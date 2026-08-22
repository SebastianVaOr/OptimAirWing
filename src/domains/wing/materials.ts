import { StructuralMaterial } from '../../core/types';

export interface MaterialProperties {
  name: string;
  density: number;         // kg/m³
  cost_kg: number;         // €/kg
  yield_strength: number;  // MPa (σ_y)
  elastic_modulus: number; // GPa (E)
  shear_modulus: number;   // GPa (G)
  fatigue_life: number;    // cycles to failure at reference stress
  poissons_ratio: number;  // ν
  ultimate_strength: number; // MPa (σ_u)
  max_service_temp_c: number; // °C
  corrosion_resistance: number; // 1-10 scale
  manufacturing_difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  certification: 'uncertified' | 'AS9100' | 'NADCAP' | 'AMS';
  typicalUse: string[];
}

export const MATERIALS_DB: Record<StructuralMaterial, MaterialProperties> = {
  al2024: {
    name: 'Aluminio 2024-T3',
    density: 2780,
    cost_kg: 8,
    yield_strength: 320,
    elastic_modulus: 73,
    shear_modulus: 28,
    fatigue_life: 5e8,
    poissons_ratio: 0.33,
    ultimate_strength: 469,
    max_service_temp_c: 175,
    corrosion_resistance: 3,
    manufacturing_difficulty: 'medium',
    certification: 'AMS',
    typicalUse: ['Fuselaje aeronáutico', 'Estructuras UAV', 'Alas ligeras'],
  },
  al7075: {
    name: 'Aluminio 7075-T6',
    density: 2810,
    cost_kg: 12,
    yield_strength: 503,
    elastic_modulus: 72,
    shear_modulus: 27,
    fatigue_life: 4e8,
    poissons_ratio: 0.33,
    ultimate_strength: 572,
    max_service_temp_c: 150,
    corrosion_resistance: 2,
    manufacturing_difficulty: 'medium',
    certification: 'AMS',
    typicalUse: ['Estructuras de alta carga', 'Alas de aviones comerciales', 'Componentes F1'],
  },
  carbon: {
    name: 'Fibra de Carbono T700/Epoxy',
    density: 1550,
    cost_kg: 75,
    yield_strength: 700,
    elastic_modulus: 145,
    shear_modulus: 60,
    fatigue_life: 2e7,
    poissons_ratio: 0.30,
    ultimate_strength: 2100,
    max_service_temp_c: 120,
    corrosion_resistance: 10,
    manufacturing_difficulty: 'hard',
    certification: 'AS9100',
    typicalUse: ['Alas de competición', 'UAV de alto rendimiento', 'F1 aerodinámica'],
  },
  carbon_t300: {
    name: 'Fibra de Carbono T300/Epoxy',
    density: 1600,
    cost_kg: 60,
    yield_strength: 600,
    elastic_modulus: 135,
    shear_modulus: 55,
    fatigue_life: 1e7,
    poissons_ratio: 0.30,
    ultimate_strength: 1800,
    max_service_temp_c: 120,
    corrosion_resistance: 10,
    manufacturing_difficulty: 'hard',
    certification: 'AS9100',
    typicalUse: ['Estructuras semi-estruturales', 'Paneles de oblivious', 'UAV medio'],
  },
  carbon_t700: {
    name: 'Fibra de Carbono T700/Epoxy',
    density: 1550,
    cost_kg: 75,
    yield_strength: 700,
    elastic_modulus: 145,
    shear_modulus: 60,
    fatigue_life: 2e7,
    poissons_ratio: 0.30,
    ultimate_strength: 2100,
    max_service_temp_c: 120,
    corrosion_resistance: 10,
    manufacturing_difficulty: 'hard',
    certification: 'AS9100',
    typicalUse: ['Largueros principales', 'Alas de competición', 'Estructures F1'],
  },
  fiberglass: {
    name: 'Fibra de Vidrio E-Glass/Epoxy',
    density: 1900,
    cost_kg: 15,
    yield_strength: 350,
    elastic_modulus: 70,
    shear_modulus: 30,
    fatigue_life: 2e7,
    poissons_ratio: 0.28,
    ultimate_strength: 1000,
    max_service_temp_c: 100,
    corrosion_resistance: 8,
    manufacturing_difficulty: 'easy',
    certification: 'uncertified',
    typicalUse: ['Drones recreativos', 'Planeadores', 'Prototipos'],
  },
  fiberglass_s2: {
    name: 'Fibra de Vidrio S-2/Epoxy',
    density: 1900,
    cost_kg: 22,
    yield_strength: 480,
    elastic_modulus: 85,
    shear_modulus: 35,
    fatigue_life: 3e7,
    poissons_ratio: 0.29,
    ultimate_strength: 1600,
    max_service_temp_c: 150,
    corrosion_resistance: 9,
    manufacturing_difficulty: 'medium',
    certification: 'uncertified',
    typicalUse: ['Estructures de alta resistencia', 'Hidroalas', 'Componentes marinos'],
  },
  wood: {
    name: 'Madera (Abeto Sitka / Pino)',
    density: 500,
    cost_kg: 5,
    yield_strength: 40,
    elastic_modulus: 10,
    shear_modulus: 0.85,
    fatigue_life: 1e6,
    poissons_ratio: 0.30,
    ultimate_strength: 70,
    max_service_temp_c: 60,
    corrosion_resistance: 3,
    manufacturing_difficulty: 'easy',
    certification: 'uncertified',
    typicalUse: ['Aviación clásica', 'Ultraligeros', 'Prototipos económicos'],
  },
  titanium: {
    name: 'Titanio Ti-6Al-4V',
    density: 4430,
    cost_kg: 80,
    yield_strength: 830,
    elastic_modulus: 114,
    shear_modulus: 44,
    fatigue_life: 1e9,
    poissons_ratio: 0.34,
    ultimate_strength: 900,
    max_service_temp_c: 350,
    corrosion_resistance: 10,
    manufacturing_difficulty: 'expert',
    certification: 'AMS',
    typicalUse: ['Componentes de alta temperatura', 'Ejes de turbine', 'Herramientas aeroespaciales'],
  },
  steel4130: {
    name: 'Acero 4130 Chromoly',
    density: 7850,
    cost_kg: 6,
    yield_strength: 460,
    elastic_modulus: 205,
    shear_modulus: 80,
    fatigue_life: 1e7,
    poissons_ratio: 0.29,
    ultimate_strength: 560,
    max_service_temp_c: 400,
    corrosion_resistance: 4,
    manufacturing_difficulty: 'medium',
    certification: 'AMS',
    typicalUse: ['Tubos de fuselaje', 'Mountain dew ties', 'Herramientas'],
  },
  hybrid: {
    name: 'Laminado Híbrido Carbono/Vidrio',
    density: 1750,
    cost_kg: 35,
    yield_strength: 500,
    elastic_modulus: 100,
    shear_modulus: 40,
    fatigue_life: 5e7,
    poissons_ratio: 0.29,
    ultimate_strength: 1400,
    max_service_temp_c: 110,
    corrosion_resistance: 9,
    manufacturing_difficulty: 'medium',
    certification: 'uncertified',
    typicalUse: ['Estructures de media carga', 'Paneles sandwich', 'Drones de competición'],
  },
};

