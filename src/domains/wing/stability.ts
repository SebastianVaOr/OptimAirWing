/**
 * Módulo de Verificación de Estabilidad Aeroelástica, Control de Pérdida
 * y Análisis Estructural Cuantitativo para OptimAirWing v6.0
 */

import { DesignRequirements, LegacyWingPayload, StructuralMaterial } from '../../core/types';
import { MATERIALS_DB, MaterialProperties } from './materials';
import { generarNACA } from './naca';
import { computeSparBox, computeSparTorsionConstant, nacaThicknessRatio } from './sparGeometry';

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
  flutterSpeedMs: number;
  flutterMargin: number;
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
 * Densidad del aire ISA (troposfera, hasta 11 km)
 */
function isaAirDensity(altitudeM: number): number {
  const alt = Math.max(0, Math.min(altitudeM || 0, 11000));
  return 1.225 * Math.pow(1 - 0.0065 * alt / 288.15, 4.256);
}

function sectorCruiseAltitudeM(sector: string | undefined): number {
  switch (sector) {
    case 'comercial': return 10668;
    case 'glider': return 3000;
    case 'sport': return 3000;
    case 'evtol': return 300;
    case 'uav': return 150;
    case 'experimental': return 2000;
    default: return 0; // f1, gt_spoiler, hydrofoil: nivel del mar
  }
}

function clMaxFromProfile(nacaCode: string | undefined, isMultiElement: boolean | undefined, numElements: number | undefined): number {
  const naca = generarNACA(nacaCode || '2412', 20);
  const clMax2d = 1.25 + 0.2 * (naca.m / 0.02) + 0.1 * (naca.t - 0.12);
  return (isMultiElement || (numElements || 1) > 1) ? 3.8 : clMax2d;
}

/**
 * Realiza el cálculo estructural cuantitativo detallado (Momento, Tensión, Deflexión, Divergencia, Flutter)
 * totalWeightKg: peso total del avión (ala + no estructural). wingMassKg: masa estructural del ala.
 */
