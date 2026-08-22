export interface AircraftReference {
  id: string;
  name: string;
  manufacturer: string;
  category: 'trainer' | 'acrobatic' | 'utility' | 'touring' | 'high_performance';
  certification: 'FAR-23' | 'CS-VLA' | 'LSA' | 'Experimental';
  specifications: {
    wingspan_m: number;
    root_chord_m: number;
    tip_chord_m: number;
    taper_ratio: number;
    sweep_deg: number;
    aspect_ratio: number;
    wing_area_m2: number;
    airfoil_root: string;
    airfoil_tip: string;
    thickness_ratio: number;
    dihedral_deg: number;
  };
  performance: {
    L_D_max: number;
    L_D_cruise: number;
    V_stall_ms: number;
    V_cruise_ms: number;
    V_never_exceed_ms: number;
    CL_max: number;
    CL_cruise: number;
    range_km: number;
    ceiling_m: number;
  };
  structural: {
    MTOW_kg: number;
    empty_weight_kg: number;
    fuel_capacity_L: number;
    wing_loading_kg_m2: number;
    power_loading_kg_hp: number;
    safety_factor: number;
    material: 'al2024' | 'al7075' | 'carbon' | 'steel_tube' | 'mixed';
  };
  sources: string[];
  notes: string;
}

