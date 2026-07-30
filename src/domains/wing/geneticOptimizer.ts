/**
 * Algoritmo Genético de Optimización Aerodinámica
 * Extraído y optimizado del motor legado con soporte multi-objetivo técnico-económico.
 */

import { calcularEmpirico, LegacyWingInput } from './empirical';
import { DesignRequirements, TargetSector, ViabilityAnalysis, LegacyWingPayload } from '../../core/types';
import { checkSweepStability } from './stability';
import { checkSectorViability, getSectorLimits } from './sectorGuardrails';
import { analyzeBucklingStability } from './buckling';
import { computeLongitudinalStability } from './flightDynamics';
import { MATERIALS_DB } from './materials';
import { generateParetoFront } from './pareto';
import {
  computeViabilityAnalysis,
  computeWeightPenalty,
  computeCostPenalty,
  computeFatiguePenalty,
  computeSectorPenalty,
  computeEstimatedWeight,
  computeEstimatedCost,
  compute_structure_penalty
} from './penalties';

export interface OptRange {
  min: number;
  max: number;
}

export interface GenerationData {
  gen: number;
  bestFit: number;
  avgFit: number;
  bestParams: LegacyWingInput;
  discardedCount?: number;
  viabilityScore?: number;
  bestAero?: { LD: number; CL: number; CD: number; AR: number; S: number };
  estimatedWeightKg?: number;
  estimatedCostEur?: number;
}

export interface OptResult {
  bestInd: number[];
  bestFitness: number;
  bestParams: LegacyWingInput;
  historyBest: number[];
  historyAvg: number[];
  viability?: ViabilityAnalysis;
}

const HIGH_LOAD_F1_NACAS = ['6412', '4415', '4412', '6415', '2415'];

export class GeneticOptimizer {
  popSize = 50;
  generations = 80;
  tournamentSize = 3;
  mutationSigma = 0.12;
  crossoverAlpha = 0.5;
  discardedCount = 0;

  ranges: OptRange[] = [
    { min: 0.5, max: 3.0 },   // Cr
    { min: 0.2, max: 2.0 },   // Ct
    { min: 2.0, max: 15.0 },  // b
    { min: -15, max: 35 },    // sweep
    { min: -6, max: 4 },      // twist
    { min: 0, max: 4 },       // m
    { min: 0, max: 6 },       // p
    { min: 8, max: 18 }       // t
  ];

  historyBest: number[] = [];
  historyAvg: number[] = [];
  running = false;
  stopRequested = false;
  onGeneration?: (
    gen: number,
    bestFit: number,
    avgFit: number,
    bestParams: LegacyWingInput,
    discardedCount?: number,
    viabilityScore?: number,
    bestAero?: { LD: number; CL: number; CD: number; AR: number; S: number },
    estimatedWeightKg?: number,
    estimatedCostEur?: number
  ) => void;

  paramsToInd(params: LegacyWingInput, sector?: string): number[] {
    const isMotorsport = sector?.startsWith('f1_') || sector === 'gt_spoiler';
    if (isMotorsport) {
      // Cromosoma F1 (3 genes): [α (8°-18°), NACA Index (0-4), Twist (-3° a 0°)]
      const alpha = Math.min(18, Math.max(8, params.alpha_deg || 12));
      let nacaIdx = HIGH_LOAD_F1_NACAS.indexOf(params.nacaCode);
      if (nacaIdx < 0) nacaIdx = 0;
      const twist = Math.min(0, Math.max(-3, params.twist_deg || 0));
      return [alpha, nacaIdx, twist];
    }

    const naca = params.nacaCode || '2412';
    const m = parseInt(naca[0] || '2', 10);
    const p = parseInt(naca[1] || '4', 10);
    const t = parseInt(naca.substring(2) || '12', 10);
    return [
      params.Cr,
      params.Ct,
      params.b,
      params.sweep_deg,
      params.twist_deg,
      params.alpha_deg ?? 4,
      m,
      p,
      t
    ];
  }

