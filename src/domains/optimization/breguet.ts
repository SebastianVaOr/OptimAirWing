/**
 * Breguet Range Equation
 *
 * The fundamental relationship for aircraft range:
 *   R = (V / c) × (L/D) × ln(W_initial / W_final)
 *
 * where:
 *   V = cruise velocity (m/s)
 *   c = specific fuel consumption (1/s or 1/m)
 *   L/D = lift-to-drag ratio
 *   W_initial = takeoff weight (N)
 *   W_final = landing weight (N)
 *
 * For electric aircraft (SFC = 0), endurance is limited by battery capacity:
 *   E = W_battery × η_motor / P_required
 *   P_required = D × V = W / (L/D) × V
 *
 * References:
 *   - Anderson, J.D. (2017). Fundamentals of Aerodynamics, Ch. 6
 *   - Raymer, D.P. (2018). Aircraft Design: A Conceptual Approach, Ch. 5
 */

export interface BreguetResult {
  range_km: number;
  endurance_h: number;
  fuel_fraction: number;  // W_fuel / W_initial
  optimal_CL: number;
  optimal_V: number;
  optimal_LD: number;
  weight_breakdown: {
    W_empty: number;
    W_fuel: number;
    W_payload: number;
    W_total: number;
  };
}

/**
 * Compute range using Breguet equation.
 */
export function breguetRange(params: {
  V_ms: number;         // Cruise velocity (m/s)
  SFC: number;          // Specific fuel consumption (1/s for piston, ~0 for electric)
  LD: number;           // Lift-to-drag ratio
  W_initial_N: number;  // Takeoff weight (N)
  W_fuel_N: number;     // Fuel weight (N)
}): BreguetResult {
  const { V_ms, SFC, LD, W_initial_N, W_fuel_N } = params;

  const W_final = W_initial_N - W_fuel_N;
  const fuelFraction = W_fuel_N / W_initial_N;

  // Breguet range
  let range_km: number;
  let endurance_h: number;

  if (SFC > 0) {
    // Powered aircraft: R = (V/c) * (L/D) * ln(Wi/Wf)
    range_km = (V_ms / SFC) * LD * Math.log(W_initial_N / Math.max(1, W_final)) / 1000;
    endurance_h = (1 / SFC) * LD * Math.log(W_initial_N / Math.max(1, W_final)) / 3600;
  } else {
    // Electric: endurance limited by battery capacity
    // P_required = W / (L/D) * V
    const P_required = (W_initial_N / LD) * V_ms;
    endurance_h = (params.W_fuel_N * 0.9) / P_required / 3600;  // 90% efficiency
    range_km = V_ms * endurance_h;
  }

  // Optimal conditions (for fixed weight):
  // CL_optimal = sqrt(CD0 * π * e * AR)
  // V_optimal = sqrt(2 * W / (ρ * S * CL_optimal))
  // LD_max = 0.5 * sqrt(π * e * AR / CD0)

  return {
    range_km: Math.max(0, range_km),
    endurance_h: Math.max(0, endurance_h),
    fuel_fraction: fuelFraction,
    optimal_CL: 0,  // Filled by caller
    optimal_V: V_ms,
    optimal_LD: LD,
    weight_breakdown: {
      W_empty: W_initial_N * 0.45,
      W_fuel: W_fuel_N,
      W_payload: W_initial_N * 0.25,
      W_total: W_initial_N,
    },
  };
}

/**
 * Optimize cruise conditions for maximum range.
 * Finds the altitude and velocity that maximize Breguet range.
 */
export function optimizeForMaxRange(params: {
  weight_kg: number;
  wingArea_m2: number;
  SFC: number;
  CD0: number;
  e_oswald: number;
  AR: number;
  fuelFraction: number;
  altitudeRange: [number, number];
  velocityRange: [number, number];
}): {
  optimalAltitude_m: number;
  optimalVelocity_ms: number;
  maxRange_km: number;
  optimalLD: number;
} {
  const { weight_kg, wingArea_m2, SFC, CD0, e_oswald, AR, fuelFraction, altitudeRange, velocityRange } = params;
  const W = weight_kg * 9.81;
  const W_fuel = W * fuelFraction;

  let bestRange = 0;
  let bestAlt = altitudeRange[0];
  let bestVel = velocityRange[0];
  let bestLD = 0;

  // Grid search (fine enough for conceptual design)
  for (let h = altitudeRange[0]; h <= altitudeRange[1]; h += 100) {
    // ISA density
    const rho = 1.225 * Math.pow(1 - 0.0065 * h / 288.15, 4.256);

    for (let V = velocityRange[0]; V <= velocityRange[1]; V += 1) {
      // Lift coefficient
      const CL = (2 * W) / (rho * wingArea_m2 * V * V);

      // Drag coefficient
      const CDi = CL * CL / (Math.PI * AR * e_oswald);
      const CD = CD0 + CDi;
      const LD = CL / CD;

      // Range
      const result = breguetRange({ V_ms: V, SFC, LD, W_initial_N: W, W_fuel_N: W_fuel });

      if (result.range_km > bestRange) {
        bestRange = result.range_km;
        bestAlt = h;
        bestVel = V;
        bestLD = LD;
      }
    }
  }

  return {
    optimalAltitude_m: bestAlt,
    optimalVelocity_ms: bestVel,
    maxRange_km: bestRange,
    optimalLD: bestLD,
  };
}