export const REFERENCE_AIRCRAFT: Record<string, AircraftReference> = {
  cessna172: {
    id: 'cessna172',
    name: 'Cessna 172 Skyhawk',
    manufacturer: 'Cessna Aircraft Company',
    category: 'trainer',
    certification: 'FAR-23',
    specifications: {
      wingspan_m: 11.0,
      root_chord_m: 1.62,
      tip_chord_m: 1.24,
      taper_ratio: 0.77,
      sweep_deg: 0,
      aspect_ratio: 7.47,
      wing_area_m2: 16.2,
      airfoil_root: 'NACA 2412',
      airfoil_tip: 'NACA 2412',
      thickness_ratio: 0.12,
      dihedral_deg: 3.5,
    },
    performance: {
      L_D_max: 12.8,
      L_D_cruise: 11.5,
      V_stall_ms: 22.6,
      V_cruise_ms: 63.4,
      V_never_exceed_ms: 89.4,
      CL_max: 1.5,
      CL_cruise: 0.35,
      range_km: 1287,
      ceiling_m: 4300,
    },
    structural: {
      MTOW_kg: 1111,
      empty_weight_kg: 762,
      fuel_capacity_L: 212,
      wing_loading_kg_m2: 68.6,
      power_loading_kg_hp: 6.6,
      safety_factor: 1.5,
      material: 'al2024',
    },
    sources: [
      'FAA Type Certificate A3CE',
      'Cessna 172S Pilot Operating Handbook (2004)',
      'Wikipedia: Cessna 172 (accessed 2026)',
    ],
    notes: 'Most produced aircraft in history. Benchmark for light trainers. Simple rectangular wing with constant chord tip sections.',
  },

  pitts_s2b: {
    id: 'pitts_s2b',
    name: 'Pitts S-2B',
    manufacturer: 'Pitts Aerobatics',
    category: 'acrobatic',
    certification: 'FAR-23',
    specifications: {
      wingspan_m: 6.1,
      root_chord_m: 1.35,
      tip_chord_m: 0.94,
      taper_ratio: 0.70,
      sweep_deg: 0,
      aspect_ratio: 5.7,
      wing_area_m2: 6.5,
      airfoil_root: 'NACA 0012',
      airfoil_tip: 'NACA 0012',
      thickness_ratio: 0.12,
      dihedral_deg: 6.0,
    },
    performance: {
      L_D_max: 6.5,
      L_D_cruise: 5.8,
      V_stall_ms: 26.0,
      V_cruise_ms: 56.0,
      V_never_exceed_ms: 134.0,
      CL_max: 1.4,
      CL_cruise: 0.25,
      range_km: 500,
      ceiling_m: 6100,
    },
    structural: {
      MTOW_kg: 680,
      empty_weight_kg: 522,
      fuel_capacity_L: 95,
      wing_loading_kg_m2: 104.6,
      power_loading_kg_hp: 3.5,
      safety_factor: 6.0,
      material: 'steel_tube',
    },
    sources: [
      'FAA Type Certificate A9EA',
      'Aviat Aircraft Pitts S-2B Specifications',
      'Wikipedia: Pitts Special (accessed 2026)',
    ],
    notes: 'Legendary aerobatic biplane. High roll rate (240°/s). Symmetric airfoils for inverted flight. +6/-4G structural limits.',
  },

  extra_300l: {
    id: 'extra_300l',
    name: 'Extra 300L',
    manufacturer: 'Extra Aircraft',
    category: 'acrobatic',
    certification: 'FAR-23',
    specifications: {
      wingspan_m: 8.0,
      root_chord_m: 1.20,
      tip_chord_m: 0.78,
      taper_ratio: 0.65,
      sweep_deg: 0,
      aspect_ratio: 7.9,
      wing_area_m2: 8.1,
      airfoil_root: 'Extra symmetric custom',
      airfoil_tip: 'Extra symmetric custom',
      thickness_ratio: 0.15,
      dihedral_deg: 1.5,
    },
    performance: {
      L_D_max: 9.5,
      L_D_cruise: 8.2,
      V_stall_ms: 28.0,
      V_cruise_ms: 68.0,
      V_never_exceed_ms: 170.0,
      CL_max: 1.5,
      CL_cruise: 0.30,
      range_km: 940,
      ceiling_m: 4800,
    },
    structural: {
      MTOW_kg: 953,
      empty_weight_kg: 676,
      fuel_capacity_L: 140,
      wing_loading_kg_m2: 117.6,
      power_loading_kg_hp: 2.9,
      safety_factor: 6.0,
      material: 'carbon',
    },
    sources: [
      'FAA Type Certificate A58NM',
      'Extra Aircraft GmbH Specifications',
      'Wikipedia: Extra EA-300 (accessed 2026)',
    ],
    notes: 'Modern monoplane aerobat. Composite construction. +10/-10G limits. Unlimited category competitor.',
  },

  socata_tb20: {
    id: 'socata_tb20',
    name: 'Socata TB20 Trinidad',
    manufacturer: 'Socata (Daher)',
    category: 'touring',
    certification: 'FAR-23',
    specifications: {
      wingspan_m: 10.0,
      root_chord_m: 1.58,
      tip_chord_m: 1.08,
      taper_ratio: 0.68,
      sweep_deg: 0,
      aspect_ratio: 7.5,
      wing_area_m2: 13.3,
      airfoil_root: 'NACA 63A415',
      airfoil_tip: 'NACA 63A415',
      thickness_ratio: 0.15,
      dihedral_deg: 4.0,
    },
    performance: {
      L_D_max: 13.5,
      L_D_cruise: 12.0,
      V_stall_ms: 24.0,
      V_cruise_ms: 78.0,
      V_never_exceed_ms: 106.0,
      CL_max: 1.6,
      CL_cruise: 0.32,
      range_km: 1800,
      ceiling_m: 6000,
    },
    structural: {
      MTOW_kg: 1400,
      empty_weight_kg: 920,
      fuel_capacity_L: 270,
      wing_loading_kg_m2: 105.3,
      power_loading_kg_hp: 5.4,
      safety_factor: 1.5,
      material: 'al2024',
    },
    sources: [
      'FAA Type Certificate A60EU',
      'Socata TB20 Flight Manual',
      'Wikipedia: Socata TB (accessed 2026)',
    ],
    notes: 'High-performance touring aircraft. Comfortable 4-seater. Good cross-country platform.',
  },

  cirrus_sr22: {
    id: 'cirrus_sr22',
    name: 'Cirrus SR22 G5',
    manufacturer: 'Cirrus Aircraft',
    category: 'high_performance',
    certification: 'FAR-23',
    specifications: {
      wingspan_m: 11.68,
      root_chord_m: 1.68,
      tip_chord_m: 1.22,
      taper_ratio: 0.73,
      sweep_deg: 0,
      aspect_ratio: 8.0,
      wing_area_m2: 17.0,
      airfoil_root: 'Cirrus custom',
      airfoil_tip: 'Cirrus custom',
      thickness_ratio: 0.13,
      dihedral_deg: 3.0,
    },
    performance: {
      L_D_max: 14.0,
      L_D_cruise: 12.5,
      V_stall_ms: 26.3,
      V_cruise_ms: 87.0,
      V_never_exceed_ms: 102.0,
      CL_max: 1.6,
      CL_cruise: 0.30,
      range_km: 1700,
      ceiling_m: 5330,
    },
    structural: {
      MTOW_kg: 1633,
      empty_weight_kg: 1030,
      fuel_capacity_L: 348,
      wing_loading_kg_m2: 96.1,
      power_loading_kg_hp: 4.5,
      safety_factor: 1.5,
      material: 'carbon',
    },
    sources: [
      'FAA Type Certificate A56EA',
      'Cirrus SR22 G5 Pilot Operating Handbook',
      'Wikipedia: Cirrus SR22 (accessed 2026)',
    ],
    notes: 'Best-selling piston single. CAPS whole-airframe parachute. Glass cockpit standard. Composite construction.',
  },

  diamond_da40: {
    id: 'diamond_da40',
    name: 'Diamond DA40 XL',
    manufacturer: 'Diamond Aircraft',
    category: 'trainer',
    certification: 'FAR-23',
    specifications: {
      wingspan_m: 11.94,
      root_chord_m: 1.20,
      tip_chord_m: 0.68,
      taper_ratio: 0.57,
      sweep_deg: 2.0,
      aspect_ratio: 12.0,
      wing_area_m2: 11.9,
      airfoil_root: 'Wortmann FX 63-137/20 HOAC',
      airfoil_tip: 'Wortmann FX 63-137/20 HOAC',
      thickness_ratio: 0.14,
      dihedral_deg: 5.0,
    },
    performance: {
      L_D_max: 15.5,
      L_D_cruise: 14.0,
      V_stall_ms: 21.0,
      V_cruise_ms: 74.0,
      V_never_exceed_ms: 94.0,
      CL_max: 1.7,
      CL_cruise: 0.28,
      range_km: 1350,
      ceiling_m: 5000,
    },
    structural: {
      MTOW_kg: 1157,
      empty_weight_kg: 750,
      fuel_capacity_L: 159,
      wing_loading_kg_m2: 97.2,
      power_loading_kg_hp: 6.1,
      safety_factor: 1.5,
      material: 'carbon',
    },
    sources: [
      'FAA Type Certificate A61NM',
      'Diamond DA40 XL Aircraft Flight Manual',
      'Wikipedia: Diamond DA40 (accessed 2026)',
    ],
    notes: 'High-aspect-ratio trainer. Excellent fuel efficiency. Composite construction. Very popular for flight schools.',
  },

  mooney_m20: {
    id: 'mooney_m20',
    name: 'Mooney M20 Acclaim',
    manufacturer: 'Mooney International',
    category: 'high_performance',
    certification: 'FAR-23',
    specifications: {
      wingspan_m: 11.0,
      root_chord_m: 1.42,
      tip_chord_m: 1.04,
      taper_ratio: 0.73,
      sweep_deg: 3.0,
      aspect_ratio: 7.4,
      wing_area_m2: 16.3,
      airfoil_root: 'Mooney M20 custom',
      airfoil_tip: 'Mooney M20 custom',
      thickness_ratio: 0.13,
      dihedral_deg: 5.0,
    },
    performance: {
      L_D_max: 13.0,
      L_D_cruise: 11.5,
      V_stall_ms: 24.4,
      V_cruise_ms: 97.0,
      V_never_exceed_ms: 108.0,
      CL_max: 1.5,
      CL_cruise: 0.28,
      range_km: 1950,
      ceiling_m: 7600,
    },
    structural: {
      MTOW_kg: 1435,
      empty_weight_kg: 977,
      fuel_capacity_L: 285,
      wing_loading_kg_m2: 88.0,
      power_loading_kg_hp: 4.5,
      safety_factor: 1.5,
      material: 'al2024',
    },
    sources: [
      'FAA Type Certificate 2A3',
      'Mooney M20 Acclaim Pilot Information Manual',
      'Wikipedia: Mooney M20 (accessed 2026)',
    ],
    notes: 'Fast piston single. Forward-swept tail distinctive. Efficient laminar wing. Highest cruise speed in class.',
  },
};