  randomInd(): number[] {
    return this.ranges.map(r => r.min + Math.random() * (r.max - r.min));
  }

  indToParams(ind: number[], sector?: TargetSector, fixedSpan?: number, reqs?: DesignRequirements): LegacyWingPayload {
    const isMotorsport = sector?.startsWith('f1_') || sector === 'gt_spoiler';

    if (isMotorsport) {
      // Cromosoma F1 (3 genes): [α, NACA Index, Twist] con geometría fija constante (span/chord)
      const alpha = Math.min(18, Math.max(8, ind[0] ?? 12));
      const nacaIdx = Math.min(4, Math.max(0, Math.round(ind[1] ?? 0)));
      const twist = Math.min(0, Math.max(-3, ind[2] ?? 0));
      const nacaCode = HIGH_LOAD_F1_NACAS[nacaIdx] || '6412';

      return {
        b: 1.05,        // Envergadura fija constante
        Cr: 0.30,       // Cuerda raíz fija constante
        Ct: 0.25,       // Cuerda punta fija constante
        sweep_deg: 0,   // Flecha fija constante
        twist_deg: Number(twist.toFixed(2)),
        alpha_deg: Number(alpha.toFixed(2)),
        nacaCode,
        isMultiElement: true,
        numElements: 2,
        flapGapMm: 12,
        flapOverlapMm: 8,
        flapAngleDeg: 28
      };
    }

    const [Cr, Ct, b, sweep, twist, alpha, m_raw, p_raw, t_raw] = ind;
    const m_int = Math.round(Math.min(9, Math.max(0, m_raw)));
    const p_int = Math.round(Math.min(9, Math.max(0, p_raw)));
    const t_int = Math.round(Math.min(18, Math.max(6, t_raw)));
    let nacaCode = `${m_int}${p_int}${String(t_int).padStart(2, '0')}`;

    const limits = getSectorLimits(sector);
    const maxCr = limits.Cr.max;
    const maxCt = limits.Ct.max;
    const maxB = (fixedSpan && fixedSpan > 0) ? fixedSpan : limits.b.max;
    const minCr = limits.Cr.min;
    const minCt = limits.Ct.min;
    const minB = (fixedSpan && fixedSpan > 0) ? fixedSpan : limits.b.min;

    let clampedB = Math.min(maxB, Math.max(minB, b));
    let clampedCr = Math.min(maxCr, Math.max(minCr, Cr));
    
    // Regla de cordura geométrica: Cr no debe superar el 60% de la envergadura b
    if (clampedCr > clampedB * 0.6) {
      clampedCr = clampedB * 0.6;
    }

    let clampedCt = Math.min(maxCt, Math.max(minCt, Ct));
    if (clampedCt > clampedCr) {
      clampedCt = clampedCr * 0.85;
    }

    // FIX (2): Lectura de límites de sweep y twist desde getSectorLimits(sector) como única fuente de verdad
    const minSweep = limits.sweep.min;
    const maxSweep = limits.sweep.max;
    const minTwist = limits.twist.min;
    const maxTwist = limits.twist.max;

    let finalB = Number(clampedB.toFixed(2));
    let finalCr = Number(clampedCr.toFixed(2));
    let finalCt = Number(clampedCt.toFixed(2));
    let finalSweep = Number(Math.min(maxSweep, Math.max(minSweep, sweep)).toFixed(2));
    let finalTwist = Number(Math.min(maxTwist, Math.max(minTwist, twist)).toFixed(2));
    let finalAlpha = Number(Math.min(14, Math.max(1, alpha ?? 4)).toFixed(1));

    // APLICACIÓN DE CANDADOS DE PARÁMETROS FIJOS (Locked Params)
    if (reqs?.locked_params) {
      const lp = reqs.locked_params;
      if (lp.b !== undefined && lp.b > 0) finalB = lp.b;
      if (lp.Cr !== undefined && lp.Cr > 0) finalCr = lp.Cr;
      if (lp.Ct !== undefined && lp.Ct > 0) finalCt = lp.Ct;
      if (lp.sweep_deg !== undefined) finalSweep = lp.sweep_deg;
      if (lp.twist_deg !== undefined) finalTwist = lp.twist_deg;
      if (lp.alpha_deg !== undefined) finalAlpha = lp.alpha_deg;
      if (lp.nacaCode !== undefined && lp.nacaCode.length >= 4) nacaCode = lp.nacaCode;
    }

    return {
      Cr: finalCr,
      Ct: finalCt,
      b: finalB,
      sweep_deg: finalSweep,
      twist_deg: finalTwist,
      alpha_deg: finalAlpha,
      nacaCode,
      isMultiElement: false,
      numElements: 1,
      flapGapMm: 0,
      flapOverlapMm: 0,
      flapAngleDeg: 0
    };
  }

