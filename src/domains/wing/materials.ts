import { StructuralMaterial } from '../../core/types';

export interface MaterialProperties {
  name: string;
  density: number; // kg/m3
  cost_kg: number; // €/kg
  yield_strength: number; // MPa (σ_y)
  elastic_modulus: number; // GPa (E)
  shear_modulus: number; // GPa (G)
  fatigue_life: number; // ciclos
}

export const MATERIALS_DB: Record<StructuralMaterial, MaterialProperties> = {
  al2024: {
    name: 'Aluminio 2024-T3',
    density: 2780,
    cost_kg: 8,
    yield_strength: 320,
    elastic_modulus: 73,
    shear_modulus: 28,
    fatigue_life: 5e8
  },
  al7075: {
    name: 'Aluminio 7075-T6',
    density: 2810,
    cost_kg: 12,
    yield_strength: 480,
    elastic_modulus: 72,
    shear_modulus: 27,
    fatigue_life: 4e8
  },
  carbon: {
    name: 'Fibra de Carbono T700',
    density: 1550,
    cost_kg: 75,
    yield_strength: 700,
    elastic_modulus: 145,
    shear_modulus: 60,
    fatigue_life: 2e7
  },
  carbon_t300: {
    name: 'Fibra de Carbono T300',
    density: 1600,
    cost_kg: 60,
    yield_strength: 600,
    elastic_modulus: 135,
    shear_modulus: 55,
    fatigue_life: 1e7
  },
  carbon_t700: {
    name: 'Fibra de Carbono T700',
    density: 1550,
    cost_kg: 75,
    yield_strength: 700,
    elastic_modulus: 145,
    shear_modulus: 60,
    fatigue_life: 2e7
  },
  fiberglass: {
    name: 'Fibra de Vidrio E-Glass',
    density: 1900,
    cost_kg: 15,
    yield_strength: 350,
    elastic_modulus: 70,
    shear_modulus: 30,
    fatigue_life: 2e7
  },
  fiberglass_s2: {
    name: 'Fibra de Vidrio S-2',
    density: 1900,
    cost_kg: 15,
    yield_strength: 350,
    elastic_modulus: 85,
    shear_modulus: 35,
    fatigue_life: 2e7
  },
  wood: {
    name: 'Madera (Abeto/Pino)',
    density: 500,
    cost_kg: 5,
    yield_strength: 40,
    elastic_modulus: 10,
    shear_modulus: 0.85,
    fatigue_life: 1e6
  },
  titanium: {
    name: 'Titanio Ti-6Al-4V',
    density: 4430,
    cost_kg: 80,
    yield_strength: 830,
    elastic_modulus: 114,
    shear_modulus: 44,
    fatigue_life: 1e9
  },
  steel4130: {
    name: 'Acero 4130 Chromoly',
    density: 7850,
    cost_kg: 6,
    yield_strength: 460,
    elastic_modulus: 205,
    shear_modulus: 80,
    fatigue_life: 1e7
  },
  hybrid: {
    name: 'Laminado Híbrido Carbono/Vidrio',
    density: 1800,
    cost_kg: 35,
    yield_strength: 500,
    elastic_modulus: 100,
    shear_modulus: 40,
    fatigue_life: 5e7
  }
};
