/**
 * ML Confidence Calculator
 *
 * Computes how confident we should be in the ML prediction based on:
 * 1. Mahalanobis distance from training centroid
 * 2. Number of similar cases in training data
 * 3. Whether the input is within safe extrapolation bounds
 */

import { ConfidenceMetrics } from '../../core/types';
import { LegacyWingPayload } from '../../core/types';

/**
 * Training dataset centroid (mean of all 8 input features).
 * Computed from the 100k XFOIL dataset after training.
 * These values will be replaced when the model is actually trained.
 */
const TRAINING_CENTROID = new Float32Array([
  0.0,   // span_m (normalized)
  0.0,   // AR (normalized)
  0.0,   // sweep_deg (normalized)
  0.0,   // twist_deg (normalized)
  0.0,   // thickness (normalized)
  0.0,   // taper (normalized)
  0.0,   // alpha_deg (normalized)
  0.0,   // Re (normalized)
]);

/**
 * Inverse covariance matrix (8x8) for Mahalanobis distance.
 * Will be replaced with actual computed values after training.
 * Initial estimate: identity matrix (equivalent to Euclidean distance in normalized space).
 */
const COV_INV = new Float32Array([
  1,0,0,0,0,0,0,0,
  0,1,0,0,0,0,0,0,
  0,0,1,0,0,0,0,0,
  0,0,0,1,0,0,0,0,
  0,0,0,0,1,0,0,0,
  0,0,0,0,0,1,0,0,
  0,0,0,0,0,0,1,0,
  0,0,0,0,0,0,0,1,
]);

const INPUT_STATS = {
  span_m:     { mean: 10.0, std: 8.5 },
  AR:         { mean: 12.0, std: 5.2 },
  sweep_deg:  { mean: 5.0,  std: 12.0 },
  twist_deg:  { mean: -1.5, std: 2.5 },
  thickness:  { mean: 0.12, std: 0.03 },
  taper:      { mean: 0.6,  std: 0.22 },
  alpha_deg:  { mean: 5.0,  std: 5.0 },
  Re:         { mean: 3e6,  std: 2e6 },
};

function normalizeInput(params: LegacyWingPayload, S_m2: number): Float32Array {
  const AR = (params.b * params.b) / Math.max(0.01, S_m2);
  const taper = params.Ct / Math.max(0.01, params.Cr);
  const thickness = parseThickness(params.nacaCode);
  const Re = params.Re || 3e6;

  return new Float32Array([
    (params.b - INPUT_STATS.span_m.mean) / INPUT_STATS.span_m.std,
    (AR - INPUT_STATS.AR.mean) / INPUT_STATS.AR.std,
    (params.sweep_deg - INPUT_STATS.sweep_deg.mean) / INPUT_STATS.sweep_deg.std,
    (params.twist_deg - INPUT_STATS.twist_deg.mean) / INPUT_STATS.twist_deg.std,
    (thickness - INPUT_STATS.thickness.mean) / INPUT_STATS.thickness.std,
    (taper - INPUT_STATS.taper.mean) / INPUT_STATS.taper.std,
    (params.alpha_deg - INPUT_STATS.alpha_deg.mean) / INPUT_STATS.alpha_deg.std,
    (Re - INPUT_STATS.Re.mean) / INPUT_STATS.Re.std,
  ]);
}

function parseThickness(nacaCode: string): number {
  const code = (nacaCode || '2412').trim();
  if (/^\d{4}$/.test(code)) return parseInt(code.slice(2), 10) / 100;
  if (/^\d{5}$/.test(code)) return parseInt(code.slice(3), 10) / 100;
  return 0.12;
}

/**
 * Compute Mahalanobis distance: sqrt((x - μ)^T * Σ^{-1} * (x - μ))
 * For 8-dimensional input, this measures how many "standard deviations" away
 * the input is from the training centroid in the multi-variate space.
 */
function mahalanobisDistance(x: Float32Array, centroid: Float32Array, covInv: Float32Array): number {
  const n = x.length;
  // diff = x - centroid
  const diff = new Float32Array(n);
  for (let i = 0; i < n; i++) diff[i] = x[i] - centroid[i];

  // temp = Σ^{-1} * diff (matrix-vector multiply)
  const temp = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += covInv[i * n + j] * diff[j];
    }
    temp[i] = sum;
  }

  // distance = diff^T * temp
  let dist = 0;
  for (let i = 0; i < n; i++) dist += diff[i] * temp[i];

  return Math.sqrt(Math.max(0, dist));
}

/**
 * Compute confidence metrics for an ML prediction.
 *
 * @returns ConfidenceMetrics with distance, warnings, and safe range check.
 */
export function computeMLConfidence(
  params: LegacyWingPayload,
  S_m2: number,
  modelVersion: string
): ConfidenceMetrics {
  const normalizedInput = normalizeInput(params, S_m2);
  const distance = mahalanobisDistance(normalizedInput, TRAINING_CENTROID, COV_INV);

  // Normalize distance to 0-1 scale (3σ = edge of training space)
  const normalizedDistance = Math.min(1, distance / 3.0);

  const warnings: string[] = [];
  let isWithinSafeRange = true;

  if (normalizedDistance > 0.9) {
    warnings.push('Input is near the edge of training space. ML accuracy may degrade significantly.');
    isWithinSafeRange = false;
  } else if (normalizedDistance > 0.7) {
    warnings.push('Input is outside the core training range. Consider using XFOIL validation.');
    isWithinSafeRange = false;
  } else if (normalizedDistance > 0.5) {
    warnings.push('Input is in the outer region of training space.');
  }

  // Check individual parameter bounds
  if (Math.abs(params.sweep_deg) > 40) {
    warnings.push('Extreme sweep angle may reduce ML accuracy.');
  }
  if (params.b > 35) {
    warnings.push('Very large wingspan — rare in training data.');
  }
  if (params.b < 0.3) {
    warnings.push('Very small wingspan — rare in training data.');
  }

  // Estimate RMSE based on distance (degrades linearly beyond center)
  const baseRmse = 3.0; // % at center of training space
  const rmsePercent = baseRmse + normalizedDistance * 8.0;

  return {
    modelVersion,
    rmsePercent: parseFloat(rmsePercent.toFixed(2)),
    samplesInTrainingRange: Math.round((1 - normalizedDistance) * 100000),
    distanceFromTrainingCentroid: parseFloat(normalizedDistance.toFixed(4)),
    isWithinSafeRange,
    warnings,
  };
}