  fitness(ind: number[], requirements?: DesignRequirements): number {
    const isMotorsport = requirements?.sector?.startsWith('f1_') || requirements?.sector === 'gt_spoiler';
    const params = this.indToParams(ind, requirements?.sector, requirements?.fixed_span_m, requirements);
    const aero = calcularEmpirico(params);

    // RESTICCIÓN DURA DE DRAG F1: CD < 0.12
    if (isMotorsport) {
      if (aero.CD >= 0.12) {
        this.discardedCount++;
        return 0.0; // Rechazo inmediato por exceso de drag
      }

      // OBJETIVO F1: Maximizar Downforce Total = (CL * Área)
      const downforceMetric = Math.abs(aero.CL) * aero.S; // (CL * S)
      const maxTargetDownforce = 0.85; // Downforce de referencia para alerón F1
      const fitScore = Math.min(99.5, Math.max(15.0, (downforceMetric / maxTargetDownforce) * 100));
      return Number(fitScore.toFixed(2));
    }

    const estWeight = computeEstimatedWeight(params, aero, requirements || {
      sector: 'uav',
      estimated_weight_kg: 25,
      material: 'al2024',
      flight_hours: 100,
      max_budget_eur: 15000,
      safety_factor: 2.5
    });

    const costObj = computeEstimatedCost(estWeight, params, requirements || {
      sector: 'uav',
      estimated_weight_kg: 25,
      material: 'al2024',
      flight_hours: 100,
      max_budget_eur: 15000,
      safety_factor: 2.5
    });
    const costTotal = typeof costObj === 'number' ? costObj : costObj.totalCost;

    // 1. RESTRICCIONES HARD & LISTA NEGRA PROHIBIDA (Rechazo Inmediato)
    // FIX (3): Estimación de CL_max del perfil NACA para descarte por entrada en pérdida (stall) en el camino no-F1
    // Fórmula: CL_max_2D = 1.1 + 0.1*camber + 0.02*thickness con corrección de flecha 3D (Raymer Aircraft Design)
    const m_camber = parseInt(params.nacaCode[0] || '2', 10);
    const t_thick = parseInt(params.nacaCode.slice(2) || '12', 10);
    const CL_max_2d = 1.1 + 0.1 * m_camber + 0.02 * t_thick;
    const CL_max = CL_max_2d * Math.cos((params.sweep_deg * Math.PI) / 180);

    if (aero.CL >= CL_max) {
      this.discardedCount++;
      return 0.0; // Rechazo inmediato por entrada en pérdida (stall)
    }

    // FIX (3): Rechazo duro si no se cumple el requisito de L/D mínimo (requirements.min_ld)
    if (requirements?.min_ld && requirements.min_ld > 0 && aero.LD < requirements.min_ld) {
      this.discardedCount++;
      return 0.0; // Rechazo inmediato por eficiencia L/D por debajo del requerimiento
    }

    const stabilityRes = checkSweepStability(params.sweep_deg, params.twist_deg, requirements?.material, params.b, params.Cr, params.Ct);
    if (stabilityRes.status === 'danger') {
      this.discardedCount++;
      return 0.0;
    }

    if (requirements?.sector === 'uav') {
      if (params.Cr < 0.25 || params.Ct < 0.12) {
        this.discardedCount++;
        return 0.0;
      }
    }

    if (requirements && !requirements.unconstrained) {
      if (requirements.max_weight_kg && requirements.max_weight_kg > 0 && estWeight > requirements.max_weight_kg * 1.5) {
        this.discardedCount++;
        return 0.0;
      }
      if (requirements.max_cost_eur && requirements.max_cost_eur > 0 && costTotal > requirements.max_cost_eur * 1.5) {
        this.discardedCount++;
        return 0.0;
      }
      if (requirements.fixed_span_m && requirements.fixed_span_m > 0 && Math.abs(params.b - requirements.fixed_span_m) > 0.05) {
        this.discardedCount++;
        return 0.0;
      }
    }

    let penaltySum = 0;

    // Guardarraíles sectoriales con penalización suave
    if (requirements?.sector && !requirements?.unconstrained) {
      const sectorDiag = checkSectorViability(requirements.sector, params, { S: aero.S, AR: aero.AR });
      if (sectorDiag.isBlocked || sectorDiag.status === 'rojo') {
        this.discardedCount++;
        return 0.0;
      } else if (sectorDiag.status === 'ambar') {
        penaltySum += sectorDiag.penalty * 0.15;
      }
    }

    const isHydrofoil = requirements?.sector?.startsWith('hydrofoil_');

    if (aero.AR < 2.5) penaltySum += 0.10;
    if (aero.CD > 0.15) penaltySum += 0.10;

    const taperRatio = params.Ct / params.Cr;
    if (taperRatio < 0.15 || taperRatio > 1.05) {
      penaltySum += 0.10;
    }

    // Factor de penalización suave lineal (evita colapsos exponenciales agresivos)
    const penaltyFactor = Math.max(0.70, 1.0 - penaltySum * 0.25);

    const mode = requirements?.optimization_mode || 'balance';
    
    // Normalización de Puntuación Base en Escala 0 - 100 calibrada dinámicamente por sector
    let baseFitness = 80;

    if (isHydrofoil) {
      const targetHydroLD = requirements?.sector === 'hydrofoil_racing' ? 16.0 : 12.0;
      const ldScore = Math.min(100, (aero.LD / targetHydroLD) * 90 + 10);
      baseFitness = ldScore;
    } else {
      let maxTargetLD = 18.0;
      if (requirements?.sector === 'glider') maxTargetLD = 30.0;
      else if (requirements?.sector === 'comercial') maxTargetLD = 24.0;
      else if (requirements?.sector === 'sport') maxTargetLD = 18.0;
      else if (requirements?.sector === 'uav' || requirements?.sector === 'evtol') maxTargetLD = 15.0;
      else if (requirements?.sector === 'experimental') maxTargetLD = 20.0;

      const ldScore = Math.min(100, (aero.LD / maxTargetLD) * 85 + 15);
      
      if (mode === 'efficiency') {
        baseFitness = ldScore;
      } else {
        const targetW = requirements?.estimated_weight_kg || 25;
        const weightRatio = targetW / Math.max(0.1, estWeight);
        const weightScore = Math.min(100, Math.max(20, weightRatio * 85));
        baseFitness = (ldScore * 0.65) + (weightScore * 0.35);
      }
    }

    const finalScore = Math.min(99.5, Math.max(25.0, baseFitness * penaltyFactor));
    return Number(finalScore.toFixed(2));
  }

