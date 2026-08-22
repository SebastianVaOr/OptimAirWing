/**
 * Validation Benchmarks — Reference cases for model accuracy verification.
 * 
 * Each benchmark has:
 * - Wing geometry (inputs)
 * - Experimental/reference data (ground truth)
 * - Expected prediction range (tolerance)
 * 
 * Sources:
 * - Abbott & Doenhoff "Theory of Wing Sections" (1959)
 * - NASA TM-X-3284 (NACA 6-series tests)
 * - Roskam "Airplane Design" Vol. II
 * - Published F1 aero data (Carrol & Kim, 2018)
 */

export interface BenchmarkCase {
  id: string;
  name: string;
  description: string;
  source: string;
  category: 'naca_2d' | 'wing_3d' | 'motorsport' | 'nautical';
  inputs: {
    nacaCode: string;
    span_m: number;
    rootChord_m: number;
    tipChord_m: number;
    sweep_deg: number;
    twist_deg: number;
    alpha_deg: number;
    reynolds: number;
    mach: number;
  };
  reference: {
    CL: number;
    CD: number;
    LD: number;
    CL_std?: number;   // standard deviation from reference
    CD_std?: number;
    notes: string;
  };
  tolerance: {
    CL_maxError_pct: number;
    CD_maxError_pct: number;
    LD_maxError_pct: number;
  };
}

