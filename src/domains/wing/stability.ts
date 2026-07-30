/**
 * Módulo de Verificación de Estabilidad Aeroelástica, Control de Pérdida
 * y Análisis Estructural Cuantitativo para OptimAirWing v6.0
 */

import { DesignRequirements, LegacyWingPayload, StructuralMaterial } from '../../core/types';
import { MATERIALS_DB, MaterialProperties } from './materials';

export interface StabilityCheckResult {
  status: 'safe' | 'warning' | 'danger';
  message: string;
  recommendation: string;
  weight_penalty_factor: number;
}

export interface StallCheckResult {
  status: 'safe' | 'warning';
  message: string;
  recommendation: string;
}

export interface QuantitativeStructuralResult {
  bendingMomentNm: number;
  maxStressMpa: number;
  flexuralSafetyFactor: number;
  tipDeflectionMm: number;
  tipDeflectionPercent: number;
  divergenceSpeedMs: number;
  divergenceMargin: number;
  flutterRisk: 'bajo' | 'medio' | 'alto';
  aileronReversalRisk: 'bajo' | 'medio' | 'alto';
  wingLoadingKgM2: number;
  stallSpeedMs: number;
  cruiseVelocityMs: number;
}

export function checkSweepStability(
  sweep_deg: number,
  twist_deg: number,
  material?: string,
  b?: number,
  Cr?: number,
  Ct?: number
): StabilityCheckResult {
  // LISTA NEGRA PROHIBIDA 1: Flecha Negativa + Twist Positivo (Wash-in) -> Pérdida asimétrica catastrófica y divergencia
  if (sweep_deg < -2 && twist_deg > 0) {
    return {
      status: 'danger',
      message:
        '🔴 CONFIGURACIÓN PROHIBIDA (LISTA NEGRA): Flecha negativa (' + sweep_deg + '°) con Twist positivo (+' + twist_deg + '°). Produce pérdida asimétrica catastrófica en puntas y divergencia aeroelástica destructiva. SCORE DESCALIFICADO (0/100).',
      recommendation:
        'ACCION REQUERIDA: Cambie el Twist a valores negativos (Wash-out entre -2° y -5°) o convierta la flecha a neutra/positiva.',
      weight_penalty_factor: 2.0
    };
  }

  // LISTA NEGRA PROHIBIDA 2: Geometría no física b < 1.5 * Cr (Cuerda mayor que o similar a la envergadura)
  if (b !== undefined && Cr !== undefined && b < 1.5 * Cr) {
    return {
      status: 'danger',
      message:
        '🔴 CONFIGURACIÓN PROHIBIDA (LISTA NEGRA): Envergadura b (' + b + 'm) es menor a 1.5x Cuerda Raíz Cr (' + Cr + 'm). Geometría físicamente absurda (efecto "tabla de planchar"). SCORE DESCALIFICADO (0/100).',
      recommendation:
        'Aumente la envergadura o reduzca la cuerda raíz para obtener un Aspect Ratio (AR) aerodinámicamente viable.',
      weight_penalty_factor: 2.0
    };
  }

  // LISTA NEGRA PROHIBIDA 3: Taper < 0.15 con flecha pronunciada
  if (Ct !== undefined && Cr !== undefined && (Ct / Math.max(0.01, Cr)) < 0.15 && Math.abs(sweep_deg) > 15) {
    return {
      status: 'danger',
      message:
        '🔴 CONFIGURACIÓN PROHIBIDA (LISTA NEGRA): Afinamiento extremo (Ct/Cr < 0.15) con Flecha alta (' + sweep_deg + '°). Produce colapso total por desprendimiento en puntas. SCORE DESCALIFICADO (0/100).',
      recommendation:
        'Aumente la cuerda de punta (Ct) a por lo menos 0.25x Cr o reduzca el ángulo de flecha.',
      weight_penalty_factor: 1.8
    };
  }

  if (sweep_deg < -5) {
    return {
      status: 'warning',
      message:
        'Flecha negativa detectada (' + sweep_deg + '°). Esta configuración requiere refuerzos estructurales adicionales para evitar divergencia aeroelástica.',
      recommendation:
        'Use carbono T700 en los largueros y asegure Wash-out (twist negativo).',
      weight_penalty_factor: 1.15
    };
  } else if (sweep_deg > 15 && twist_deg < -3) {
    return {
      status: 'warning',
      message:
        'Flecha positiva alta con wash-out extremo. Puede reducir la eficiencia aerodinámica.',
      recommendation: 'Reduzca wash-out a -2° o disminuya la flecha.',
      weight_penalty_factor: 1.0
    };
  } else {
    return {
      status: 'safe',
      message: 'Configuración estructuralmente estable.',
      recommendation: 'Ninguna.',
      weight_penalty_factor: 1.0
    };
  }
}

