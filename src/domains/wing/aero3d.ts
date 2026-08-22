/**
 * 3D Aerodynamic Analysis — NeuralFoil 2D + VLM 3D Coupling
 *
 * Combines:
 *   1. NeuralFoil for 2D section data (CL_alpha, CD_polar, transition)
 *   2. VLM for 3D effects (sweep, taper, twist, induced drag)
 *
 * This gives Master's-level accuracy at conceptual design speed.
 */

import { LegacyWingPayload } from '../../core/types';
import { FlightConditions } from '../flight/conditions';
import { getNeuralFoilAero, NeuralFoilResult } from './neuralfoil/index';
import { solveVLM, VLMResult, VLMSolverInput } from './vlm/solver';

export interface Aero3DResult {
  // 2D section data (from NeuralFoil)
  section2D: NeuralFoilResult;

  // 3D results (from VLM)
  CL_3D: number;
  CDi_3D: number;
  CD_total_3D: number;
  LD_3D: number;
  Cm_3D: number;

  // Oswald efficiency
  e_oswald: number;

  // CL distribution (for structural loading)
  CL_distribution: number[];

  // Warnings
  warnings: string[];
}

/**
 * Compute full 3D aerodynamics for a wing.
 */
export async function compute3DAero(
  params: LegacyWingPayload,
  flight: FlightConditions,
  cd0_polar?: number
): Promise<Aero3DResult> {
  // 1. Get 2D section data from NeuralFoil
  const section2D = await getNeuralFoilAero(
    params.nacaCode,
    params.alpha_deg,
    flight.reynolds_number,
    flight.altitude_m,
    9  // Ncrit
  );

  // 2. Compute CL_alpha from NeuralFoil polar (finite difference)
  const dAlpha = 0.5;
  const upper = await getNeuralFoilAero(
    params.nacaCode,
    params.alpha_deg + dAlpha,
    flight.reynolds_number,
    flight.altitude_m
  );
  const lower = await getNeuralFoilAero(
    params.nacaCode,
    params.alpha_deg - dAlpha,
    flight.reynolds_number,
    flight.altitude_m
  );
  const CL_alpha_2d = ((upper.CL - lower.CL) / (2 * dAlpha)) * (180 / Math.PI); // per radian

  // 3. Run VLM for 3D effects
  const taperRatio = Math.max(0.05, params.Ct / params.Cr);

  const vlmInput: VLMSolverInput = {
    wing: {
      n_panels_spanwise: 20,
      span_m: params.b,
      rootChord_m: params.Cr,
      taperRatio,
      sweep_deg: params.sweep_deg,
      twist_deg: params.twist_deg,
      CL_alpha_2d,
      CL_max_2d: 1.4,
      alpha_stall_2d: 12,
    },
    flight: {
      V_inf: flight.velocity_m_s,
      rho: flight.isa.density_kg_m3,
      alpha_deg: params.alpha_deg,
    },
  };

  const vlmResult = solveVLM(vlmInput);

  // 4. Compute total drag: CD = CD0 + CDi
  // CD0 from NeuralFoil + skin friction correction
  const CD0 = cd0_polar ?? section2D.CD;
  const CD_total = CD0 + vlmResult.CDi;

  // 5. Compute L/D
  const LD = vlmResult.CL_3D / Math.max(0.001, CD_total);

  // 6. CM (approximately same as 2D for small sweep)
  const Cm = section2D.CM * Math.cos(params.sweep_deg * Math.PI / 180);

  return {
    section2D,
    CL_3D: vlmResult.CL_3D,
    CDi_3D: vlmResult.CDi,
    CD_total_3D: CD_total,
    LD_3D: LD,
    Cm_3D: Cm,
    e_oswald: vlmResult.efficiency_factor,
    CL_distribution: vlmResult.CL_distribution,
    warnings: vlmResult.warnings,
  };
}