export function computeQuantitativeStructuralAnalysis(
  params: LegacyWingPayload,
  aero: { S: number; AR: number; CL: number },
  reqs?: Partial<DesignRequirements>,
  totalWeightKg: number = 10,
  wingMassKg?: number
): QuantitativeStructuralResult {
  const matKey = (reqs?.material || 'al2024') as StructuralMaterial;
  const mat: MaterialProperties = MATERIALS_DB[matKey] || MATERIALS_DB.al2024;

  // Factor de carga de maniobra (n-g) independiente del margen de seguridad
  const loadFactor = reqs?.maneuver_load_factor_g ?? 2.5;
  const cruiseVelocityMs = reqs?.cruise_velocity_ms || 50; // default 50 m/s
  const rho = isaAirDensity(reqs?.cruise_altitude_m ?? sectorCruiseAltitudeM(reqs?.sector));

  // 1. Sustentación y Momento Flector en Raíz (L = W·n, vuelo recortado)
  const g = 9.81;
  const realWeightN = totalWeightKg * g;
  const totalLiftN = realWeightN * loadFactor;
  // Momento en la raíz por ala semi-envergadura b/2: M_root = (Lift/2) * (b/4)
  const rootBendingMomentNm = (totalLiftN / 2) * (params.b / 4);

  // 2. Caja de larguero hueca realista (profundidad 55% del espesor relativo real del NACA)
  const rootChord = Math.max(0.05, params.Cr);
  const box = computeSparBox(rootChord, nacaThicknessRatio(params.nacaCode));

  // Tensión máxima de flexión σ = M·(h/2)/I (Pa -> MPa)
  const maxStressMpa = parseFloat(
    (((rootBendingMomentNm * (box.h_m / 2)) / Math.max(1e-9, box.I_m4)) / 1e6).toFixed(2)
  );

  // FS flexión = σ_yield / σ_max (sin clamp: el semáforo debe discriminar; cap solo de visualización a 50)
  const fsRaw = mat.yield_strength / Math.max(0.1, maxStressMpa);
  const flexuralSafetyFactor = parseFloat(Math.min(50, Math.max(0.1, fsRaw)).toFixed(2));

  // 3. Deflexión de Punta: viga en ménsula con carga repartida δ = (L/2)·s³/(8·E·I)
  const E_pa = mat.elastic_modulus * 1e9;
  const semiSpan = params.b / 2;
  const tipDeflectionM =
    ((totalLiftN / 2) * Math.pow(semiSpan, 3)) / Math.max(1e3, 8 * E_pa * box.I_m4);
  const tipDeflectionMm = parseFloat((tipDeflectionM * 1000).toFixed(1));
  const tipDeflectionPercent = parseFloat(((tipDeflectionM / params.b) * 100).toFixed(2));

  // 4. Velocidad de Divergencia Aeroelástica (V_d) con la rigidez torsional real de la caja
  const J = computeSparTorsionConstant(box, rootChord);
  const G_pa = mat.shear_modulus * 1e9;
  const GJ = G_pa * J;
  const dCL_dalpha = (2 * Math.PI) / (1 + 2 / Math.max(1, aero.AR));
  const meanChord = (params.Cr + params.Ct) / 2;
  const e_c = Math.max(0.01, 0.15 * meanChord); // Centro aerodinámico vs centro cortante

  const sweepRad = (params.sweep_deg * Math.PI) / 180;
  let divergenceSpeedMs = 0;

  if (params.sweep_deg < 0) {
    const sweepTerm = Math.max(0.1, Math.abs(Math.sin(sweepRad)));
    divergenceSpeedMs = Math.sqrt((2 * GJ) / (rho * aero.S * e_c * dCL_dalpha * sweepTerm));
  } else {
    divergenceSpeedMs = Math.sqrt((2 * GJ) / (rho * aero.S * e_c * dCL_dalpha));
  }

  // Cap solo de visualización por seguridad (1500 m/s); sin clamp del resultado normal
  divergenceSpeedMs = parseFloat(Math.min(1500, Math.max(10, divergenceSpeedMs)).toFixed(1));
  const divergenceMargin = parseFloat((divergenceSpeedMs / Math.max(1, cruiseVelocityMs)).toFixed(2));

  // 5. Flutter Screening v2 (2-GDL bending-torsion, quasi-steady)
  // Parámetros para sección típica binaria
  const wingMassEffKg = wingMassKg ?? Math.max(0.5, totalWeightKg * 0.1);
  const mu = Math.max(0.5, wingMassEffKg / Math.max(0.5, params.b));
  const omega_flex = (3.52 / (2 * Math.PI)) * Math.sqrt((E_pa * box.I_m4) / (mu * Math.pow(semiSpan, 4))) * (2 * Math.PI);
  const I_p_mass_per_len = mu * (Math.pow(meanChord, 2) / 8);
  const omega_torsion = Math.sqrt(GJ / (I_p_mass_per_len * Math.pow(semiSpan, 2)));
  
  const b_h = meanChord / 2; // semi-cuerda
  const r_alpha_sq = 0.5; // radio de giro al cuadrado normalizado (típico ~0.5)
  const e_ac = 0.15 * meanChord; // offset AC-EA
  const mu_mass_ratio = mu / (Math.PI * rho * b_h * b_h); // mass ratio dimensional
  
  // V-g screening: flutter cuando modos se acoplan
  // Aproximación: V_flutter desde coalescencia de frecuencias con acoplamiento aerodinámico
  const freq_ratio = omega_flex / omega_torsion;
  const V_flutter_estimate = omega_torsion * b_h * Math.sqrt(
    Math.max(0.1, mu_mass_ratio * r_alpha_sq * Math.abs(1 - freq_ratio * freq_ratio))
  );
  
  const flutterMargin = V_flutter_estimate / Math.max(1, cruiseVelocityMs);
  let flutterRisk: 'bajo' | 'medio' | 'alto' = 'bajo';
  if (flutterMargin < 1.5 || (params.sweep_deg < -5 && flexuralSafetyFactor < 1.5)) {
    flutterRisk = 'alto';
  } else if (flutterMargin < 2.0 || params.sweep_deg < 0) {
    flutterRisk = 'medio';
  }
  
  const f_flex = omega_flex / (2 * Math.PI);
  const f_torsion = omega_torsion / (2 * Math.PI);

  // 6. Inversión de Alerones (Aileron Reversal)
  const reversalSpeedMs = 0.85 * divergenceSpeedMs * Math.sqrt(mat.shear_modulus / (mat.elastic_modulus * 0.3));
  let aileronReversalRisk: 'bajo' | 'medio' | 'alto' = 'bajo';
  if (reversalSpeedMs < cruiseVelocityMs * 1.3) {
    aileronReversalRisk = 'alto';
  } else if (reversalSpeedMs < cruiseVelocityMs * 1.8) {
    aileronReversalRisk = 'medio';
  }

  // 7. Carga Alar y Velocidad de Pérdida con el PESO TOTAL del avión
  const wingLoadingKgM2 = parseFloat((totalWeightKg / Math.max(0.1, aero.S)).toFixed(2));
  const CL_max = clMaxFromProfile(params.nacaCode, params.isMultiElement, params.numElements);
  const stallSpeedMs = parseFloat(
    Math.sqrt((2 * totalWeightKg * 9.81) / (rho * aero.S * CL_max)).toFixed(1)
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
    flutterSpeedMs: parseFloat(V_flutter_estimate.toFixed(1)),
    flutterMargin: parseFloat(flutterMargin.toFixed(2)),
    aileronReversalRisk,
    wingLoadingKgM2,
    stallSpeedMs,
    cruiseVelocityMs
  };
}