export const VALIDATION_BENCHMARKS: BenchmarkCase[] = [
  // --- NACA 2D Airfoil Cases (Abbott & Von Doenhoff, Re=3×10⁶) ---
  {
    id: 'naca-0012-alpha4',
    name: 'NACA 0012 @ α=4°',
    description: 'Simétrico clásico a Re=3M, ángulo moderado',
    source: 'Abbott & Von Doenhoff (1959), Table 5',
    category: 'naca_2d',
    inputs: {
      nacaCode: '0012', span_m: 10, rootChord_m: 1, tipChord_m: 1,
      sweep_deg: 0, twist_deg: 0, alpha_deg: 4,
      reynolds: 3e6, mach: 0.1,
    },
    reference: {
      CL: 0.44, CD: 0.0088, LD: 50.0,
      CL_std: 0.02, CD_std: 0.0005,
      notes: 'Symmetric airfoil at moderate AoA. Experimental data from NACA wind tunnel.',
    },
    tolerance: { CL_maxError_pct: 8, CD_maxError_pct: 15, LD_maxError_pct: 12 },
  },
  {
    id: 'naca-2412-alpha6',
    name: 'NACA 2412 @ α=6°',
    description: 'Perfil cambered estándar, alta sustentación',
    source: 'Abbott & Von Doenhoff (1959), Table 5',
    category: 'naca_2d',
    inputs: {
      nacaCode: '2412', span_m: 10, rootChord_m: 1, tipChord_m: 1,
      sweep_deg: 0, twist_deg: 0, alpha_deg: 6,
      reynolds: 3e6, mach: 0.1,
    },
    reference: {
      CL: 0.85, CD: 0.0090, LD: 94.4,
      CL_std: 0.02, CD_std: 0.0004,
      notes: 'Most common GA airfoil. High L/D at moderate AoA.',
    },
    tolerance: { CL_maxError_pct: 8, CD_maxError_pct: 18, LD_maxError_pct: 15 },
  },
  {
    id: 'naca-4412-alpha8',
    name: 'NACA 4412 @ α=8°',
    description: 'Alto camber, cerca de CL_max',
    source: 'Abbott & Von Doenhoff (1959), Table 5',
    category: 'naca_2d',
    inputs: {
      nacaCode: '4412', span_m: 10, rootChord_m: 1, tipChord_m: 1,
      sweep_deg: 0, twist_deg: 0, alpha_deg: 8,
      reynolds: 3e6, mach: 0.1,
    },
    reference: {
      CL: 1.18, CD: 0.0112, LD: 105.4,
      CL_std: 0.03, CD_std: 0.0006,
      notes: 'High camber airfoil approaching maximum lift.',
    },
    tolerance: { CL_maxError_pct: 10, CD_maxError_pct: 20, LD_maxError_pct: 18 },
  },
  {
    id: 'naca-23012-alpha2',
    name: 'NACA 23012 @ α=2°',
    description: 'Perfil de baja resistencia, alto L/D',
    source: 'Abbott & Von Doenhoff (1959), Table 5',
    category: 'naca_2d',
    inputs: {
      nacaCode: '23012', span_m: 10, rootChord_m: 1, tipChord_m: 1,
      sweep_deg: 0, twist_deg: 0, alpha_deg: 2,
      reynolds: 3e6, mach: 0.1,
    },
    reference: {
      CL: 0.42, CD: 0.0060, LD: 70.0,
      CL_std: 0.015, CD_std: 0.0003,
      notes: 'Low-drag airfoil at cruise condition.',
    },
    tolerance: { CL_maxError_pct: 8, CD_maxError_pct: 15, LD_maxError_pct: 12 },
  },

  // --- 3D Wing Cases ---
  {
    id: 'piper-pa28',
    name: 'Piper PA-28 Wing',
    description: 'Ala recta de avión ligero (Ultralight reference)',
    source: 'Piper PA-28-181 Archer II, POH data + Roskam Vol II',
    category: 'wing_3d',
    inputs: {
      nacaCode: '2412', span_m: 10.8, rootChord_m: 1.63, tipChord_m: 0.97,
      sweep_deg: 1.5, twist_deg: -3, alpha_deg: 4,
      reynolds: 5e6, mach: 0.12,
    },
    reference: {
      CL: 0.52, CD: 0.022, LD: 23.6,
      CL_std: 0.03, CD_std: 0.003,
      notes: 'Real GA aircraft wing. Straight wing, constant taper. Oswald e≈0.82.',
    },
    tolerance: { CL_maxError_pct: 10, CD_maxError_pct: 20, LD_maxError_pct: 18 },
  },
  {
    id: 'asw27-glider',
    name: 'ASW-27 Glider Wing',
    description: 'Planeador de competición, alto alargamiento',
    source: 'Schempp-Hirth ASW-27 datasheet + convention data',
    category: 'wing_3d',
    inputs: {
      nacaCode: '2418', span_m: 15, rootChord_m: 1.2, tipChord_m: 0.6,
      sweep_deg: 2, twist_deg: -4, alpha_deg: 5,
      reynolds: 4e6, mach: 0.08,
    },
    reference: {
      CL: 0.72, CD: 0.0085, LD: 84.7,
      CL_std: 0.04, CD_std: 0.001,
      notes: 'High-performance sailplane. AR≈25, requires accurate induced drag prediction.',
    },
    tolerance: { CL_maxError_pct: 12, CD_maxError_pct: 25, LD_maxError_pct: 20 },
  },
  {
    id: 'boeing-737-class',
    name: 'Boeing 737-800 Class Wing',
    description: 'Ala en flecha de avión comercial',
    source: 'NASA Common Research Model (CRM) simplified',
    category: 'wing_3d',
    inputs: {
      nacaCode: '2412', span_m: 35, rootChord_m: 8, tipChord_m: 2.5,
      sweep_deg: 25, twist_deg: -5, alpha_deg: 3,
      reynolds: 20e6, mach: 0.78,
    },
    reference: {
      CL: 0.50, CD: 0.028, LD: 17.9,
      CL_std: 0.03, CD_std: 0.004,
      notes: 'Swept wing at transonic cruise. Includes wave drag contribution.',
    },
    tolerance: { CL_maxError_pct: 15, CD_maxError_pct: 25, LD_maxError_pct: 20 },
  },

  // --- F1/Motorsport Cases ---
  {
    id: 'f1-rear-wing',
    name: 'F1 Rear Wing (Multi-element)',
    description: 'Ala trasera de F1, alta carga, multi-elemento',
    source: 'Carrol & Kim, "Design of a 2.5D Multi-Element Race Car Wing" (2018)',
    category: 'motorsport',
    inputs: {
      nacaCode: '6412', span_m: 1.05, rootChord_m: 0.30, tipChord_m: 0.25,
      sweep_deg: 0, twist_deg: -2, alpha_deg: 12,
      reynolds: 1e6, mach: 0.08,
    },
    reference: {
      CL: 2.85, CD: 0.12, LD: 23.8,
      CL_std: 0.15, CD_std: 0.01,
      notes: 'Multi-element F1 rear wing with endplates. Very high CL from slot effect.',
    },
    tolerance: { CL_maxError_pct: 15, CD_maxError_pct: 20, LD_maxError_pct: 18 },
  },

  // --- Nautical Cases ---
  {
    id: 'hydrofoil-racing',
    name: 'Hydrofoil Racing (NACA 63-415)',
    description: 'Foil marino de competición a 25 knots',
    source: 'Larson & Viswanathan, "Hydrofoil Design" (2019)',
    category: 'nautical',
    inputs: {
      nacaCode: '63415', span_m: 1.5, rootChord_m: 0.25, tipChord_m: 0.15,
      sweep_deg: 3, twist_deg: -2, alpha_deg: 5,
      reynolds: 2e6, mach: 0.05,
    },
    reference: {
      CL: 0.65, CD: 0.010, LD: 65.0,
      CL_std: 0.03, CD_std: 0.001,
      notes: 'Hydrofoil at 12.9 m/s in saltwater. Different fluid density considerations.',
    },
    tolerance: { CL_maxError_pct: 12, CD_maxError_pct: 20, LD_maxError_pct: 18 },
  },
];

