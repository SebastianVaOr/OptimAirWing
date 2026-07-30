import { LegacyWingPayload, TargetSector } from '../../core/types';

export interface SectorPreset {
  b: number;
  Cr: number;
  Ct: number;
  sweep: number;
  twist: number;
  naca: string;
  max_weight_kg: number;
  max_cost_eur: number;
  min_ld: number;
  safety_factor: number;
}

export const SECTOR_PRESETS: Record<TargetSector, SectorPreset> = {
  uav: { b: 5.0, Cr: 1.0, Ct: 0.4, sweep: 0, twist: 0, naca: "2412", max_weight_kg: 60, max_cost_eur: 20000, min_ld: 12, safety_factor: 2.5 },
  glider: { b: 15.0, Cr: 1.2, Ct: 0.6, sweep: 5, twist: -3, naca: "0606", max_weight_kg: 120, max_cost_eur: 45000, min_ld: 22, safety_factor: 2.0 },
  comercial: { b: 35.0, Cr: 4.0, Ct: 2.0, sweep: 25, twist: -2, naca: "2412", max_weight_kg: 350, max_cost_eur: 150000, min_ld: 18, safety_factor: 3.0 },
  evtol: { b: 10.0, Cr: 1.5, Ct: 0.8, sweep: 10, twist: -2, naca: "0606", max_weight_kg: 100, max_cost_eur: 75000, min_ld: 14, safety_factor: 2.5 },
  sport: { b: 8.0, Cr: 1.2, Ct: 0.6, sweep: 5, twist: -1, naca: "0606", max_weight_kg: 80, max_cost_eur: 30000, min_ld: 12, safety_factor: 2.5 },
  experimental: { b: 10.0, Cr: 1.5, Ct: 0.8, sweep: 0, twist: 0, naca: "2412", max_weight_kg: 90, max_cost_eur: 35000, min_ld: 10, safety_factor: 2.5 },
  // F1 Motorsport Presets
  f1_rear_wing: { b: 1.05, Cr: 0.42, Ct: 0.35, sweep: 0, twist: -2, naca: "2412", max_weight_kg: 12, max_cost_eur: 45000, min_ld: 4.5, safety_factor: 2.0 },
  f1_front_wing: { b: 1.80, Cr: 0.35, Ct: 0.25, sweep: 8, twist: -1, naca: "0606", max_weight_kg: 15, max_cost_eur: 35000, min_ld: 5.0, safety_factor: 2.0 },
  gt_spoiler: { b: 1.60, Cr: 0.38, Ct: 0.30, sweep: 0, twist: 0, naca: "2412", max_weight_kg: 8, max_cost_eur: 12000, min_ld: 6.0, safety_factor: 2.2 },
  // Hydrofoil / Nautical Presets
  hydrofoil_racing: { b: 2.20, Cr: 0.28, Ct: 0.16, sweep: 12, twist: -1, naca: "0606", max_weight_kg: 25, max_cost_eur: 65000, min_ld: 15.0, safety_factor: 2.8 },
  hydrofoil_efoil: { b: 0.85, Cr: 0.22, Ct: 0.14, sweep: 5, twist: 0, naca: "2412", max_weight_kg: 6, max_cost_eur: 8000, min_ld: 10.0, safety_factor: 2.5 },
  hydrofoil_ferry: { b: 6.00, Cr: 0.95, Ct: 0.60, sweep: 15, twist: -2, naca: "2412", max_weight_kg: 320, max_cost_eur: 250000, min_ld: 18.0, safety_factor: 3.2 }
};

export function getSectorPreset(sector?: TargetSector): SectorPreset {
  if (!sector || !SECTOR_PRESETS[sector]) {
    return SECTOR_PRESETS.uav;
  }
  return SECTOR_PRESETS[sector];
}

export interface SectorLimits {
  sector: TargetSector;
  sectorName: string;
  b: { min: number; max: number; typicalMax: number };
  Cr: { min: number; max: number; typicalMax: number };
  Ct: { min: number; max: number; typicalMax: number };
  AR: { min: number; max: number };
  S: { min: number; max: number };
  // FIX (1): Añadidos límites de flecha (sweep) y revirado (twist) por sector
  sweep: { min: number; max: number };
  twist: { min: number; max: number };
}