/**
 * Recommend the top 3 materials for a given use case based on
 * strength-to-weight ratio, cost, and manufacturing feasibility.
 */
export function recommendMaterials(params: {
  wingspan: number;
  sector: string;
  maxBudget?: number;
  certificationRequired?: boolean;
}): { materialId: StructuralMaterial; score: number; reasoning: string }[] {
  const candidates = Object.entries(MATERIALS_DB).map(([id, mat]) => {
    const matId = id as StructuralMaterial;
    let score = 0;

    // Strength-to-weight ratio (higher is better for aerospace)
    const specificStrength = mat.yield_strength / (mat.density / 1000); // MPa/(g/cm³)
    score += Math.min(30, specificStrength / 100);

    // Cost penalty (lower cost is better)
    score += Math.min(20, 20 - (mat.cost_kg / 5));

    // Corrosion resistance bonus for hydrofoil
    if (params.sector.startsWith('hydrofoil_')) {
      score += mat.corrosion_resistance * 2;
    }

    // Manufacturing difficulty penalty
    const diffPenalty: Record<string, number> = { easy: 0, medium: -2, hard: -5, expert: -8 };
    score += diffPenalty[mat.manufacturing_difficulty] || 0;

    // Certification bonus if required
    if (params.certificationRequired && mat.certification !== 'uncertified') {
      score += 5;
    }

    // Budget constraint
    if (params.maxBudget && mat.cost_kg > params.maxBudget / Math.max(1, params.wingspan)) {
      score -= 10;
    }

    const reasoning = `σ_y=${mat.yield_strength} MPa, ρ=${mat.density} kg/m³, €${mat.cost_kg}/kg`;

    return { materialId: matId, score: Math.round(score * 10) / 10, reasoning };
  });

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
}
