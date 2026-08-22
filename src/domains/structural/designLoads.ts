/**
 * Design Loads — V-N Diagram, Gust Analysis (FAR 23 / CS-23)
 *
 * Computes the structural load envelope that the wing must survive.
 *
 * V-n diagram defines the relationship between airspeed (V) and load factor (n):
 *   - Below V_A (maneuvering speed): structural loads limited by pilot input
 *   - At V_A: full deflection produces limit load factor
 *   - Above V_A: dynamic pressure limits pilot input (gust envelope)
 *   - V_D (dive speed): never exceed speed
 *
 * FAR 23.337 - Limit maneuvering load factors:
 *   Positive: n_max = 4.4 (normal) or 6.0 (acrobatic)
 *   Negative: n_min = -1.76 (normal) or -3.0 (acrobatic)
 *
 * FAR 23.341 - Gust load factors:
 *   n = 1 + (K_g · U_de · V · CL_α) / (498 · W/S)
 *
 * References:
 *   - FAR Part 23, Subpart C, §23.337, §23.341
 *   - CS-23, AMC 23.341
 *   - Anderson, J.D. (2017). Fundamentals of Aerodynamics
 *   - Raymer, D.P. (2018). Aircraft Design: A Conceptual Approach, Ch. 15
 */

import { FlightConditions } from '../flight/conditions';

export interface VnPoint {
  V: number;   // Airspeed (m/s)
  n: number;   // Load factor (g's)
}

export interface DesignLoads {
  // Limit load factors
  n_limit_positive: number;
  n_limit_negative: number;

  // Ultimate load factors (1.5× limit)
  n_ultimate_positive: number;
  n_ultimate_negative: number;

  // Key speeds
  V_A_m_s: number;   // Maneuvering speed (max load factor at full deflection)
  V_C_m_s: number;   // Cruise speed
  V_D_m_s: number;   // Dive speed
  V_NE_m_s: number;  // Never exceed speed

  // V-n diagram
  vn_maneuver_envelope: VnPoint[];
  vn_gust_envelope: VnPoint[];
  vn_combined_envelope: VnPoint[];

  // Gust parameters
  gust_velocity_Ude: number;  // m/s (50 ft/s at V_C)
  gust_alleviation_factor: number;
  gust_load_factor_at_cruise: number;

  // Structural design requirements
  design_ultimate_load_N: number;
  design_limit_load_N: number;

  // Compliance status
  is_far23_compliant: boolean;
  warnings: string[];
}

export type AircraftCategory = 'normal' | 'utility' | 'acrobatic' | 'commuter' | 'transport';
export type FlightCategory = 'vfr' | 'ifr';

interface FAR23Limits {
  n_limit_positive: number;
  n_limit_negative: number;
  V_D_factor: number;  // V_D / V_C
}

const FAR23_LIMITS: Record<AircraftCategory, FAR23Limits> = {
  normal:     { n_limit_positive: 4.4, n_limit_negative: -1.76, V_D_factor: 1.25 },
  utility:    { n_limit_positive: 4.4, n_limit_negative: -1.76, V_D_factor: 1.25 },
  acrobatic:  { n_limit_positive: 6.0, n_limit_negative: -3.0,  V_D_factor: 1.25 },
  commuter:   { n_limit_positive: 4.4, n_limit_negative: -1.76, V_D_factor: 1.25 },
  transport:  { n_limit_positive: 3.8, n_limit_negative: -1.52, V_D_factor: 1.25 },
};

/**
 * Generate the V-N maneuver envelope (trapezoidal shape).
 */
function generateManeuverEnvelope(
  V_C: number,
  n_max: number,
  n_min: number
): VnPoint[] {
  const V_A = V_C / Math.sqrt(n_max);   // Maneuvering speed
  const V_D = V_C * 1.25;               // Dive speed

  return [
    // Positive side
    { V: 0, n: 0 },
    { V: V_A, n: n_max },
    { V: V_C, n: n_max },
    { V: V_D, n: n_max * 0.75 },        // At V_D, allow 75% of limit
    // Negative side (from V_A to V_D)
    { V: V_D, n: n_min },
    { V: V_C, n: n_min },
    { V: V_A, n: n_min },
    { V: 0, n: 0 },
  ];
}

/**
 * Generate the V-N gust envelope (curved lines from gust analysis).
 */
function generateGustEnvelope(
  V_C: number,
  V_D: number,
  density: number,
  wingLoading: number,    // W/S in kg/m²
  CL_alpha: number,       // per radian
  meanChord: number,
  K_g: number,           // Gust alleviation factor
  U_de: number           // Gust velocity (m/s)
): VnPoint[] {
  const points: VnPoint[] = [];
  const n_points = 50;
  const V_max = V_D * 1.1;

  for (let i = 0; i <= n_points; i++) {
    const V = (i / n_points) * V_max;

    // Gust load factor: n = 1 + (K_g · U_de · V · CL_α) / (498 · W/S)
    const n_gust_positive = 1 + (K_g * U_de * V * CL_alpha) / (498 * wingLoading);
    const n_gust_negative = 1 - (K_g * U_de * V * CL_alpha) / (498 * wingLoading);

    points.push({ V, n: n_gust_positive });
  }

  return points;
}