  crowdingDistance(pop: number[][], fits: number[]): number[] {
    const n = pop.length;
    const dist = new Array(n).fill(0);
    const m = pop[0]?.length || 1;
    const idxSorted = pop.map((_, i) => i);
    for (let obj = 0; obj < 2; obj++) {
      idxSorted.sort((a, b) => obj === 0 ? fits[b] - fits[a] : (fits[a] - fits[b]));
      dist[idxSorted[0]] = Infinity;
      dist[idxSorted[n - 1]] = Infinity;
      const minFit = fits[idxSorted[0]];
      const maxFit = fits[idxSorted[n - 1]];
      const range = Math.max(1e-10, maxFit - minFit);
      for (let i = 1; i < n - 1; i++) {
        dist[idxSorted[i]] += (fits[idxSorted[i + 1]] - fits[idxSorted[i - 1]]) / range;
      }
    }
    return dist;
  }

  tournament(pop: number[][], fits: number[], crowdDist?: number[]): number[] {
    const idx: number[] = [];
    for (let i = 0; i < this.tournamentSize; i++) {
      idx.push(Math.floor(Math.random() * pop.length));
    }
    let bestIdx = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const crowdBetter = crowdDist && crowdDist[idx[i]] > crowdDist[bestIdx] * 1.5;
      if (fits[idx[i]] > fits[bestIdx] || (fits[idx[i]] === fits[bestIdx] && crowdBetter)) {
        bestIdx = idx[i];
      }
    }
    return pop[bestIdx].slice();
  }

  crossover(parent1: number[], parent2: number[]): number[] {
    const child: number[] = [];
    const alpha = this.crossoverAlpha;
    for (let i = 0; i < parent1.length; i++) {
      const min = Math.min(parent1[i], parent2[i]);
      const max = Math.max(parent1[i], parent2[i]);
      const d = max - min;
      const minVal = min - d * alpha;
      const maxVal = max + d * alpha;
      const newVal = minVal + Math.random() * (maxVal - minVal);
      const r = this.ranges[i] || { min: 0, max: 1 };
      child.push(Math.min(r.max, Math.max(r.min, newVal)));
    }
    return child;
  }

  mutate(ind: number[]): number[] {
    const mutated = ind.slice();
    for (let i = 0; i < mutated.length; i++) {
      if (Math.random() < 0.25) {
        const r = this.ranges[i] || { min: 0, max: 1 };
        const sigma = (r.max - r.min) * this.mutationSigma;
        const newVal = mutated[i] + this.gaussianRandom() * sigma;
        mutated[i] = Math.min(r.max, Math.max(r.min, newVal));
      }
    }
    return mutated;
  }

  gaussianRandom(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  async run(initialParams?: LegacyWingInput, requirements?: DesignRequirements): Promise<OptResult> {
    this.running = true;
    this.stopRequested = false;
    this.historyBest = [];
    this.historyAvg = [];
    this.discardedCount = 0;

    const sector = requirements?.sector;
    const isMotorsport = sector?.startsWith('f1_') || sector === 'gt_spoiler';

    if (isMotorsport) {
      // Cromosoma F1 (3 genes): [α (8°-18°), NACA Index (0-4), Twist (-3° a 0°)]
      this.ranges = [
        { min: 8.0, max: 18.0 },
        { min: 0.0, max: 4.0 },
        { min: -3.0, max: 0.0 }
      ];
    } else {
      const limits = getSectorLimits(sector);
      const fixedSpan = (requirements?.fixed_span_m && requirements.fixed_span_m > 0) ? requirements.fixed_span_m : undefined;

      // FIX (2): Eliminada duplicación, leyendo directamente limits.sweep y limits.twist
      this.ranges = [
        { min: limits.Cr.min, max: limits.Cr.max },
        { min: limits.Ct.min, max: limits.Ct.max },
        { min: fixedSpan ? fixedSpan : limits.b.min, max: fixedSpan ? fixedSpan : limits.b.max },
        { min: limits.sweep.min, max: limits.sweep.max },
        { min: limits.twist.min, max: limits.twist.max },
        { min: 1.0, max: 14.0 }, // alpha_deg (1° a 14°)
        { min: 0, max: 4 },     // m (camber)
        { min: 2, max: 6 },     // p (position)
        { min: 8, max: 18 }    // t (thickness)
      ];
    }

    let population: number[][] = [];

    const modeType = requirements?.optimization_mode_type || 'from_scratch';

    if (modeType === 'from_sliders' && initialParams) {
      const baseInd = this.paramsToInd(initialParams, sector);
      population.push(baseInd);

      for (let i = 1; i < 15; i++) {
        population.push(this.mutate(baseInd));
      }
    }

    while (population.length < this.popSize) {
      population.push(this.randomInd());
    }

    let fitnessList = population.map(ind => this.fitness(ind, requirements));

    for (let gen = 0; gen < this.generations; gen++) {
      if (this.stopRequested) break;

      const crowdDist = this.crowdingDistance(population, fitnessList);
      const newPop: number[][] = [];
      let bestIdx = 0;
      for (let i = 1; i < fitnessList.length; i++) {
        if (fitnessList[i] > fitnessList[bestIdx]) bestIdx = i;
      }
      newPop.push(population[bestIdx].slice());

      while (newPop.length < this.popSize) {
        const p1 = this.tournament(population, fitnessList, crowdDist);
        const p2 = this.tournament(population, fitnessList, crowdDist);
        let child = this.crossover(p1, p2);
        child = this.mutate(child);
        newPop.push(child);
      }

      population = newPop;
      fitnessList = population.map(ind => this.fitness(ind, requirements));

      const bestFit = Math.max(...fitnessList);
      const avgFit = fitnessList.reduce((a, b) => a + b, 0) / fitnessList.length;
      this.historyBest.push(bestFit);
      this.historyAvg.push(avgFit);

      const currentBestInd = population[fitnessList.indexOf(bestFit)];
      const currentBestParams = this.indToParams(currentBestInd, requirements?.sector, requirements?.fixed_span_m, requirements);
      const currentAero = calcularEmpirico(currentBestParams);
      const currentEstWeight = computeEstimatedWeight(currentBestParams, currentAero, requirements || {
        sector: 'uav', estimated_weight_kg: 25, material: 'al2024', flight_hours: 100, max_budget_eur: 15000, safety_factor: 2.5
      });
      const costObj = computeEstimatedCost(currentEstWeight, currentBestParams, requirements || {
        sector: 'uav', estimated_weight_kg: 25, material: 'al2024', flight_hours: 100, max_budget_eur: 15000, safety_factor: 2.5
      });
      const currentEstCost = typeof costObj === 'number' ? costObj : costObj.totalCost;

      if (gen % 10 === 0) {
        console.log(`[AG DEBUG] Gen ${gen + 1}: b=${currentBestParams.b}m, Cr=${currentBestParams.Cr}m, bestFit=${bestFit.toFixed(2)}, discarded=${this.discardedCount}`);
      }

      if (this.onGeneration) {
        this.onGeneration(
          gen + 1,
          bestFit,
          avgFit,
          currentBestParams,
          this.discardedCount,
          Math.round(bestFit),
          { LD: currentAero.LD, CL: currentAero.CL, CD: currentAero.CD, AR: currentAero.AR, S: currentAero.S },
          currentEstWeight,
          currentEstCost
        );
      }

      await new Promise(resolve => setTimeout(resolve, 8));
    }

    this.running = false;
    const finalBestIdx = fitnessList.indexOf(Math.max(...fitnessList));
    const finalBestInd = population[finalBestIdx];
    const bestParams = this.indToParams(finalBestInd, requirements?.sector, requirements?.fixed_span_m, requirements);

    let viability: ViabilityAnalysis | undefined = undefined;
    if (requirements) {
      const aero = calcularEmpirico(bestParams);
      viability = computeViabilityAnalysis(bestParams, aero, requirements);
      viability.paretoDesigns = generateParetoFront(requirements, bestParams);
      viability.discardedDesignsCount = this.discardedCount;
    }

    return {
      bestInd: finalBestInd,
      bestFitness: fitnessList[finalBestIdx],
      bestParams,
      historyBest: this.historyBest,
      historyAvg: this.historyAvg,
      viability
    };
  }

  stop(): void {
    this.stopRequested = true;
  }
}
