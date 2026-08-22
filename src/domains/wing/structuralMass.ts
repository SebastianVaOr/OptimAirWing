/**
 * Structural Mass Estimation — Physics-Based Model
 * Based on Raymer "Aircraft Design: A Conceptual Approach" Ch.15,
 * Roskam "Airplane Design" Vol.8, and Nicolai "Fundamentals of Aircraft Design".
 *
 * Unlike the old empirical MTOW fraction (which produced 2.5 kg for a 22 m² wing),
 * this module computes mass from actual material volume: skin, spars, ribs, and assembly.
 */

import { DesignRequirements, LegacyWingPayload, StructuralMaterial } from '../../core/types';
import { MATERIALS_DB, MaterialProperties } from './materials';
import { nacaThicknessRatio } from './sparGeometry';

export interface MassBreakdown {
  skinKg: number;
  sparsKg: number;
  ribsKg: number;
  trailingEdgeKg: number;
  assemblyKg: number;
  totalKg: number;
  skinThicknessMm: number;
  sparWallThicknessMm: number;
  numRibs: number;
  referenceMethod: 'raymer_physics';
}

/**
 * Compute minimum skin thickness from buckling constraint (plate buckling).
 * σ_cr = k_c · π² · E / (12(1-ν²)) · (t/b)²
 * For a simply-supported plate under compression: k_c ≈ 4.0
 * We design for 1.5× the operating compressive stress.
 */
function computeMinSkinThickness(
  panelWidthM: number,
  compressiveStressPa: number,
  mat: MaterialProperties,
  safetyFactor: number
): number {
  const nu = 0.33; // Poisson's ratio for metals (approx)
  const k_c = 4.0; // simply-supported plate in compression

  // Required critical stress = operating stress × safety factor
  const sigma_cr_required = compressiveStressPa * safetyFactor;

  // t = b * sqrt(12 * σ_cr * (1-ν²) / (k_c * π² * E))
  const E_pa = mat.elastic_modulus * 1e9;
  const t = panelWidthM * Math.sqrt(
    (12 * sigma_cr_required * (1 - nu * nu)) / (k_c * Math.PI * Math.PI * E_pa)
  );

  // Clamp: 0.5 mm minimum (manufacturing), 5 mm maximum (wing skin)
  return Math.max(0.0005, Math.min(0.005, t));
}

/**
 * Compute operating compressive stress at wing skin from bending.
 * At the root, the skin on the upper surface experiences compression:
 * σ_skin = M_root · y_skin / I_spar ≈ M_root / (chord · t_spar · h)
 */
function computeSkinCompressiveStress(
  rootBendingMomentNm: number,
  rootChordM: number,
  sparHeightM: number
): number {
  // Approximate: the skin panel between spars carries a fraction of the bending load.
  // Conservative estimate: full bending stress on the skin width between spars.
  const skinPanelWidth = 0.35 * rootChordM; // spar-to-spar distance
  return rootBendingMomentNm / Math.max(1e-6, skinPanelWidth * sparHeightM * sparHeightM / 6);
}

/**
 * Full physics-based structural mass estimation.
 *
 * Key difference from the old model:
 * - Old: wingMass = MTOW × 0.10 (completely geometry-blind)
 * - New: wingMass = ρ × (S_skin × t_skin + V_spar + V_ribs) × assembly_factor
 */