export function getAircraftByCategory(category: AircraftReference['category']): AircraftReference[] {
  return Object.values(REFERENCE_AIRCRAFT).filter(ac => ac.category === category);
}

export function getPercentileRank(value: number, metric: keyof AircraftReference['performance'], category?: AircraftReference['category']): number {
  const aircraft = category 
    ? getAircraftByCategory(category) 
    : Object.values(REFERENCE_AIRCRAFT);
  
  const sorted = aircraft
    .map(ac => ac.performance[metric] as number)
    .sort((a, b) => a - b);
  
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

export function computePopulationStats(metric: keyof AircraftReference['performance']): { 
  mean: number; 
  std: number; 
  min: number; 
  max: number;
  p5: number;
  p95: number;
} {
  const values = Object.values(REFERENCE_AIRCRAFT)
    .map(ac => ac.performance[metric] as number)
    .sort((a, b) => a - b);
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
  
  return {
    mean,
    std,
    min: values[0],
    max: values[values.length - 1],
    p5: values[Math.floor(values.length * 0.05)],
    p95: values[Math.floor(values.length * 0.95)],
  };
}

export function computeStructuralStats(metric: keyof AircraftReference['structural']): { 
  mean: number; 
  std: number; 
  min: number; 
  max: number;
} {
  const values = Object.values(REFERENCE_AIRCRAFT)
    .map(ac => ac.structural[metric] as number)
    .sort((a, b) => a - b);
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
  
  return { mean, std, min: values[0], max: values[values.length - 1] };
}
