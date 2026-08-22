/**
 * Pareto Trade-off Analysis & Sensitivity Engine
 *
 * Generates alternative design variants, identifies Pareto-optimal designs,
 * and computes parameter sensitivity for multi-objective optimization.
 */

import { LegacyWingPayload, DesignRequirements, StructuralMaterial } from '../../core/types';
import { AerodynamicResult, calcularEmpirico } from '../wing/empirical';
import { computeStructuralMass } from '../wing/structuralMass';
import { FlightConditions } from '../flight/conditions';

export interface TradeoffResult {
  paretoFront: ParetoDesign[];
  interiorPoints: ParetoDesign[];
  sensitivity: SensitivityAnalysis[];
  yourDesignPosition: YourDesignPosition;
}

export interface ParetoDesign {
  config: LegacyWingPayload;
  objectives: {
    L_D: number;
    weight_kg: number;
    cost_eur: number;
    CL_max: number;
  };
  metrics: {
    AR: number;
    sweep: number;
    taper: number;
    span: number;
  };
}

export interface YourDesignPosition {
  objectives: { L_D: number; weight_kg: number; cost_eur: number; CL_max: number };
  isParetoOptimal: boolean;
  distanceToFront: number;
  percentileRank: number;  // 0-100, what percentile of designs you're in
}

export interface SensitivityAnalysis {
  parameter: string;
  impact_L_D: number;    // % change in L/D for ±10% parameter change
  impact_weight: number; // % change in weight
  impact_cost: number;   // % change in cost
  rank: number;          // 1 = most sensitive
}

const PARAMETER_BOUNDS: Record<string, { min: number; max: number }> = {
  span: { min: 3, max: 8 },
  Cr: { min: 0.3, max: 0.8 },
  Ct: { min: 0.2, max: 0.6 },
  sweep_deg: { min: -5, max: 15 },
  twist_deg: { min: -3, max: 1 },
};

const BASE_REQUIREMENTS: DesignRequirements = {
  sector: 'uav' as const,
  estimated_weight_kg: 5,
  material: 'al2024' as const,
  flight_hours: 500,
  max_budget_eur: 5000,
  safety_factor: 1.5,
};

export function computeTradeoffs(
  baseConfig: LegacyWingPayload,
  flightConditions?: FlightConditions,
  nVariants: number = 200
): TradeoffResult {
  const variants = generateVariants(baseConfig, nVariants);

  const evaluated = variants.map(v => evaluateVariant(v, flightConditions));

  const paretoFront = extractParetoFrontFNDS(evaluated);

  const interiorPoints = evaluated.filter(v => !paretoFront.includes(v));

  const sensitivity = computeSensitivity(baseConfig, flightConditions);

  const yourDesign = evaluateVariant(baseConfig, flightConditions);
  const yourPosition: YourDesignPosition = {
    objectives: yourDesign.objectives,
    isParetoOptimal: paretoFront.includes(yourDesign),
    distanceToFront: computeDistanceToFront(yourDesign, paretoFront),
    percentileRank: computePercentileRank(yourDesign, evaluated),
  };

  return {
    paretoFront,
    interiorPoints,
    sensitivity,
    yourDesignPosition: yourPosition,
  };
}

function generateVariants(base: LegacyWingPayload, n: number): LegacyWingPayload[] {
  const variants: LegacyWingPayload[] = [];

  // Include base design
  variants.push({ ...base });

  // Generate perturbed variants
  for (let i = 1; i < n; i++) {
    const variant = { ...base };
    const perturbation = 0.2; // ±20% variation

    // Randomly perturb each parameter
    const params = Object.keys(PARAMETER_BOUNDS) as (keyof typeof PARAMETER_BOUNDS)[];
    const nToPerturb = 2 + Math.floor(Math.random() * 3); // 2-4 parameters

    for (let j = 0; j < nToPerturb; j++) {
      const param = params[Math.floor(Math.random() * params.length)];
      const bounds = PARAMETER_BOUNDS[param];
      const currentValue = variant[param as keyof LegacyWingPayload] as number;
      const delta = (bounds.max - bounds.min) * perturbation * (Math.random() - 0.5) * 2;
      const newValue = Math.max(bounds.min, Math.min(bounds.max, currentValue + delta));
      (variant as any)[param] = Number(newValue.toFixed(3));
    }

    variants.push(variant);
  }

  return variants;
}

function evaluateVariant(config: LegacyWingPayload, flightConditions?: FlightConditions): ParetoDesign {
  // Compute aerodynamics
  const aero = calcularEmpirico(config);

  // Compute structural mass
  const S = (config.b / 2) * (config.Cr + config.Ct);
  const AR = (config.b ** 2) / Math.max(0.01, S);
  const massBreakdown = computeStructuralMass(config, BASE_REQUIREMENTS, { S, AR });
  const totalWeight = massBreakdown.totalKg * 2.2 + 2; // wing + systems + payload

  // Estimate cost (simple Raymer-based)
  const manHours = 10 + (config.b * 5) + (S * 20);
  const costEur = manHours * 50 + massBreakdown.totalKg * 50;

  return {
    config,
    objectives: {
      L_D: aero.LD,
      weight_kg: totalWeight,
      cost_eur: costEur,
      CL_max: aero.CL_max,
    },
    metrics: {
      AR,
      sweep: config.sweep_deg,
      taper: config.Ct / config.Cr,
      span: config.b,
    },
  };
}

