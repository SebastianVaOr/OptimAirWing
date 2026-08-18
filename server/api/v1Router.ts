import { Router } from 'express';
import { z } from 'zod';
import { predictorRegistry } from '../predictors/registry';
import { WingParamsZodSchema, LegacyWingPayloadSchema, LegacyWingPayloadValidatedSchema } from '../schemas/wingSchema';
import { db } from '../db/store';
import { legacyToWingParams } from '../../src/core/store';
import { GeneticOptimizer } from '../../src/domains/wing/geneticOptimizer';
import { DesignRequirements, LegacyWingPayload, WingParams } from '../../src/core/types';
import { validate } from '../middleware/validate';
import { requirePlan, checkCredit } from '../middleware/planEnforcer';
import { idempotent } from '../infra/idempotency';
import { reportUsageByOrgId } from '../lib/stripe';
import { OrgRepo, DesignRepo } from '../db/repositories';
import { logger } from '../lib/logger';

const orgRepo = new OrgRepo();
const designRepo = new DesignRepo();

function sendError(res: import('express').Response, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return res.status(status).json({ error: code, message, ...extra });
}

export const v1Router = Router();

const OptimizeRequestSchema = z.object({
  params: LegacyWingPayloadSchema.partial().optional(),
  initial_params: LegacyWingPayloadSchema.partial().optional(),
  requirements: z.object({
    sector: z.string().optional(),
    optimization_mode: z.string().optional(),
    optimization_level: z.string().optional(),
    optimization_mode_type: z.string().optional(),
    unconstrained: z.boolean().optional(),
    max_weight_kg: z.number().positive().optional(),
    max_cost_eur: z.number().positive().optional(),
    min_ld: z.number().positive().optional(),
    fixed_span_m: z.number().positive().optional(),
    estimated_weight_kg: z.number().positive().optional(),
    max_budget_eur: z.number().positive().optional(),
    material: z.string().optional(),
    flight_hours: z.number().positive().optional(),
    safety_factor: z.number().positive().optional(),
    cruise_velocity_ms: z.number().positive().optional()
  }).optional(),
  sector: z.string().optional(),
  optimization_mode: z.string().optional(),
  optimization_level: z.string().optional(),
  optimization_mode_type: z.string().optional(),
  unconstrained: z.boolean().optional(),
  max_weight_kg: z.number().optional(),
  max_cost_eur: z.number().optional(),
  min_ld: z.number().optional(),
  fixed_span_m: z.number().optional(),
  estimated_weight_kg: z.number().optional(),
  max_budget_eur: z.number().optional(),
  material: z.string().optional(),
  flight_hours: z.number().optional(),
  safety_factor: z.number().optional(),
  cruise_velocity_ms: z.number().optional()
}).superRefine((body, ctx) => {
  // Cordura geométrica: Ct ≤ Cr en params/initial_params si ambos están presentes
  const candidate = body.params || body.initial_params;
  if (candidate && candidate.Ct !== undefined && candidate.Cr !== undefined && candidate.Ct > candidate.Cr) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ct no puede exceder Cr (geometría inválida)',
      path: ['params', 'Ct'],
    });
  }
});

v1Router.get('/user/credits', (req, res) => {
  const credits = db.getCreditsInfo('org_demo');
  return res.json(credits);
});

v1Router.post('/user/credits/use', (req, res) => {
  const parsed = z.object({
    type: z.enum(['prediction', 'optimization']),
    amount: z.number().int().positive().optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, 'INVALID_PAYLOAD', 'Payload inválido', { details: parsed.error.format() });
  }

  const type = parsed.data.type;
  // Facturación plana: cada corrida de optimización cuesta 1 crédito, el nivel es solo etiqueta de fidelidad
  const amount = type === 'optimization' ? 1 : (parsed.data.amount || 1);

  const allowed = db.incrementUsage('org_demo', type, amount);
  if (!allowed) {
    return sendError(res, 429, 'INSUFFICIENT_CREDITS', `Ha agotado sus créditos para esta operación (requiere ${amount} crédito(s)). Compre créditos extra o actualice su suscripción.`, { credits: db.getCreditsInfo('org_demo') });
  }
  return res.json({ status: 'success', credits: db.getCreditsInfo('org_demo') });
});

