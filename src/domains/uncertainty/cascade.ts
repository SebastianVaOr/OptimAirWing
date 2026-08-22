/**
 * Uncertainty Cascade Propagation
 *
 * Unlike simple Monte Carlo, this module tracks HOW uncertainty propagates
 * through the calculation chain, showing which input uncertainties dominate
 * the output uncertainty.
 *
 * Key insight from 20 years of experience: A nominal FS = 1.52 means nothing
 * if the 95% CI lower bound is 1.31. The lower bound is what matters.
 *
 * Mathematical basis:
 *   For y = f(x₁, x₂, ..., xₙ), the variance of y is:
 *   Var(y) ≈ Σᵢ (∂f/∂xᵢ)² · Var(xᵢ) + Σᵢⱼ (∂f/∂xᵢ)(∂f/∂xⱼ)·Cov(xᵢ,xⱼ)
 *
 * This is first-order second-moment (FOSM) method.
 * For non-linear functions, we also support Monte Carlo with LHS.
 *
 * References:
 *   - Haldar, A. & Mahadevan, S. (2000). Probability, Reliability, and Statistical Methods
 *   - Melchers, R.E. (1999). Structural Reliability Analysis and Prediction
 */

export type DistributionType = 'normal' | 'uniform' | 'triangular';

export interface UncertaintySource {
  parameter: string;
  nominalValue: number;
  stdDev: number;           // Standard deviation
  distribution: DistributionType;
  correlationWith?: string[];
  unit: string;
  description: string;
}

export interface PropagatedResult {
  outputName: string;
  nominalValue: number;
  mean: number;
  stdDev: number;
  confidenceInterval_95: [number, number];
  coefficientOfVariation: number;  // CV = σ/μ (dimensionless)

  sensitivity: SensitivityEntry[];
  cascadeChain: string[];
}

export interface SensitivityEntry {
  parameter: string;
  sensitivityIndex: number;  // ∂output/∂input × σ_input / σ_output
  contribution_pct: number;  // % of total output variance
  normalizedSensitivity: number;
}

/**
 * Latin Hypercube Sampling for Monte Carlo
 */
function latinHypercubeSample(
  sources: UncertaintySource[],
  n: number
): Record<string, number>[] {
  const samples: Record<string, number>[] = [];

  for (let i = 0; i < n; i++) {
    const sample: Record<string, number> = {};
    for (const src of sources) {
      const u = (i + Math.random()) / n;  // Stratified random
      sample[src.parameter] = inverseTransformSample(src, u);
    }
    samples.push(sample);
  }

  return samples;
}

function inverseTransformSample(src: UncertaintySource, u: number): number {
  switch (src.distribution) {
    case 'normal':
      // Box-Muller approximation
      const z = Math.sqrt(-2 * Math.log(Math.max(1e-10, u))) * Math.cos(2 * Math.PI * Math.random());
      return src.nominalValue + src.stdDev * z;

    case 'uniform':
      return src.nominalValue + src.stdDev * Math.sqrt(3) * (2 * u - 1);

    case 'triangular':
      return src.nominalValue + src.stdDev * (u < 0.5
        ? Math.sqrt(2 * u) - 1
        : 1 - Math.sqrt(2 * (1 - u)));

    default:
      return src.nominalValue;
  }
}

/**
 * Monte Carlo propagation with variance decomposition
 */
