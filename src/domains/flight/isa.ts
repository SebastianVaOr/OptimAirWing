/**
 * ISA (International Standard Atmosphere) Model
 *
 * Derivation from first principles (ICAO Standard Atmosphere):
 *
 * T(h) = T₀ - L·h          [K]   (troposphere, h < 11 km)
 * p(h) = p₀·(T/T₀)^(g₀/(R·L))  [Pa]
 * ρ(h) = ρ₀·(T/T₀)^(g₀/(R·L)-1) [kg/m³]
 *
 * Constants:
 *   T₀ = 288.15 K (15°C at sea level)
 *   p₀ = 101325 Pa
 *   ρ₀ = 1.225 kg/m³
 *   L  = 0.0065 K/m (temperature lapse rate)
 *   g₀ = 9.80665 m/s²
 *   R  = 287.05 J/(kg·K) (specific gas constant for dry air)
 *   γ  = 1.4 (ratio of specific heats)
 *
 * Validity: h < 11 km (troposphere), M < 0.3 (incompressible assumption)
 *
 * References:
 *   - Anderson, J.D. (2017). Fundamentals of Aerodynamics, Ch. 2.
 *   - ICAO Standard Atmosphere (1993).
 *   - Raymer, D.P. (2018). Aircraft Design: A Conceptual Approach, Ch. 4.
 */

export interface ISAConstants {
  T0: number;
  p0: number;
  rho0: number;
  lapseRate: number;
  g0: number;
  R: number;
  gamma: number;
  mu0: number;      // Sea level dynamic viscosity
  SuthC1: number;   // Sutherland's constant C₁
  SuthC2: number;   // Sutherland's constant C₂
}

export const ISA: ISAConstants = {
  T0: 288.15,
  p0: 101325,
  rho0: 1.225,
  lapseRate: 0.0065,
  g0: 9.80665,
  R: 287.05,
  gamma: 1.4,
  mu0: 1.7894e-5,
  SuthC1: 1.458e-6,
  SuthC2: 110.4,
};

export interface ISAResult {
  altitude_m: number;
  temperature_K: number;
  pressure_Pa: number;
  density_kg_m3: number;
  speedOfSound_m_s: number;
  dynamicViscosity_Pa_s: number;
  kinematicViscosity_m2_s: number;
  layer: 'troposphere' | 'stratosphere_low' | 'stratosphere_high';
}

/**
 * Compute ISA atmospheric properties at a given altitude.
 *
 * Troposphere (0-11 km): T decreases linearly at L = 6.5 K/km
 * Stratosphere (11-20 km): T ≈ constant at 216.65 K
 */
export function computeISA(altitude_m: number): ISAResult {
  const h = Math.max(0, altitude_m);

  let T: number;
  let p: number;
  let rho: number;
  let layer: ISAResult['layer'];

  if (h <= 11000) {
    // Troposphere
    T = ISA.T0 - ISA.lapseRate * h;
    p = ISA.p0 * Math.pow(T / ISA.T0, ISA.g0 / (ISA.R * ISA.lapseRate));
    rho = ISA.rho0 * Math.pow(T / ISA.T0, ISA.g0 / (ISA.R * ISA.lapseRate) - 1);
    layer = 'troposphere';
  } else if (h <= 20000) {
    // Lower stratosphere (isothermal at T = 216.65 K)
    T = 216.65;
    const p11 = ISA.p0 * Math.pow(216.65 / ISA.T0, ISA.g0 / (ISA.R * ISA.lapseRate));
    p = p11 * Math.exp(-ISA.g0 * (h - 11000) / (ISA.R * T));
    rho = p / (ISA.R * T);
    layer = 'stratosphere_low';
  } else {
    // Upper stratosphere (simplified: extrapolation)
    T = 216.65 + 0.001 * (h - 20000);
    const p11 = ISA.p0 * Math.pow(216.65 / ISA.T0, ISA.g0 / (ISA.R * ISA.lapseRate));
    const p20 = p11 * Math.exp(-ISA.g0 * 9000 / (ISA.R * 216.65));
    p = p20 * Math.pow(216.65 / T, ISA.g0 / (ISA.R * 0.001));
    rho = p / (ISA.R * T);
    layer = 'stratosphere_high';
  }

  const a = Math.sqrt(ISA.gamma * ISA.R * T);
  const mu = ISA.SuthC1 * Math.pow(T, 1.5) / (T + ISA.SuthC2);
  const nu = mu / rho;

  return {
    altitude_m: h,
    temperature_K: T,
    pressure_Pa: p,
    density_kg_m3: rho,
    speedOfSound_m_s: a,
    dynamicViscosity_Pa_s: mu,
    kinematicViscosity_m2_s: nu,
    layer,
  };
}