v1Router.post('/user/credits/buy-pack', (req, res) => {
  const parsed = z.object({
    pack_size: z.number().refine(v => [10, 25, 50].includes(v), 'Opciones: 10, 25, 50')
  }).safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, 'INVALID_PACK', 'Pack inválido', { details: parsed.error.format() });
  }

  db.addExtraCredits('org_demo', parsed.data.pack_size);
  const credits = db.getCreditsInfo('org_demo');
  return res.json({
    status: 'success',
    message: `Se han añadido ${parsed.data.pack_size} créditos extra a su cuenta.`,
    credits
  });
});

v1Router.post('/predict', requirePlan('freemium'), checkCredit('predictions'), validate(WingParamsZodSchema), (req, res) => {
  const orgId = (req as any).orgId || 'org_demo';
  const result = predictorRegistry.predictWithFallback(req.body as WingParams);

  orgRepo.incrementPredictions(orgId);
  reportUsageByOrgId(orgId, 1).catch(() => {});

  return res.json(result);
});

v1Router.post('/predict/legacy', requirePlan('freemium'), checkCredit('predictions'), validate(LegacyWingPayloadValidatedSchema), (req, res) => {
  const orgId = (req as any).orgId || 'org_demo';
  const wingParams = legacyToWingParams(req.body as LegacyWingPayload);
  const result = predictorRegistry.predictWithFallback(wingParams);

  orgRepo.incrementPredictions(orgId);
  reportUsageByOrgId(orgId, 1).catch(() => {});

  return res.json(result);
});

v1Router.post('/optimize', requirePlan('professional'), checkCredit('optimizations'), idempotent(3600000), validate(OptimizeRequestSchema), async (req, res) => {
  const body = req.body;
  const level = body.level || body.optimization_level || body.requirements?.optimization_level;
  const mode = body.mode || body.optimization_mode || body.requirements?.optimization_mode;

  const initialParams: LegacyWingPayload | undefined = body.params || body.initial_params as any;
  const rawReqs = body.requirements;

  const requirements: DesignRequirements = {
    sector: body.sector || rawReqs?.sector || 'uav',
    optimization_mode: body.optimization_mode || rawReqs?.optimization_mode || 'balance',
    optimization_mode_type: body.optimization_mode_type || rawReqs?.optimization_mode_type || 'from_scratch',
    optimization_level: level || 'basic',
    unconstrained: body.unconstrained ?? rawReqs?.unconstrained ?? false,
    max_weight_kg: body.max_weight_kg ?? rawReqs?.max_weight_kg ?? undefined,
    max_cost_eur: body.max_cost_eur ?? rawReqs?.max_cost_eur ?? undefined,
    min_ld: body.min_ld ?? rawReqs?.min_ld ?? undefined,
    fixed_span_m: body.fixed_span_m ?? rawReqs?.fixed_span_m ?? undefined,
    estimated_weight_kg: body.estimated_weight_kg ?? rawReqs?.estimated_weight_kg ?? 25,
    max_budget_eur: body.max_budget_eur ?? rawReqs?.max_budget_eur ?? 15000,
    material: body.material || rawReqs?.material || 'al2024',
    flight_hours: body.flight_hours ?? rawReqs?.flight_hours ?? 100,
    safety_factor: body.safety_factor ?? rawReqs?.safety_factor ?? 2.5,
    cruise_velocity_ms: body.cruise_velocity_ms ?? rawReqs?.cruise_velocity_ms ?? 50,
  };

  const optimizer = new GeneticOptimizer();
  const optResult = await optimizer.run(initialParams, requirements);

  const orgId = (req as any).orgId || 'org_demo';
  orgRepo.incrementOptimizations(orgId);
  // Facturación plana: 1 crédito por corrida, independiente del nivel de optimización
  reportUsageByOrgId(orgId, 1).catch(() => {});

  // Convención de respuesta: snake_case (best_params, best_fitness, history_best)
  return res.json({
    status: 'success',
    best_params: optResult.bestParams,
    best_fitness: optResult.bestFitness,
    history_best: optResult.historyBest,
    history_avg: optResult.historyAvg,
    viability: optResult.viability,
    credits: db.getCreditsInfo('org_demo'),
    timestamp: new Date().toISOString()
  });
});

