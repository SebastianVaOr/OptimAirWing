/**
 * Pilot-Aircraft Interaction Model
 *
 * Models the human pilot as a dynamic system with:
 *   - Reaction delay (McRuer crossover model)
 *   - Fatigue degradation over time
 *   - Vibration sensitivity
 *   - Control saturation
 *   - Gain adaptation
 *
 * The pilot transfer function (simplified McRuer):
 *   Y_pilot(s) = K_p * e^(-τ·s) * (T_L·s + 1) / (T_I·s + 1)
 *
 * where:
 *   K_p = pilot gain (adaptable, 0.5-10 depending on experience)
 *   τ   = reaction delay (0.15-0.40 s)
 *   T_L = lead time constant (anticipation)
 *   T_I = lag time constant (smoothing)
 *
 * References:
 *   - McRuer, D.T. et al. (1968). "A Review of Quasi-Linear Pilot Models"
 *   - MIL-STD-1797A: Flying Qualities of Piloted Aircraft
 *   - Nelson, R.C. (1998). Flight Stability and Automatic Control
 */

export type PilotType = 'novice' | 'experienced' | 'expert' | 'automated';

export interface PilotProfile {
  type: PilotType;

  // Reaction time
  base_reaction_time_s: number;
  reaction_time_increase_per_hour_s: number;  // Fatigue degradation

  // Control characteristics
  gain_min: number;
  gain_max: number;
  lead_time_constant_s: number;   // Anticipation
  lag_time_constant_s: number;    // Smoothing

  // Control saturation
  controlSaturation: {
    elevator_deg: number;
    aileron_deg: number;
    rudder_deg: number;
  };

  // Environmental sensitivity
  vibration_sensitivity: number;  // 0-1
  crosswind_tolerance_deg: number;
  turbulence_tolerance_g: number;

  // Workload model
  base_workload: number;  // 1-10
  workload_per_g: number;
  workload_per_second_task: number;
}

export const PILOT_PROFILES: Record<PilotType, PilotProfile> = {
  novice: {
    type: 'novice',
    base_reaction_time_s: 0.40,
    reaction_time_increase_per_hour_s: 0.05,
    gain_min: 0.5,
    gain_max: 2.0,
    lead_time_constant_s: 0.1,
    lag_time_constant_s: 0.5,
    controlSaturation: { elevator_deg: 15, aileron_deg: 20, rudder_deg: 25 },
    vibration_sensitivity: 0.8,
    crosswind_tolerance_deg: 10,
    turbulence_tolerance_g: 0.3,
    base_workload: 5,
    workload_per_g: 3,
    workload_per_second_task: 2,
  },
  experienced: {
    type: 'experienced',
    base_reaction_time_s: 0.25,
    reaction_time_increase_per_hour_s: 0.02,
    gain_min: 1.0,
    gain_max: 5.0,
    lead_time_constant_s: 0.2,
    lag_time_constant_s: 0.3,
    controlSaturation: { elevator_deg: 25, aileron_deg: 30, rudder_deg: 30 },
    vibration_sensitivity: 0.3,
    crosswind_tolerance_deg: 20,
    turbulence_tolerance_g: 0.5,
    base_workload: 3,
    workload_per_g: 2,
    workload_per_second_task: 1,
  },
  expert: {
    type: 'expert',
    base_reaction_time_s: 0.15,
    reaction_time_increase_per_hour_s: 0.01,
    gain_min: 2.0,
    gain_max: 10.0,
    lead_time_constant_s: 0.3,
    lag_time_constant_s: 0.2,
    controlSaturation: { elevator_deg: 30, aileron_deg: 30, rudder_deg: 30 },
    vibration_sensitivity: 0.1,
    crosswind_tolerance_deg: 30,
    turbulence_tolerance_g: 1.0,
    base_workload: 2,
    workload_per_g: 1,
    workload_per_second_task: 0.5,
  },
  automated: {
    type: 'automated',
    base_reaction_time_s: 0.05,
    reaction_time_increase_per_hour_s: 0.0,
    gain_min: 5.0,
    gain_max: 20.0,
    lead_time_constant_s: 0.5,
    lag_time_constant_s: 0.1,
    controlSaturation: { elevator_deg: 30, aileron_deg: 30, rudder_deg: 30 },
    vibration_sensitivity: 0.0,
    crosswind_tolerance_deg: 45,
    turbulence_tolerance_g: 2.0,
    base_workload: 1,
    workload_per_g: 0,
    workload_per_second_task: 0,
  },
};

export interface PilotState {
  flight_time_h: number;
  vibration_level_g: number;
  crosswind_deg: number;
  turbulence_g: number;
}

/**
 * Compute effective pilot delay including fatigue and environmental effects
 */
export function computeEffectivePilotDelay(
  profile: PilotProfile,
  state: PilotState
): number {
  const fatigueDelay = state.flight_time_h * profile.reaction_time_increase_per_hour_s;
  const vibrationDelay = state.vibration_level_g * profile.vibration_sensitivity * 0.05;
  const stressDelay =
    (state.crosswind_deg > profile.crosswind_tolerance_deg ? 0.05 : 0) +
    (state.turbulence_g > profile.turbulence_tolerance_g ? 0.05 : 0);

  return profile.base_reaction_time_s + fatigueDelay + vibrationDelay + stressDelay;
}

/**
 * Compute pilot workload rating (1-10, Cooper-Harper style)
 */
export function computePilotWorkload(
  profile: PilotProfile,
  state: PilotState,
  maneuvering_g: number,
  taskCount: number
): number {
  let workload = profile.base_workload;
  workload += (maneuvering_g - 1) * profile.workload_per_g;
  workload += (taskCount - 1) * profile.workload_per_second_task;
  workload *= 1 + state.flight_time_h * 0.05;  // Fatigue increases workload
  return Math.max(1, Math.min(10, workload));
}

/**
 * Cooper-Harper rating from workload and performance
 */
export function cooperHarperRating(
  workload: number,
  maxTrackingError: number,
  timeToRecover_s: number
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 {
  if (workload <= 3 && maxTrackingError < 0.5 && timeToRecover_s < 2) return 1;
  if (workload <= 3 && maxTrackingError < 1.0 && timeToRecover_s < 3) return 2;
  if (workload <= 4 && maxTrackingError < 2.0) return 3;
  if (workload <= 5 && maxTrackingError < 3.0) return 4;
  if (workload <= 6) return 5;
  if (workload <= 7) return 6;
  if (workload <= 8) return 7;
  if (workload <= 9) return 8;
  return 9;
}
