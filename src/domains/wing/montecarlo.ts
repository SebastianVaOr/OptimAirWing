import { DesignRequirements, LegacyWingPayload } from '../../core/types';
import { computeEstimatedCost, computeEstimatedWeight } from './penalties';

export interface MonteCarloPercentiles {
  p5: number;
  p50: number;
  p95: number;
}

export interface MonteCarloAnalysisResult {
  LD: MonteCarloPercentiles;
  FS: MonteCarloPercentiles;
  Peso: MonteCarloPercentiles;
  Coste: MonteCarloPercentiles;
  samplesCount: number;
}

function calcPercentile(sortedArr: number[], pct: number): number {
  if (sortedArr.length === 0) return 0;
  const index = (sortedArr.length - 1) * (pct / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + num * stdDev;
}

export function runMonteCarloSimulations(
  params: LegacyWingPayload,
  nSamples: number = 500,
  req?: DesignRequirements,
  baselineAero?: { CL: number; CD: number; S?: number; AR?: number }
): MonteCarloAnalysisResult {
  const lds: number[] = [];
  const fss: number[] = [];
  const weights: number[] = [];
  const costs: number[] = [];

  const defaultReq: DesignRequirements = req || {
    sector: 'uav',
    estimated_weight_kg: 25,
    material: 'al2024',
    flight_hours: 10,
    max_budget_eur: 15000,
    safety_factor: 2.5
  };

  const baseB = params.b || 5.0;
  const baseCr = params.Cr || 1.2;
  const baseCt = params.Ct || 0.8;

  for (let i = 0; i < nSamples; i++) {
    // For i === 0 (or median anchor), use exact nominal values
    const isNominal = i === 0;
    const b = isNominal ? baseB : Math.max(0.2, gaussianRandom(baseB, baseB * 0.03));
    const Cr = isNominal ? baseCr : Math.max(0.1, gaussianRandom(baseCr, baseCr * 0.03));
    const Ct = isNominal ? baseCt : Math.max(0.05, gaussianRandom(baseCt, baseCt * 0.03));

    const S = ((Cr + Ct) / 2) * b;
    const AR = (b * b) / Math.max(0.01, S);
    const OswaldE = 0.85;
    const CL = baselineAero ? baselineAero.CL : (2 * Math.PI * 0.07) * (1 / (1 + 2 / AR));
    const CD = baselineAero ? baselineAero.CD : (0.015 + (CL * CL) / (Math.PI * OswaldE * AR));
    const LD = CL / Math.max(0.001, CD);

    const sampledParams: LegacyWingPayload = {
      ...params,
      b,
      Cr,
      Ct
    };

    const sampledAero = { CL, CD, LD, S, S_m2: S, AR, e: OswaldE };
    const weightKg = computeEstimatedWeight(sampledParams, sampledAero, defaultReq);

    const Ix = (Cr * Math.pow(Cr * 0.12, 3)) / 12;
    const sf = defaultReq.safety_factor || 2.5;
    const M_root = (weightKg * 9.81 * sf / 2) * (b / 4);
    const sigma = (M_root * (Cr * 0.06)) / Math.max(1e-9, Ix);
    const yieldStress = 270e6;
    const FS = yieldStress / Math.max(1e3, sigma);

    const costObj = computeEstimatedCost(weightKg, sampledParams, defaultReq);
    const costEur = costObj.totalCost;

    lds.push(LD);
    fss.push(FS);
    weights.push(weightKg);
    costs.push(costEur);
  }

  lds.sort((a, b) => a - b);
  fss.sort((a, b) => a - b);
  weights.sort((a, b) => a - b);
  costs.sort((a, b) => a - b);

  return {
    LD: {
      p5: parseFloat(calcPercentile(lds, 5).toFixed(2)),
      p50: parseFloat(calcPercentile(lds, 50).toFixed(2)),
      p95: parseFloat(calcPercentile(lds, 95).toFixed(2)),
    },
    FS: {
      p5: parseFloat(calcPercentile(fss, 5).toFixed(2)),
      p50: parseFloat(calcPercentile(fss, 50).toFixed(2)),
      p95: parseFloat(calcPercentile(fss, 95).toFixed(2)),
    },
    Peso: {
      p5: parseFloat(calcPercentile(weights, 5).toFixed(2)),
      p50: parseFloat(calcPercentile(weights, 50).toFixed(2)),
      p95: parseFloat(calcPercentile(weights, 95).toFixed(2)),
    },
    Coste: {
      p5: parseFloat(calcPercentile(costs, 5).toFixed(2)),
      p50: parseFloat(calcPercentile(costs, 50).toFixed(2)),
      p95: parseFloat(calcPercentile(costs, 95).toFixed(2)),
    },
    samplesCount: nSamples,
  };
}