export function computeStructuralMass(
  params: LegacyWingPayload,
  req: DesignRequirements,
  aero: { S: number; AR: number }
): MassBreakdown {
  const mat: MaterialProperties = MATERIALS_DB[req.material] || MATERIALS_DB.al2024;

  // --- Geometry ---
  const rootChordM = Math.max(0.05, params.Cr);
  const tipChordM = Math.max(0.01, params.Ct);
  const spanM = Math.max(0.1, params.b);
  const semiSpanM = spanM / 2;
  const tOverC = nacaThicknessRatio(params.nacaCode);
  const taperRatio = tipChordM / rootChordM;
  const sweepRad = (params.sweep_deg * Math.PI) / 180;
  const avgChordM = (rootChordM + tipChordM) / 2;
  const wingAreaM2 = aero.S || (spanM * avgChordM);

  // --- Load conditions ---
  const loadFactorG = req.maneuver_load_factor_g ?? 2.5;
  const totalWeightN = req.estimated_weight_kg * 9.81;
  const totalLiftN = totalWeightN * loadFactorG;

  // Root bending moment: M = (L/2) × (b/4) for elliptic loading (Raymer)
  const rootBendingMomentNm = (totalLiftN / 2) * (spanM / 4);

  // --- Spar geometry (2-spar box) ---
  const sparHeightM = 0.55 * rootChordM * Math.max(0.05, tOverC);
  const sparWidthM = 0.35 * rootChordM;

  // Spar wall thickness: sized to carry bending load with safety factor
  const yieldStressPa = mat.yield_strength * 1e6;
  const requiredSectionModulus = rootBendingMomentNm / (yieldStressPa / (req.safety_factor || 2.5));
  // For hollow box: Z ≈ 2 × sparWidthM × sparHeightM × tWall → tWall = Z / (2 × w × h)
  const sparWallThicknessM = Math.max(
    0.001, // 1 mm minimum manufacturing
    Math.min(
      0.015, // 15 mm maximum (even carbon doesn't need more)
      requiredSectionModulus / (2 * sparWidthM * sparHeightM)
    )
  );

  // --- 1. SKIN MASS ---
  // Skin area ≈ wetted area of the wing (upper + lower + leading/trailing edge)
  const wettedAreaM2 = wingAreaM2 * 2.1; // factor for leading/trailing edge wetted area
  const compressiveStressPa = computeSkinCompressiveStress(rootBendingMomentNm, rootChordM, sparHeightM);
  const skinThicknessM = computeMinSkinThickness(
    sparWidthM * 0.5, // panel width between stringers
    compressiveStressPa,
    mat,
    req.safety_factor || 2.5
  );
  const skinKg = wettedAreaM2 * skinThicknessM * mat.density;

  // --- 2. SPAR MASS (2 spars: main spar at 25% chord, rear spar at 60% chord) ---
  // Each spar runs from root to tip, with taper in height
  const tipSparHeightM = sparHeightM * taperRatio;
  const avgSparHeightM = (sparHeightM + tipSparHeightM) / 2;

  // Spar wall cross-section area: 2 × (w × t + h × t) ≈ 2 × t × (w + h)
  const sparCrossSectionM2 = 2 * sparWallThicknessM * (sparWidthM + avgSparHeightM);

  // Path length along spar (accounting for sweep)
  const sparLengthM = semiSpanM / Math.cos(sweepRad);

  // Two spars (main + rear), the rear spar is ~70% the mass of the main spar
  const mainSparMass = sparCrossSectionM2 * sparLengthM * mat.density;
  const rearSparMass = mainSparMass * 0.7;

  // Spar caps (reinforcement strips at top and bottom of box)
  const sparCapThickness = sparWallThicknessM * 1.5;
  const sparCapWidth = sparWidthM * 0.3;
  const sparCapArea = 2 * sparCapWidth * sparCapThickness; // top + bottom
  const sparCapMass = sparCapArea * sparLengthM * mat.density * 2; // for both spars

  const sparsKg = mainSparMass + rearSparMass + sparCapMass;

  // --- 3. RIB MASS ---
  // Ribs every 0.4 m along the span, plus at root, tip, and spar intersections
  const ribSpacingM = 0.4;
  const numRibs = Math.max(3, Math.ceil(spanM / ribSpacingM) + 1);

  // Each rib is an elliptical/circular plate fitting inside the airfoil
  // Average rib chord
  const avgRibChordM = avgChordM;
  const ribHeightM = avgRibChordM * tOverC; // height = chord × t/c
  const ribAreaM2 = Math.PI * (avgRibChordM / 2) * (ribHeightM / 2) * 0.6; // elliptic with 0.6 fill factor
  const ribThicknessM = Math.max(0.0008, 0.0015 * rootChordM); // 0.8-1.5 mm depending on scale

  // Lightening holes in ribs: reduce mass by 40%
  const ribLighteningFactor = 0.6;
  const ribsKg = numRibs * ribAreaM2 * ribThicknessM * mat.density * ribLighteningFactor;

  // --- 4. TRAILING EDGE MASS ---
  // TE flap structure, hinges, actuators (simplified: ~15% of skin mass)
  const trailingEdgeKg = skinKg * 0.15;

  // --- 5. ASSEMBLY FACTOR ---
  // Fasteners, adhesive, sealant, fittings, paint, reinforcement patches
  // 12% for metals, 8% for composites (less fasteners, more adhesive)
  const isComposite = req.material.includes('carbon') || req.material === 'fiberglass' ||
                       req.material === 'fiberglass_s2' || req.material === 'hybrid';
  const assemblyFactor = isComposite ? 1.08 : 1.12;

  const subtotalKg = skinKg + sparsKg + ribsKg + trailingEdgeKg;
  const assemblyKg = subtotalKg * (assemblyFactor - 1);
  const totalKg = subtotalKg * assemblyFactor;

  // --- Sanity checks ---
  // Minimum wing mass: at least 2 kg even for the smallest wing (manufacturing reality)
  const minimumWingMassKg = Math.max(2.0, wingAreaM2 * 0.3); // at least 0.3 kg/m²
  const finalTotalKg = Math.max(minimumWingMassKg, totalKg);

  return {
    skinKg: parseFloat(skinKg.toFixed(3)),
    sparsKg: parseFloat(sparsKg.toFixed(3)),
    ribsKg: parseFloat(ribsKg.toFixed(3)),
    trailingEdgeKg: parseFloat(trailingEdgeKg.toFixed(3)),
    assemblyKg: parseFloat(assemblyKg.toFixed(3)),
    totalKg: parseFloat(finalTotalKg.toFixed(2)),
    skinThicknessMm: parseFloat((skinThicknessM * 1000).toFixed(2)),
    sparWallThicknessMm: parseFloat((sparWallThicknessM * 1000).toFixed(2)),
    numRibs,
    referenceMethod: 'raymer_physics',
  };
}