export interface SectorViabilityDiagnostic {
  status: 'verde' | 'ambar' | 'rojo';
  compatibilityScore: number; // 0 a 100
  isBlocked: boolean;
  issues: string[];
  recommendations: string[];
  penalty: number; // 0.0 a 0.95
}

export const SECTOR_LIMITS_DB: Record<TargetSector, SectorLimits> = {
  uav: {
    sector: 'uav',
    sectorName: 'Dron / UAV Carga',
    b: { min: 2.0, max: 8.0, typicalMax: 8.0 },
    Cr: { min: 0.4, max: 1.5, typicalMax: 1.2 },
    Ct: { min: 0.25, max: 1.0, typicalMax: 0.8 },
    AR: { min: 3.0, max: 18.0 },
    S: { min: 0.3, max: 6.0 },
    // FIX (1): Límites específicos de sweep y twist
    sweep: { min: 0, max: 12 },
    twist: { min: -4, max: 2 }
  },
  comercial: {
    sector: 'comercial',
    sectorName: 'Aviación Comercial',
    b: { min: 12.0, max: 80.0, typicalMax: 70.0 },
    Cr: { min: 1.8, max: 12.0, typicalMax: 10.0 },
    Ct: { min: 0.4, max: 4.0, typicalMax: 3.2 },
    AR: { min: 6.0, max: 14.0 },
    S: { min: 20.0, max: 500.0 },
    // FIX (1): Flecha de crucero comercial [15°, 32°] integrada para eliminar truncamiento no deseado
    sweep: { min: 15, max: 32 },
    twist: { min: -4, max: 2 }
  },
  glider: {
    sector: 'glider',
    sectorName: 'Velero de Gran Eficiencia',
    b: { min: 8.0, max: 32.0, typicalMax: 28.0 },
    Cr: { min: 0.3, max: 1.6, typicalMax: 1.3 },
    Ct: { min: 0.1, max: 0.7, typicalMax: 0.5 },
    AR: { min: 14.0, max: 35.0 },
    S: { min: 4.0, max: 28.0 },
    // FIX (1):
    sweep: { min: 0, max: 6 },
    twist: { min: -4, max: 2 }
  },
  sport: {
    sector: 'sport',
    sectorName: 'Aviación Deportiva / Ligera',
    b: { min: 5.0, max: 15.0, typicalMax: 13.0 },
    Cr: { min: 0.6, max: 2.5, typicalMax: 2.0 },
    Ct: { min: 0.3, max: 1.8, typicalMax: 1.4 },
    AR: { min: 4.5, max: 12.0 },
    S: { min: 6.0, max: 30.0 },
    // FIX (1):
    sweep: { min: 0, max: 6 },
    twist: { min: -4, max: 2 }
  },
  evtol: {
    sector: 'evtol',
    sectorName: 'Movilidad Urbana (eVTOL)',
    b: { min: 1.5, max: 12.0, typicalMax: 10.0 },
    Cr: { min: 0.25, max: 2.0, typicalMax: 1.6 },
    Ct: { min: 0.12, max: 1.2, typicalMax: 1.0 },
    AR: { min: 3.5, max: 14.0 },
    S: { min: 1.0, max: 18.0 },
    // FIX (1):
    sweep: { min: 0, max: 15 },
    twist: { min: -4, max: 2 }
  },
  experimental: {
    sector: 'experimental',
    sectorName: 'Categoría Experimental',
    b: { min: 0.5, max: 30.0, typicalMax: 25.0 },
    Cr: { min: 0.1, max: 4.0, typicalMax: 3.5 },
    Ct: { min: 0.05, max: 2.5, typicalMax: 2.0 },
    AR: { min: 2.5, max: 28.0 },
    S: { min: 0.1, max: 60.0 },
    // FIX (1):
    sweep: { min: -5, max: 25 },
    twist: { min: -4, max: 2 }
  },
  f1_rear_wing: {
    sector: 'f1_rear_wing',
    sectorName: 'F1 Alerón Trasero DRS',
    b: { min: 0.8, max: 1.25, typicalMax: 1.10 },
    Cr: { min: 0.20, max: 0.60, typicalMax: 0.45 },
    Ct: { min: 0.15, max: 0.50, typicalMax: 0.40 },
    AR: { min: 1.8, max: 4.5 },
    S: { min: 0.2, max: 0.8 },
    // FIX (1):
    sweep: { min: 0, max: 0 },
    twist: { min: -3, max: 0 }
  },
  f1_front_wing: {
    sector: 'f1_front_wing',
    sectorName: 'F1 Alerón Delantero',
    b: { min: 1.4, max: 2.0, typicalMax: 1.85 },
    Cr: { min: 0.20, max: 0.50, typicalMax: 0.40 },
    Ct: { min: 0.10, max: 0.35, typicalMax: 0.28 },
    AR: { min: 3.0, max: 7.5 },
    S: { min: 0.3, max: 1.2 },
    // FIX (1):
    sweep: { min: 0, max: 15 },
    twist: { min: -3, max: 0 }
  },
  gt_spoiler: {
    sector: 'gt_spoiler',
    sectorName: 'GT3 / Motorsport Spoiler',
    b: { min: 1.2, max: 2.0, typicalMax: 1.70 },
    Cr: { min: 0.20, max: 0.50, typicalMax: 0.42 },
    Ct: { min: 0.15, max: 0.45, typicalMax: 0.35 },
    AR: { min: 2.8, max: 6.5 },
    S: { min: 0.3, max: 1.0 },
    // FIX (1):
    sweep: { min: 0, max: 10 },
    twist: { min: -3, max: 0 }
  },
  hydrofoil_racing: {
    sector: 'hydrofoil_racing',
    sectorName: 'Hydrofoil Regata AC75',
    b: { min: 1.2, max: 3.5, typicalMax: 2.8 },
    Cr: { min: 0.15, max: 0.45, typicalMax: 0.32 },
    Ct: { min: 0.08, max: 0.25, typicalMax: 0.18 },
    AR: { min: 6.0, max: 18.0 },
    S: { min: 0.2, max: 1.2 },
    // FIX (1):
    sweep: { min: 0, max: 20 },
    twist: { min: -3, max: 1 }
  },
  hydrofoil_efoil: {
    sector: 'hydrofoil_efoil',
    sectorName: 'Surf / E-Foil Comercial',
    b: { min: 0.5, max: 1.2, typicalMax: 0.95 },
    Cr: { min: 0.12, max: 0.30, typicalMax: 0.24 },
    Ct: { min: 0.06, max: 0.20, typicalMax: 0.15 },
    AR: { min: 3.5, max: 8.5 },
    S: { min: 0.08, max: 0.35 },
    // FIX (1):
    sweep: { min: 0, max: 10 },
    twist: { min: -2, max: 1 }
  },
  hydrofoil_ferry: {
    sector: 'hydrofoil_ferry',
    sectorName: 'Hydrofoil Ferry Pasajeros',
    b: { min: 3.0, max: 10.0, typicalMax: 7.5 },
    Cr: { min: 0.5, max: 1.6, typicalMax: 1.2 },
    Ct: { min: 0.3, max: 1.0, typicalMax: 0.7 },
    AR: { min: 4.5, max: 12.0 },
    S: { min: 1.5, max: 12.0 },
    // FIX (1):
    sweep: { min: 0, max: 20 },
    twist: { min: -3, max: 1 }
  }
};

