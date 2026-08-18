import { LegacyWingPayload } from '../../core/types';
import { computeSparBox, nacaThicknessRatio } from './sparGeometry';

export interface BucklingAnalysisResult {
  P_crit_N: number;
  P_applied_N: number;
  fs_buckling: number;
  status: 'Seguro' | 'Riesgo' | 'Peligro';
  penalty: number;
}

/**
 * Computes Euler Buckling Load for a cantilever wing main spar.
 * P_crit = (pi^2 * E * I) / (K * L)^2
 * K es el factor de longitud efectiva de Euler (no 1/K^2).
 */
export function computeEulerBuckling(
  E_Pa: number,
  I_m4: number,
  semiSpanM: number,
  boundaryCondition: 'fixed-free' | 'pinned-pinned' | 'fixed-pinned' | 'fixed-fixed' = 'fixed-free'
): number {
  const K_factors = {
    'fixed-free': 2,
    'pinned-pinned': 1,
    'fixed-pinned': 0.7,
    'fixed-fixed': 0.5,
  };
  const K = K_factors[boundaryCondition] || 2;
  const Leff = Math.max(0.01, K * semiSpanM);
  const P_crit = (Math.PI * Math.PI * E_Pa * I_m4) / (Leff * Leff);
  return parseFloat(P_crit.toFixed(2));
}

export function analyzeBucklingStability(
  params: LegacyWingPayload,
  E_Gpa: number,
  weightRealKg: number,
  loadFactor: number = 2.5
): BucklingAnalysisResult {
  const E_Pa = E_Gpa * 1e9;
  // Caja de larguero hueca realista compartida (misma inercia que stability/montecarlo)
  const rootChord = Math.max(0.1, params.Cr);
  const box = computeSparBox(rootChord, nacaThicknessRatio(params.nacaCode));
  const I_m4 = box.I_m4;

  const semiSpan = Math.max(0.1, params.b / 2);
  const P_crit_N = computeEulerBuckling(E_Pa, I_m4, semiSpan, 'fixed-free');

  const g = 9.81;
  // Carga axial de columna conservadora: peso total * factor de carga (check de columna de Euler)
  const P_applied_N = Math.max(1.0, weightRealKg * g * loadFactor);

  const fs_buckling = parseFloat((P_crit_N / P_applied_N).toFixed(2));

  let status: 'Seguro' | 'Riesgo' | 'Peligro' = 'Seguro';
  let penalty = 0.0;

  if (fs_buckling < 1.0) {
    status = 'Peligro';
    penalty = 0.6;
  } else if (fs_buckling < 1.5) {
    status = 'Riesgo';
    penalty = 0.2 * (1.5 - fs_buckling);
  }

  return {
    P_crit_N,
    P_applied_N: parseFloat(P_applied_N.toFixed(2)),
    fs_buckling,
    status,
    penalty: parseFloat(penalty.toFixed(3)),
  };
}