export function checkStallCharacteristics(
  taperRatio: number,
  sweep_deg: number,
  twist_deg: number
): StallCheckResult {
  if (taperRatio < 0.4 && sweep_deg < 0) {
    return {
      status: 'warning',
      message:
        'Afinamiento extremo en ala en flecha negativa. La punta puede perder sustentación bruscamente.',
      recommendation: 'Aumente el taper a >0.5 o reduzca la flecha negativa.'
    };
  }
  return {
    status: 'safe',
    message: 'Comportamiento en pérdida aceptable.',
    recommendation: 'Mantiene desprendimiento de capa límite controlado desde la raíz.'
  };
}

/**
 * Realiza el cálculo estructural cuantitativo detallado (Momento, Tensión, Deflexión, Divergencia, Flutter)
 */
export function computeQuantitativeStructuralAnalysis(
  params: LegacyWingPayload,
  aero: { S: number; AR: number; CL: number },
  reqs?: Partial<DesignRequirements>,
  estimatedWeightKg: number = 10
): QuantitativeStructuralResult {
  const matKey = (reqs?.material || 'al2024') as StructuralMaterial;
  const mat: MaterialProperties = MATERIALS_DB[matKey] || MATERIALS_DB.al2024;

  const loadFactor = reqs?.safety_factor ? Math.max(2.5, reqs.safety_factor * 2.5) : 3.8; // default 3.8g UAV
  const cruiseVelocityMs = reqs?.cruise_velocity_ms || 50; // default 50 m/s
  const rho = 1.225; // kg/m3

  // 1. Sustentación y Momento Flector en Raíz usando el PESO REAL ESTIMADO (estimatedWeightKg)
  const g = 9.81;
  const realWeightN = estimatedWeightKg * g;
  const q = 0.5 * rho * Math.pow(cruiseVelocityMs, 2);
  const aeroLiftN = q * aero.S * Math.max(0.1, aero.CL);
  
  // Fuerza total en maniobra basada en peso estructural real y factor de carga
  const totalLiftN = Math.max(realWeightN * loadFactor, aeroLiftN * loadFactor);
  // Momento en la raíz por ala semi-envergadura b/2: M_root = (Lift/2) * (b/4)
  const rootBendingMomentNm = (totalLiftN / 2) * (params.b / 4);

  // Inercia y Módulo de Sección (Geometría del larguero en la raíz)
  const rootChord = Math.max(0.05, params.Cr);
  const maxThickness = rootChord * 0.12; // Suponiendo perfil 12% espesor relativo
  // Moment of inertia I_x ~ 0.08 * Cr * (thickness)^3
  const Ix = Math.max(1e-8, 0.08 * rootChord * Math.pow(maxThickness, 3));
  // Módulo resistente W_z = I_x / (maxThickness / 2)
  const Wz = Ix / (maxThickness / 2);

  // Tensión máxima en flector σ = M / W_z (Pa -> MPa)
  const maxStressMpa = parseFloat(((rootBendingMomentNm / Wz) / 1e6).toFixed(2));

  // Factor de seguridad flexión: FS = σ_yield / σ_max
  const flexuralSafetyFactor = parseFloat(
    Math.min(10.0, Math.max(0.1, mat.yield_strength / Math.max(0.1, maxStressMpa))).toFixed(2)
  );

  // 2. Deflexión de Punta (Tip Deflection)
  // Cantilever beam under distributed aerodynamic load: delta = (L/2 * loadFactor * (b/2)^3) / (3 * E * Ix)
  const E_pa = mat.elastic_modulus * 1e9;
  const semiSpan = params.b / 2;
  const tipDeflectionM =
    ((totalLiftN / 2) * Math.pow(semiSpan, 3)) / Math.max(1e3, 3 * E_pa * Ix);
  const tipDeflectionMm = parseFloat((tipDeflectionM * 1000).toFixed(1));
  const tipDeflectionPercent = parseFloat(((tipDeflectionM / params.b) * 100).toFixed(2));

  // 3. Velocidad de Divergencia Aeroelástica (V_d)
  // Rigidez torsional GJ: G (Pa) * J (m4). J ~ 2 * Ix
  const J = 2 * Ix;
  const G_pa = mat.shear_modulus * 1e9;
  const GJ = G_pa * J;
  const dCL_dalpha = (2 * Math.PI) / (1 + 2 / Math.max(1, aero.AR));
  const meanChord = (params.Cr + params.Ct) / 2;
  const e_c = 0.15 * meanChord; // Centro aerodinámico vs centro cortante

  const sweepRad = (params.sweep_deg * Math.PI) / 180;
  let divergenceSpeedMs = 0;

  if (params.sweep_deg < 0) {
    // Para flecha negativa, V_d es críticamente reducida por acoplamiento
    const sweepTerm = Math.max(0.1, Math.abs(Math.sin(sweepRad)));
    divergenceSpeedMs = Math.sqrt((2 * GJ) / (rho * aero.S * e_c * dCL_dalpha * sweepTerm));
  } else {
    // Para flecha recta/positiva, V_d torsional pura
    divergenceSpeedMs = Math.sqrt((2 * GJ) / (rho * aero.S * e_c * dCL_dalpha));
  }

  divergenceSpeedMs = parseFloat(Math.min(999, Math.max(10, divergenceSpeedMs)).toFixed(1));
  const divergenceMargin = parseFloat((divergenceSpeedMs / Math.max(1, cruiseVelocityMs)).toFixed(2));

  // 4. Riesgo de Flutter (Frecuencias Acopladas Flexión vs Torsión)
  const mu = Math.max(0.5, estimatedWeightKg / Math.max(0.5, params.b)); // masa por metro
  const f_flex = (3.52 / (2 * Math.PI)) * Math.sqrt((E_pa * Ix) / (mu * Math.pow(semiSpan, 4)));
  const f_torsion = (1 / (2 * Math.PI)) * Math.sqrt(GJ / (1e-4 * Math.pow(semiSpan, 2)));

  const freqGap = Math.abs(f_flex - f_torsion) / Math.max(0.1, f_torsion);
  let flutterRisk: 'bajo' | 'medio' | 'alto' = 'bajo';
  if (freqGap < 0.20 || (params.sweep_deg < -5 && flexuralSafetyFactor < 1.5)) {
    flutterRisk = 'alto';
  } else if (freqGap < 0.35 || params.sweep_deg < 0) {
    flutterRisk = 'medio';
  }

  // 5. Inversión de Alerones (Aileron Reversal)
  const reversalSpeedMs = 0.85 * divergenceSpeedMs * Math.sqrt(mat.shear_modulus / (mat.elastic_modulus * 0.3));
  let aileronReversalRisk: 'bajo' | 'medio' | 'alto' = 'bajo';
  if (reversalSpeedMs < cruiseVelocityMs * 1.3) {
    aileronReversalRisk = 'alto';
  } else if (reversalSpeedMs < cruiseVelocityMs * 1.8) {
    aileronReversalRisk = 'medio';
  }

  // 6. Carga Alar y Velocidad de Pérdida
  const wingLoadingKgM2 = parseFloat((estimatedWeightKg / Math.max(0.1, aero.S)).toFixed(2));
  const CL_max = Math.min(1.8, Math.max(0.8, aero.CL * 1.5));
  const stallSpeedMs = parseFloat(
    Math.sqrt((2 * estimatedWeightKg * 9.81) / (rho * aero.S * CL_max)).toFixed(1)
  );

  return {
    bendingMomentNm: Math.round(rootBendingMomentNm),
    maxStressMpa,
    flexuralSafetyFactor,
    tipDeflectionMm,
    tipDeflectionPercent,
    divergenceSpeedMs,
    divergenceMargin,
    flutterRisk,
    aileronReversalRisk,
    wingLoadingKgM2,
    stallSpeedMs,
    cruiseVelocityMs
  };
}