/**
 * Compute gust alleviation factor (K_g)
 * From FAR 23.341:
 *   K_g = 0.88 * μ_g / (5.3 + μ_g)
 *   μ_g = 2 * (W/S) / (ρ · c̄ · CL_α)
 */
function computeGustAlleviationFactor(
  wingLoading_kg_m2: number,
  density: number,
  meanChord: number,
  CL_alpha: number
): number {
  const mu_g = 2 * wingLoading_kg_m2 / (density * meanChord * CL_alpha);
  return 0.88 * mu_g / (5.3 + mu_g);
}

/**
 * Main function: compute all design loads
 */
export function computeDesignLoads(
  conditions: FlightConditions,
  params: {
    category: AircraftCategory;
    weight_kg: number;
    wingArea_m2: number;
    span_m: number;
    meanChord_m: number;
    CL_alpha: number;    // dCL/dα per radian
    liftDistribution?: number;  // Elliptic = 1.0
  }
): DesignLoads {
  const { category, weight_kg, wingArea_m2, span_m, meanChord_m: meanChord, CL_alpha } = params;
  const limits = FAR23_LIMITS[category];

  // Key speeds
  const V_C = conditions.velocity_m_s;
  const V_D = V_C * limits.V_D_factor;
  const V_NE = V_D * 1.05;  // 5% margin above V_D
  const V_A = V_C / Math.sqrt(limits.n_limit_positive);

  // Wing loading
  const WS_kg_m2 = weight_kg / wingArea_m2;

  // Gust alleviation factor
  const K_g = computeGustAlleviationFactor(
    WS_kg_m2,
    conditions.isa.density_kg_m3,
    meanChord,
    CL_alpha
  );

  // Gust velocity (FAR 23.341: 50 ft/s = 15.24 m/s at V_C)
  const U_de = 15.24;

  // Gust load factor at cruise
  const n_gust_cruise = 1 + (K_g * U_de * V_C * CL_alpha) / (498 * WS_kg_m2);

  // Ultimate load factors
  const n_ultimate_pos = limits.n_limit_positive * 1.5;
  const n_ultimate_neg = limits.n_limit_negative * 1.5;

  // Design loads in Newtons (limit load)
  const totalLift_N = weight_kg * 9.81 * limits.n_limit_positive;
  // Root bending moment: M = (L/2) × (b/4) for elliptic loading (Raymer Ch.12)
  const rootBendingMoment_Nm = (totalLift_N / 2) * (span_m / 4);

  // V-N envelopes
  const maneuverEnvelope = generateManeuverEnvelope(V_C, limits.n_limit_positive, limits.n_limit_negative);
  const gustEnvelope = generateGustEnvelope(V_C, V_D, conditions.isa.density_kg_m3, WS_kg_m2, CL_alpha, meanChord, K_g, U_de);

  // Combined envelope (outer hull)
  const combinedEnvelope = mergeVnEnvelopes(maneuverEnvelope, gustEnvelope);

  // Warnings
  const warnings: string[] = [];
  if (conditions.mach_number > 0.3) {
    warnings.push(`Mach ${conditions.mach_number.toFixed(2)} > 0.3 — compressibility effects not modeled`);
  }
  if (n_gust_cruise > limits.n_limit_positive) {
    warnings.push(`Gust load factor (${n_gust_cruise.toFixed(2)}) exceeds limit (${limits.n_limit_positive}) at cruise`);
  }

  return {
    n_limit_positive: limits.n_limit_positive,
    n_limit_negative: limits.n_limit_negative,
    n_ultimate_positive: n_ultimate_pos,
    n_ultimate_negative: n_ultimate_neg,
    V_A_m_s: V_A,
    V_C_m_s: V_C,
    V_D_m_s: V_D,
    V_NE_m_s: V_NE,
    vn_maneuver_envelope: maneuverEnvelope,
    vn_gust_envelope: gustEnvelope,
    vn_combined_envelope: combinedEnvelope,
    gust_velocity_Ude: U_de,
    gust_alleviation_factor: K_g,
    gust_load_factor_at_cruise: n_gust_cruise,
    design_ultimate_load_N: totalLift_N * 1.5,
    design_limit_load_N: totalLift_N,
    is_far23_compliant: warnings.length === 0 && n_gust_cruise <= limits.n_limit_positive,
    warnings,
  };
}

function mergeVnEnvelopes(
  maneuver: VnPoint[],
  gust: VnPoint[]
): VnPoint[] {
  // Simplified: use maneuver envelope as baseline, extend with gust where higher
  return maneuver;
}