/**
 * Run all validation benchmarks against a given predictor function.
 * Returns per-benchmark results and aggregate statistics.
 */
export function runBenchmarkSuite(
  predictor: (inputs: BenchmarkCase['inputs']) => { CL: number; CD: number }
): {
  results: {
    id: string;
    name: string;
    predictedCL: number;
    predictedCD: number;
    referenceCL: number;
    referenceCD: number;
    CL_error_pct: number;
    CD_error_pct: number;
    LD_predicted: number;
    LD_reference: number;
    LD_error_pct: number;
    pass: boolean;
  }[];
  aggregate: {
    meanCLerror: number;
    meanCDerror: number;
    meanLDerror: number;
    passRate: number;
    totalCases: number;
    passedCases: number;
    worstCase: string;
  };
} {
  const results = VALIDATION_BENCHMARKS.map(benchmark => {
    const predicted = predictor(benchmark.inputs);
    const CL_error = Math.abs((predicted.CL - benchmark.reference.CL) / Math.max(0.01, benchmark.reference.CL)) * 100;
    const CD_error = Math.abs((predicted.CD - benchmark.reference.CD) / Math.max(0.001, benchmark.reference.CD)) * 100;
    const LD_pred = predicted.CL / Math.max(0.001, predicted.CD);
    const LD_ref = benchmark.reference.LD;
    const LD_error = Math.abs((LD_pred - LD_ref) / Math.max(0.1, LD_ref)) * 100;

    const pass = CL_error <= benchmark.tolerance.CL_maxError_pct
      && CD_error <= benchmark.tolerance.CD_maxError_pct
      && LD_error <= benchmark.tolerance.LD_maxError_pct;

    return {
      id: benchmark.id,
      name: benchmark.name,
      predictedCL: parseFloat(predicted.CL.toFixed(4)),
      predictedCD: parseFloat(predicted.CD.toFixed(6)),
      referenceCL: benchmark.reference.CL,
      referenceCD: benchmark.reference.CD,
      CL_error_pct: parseFloat(CL_error.toFixed(2)),
      CD_error_pct: parseFloat(CD_error.toFixed(2)),
      LD_predicted: parseFloat(LD_pred.toFixed(2)),
      LD_reference: LD_ref,
      LD_error_pct: parseFloat(LD_error.toFixed(2)),
      pass,
    };
  });

  const passedCases = results.filter(r => r.pass).length;
  const worstCase = results.reduce((worst, r) =>
    r.CL_error_pct + r.CD_error_pct > (worst?.CL_error_pct ?? 0) + (worst?.CD_error_pct ?? 0) ? r : worst
  );

  return {
    results,
    aggregate: {
      meanCLerror: parseFloat((results.reduce((s, r) => s + r.CL_error_pct, 0) / results.length).toFixed(2)),
      meanCDerror: parseFloat((results.reduce((s, r) => s + r.CD_error_pct, 0) / results.length).toFixed(2)),
      meanLDerror: parseFloat((results.reduce((s, r) => s + r.LD_error_pct, 0) / results.length).toFixed(2)),
      passRate: parseFloat(((passedCases / results.length) * 100).toFixed(1)),
      totalCases: results.length,
      passedCases,
      worstCase: worstCase?.id || 'N/A',
    },
  };
}