/**
 * Quick sanity check: is the mass estimate physically plausible?
 * Returns true if the estimate is within reasonable bounds.
 */
export function isMassEstimatePlausible(
  massKg: number,
  wingAreaM2: number,
  material: StructuralMaterial
): { plausible: boolean; reason?: string } {
  const wingLoading = massKg / Math.max(0.01, wingAreaM2);

  // Material-specific wing loading bounds (kg/m²)
  const bounds: Record<string, [number, number]> = {
    wood: [1.5, 12],
    fiberglass: [2, 10],
    al2024: [3, 15],
    al7075: [2.5, 13],
    carbon: [1, 8],
    carbon_t300: [1.2, 9],
    carbon_t700: [1, 8],
    fiberglass_s2: [1.8, 10],
    titanium: [4, 20],
    steel4130: [5, 25],
    hybrid: [1.5, 10],
  };

  const [minLoad, maxLoad] = bounds[material] || [2, 15];

  if (wingLoading < minLoad) {
    return { plausible: false, reason: `Wing loading ${wingLoading.toFixed(2)} kg/m² is below minimum ${minLoad} kg/m² for ${material}` };
  }
  if (wingLoading > maxLoad) {
    return { plausible: false, reason: `Wing loading ${wingLoading.toFixed(2)} kg/m² exceeds maximum ${maxLoad} kg/m² for ${material}` };
  }

  return { plausible: true };
}
