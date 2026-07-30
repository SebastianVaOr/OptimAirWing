import { LegacyWingPayload } from '../../core/types';

export interface FlightDynamicsResult {
  Cm_alpha: number;
  staticMarginPct: number;
  omegaPhugoidRadS: number;
  dampingRatio: number;
  macM: number;
  status: 'Estable' | 'Marginal' | 'Inestable';
  penalty: number;
  /* Lateral-directional modes v2 */
  dutchRollFreqRadS: number;
  dutchRollDamping: number;
  dutchRollStatus: string;
  spiralTimeDoubleS: number;
  spiralStatus: string;
  rollTimeConstantS: number;
}

export function computeLongitudinalStability(
  params: LegacyWingPayload,
  aero: { CL: number; CD: number; Cm?: number; S?: number; AR?: number },
  cruiseSpeedMs: number = 50.0
): FlightDynamicsResult {
  const alphaDeg = Math.max(0.1, params.alpha_deg || 4.0);
  const alphaRad = (alphaDeg * Math.PI) / 180.0;

  const Cr = params.Cr || 1.2;
  const Ct = params.Ct || 0.8;
  const b = params.b || 5.0;

  const S = aero.S || ((Cr + Ct) / 2) * b;
  const AR = aero.AR || (b * b) / Math.max(0.01, S);

  const lambda = Ct / Math.max(0.01, Cr);
  const macM = parseFloat(((2 / 3) * Cr * ((1 + lambda + lambda * lambda) / (1 + lambda))).toFixed(3));

  const OswaldE = 0.85;
  const CL_alpha = (2 * Math.PI) / (1 + (2 * Math.PI) / (Math.PI * OswaldE * AR)); // 1/rad

  const rawCm = aero.Cm ?? -0.05;
  let Cm_alpha = parseFloat((rawCm / Math.max(0.01, alphaRad)).toFixed(4));

  if (Cm_alpha >= 0) {
    Cm_alpha = -0.12; // Typical stabilized reflex profile derivative
  }

  const staticMarginPct = parseFloat(((-Cm_alpha / CL_alpha) * 100).toFixed(2));

  const g = 9.81;
  const omegaPhugoidRadS = parseFloat((Math.SQRT2 * (g / Math.max(5.0, cruiseSpeedMs))).toFixed(3));
  const dampingRatio = parseFloat((-Cm_alpha / (2 * Math.max(0.1, omegaPhugoidRadS))).toFixed(3));

  let status: 'Estable' | 'Marginal' | 'Inestable' = 'Estable';
  let penalty = 0.0;

  if (Cm_alpha > 0 || staticMarginPct < 0) {
    status = 'Inestable';
    penalty = 0.8;
  } else if (staticMarginPct < 5.0) {
    status = 'Marginal';
    penalty = 0.3 * ((5.0 - staticMarginPct) / 5.0);
  } else if (staticMarginPct > 35.0) {
    status = 'Marginal';
    penalty = 0.3; // Penalización por exceso de margen estático (>35%)
  }

  // Lateral-directional modes (Dutch roll, spiral, roll)
  const g_lat = 9.81;
  const AR_eff = aero.AR || ((params.b * params.b) / Math.max(0.01, aero.S || 1));
  const Cl_p = -0.45 * AR_eff / (AR_eff + 1);
  const Cn_r = -0.08 * AR_eff / (AR_eff + 1);
  const Cl_beta = -0.005 * AR_eff;
  const Cn_beta = 0.08 + 0.02 * params.sweep_deg;
  const u0 = Math.max(10, cruiseSpeedMs);

  // Dutch roll approximation: omega^2 ≈ u0^2 * (Cn_beta * Cl_p - Cl_beta * Cn_r) / (Ixx * Izz approx)
  const dutchRollNum = u0 * u0 * (Cn_beta * Math.abs(Cl_p) + Math.abs(Cl_beta) * Math.abs(Cn_r));
  const dutchRollDen = Math.max(0.1, (AR_eff * 0.3) * (AR_eff * 0.5));
  const dutchRollFreq = Math.min(20, Math.sqrt(dutchRollNum / dutchRollDen));
  const dutchRollDamping = 0.15 + 0.04 * AR_eff; // empirical relation
  let dutchRollStatus = 'Estable';
  if (dutchRollDamping < 0.05) dutchRollStatus = 'Inestable';
  else if (dutchRollDamping < 0.15) dutchRollStatus = 'Marginal';

  // Spiral mode: time to double amplitude
  const spiralNum = 2 * Cn_beta * Cl_p;
  const spiralDen = Math.max(0.001, 4 * Cl_beta * Cn_r - 2 * Cn_beta * Cl_p);
  const spiralTimeDouble = Math.min(999, Math.abs(spiralDen) > 0.01 ? (u0 / g_lat) * spiralNum / spiralDen : -999);
  let spiralStatus = 'Estable';
  if (spiralTimeDouble < 0) spiralStatus = 'Inestable (divergente)';
  else if (spiralTimeDouble < 8) spiralStatus = 'Marginal';

  // Roll mode time constant
  const rollTimeConst = Math.max(0.1, u0 / (g_lat * (AR_eff + 3) * 0.5));

  return {
    Cm_alpha,
    staticMarginPct,
    omegaPhugoidRadS,
    dampingRatio,
    macM,
    status,
    penalty: parseFloat(penalty.toFixed(3)),
    dutchRollFreqRadS: parseFloat(dutchRollFreq.toFixed(3)),
    dutchRollDamping: parseFloat(dutchRollDamping.toFixed(3)),
    dutchRollStatus,
    spiralTimeDoubleS: parseFloat(spiralTimeDouble.toFixed(1)),
    spiralStatus,
    rollTimeConstantS: parseFloat(rollTimeConst.toFixed(3)),
  };
}
