/**
 * Flight Conditions Engine
 *
 * Core module that computes all flight conditions from user inputs.
 * Supports 4 modes of operation:
 *
 * Basic:      User selects mission preset → software injects V, h
 * Intermediate: User specifies V and h directly
 * Advanced:   User provides W, S, CL → software derives V = sqrt(2·(W/S)/(ρ·CL))
 * Auto:       MDO optimizer finds optimal V, h for mission requirements
 *
 * All computation runs client-side in WASM/browser (< 1 ms).
 */

import { computeISA, ISAResult } from './isa';
import { MissionPreset, MISSION_PRESETS } from './presets';

export type FlightMode = 'basic' | 'intermediate' | 'advanced' | 'auto';

export interface MissionInput {
  mode: FlightMode;

  // Basic mode
  missionPresetId?: string;

  // Intermediate mode
  velocity_m_s?: number;
  altitude_m?: number;

  // Advanced mode
  weight_kg?: number;
  wingArea_m2?: number;
  targetCL?: number;

  // Auto-optimization mode
  range_km?: number;
  endurance_h?: number;
  takeoffDistance_m?: number;
}

export interface FlightConditions {
  // State
  altitude_m: number;
  velocity_m_s: number;

  // ISA properties
  isa: ISAResult;

  // Derived quantities
  dynamicPressure_Pa: number;
  reynolds_number: number;
  reynolds_per_meter: number;
  mach_number: number;

  // Wing loading
  wingLoading_kg_m2: number;
  wingLoading_N_m2: number;

  // Derived extreme speeds
  V_gust_m_s: number;
  V_dive_m_s: number;
  V_flutter_limit_m_s: number;

  // Load factors (FAR 23 baseline)
  n_gust: number;
  n_dive: number;
  n_stall: number;

  // Stall speed
  V_stall_m_s: number;

  // Source
  mode: FlightMode;
  presetUsed?: MissionPreset;
}

/**
 * Core function: compute all flight conditions from a mission input.
 */
export function computeFlightConditions(
  input: MissionInput,
  params: {
    meanChord_m: number;
    wingArea_m2: number;
    totalWeight_kg: number;
    CL_max: number;
    AR: number;
    CL_alpha: number;
  }
): FlightConditions {
  const { meanChord_m, wingArea_m2, totalWeight_kg, CL_max, AR, CL_alpha } = params;

  let altitude_m: number;
  let velocity_m_s: number;
  let CL_cruise: number;
  let presetUsed: MissionPreset | undefined;

  switch (input.mode) {
    case 'basic': {
      presetUsed = MISSION_PRESETS.find(p => p.id === (input.missionPresetId ?? 'recon_drone'))
        ?? MISSION_PRESETS[0];
      altitude_m = presetUsed.altitude_m;
      velocity_m_s = presetUsed.velocity_m_s;
      CL_cruise = presetUsed.CL_cruise;
      break;
    }

    case 'intermediate': {
      altitude_m = input.altitude_m ?? 0;
      velocity_m_s = input.velocity_m_s ?? 20;
      CL_cruise = (2 * totalWeight_kg * 9.81) / (computeISA(altitude_m).density_kg_m3 * wingArea_m2 * velocity_m_s ** 2);
      break;
    }

    case 'advanced': {
      altitude_m = input.altitude_m ?? 0;
      const weight = (input.weight_kg ?? totalWeight_kg) * 9.81;
      const area = input.wingArea_m2 ?? wingArea_m2;
      CL_cruise = input.targetCL ?? 0.6;
      const isa = computeISA(altitude_m);
      velocity_m_s = Math.sqrt((2 * weight / area) / (isa.density_kg_m3 * CL_cruise));
      break;
    }

    case 'auto': {
      // Optimized cruise conditions for maximum Breguet range
      // L/D_max occurs approximately at CL = sqrt(CD0 * π * e * AR)
      altitude_m = input.altitude_m ?? 1500;
      CL_cruise = 0.65;  // Typical optimal
      const isa_auto = computeISA(altitude_m);
      const WS = totalWeight_kg * 9.81 / wingArea_m2;
      velocity_m_s = Math.sqrt((2 * WS) / (isa_auto.density_kg_m3 * CL_cruise));
      break;
    }

    default: {
      altitude_m = 0;
      velocity_m_s = 20;
      CL_cruise = 0.5;
    }
  }

  // ISA at altitude
  const isa = computeISA(altitude_m);

  // Dynamic pressure
  const q = 0.5 * isa.density_kg_m3 * velocity_m_s ** 2;

  // Reynolds number
  const Re = isa.density_kg_m3 * velocity_m_s * meanChord_m / isa.dynamicViscosity_Pa_s;
  const RePerMeter = isa.density_kg_m3 * velocity_m_s / isa.dynamicViscosity_Pa_s;

  // Mach
  const M = velocity_m_s / isa.speedOfSound_m_s;

  // Wing loading
  const WS_kg_m2 = totalWeight_kg / wingArea_m2;
  const WS_N_m2 = totalWeight_kg * 9.81 / wingArea_m2;

  // Stall speed: V_stall = sqrt(2W / (ρ·S·CL_max))
  const V_stall = Math.sqrt((2 * totalWeight_kg * 9.81) / (isa.density_kg_m3 * wingArea_m2 * CL_max));

  // Derived extreme speeds (FAR 23.337, 23.341)
  const V_gust = 1.5 * velocity_m_s;      // Gust speed (1.5× cruise)
  const V_dive = 2.0 * velocity_m_s;      // Dive speed (2× cruise)
  const V_flutter = 2.4 * velocity_m_s;   // Flutter margin (2.4× cruise)

  // Gust load factor (simplified FAR 23.341)
  // n = 1 + (K_g · U_de · V · CL_α) / (498 · W/S)
  const U_de = 15.24;  // 50 ft/s gust velocity at V_c
  const mu_g = 2 * totalWeight_kg / (isa.density_kg_m3 * wingArea_m2 * meanChord_m);
  const K_g = 0.88 * mu_g / (5.3 + mu_g);
  const n_gust = 1 + (K_g * U_de * velocity_m_s * CL_alpha) / (498 * WS_kg_m2);

  // Dive load factor
  const n_dive = 0.75 * 4.4;  // Typical FAR 23 limit for normal category

  // Stall load factor
  const n_stall = CL_max / CL_cruise;

  return {
    altitude_m,
    velocity_m_s,
    isa,
    dynamicPressure_Pa: q,
    reynolds_number: Re,
    reynolds_per_meter: RePerMeter,
    mach_number: M,
    wingLoading_kg_m2: WS_kg_m2,
    wingLoading_N_m2: WS_N_m2,
    V_gust_m_s: V_gust,
    V_dive_m_s: V_dive,
    V_flutter_limit_m_s: V_flutter,
    n_gust,
    n_dive,
    n_stall,
    V_stall_m_s: V_stall,
    mode: input.mode,
    presetUsed,
  };
}
