/**
 * Manufacturing Knockdown Factors
 *
 * Real structures are not perfect. Manufacturing introduces:
 *   - Porosity (composite layup)
 *   - Thickness variation (machining tolerance)
 *   - Bonding defects (adhesive joints)
 *   - Surface finish (aerodynamic drag)
 *   - Residual stresses (welding, curing)
 *
 * A 20-year veteran knows: FEA with perfect geometry is meaningless
 * without these factors. The FS = 1.5 computed with ideal properties
 * is actually FS = 1.2 in practice.
 *
 * Knockdown factors are multiplied:
 *   σ_actual = K_combined × σ_FEA
 *
 * References:
 *   - MIL-HDBK-5 (Metallic Materials)
 *   - CMH-17 (Composites Materials Handbook)
 *   - Shanley, F.R. (1952). Strength of Metal Aircraft Structures
 */

export type ManufacturingProcess =
  | 'cnc_machining'
  | 'sheet_metal'
  | 'composite_wet_layup'
  | 'composite_prepreg_autoclave'
  | 'composite_resin_infusion'
  | 'additive_manufacturing'
  | 'casting'
  | 'welding';

export interface KnockdownFactors {
  porosity: number;
  thicknessVariation: number;
  bondingQuality: number;
  surfaceFinish: number;
  residualStress: number;
  combined: number;
}

export interface ManufacturingAnalysis {
  process: ManufacturingProcess;
  knockdownFactors: KnockdownFactors;

  adjustedProperties: {
    ultimateStrength_MPa: number;
    fatigueStrength_MPa: number;
    bucklingLoad_N: number;
    elasticModulus_GPa: number;
  };

  inspectionRequirements: {
    porosityNDI: string;
    bondingInspection: string;
    thicknessTolerance_mm: number;
    surfaceFinishRa: number;  // μm
  };

  processRecommendations: string[];
}

const KNOCKDOWN_TABLE: Record<ManufacturingProcess, KnockdownFactors> = {
  cnc_machining: {
    porosity: 1.0,
    thicknessVariation: 0.97,
    bondingQuality: 1.0,
    surfaceFinish: 0.98,
    residualStress: 0.92,
    combined: 0.875,
  },
  sheet_metal: {
    porosity: 1.0,
    thicknessVariation: 0.95,
    bondingQuality: 1.0,
    surfaceFinish: 0.95,
    residualStress: 0.90,
    combined: 0.813,
  },
  composite_wet_layup: {
    porosity: 0.88,
    thicknessVariation: 0.92,
    bondingQuality: 0.85,
    surfaceFinish: 0.95,
    residualStress: 0.95,
    combined: 0.620,
  },
  composite_prepreg_autoclave: {
    porosity: 0.95,
    thicknessVariation: 0.97,
    bondingQuality: 0.93,
    surfaceFinish: 0.97,
    residualStress: 0.97,
    combined: 0.799,
  },
  composite_resin_infusion: {
    porosity: 0.90,
    thicknessVariation: 0.94,
    bondingQuality: 0.88,
    surfaceFinish: 0.95,
    residualStress: 0.96,
    combined: 0.681,
  },
  additive_manufacturing: {
    porosity: 0.85,
    thicknessVariation: 0.90,
    bondingQuality: 1.0,
    surfaceFinish: 0.80,
    residualStress: 0.80,
    combined: 0.492,
  },
  casting: {
    porosity: 0.82,
    thicknessVariation: 0.88,
    bondingQuality: 1.0,
    surfaceFinish: 0.85,
    residualStress: 0.85,
    combined: 0.426,
  },
  welding: {
    porosity: 0.90,
    thicknessVariation: 0.95,
    bondingQuality: 1.0,
    surfaceFinish: 0.90,
    residualStress: 0.75,
    combined: 0.578,
  },
};

export function analyzeManufacturingEffects(
  process: ManufacturingProcess,
  material: {
    ultimate_strength_MPa: number;
    fatigue_strength_MPa: number;
    buckling_load_N: number;
    elastic_modulus_GPa: number;
  }
): ManufacturingAnalysis {
  const kf = KNOCKDOWN_TABLE[process];

  // Combined factor is product of all individual factors
  const combined = kf.porosity * kf.thicknessVariation * kf.bondingQuality * kf.surfaceFinish * kf.residualStress;

  const adjustedProperties = {
    ultimateStrength_MPa: material.ultimate_strength_MPa * combined,
    fatigueStrength_MPa: material.fatigue_strength_MPa * kf.porosity * kf.surfaceFinish,
    bucklingLoad_N: material.buckling_load_N * kf.thicknessVariation ** 2,
    elasticModulus_GPa: material.elastic_modulus_GPa,  // E not significantly affected
  };

  const inspectionRequirements = getInspectionRequirements(process);
  const processRecommendations = getProcessRecommendations(kf);

  return {
    process,
    knockdownFactors: { ...kf, combined },
    adjustedProperties,
    inspectionRequirements,
    processRecommendations,
  };
}

function getInspectionRequirements(process: ManufacturingProcess) {
  const requirements: Record<string, { porosityNDI: string; bondingInspection: string; thicknessTolerance_mm: number; surfaceFinishRa: number }> = {
    composite_prepreg_autoclave: { porosityNDI: 'Ultrasonic C-scan', bondingInspection: 'Ultrasonic phased array', thicknessTolerance_mm: 0.1, surfaceFinishRa: 0.8 },
    composite_wet_layup: { porosityNDI: 'Tap test + thermography', bondingInspection: 'Visual + tap test', thicknessTolerance_mm: 0.3, surfaceFinishRa: 1.6 },
    cnc_machining: { porosityNDI: 'Not required (wrought)', bondingInspection: 'Not required', thicknessTolerance_mm: 0.05, surfaceFinishRa: 0.4 },
    sheet_metal: { porosityNDI: 'Not required', bondingInspection: 'Not required', thicknessTolerance_mm: 0.1, surfaceFinishRa: 0.8 },
    additive_manufacturing: { porosityNDI: 'CT scan + ultrasonic', bondingInspection: 'Not applicable', thicknessTolerance_mm: 0.2, surfaceFinishRa: 3.2 },
    welding: { porosityNDI: 'Radiographic + ultrasonic', bondingInspection: 'Not applicable', thicknessTolerance_mm: 0.2, surfaceFinishRa: 6.3 },
    casting: { porosityNDI: 'X-ray + ultrasonic', bondingInspection: 'Not applicable', thicknessTolerance_mm: 0.5, surfaceFinishRa: 3.2 },
    composite_resin_infusion: { porosityNDI: 'Ultrasonic pulse-echo', bondingInspection: 'Ultrasonic', thicknessTolerance_mm: 0.2, surfaceFinishRa: 1.2 },
  };

  return requirements[process] ?? requirements.cnc_machining;
}

function getProcessRecommendations(kf: KnockdownFactors): string[] {
  const recs: string[] = [];

  if (kf.porosity < 0.90) {
    recs.push('⚠️ Porosity > 10%: Consider upgrading to autoclave process or adding autoclave post-cure');
  }
  if (kf.surfaceFinish < 0.90) {
    recs.push('⚠️ Poor surface finish: Add post-processing (machining, sanding, coating)');
  }
  if (kf.residualStress < 0.85) {
    recs.push('⚠️ High residual stress: Add stress-relief heat treatment');
  }
  if (kf.bondingQuality < 0.90) {
    recs.push('⚠️ Bond quality: Increase surface preparation, add peeling ply or plasma treatment');
  }

  return recs;
}
