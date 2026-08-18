import { LegacyWingPayload } from '../../core/types';

export interface FlightDynamicsResult {
  Cm_alpha: number;
  staticMarginPct: number;
  omegaPhugoidRadS: number;
  dampingRatio: number;
  macM: number;
  x_np_over_c: number;
  x_cg_over_c: number;
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
  aero: { CL: number; CD: number; Cm?: number; S?: number; AR?: number; e?: number },
  cruiseSpeedMs: number = 50.0
): FlightDynamicsResult {
  const Cr = params.Cr || 1.2;
  const Ct = params.Ct || 0.8;
  const b = params.b || 5.0;

  const S = aero.S || ((Cr + Ct) / 2) * b;
  const AR = aero.AR || (b * b) / Math.max(0.01, S);

  const lambda = Ct / Math.max(0.01, Cr);
  const macM = parseFloat(((2 / 3) * Cr * ((1 + lambda + lambda * lambda) / (1 + lambda))).toFixed(3));

  // e de Oswald empírico si lo recibe el módulo; 0.85 como default documentado
  const OswaldE = aero.e ?? 0.85;
  const CL_alpha = (2 * Math.PI) / (1 + (2 * Math.PI) / (Math.PI * OswaldE * AR)); // 1/rad

  // Margen estático desde geometría (modelo de ala sola / ala volante, sin cola):
  // el punto neutro del ala coincide con su centro aerodinámico (~25% MAC) y se asume
  // un CG adelantado en 20% MAC, lo que da un margen estático positivo del 5%.
  const xAcOverC = 0.25; // centro aerodinámico del ala (punto neutro de la ala sola)
  const xCgOverC = 0.20; // supuesto de CG: 20% MAC (adelante del AC para ala volante)
  const staticMarginPct = parseFloat(((xAcOverC - xCgOverC) * 100).toFixed(2));

  // Cm_alpha respecto al CG desde geometría: Cm_α = a·(x_cg − x_ac) [1/rad].
  // Es la rigidez de cabeceo real (negativa = estable), coherente con el margen estático.
  const Cm_alpha = parseFloat((CL_alpha * (xCgOverC - xAcOverC)).toFixed(4));

  const g = 9.81;
  const omegaPhugoidRadS = parseFloat((Math.SQRT2 * (g / Math.max(5.0, cruiseSpeedMs))).toFixed(3));
  // Aproximación de Lanchester para el modo fúgido: zeta ≈ (CD/CL)/sqrt(2)
  const dampingRatio = parseFloat(((aero.CD / Math.max(0.001, aero.CL)) / Math.SQRT2).toFixed(3));

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
  // Cn_beta saturado para que no crezca sin límite con la flecha
  const Cn_beta = Math.min(0.25, 0.08 + 0.02 * (params.sweep_deg || 0));
  const Cl_r = aero.CL / 4; // momento de rolido por guiñada (estimación)
  const u0 = Math.max(10, cruiseSpeedMs);

  // Dutch roll approximation: omega^2 ≈ u0^2 * (Cn_beta * Cl_p - Cl_beta * Cn_r) / (Ixx * Izz approx)
  const dutchRollNum = u0 * u0 * (Cn_beta * Math.abs(Cl_p) + Math.abs(Cl_beta) * Math.abs(Cn_r));
  const dutchRollDen = Math.max(0.1, (AR_eff * 0.3) * (AR_eff * 0.5));
  const dutchRollFreq = Math.min(20, Math.sqrt(dutchRollNum / dutchRollDen));
  const dutchRollDamping = 0.15 + 0.04 * AR_eff; // empirical relation
  let dutchRollStatus = 'Estable';
  if (dutchRollDamping < 0.05) dutchRollStatus = 'Inestable';
  else if (dutchRollDamping < 0.15) dutchRollStatus = 'Marginal';

  // Spiral mode: criterio real Cl_beta*Cn_r - Cn_beta*Cl_r > 0 (estable)
  const spiralCriterion = Cl_beta * Cn_r - Cn_beta * Cl_r;
  const spiralRoot = -2 * (g_lat / u0) * spiralCriterion;
  const spiralTimeDouble = Math.abs(spiralRoot) > 1e-5 ? Math.LN2 / Math.abs(spiralRoot) : 999;
  let spiralStatus = 'Estable';
  if (spiralCriterion < 0) spiralStatus = 'Inestable (divergente)';
  else if (spiralCriterion < 1e-6) spiralStatus = 'Marginal';

  // Roll mode time constant
  const rollTimeConst = Math.max(0.1, u0 / (g_lat * (AR_eff + 3) * 0.5));

  return {
    Cm_alpha,
    staticMarginPct,
    omegaPhugoidRadS,
    dampingRatio,
    macM,
    x_np_over_c: parseFloat(xAcOverC.toFixed(3)),
    x_cg_over_c: parseFloat(xCgOverC.toFixed(3)),
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