v1Router.get('/optimize/stream', requirePlan('professional'), checkCredit('optimizations'), async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const orgId = (req as any).orgId || 'org_demo';

  // Consumo plano: 1 crédito por corrida, mismo gate de plan/créditos que /optimize
  const allowed = db.incrementUsage(orgId, 'optimization', 1);
  if (!allowed) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Créditos insuficientes (requiere 1 crédito).' })}\n\n`);
    return res.end();
  }

  let initialParams: LegacyWingPayload | undefined;
  let rawReqs: DesignRequirements | undefined;
  if (req.query.params) {
    try {
      initialParams = JSON.parse(req.query.params as string);
    } catch (_) {}
  }
  if (req.query.requirements) {
    try {
      rawReqs = JSON.parse(req.query.requirements as string);
    } catch (_) {}
  }

  const requirements: DesignRequirements = {
    sector: (req.query.sector as any) || rawReqs?.sector || 'uav',
    optimization_mode: (req.query.priority as any) || (req.query.optimization_mode as any) || rawReqs?.optimization_mode || 'balance',
    optimization_mode_type: (req.query.optimization_mode_type as any) || rawReqs?.optimization_mode_type || 'from_scratch',
    optimization_level: (req.query.optimization_level as any) || rawReqs?.optimization_level || 'basic',
    unconstrained: req.query.unconstrained !== undefined ? req.query.unconstrained === 'true' : (rawReqs?.unconstrained || false),
    max_weight_kg: Number(req.query.max_weight_kg ?? req.query.maxWeight ?? rawReqs?.max_weight_kg) || undefined,
    max_cost_eur: Number(req.query.max_cost_eur ?? req.query.maxCost ?? rawReqs?.max_cost_eur) || undefined,
    min_ld: Number(req.query.min_ld ?? req.query.minLD ?? rawReqs?.min_ld) || undefined,
    fixed_span_m: Number(req.query.fixed_span_m ?? req.query.fixedSpan ?? rawReqs?.fixed_span_m) || undefined,
    estimated_weight_kg: Number(req.query.estimated_weight_kg ?? rawReqs?.estimated_weight_kg) || 25,
    max_budget_eur: Number(req.query.max_budget_eur ?? rawReqs?.max_budget_eur) || 15000,
    material: (req.query.material as any) || rawReqs?.material || 'al2024',
    flight_hours: Number(req.query.flight_hours ?? rawReqs?.flight_hours) || 100,
    safety_factor: Number(req.query.safety_factor ?? rawReqs?.safety_factor) || 2.5,
    cruise_velocity_ms: Number(req.query.cruise_velocity_ms ?? rawReqs?.cruise_velocity_ms) || 50,
  };

  const optimizer = new GeneticOptimizer();
  let isCancelled = false;

  req.on('close', () => {
    isCancelled = true;
    optimizer.stop();
  });

  optimizer.onGeneration = (gen, bestFit, avgFit, bestParams) => {
    if (isCancelled) return;
    res.write(`event: progress\ndata: ${JSON.stringify({ generation: gen, max_generations: optimizer.generations, best_fitness: Number(bestFit.toFixed(2)), avg_fitness: Number(avgFit.toFixed(2)), best_params: bestParams })}\n\n`);
  };

  try {
    const optResult = await optimizer.run(initialParams, requirements);
    if (!isCancelled) {
      res.write(`event: complete\ndata: ${JSON.stringify({
        status: 'success',
        best_params: optResult.bestParams,
        best_fitness: optResult.bestFitness,
        history_best: optResult.historyBest,
        history_avg: optResult.historyAvg,
        viability: optResult.viability,
        credits: db.getCreditsInfo(orgId)
      })}\n\n`);
      reportUsageByOrgId(orgId, 1).catch(() => {});
    }
  } catch (e: any) {
    if (!isCancelled) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: e.message || 'Error durante la optimización' })}\n\n`);
    }
  } finally {
    res.end();
  }
});