function extractParetoFrontFNDS(designs: ParetoDesign[]): ParetoDesign[] {
  const pareto: ParetoDesign[] = [];
  const n = designs.length;

  for (let i = 0; i < n; i++) {
    const candidate = designs[i];
    let isDominated = false;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const other = designs[j];

      const betterOrEqual =
        other.objectives.L_D >= candidate.objectives.L_D &&
        other.objectives.weight_kg <= candidate.objectives.weight_kg &&
        other.objectives.cost_eur <= candidate.objectives.cost_eur &&
        other.objectives.CL_max >= candidate.objectives.CL_max;

      const strictlyBetter =
        other.objectives.L_D > candidate.objectives.L_D ||
        other.objectives.weight_kg < candidate.objectives.weight_kg ||
        other.objectives.cost_eur < candidate.objectives.cost_eur ||
        other.objectives.CL_max > candidate.objectives.CL_max;

      if (betterOrEqual && strictlyBetter) {
        isDominated = true;
        break;
      }
    }

    if (!isDominated) {
      pareto.push(candidate);
    }
  }

  return pareto;
}

function extractParetoFront(designs: ParetoDesign[]): ParetoDesign[] {
  return extractParetoFrontFNDS(designs);
}

function computeDistanceToFront(design: ParetoDesign, front: ParetoDesign[]): number {
  if (front.length === 0) return Infinity;

  let minDistance = Infinity;

  for (const p of front) {
    // Normalized Euclidean distance in objective space
    const dLD = (design.objectives.L_D - p.objectives.L_D) / Math.max(p.objectives.L_D, 0.1);
    const dWeight = (design.objectives.weight_kg - p.objectives.weight_kg) / Math.max(p.objectives.weight_kg, 0.1);
    const dCost = (design.objectives.cost_eur - p.objectives.cost_eur) / Math.max(p.objectives.cost_eur, 10);
    const dCLmax = (design.objectives.CL_max - p.objectives.CL_max) / Math.max(p.objectives.CL_max, 0.1);

    const distance = Math.sqrt(dLD ** 2 + dWeight ** 2 + dCost ** 2 + dCLmax ** 2);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

function computePercentileRank(design: ParetoDesign, allDesigns: ParetoDesign[]): number {
  // What percentile is this design in terms of L/D?
  const lDValues = allDesigns.map(d => d.objectives.L_D).sort((a, b) => a - b);
  const rank = lDValues.findIndex(v => v >= design.objectives.L_D);
  return Math.round((rank / allDesigns.length) * 100);
}

function computeSensitivity(base: LegacyWingPayload, flightConditions?: FlightConditions): SensitivityAnalysis[] {
  const baseEval = evaluateVariant(base, flightConditions);
  const sensitivity: SensitivityAnalysis[] = [];
  const params = Object.keys(PARAMETER_BOUNDS) as (keyof typeof PARAMETER_BOUNDS)[];

  for (const param of params) {
    const baseValue = base[param as keyof LegacyWingPayload] as number;
    const delta = baseValue * 0.1; // ±10%
    const upValue = baseValue + delta;
    const downValue = baseValue - delta;

    // Evaluate with +10% parameter
    const upConfig = { ...base, [param]: upValue };
    const upEval = evaluateVariant(upConfig, flightConditions);

    // Evaluate with -10% parameter
    const downConfig = { ...base, [param]: downValue };
    const downEval = evaluateVariant(downConfig, flightConditions);

    // Average impact (symmetric difference)
    const impactLD = Math.abs((upEval.objectives.L_D - downEval.objectives.L_D) / baseEval.objectives.L_D * 50);
    const impactWeight = Math.abs((upEval.objectives.weight_kg - downEval.objectives.weight_kg) / baseEval.objectives.weight_kg * 50);
    const impactCost = Math.abs((upEval.objectives.cost_eur - downEval.objectives.cost_eur) / baseEval.objectives.cost_eur * 50);

    sensitivity.push({
      parameter: param,
      impact_L_D: Number(impactLD.toFixed(2)),
      impact_weight: Number(impactWeight.toFixed(2)),
      impact_cost: Number(impactCost.toFixed(2)),
      rank: 0, // will be set after sorting
    });
  }

  // Sort by total impact and assign rank
  sensitivity.sort((a, b) => {
    const totalA = a.impact_L_D + a.impact_weight + a.impact_cost;
    const totalB = b.impact_L_D + b.impact_weight + b.impact_cost;
    return totalB - totalA;
  });

  sensitivity.forEach((s, i) => s.rank = i + 1);

  return sensitivity;
}

export function getParetoColor(ld: number, weight: number, paretoPoints: ParetoDesign[]): string {
  const isPareto = paretoPoints.some(p =>
    Math.abs(p.objectives.L_D - ld) < 0.01 &&
    Math.abs(p.objectives.weight_kg - weight) < 0.01
  );
  return isPareto ? 'fill-ok' : 'fill-accent/30';
}