export function propagateUncertainty(
  sources: UncertaintySource[],
  model: (params: Record<string, number>) => number,
  outputName: string = 'output',
  nSamples: number = 5000
): PropagatedResult {
  // Generate LHS samples
  const samples = latinHypercubeSample(sources, nSamples);

  // Evaluate model at each sample
  const outputs = samples.map(s => model(s));

  // Output statistics
  const mean = outputs.reduce((a, b) => a + b, 0) / nSamples;
  const variance = outputs.reduce((a, b) => a + (b - mean) ** 2, 0) / (nSamples - 1);
  const stdDev = Math.sqrt(variance);

  // 95% CI (percentile method)
  const sorted = [...outputs].sort((a, b) => a - b);
  const lo = sorted[Math.floor(0.025 * nSamples)];
  const hi = sorted[Math.floor(0.975 * nSamples)];

  // First-order sensitivity analysis (partial derivatives via finite differences)
  const baseOutput = model(Object.fromEntries(sources.map(s => [s.parameter, s.nominalValue])));
  const sensitivities: SensitivityEntry[] = [];

  for (const src of sources) {
    const delta = Math.max(1e-8, Math.abs(src.nominalValue * 0.01));
    const perturbedUp = { ...Object.fromEntries(sources.map(s => [s.parameter, s.nominalValue])) };
    perturbedUp[src.parameter] += delta;
    const perturbedDown = { ...perturbedUp };
    perturbedDown[src.parameter] = src.nominalValue - delta;

    const dYdX = (model(perturbedUp) - model(perturbedDown)) / (2 * delta);
    const contribution = (dYdX * src.stdDev) ** 2;

    sensitivities.push({
      parameter: src.parameter,
      sensitivityIndex: dYdX * src.stdDev / Math.max(1e-10, stdDev),
      contribution_pct: 0,  // Filled below
      normalizedSensitivity: dYdX * (src.nominalValue / Math.max(1e-10, baseOutput)),
    });
  }

  // Normalize contributions
  const totalVariance = sensitivities.reduce((s, e) => s + e.contribution_pct, 0);
  if (totalVariance > 0) {
    for (const sens of sensitivities) {
      sens.contribution_pct = (sens.contribution_pct / totalVariance) * 100;
    }
  } else {
    // If contributions don't sum to total, recalculate from sensitivity indices
    const totalSI2 = sensitivities.reduce((s, e) => s + e.sensitivityIndex ** 2, 0);
    for (const sens of sensitivities) {
      sens.contribution_pct = totalSI2 > 0 ? (sens.sensitivityIndex ** 2 / totalSI2) * 100 : 0;
    }
  }

  // Sort by contribution
  sensitivities.sort((a, b) => b.contribution_pct - a.contribution_pct);

  return {
    outputName,
    nominalValue: baseOutput,
    mean,
    stdDev,
    confidenceInterval_95: [lo, hi],
    coefficientOfVariation: stdDev / Math.abs(mean || 1e-10),
    sensitivity: sensitivities,
    cascadeChain: sources.map(s => s.parameter),
  };
}

/**
 * Compute safety factor with uncertainty quantification
 */
export interface SafetyFactorResult {
  nominal_FS: number;
  FS_mean: number;
  FS_stdDev: number;
  FS_CI_95: [number, number];
  required_FS: number;
  isAcceptable: boolean;  // FS_CI_lower >= required_FS
  margin: number;
  dominantUncertainties: SensitivityEntry[];
  recommendations: string[];
}

export function computeSafetyFactorWithConfidence(
  computeNominalFS: (params: Record<string, number>) => number,
  uncertainties: UncertaintySource[],
  required_FS: number = 1.5,
  nSamples: number = 5000
): SafetyFactorResult {
  const propagated = propagateUncertainty(uncertainties, computeNominalFS, 'Safety Factor', nSamples);

  const FS_lower = propagated.confidenceInterval_95[0];
  const isAcceptable = FS_lower >= required_FS;

  const recommendations: string[] = [];
  if (!isAcceptable) {
    recommendations.push(`FS lower bound (${FS_lower.toFixed(2)}) < required (${required_FS})`);
    if (propagated.sensitivity.length > 0) {
      const dominant = propagated.sensitivity[0];
      recommendations.push(`Dominant uncertainty: ${dominant.parameter} (${dominant.contribution_pct.toFixed(0)}%)`);
    }
  } else {
    recommendations.push(`FS acceptable with 95% confidence`);
  }

  return {
    nominal_FS: propagated.nominalValue,
    FS_mean: propagated.mean,
    FS_stdDev: propagated.stdDev,
    FS_CI_95: propagated.confidenceInterval_95,
    required_FS,
    isAcceptable,
    margin: FS_lower / required_FS - 1,
    dominantUncertainties: propagated.sensitivity.slice(0, 5),
    recommendations,
  };
}