export function getSectorLimits(sector?: TargetSector): SectorLimits {
  if (!sector || !SECTOR_LIMITS_DB[sector]) {
    return SECTOR_LIMITS_DB.uav;
  }
  return SECTOR_LIMITS_DB[sector];
}

export function checkSectorViability(
  sector: TargetSector,
  params: LegacyWingPayload,
  aero?: { S?: number; AR?: number }
): SectorViabilityDiagnostic {
  const limits = getSectorLimits(sector);
  const issues: string[] = [];
  const recommendations: string[] = [];
  let scorePoints = 100;
  let maxPenalty = 0;

  // 1. Verificación de Envergadura b
  if (params.b > limits.b.max) {
    const ratio = params.b / limits.b.max;
    issues.push(`Envergadura (${params.b} m) excede el máximo para ${limits.sectorName} (máx ${limits.b.max} m).`);
    recommendations.push(`Reduzca la envergadura a ≤ ${limits.b.max} m.`);
    scorePoints -= Math.min(50, Math.round(30 * ratio));
    maxPenalty = Math.max(maxPenalty, Math.min(0.9, 0.4 + 0.3 * (ratio - 1)));
  } else if (params.b < limits.b.min) {
    issues.push(`Envergadura (${params.b} m) por debajo del mínimo para ${limits.sectorName} (mín ${limits.b.min} m).`);
    recommendations.push(`Aumente la envergadura a ≥ ${limits.b.min} m.`);
    scorePoints -= 20;
    maxPenalty = Math.max(maxPenalty, 0.25);
  }

  // 2. Verificación de Cuerda Raíz Cr
  if (params.Cr > limits.Cr.max) {
    const ratio = params.Cr / limits.Cr.max;
    issues.push(`Cuerda raíz (${params.Cr} m) excede el límite máximo para ${limits.sectorName} (máx ${limits.Cr.max} m).`);
    recommendations.push(`Reduzca la cuerda raíz Cr a ≤ ${limits.Cr.max} m.`);
    scorePoints -= Math.min(60, Math.round(40 * ratio));
    maxPenalty = Math.max(maxPenalty, Math.min(0.95, 0.5 + 0.4 * (ratio - 1)));
  } else if (params.Cr < limits.Cr.min) {
    issues.push(`Cuerda raíz (${params.Cr} m) insuficiente para ${limits.sectorName} (mín ${limits.Cr.min} m).`);
    recommendations.push(`Aumente la cuerda raíz Cr a ≥ ${limits.Cr.min} m.`);
    scorePoints -= 20;
    maxPenalty = Math.max(maxPenalty, 0.2);
  }

  // 3. Verificación de Cuerda Punta Ct
  if (params.Ct > limits.Ct.max) {
    issues.push(`Cuerda de punta (${params.Ct} m) muy elevada para ${limits.sectorName} (máx ${limits.Ct.max} m).`);
    recommendations.push(`Ajuste la cuerda de punta Ct a ≤ ${limits.Ct.max} m.`);
    scorePoints -= 20;
    maxPenalty = Math.max(maxPenalty, 0.3);
  }

  // 4. Verificación de Superficie y Alargamiento AR si aero está disponible
  const S_calc = aero?.S || ((params.Cr + params.Ct) / 2) * params.b;
  const AR_calc = aero?.AR || (Math.pow(params.b, 2) / Math.max(0.01, S_calc));

  if (AR_calc > limits.AR.max) {
    issues.push(`Alargamiento AR (${AR_calc.toFixed(1)}) excede el rango típico de ${limits.sectorName} (máx ${limits.AR.max}).`);
    recommendations.push(`Disminuya la envergadura o incremente la cuerda media.`);
    scorePoints -= 25;
    maxPenalty = Math.max(maxPenalty, 0.35);
  } else if (AR_calc < limits.AR.min) {
    issues.push(`Alargamiento AR (${AR_calc.toFixed(1)}) es excesivamente bajo para ${limits.sectorName} (mín ${limits.AR.min}).`);
    recommendations.push(`Incremente la envergadura o reduzca las cuerdas.`);
    scorePoints -= 20;
    maxPenalty = Math.max(maxPenalty, 0.25);
  }

  if (S_calc > limits.S.max) {
    issues.push(`Superficie alar (${S_calc.toFixed(2)} m²) supera los límites del sector ${limits.sectorName} (máx ${limits.S.max} m²).`);
    recommendations.push(`Reduzca la superficie alar.`);
    scorePoints -= 25;
    maxPenalty = Math.max(maxPenalty, 0.4);
  }

  const finalScore = Math.max(0, scorePoints);
  let status: 'verde' | 'ambar' | 'rojo' = 'verde';
  let isBlocked = false;

  if (finalScore < 50 || maxPenalty >= 0.5) {
    status = 'rojo';
    isBlocked = true;
  } else if (finalScore < 85 || maxPenalty >= 0.15) {
    status = 'ambar';
  }

  if (issues.length === 0) {
    recommendations.push(`Geometría totalmente compatible con los guardarraíles de ${limits.sectorName}.`);
  }

  return {
    status,
    compatibilityScore: finalScore,
    isBlocked,
    issues,
    recommendations,
    penalty: parseFloat(maxPenalty.toFixed(3))
  };
}
