/**
 * Unified Prediction Engine
 *
 * Single entry point for all aerodynamic predictions.
 * Routes to the appropriate backend based on fidelity mode:
 *
 * - 'normal': Lifting-line improved + physics-based mass (client-side)
 * - 'neuralfoil': NeuralFoil 2D + VLM 3D coupling (client-side)
 * - 'advanced': ML Neural Surrogate ONNX (client-side, WebGPU/WASM)
 * - 'cfd_validation': SU2 CFD (future cloud backend)
 */

import {
  FidelityMode,
  LegacyWingPayload,
  DesignRequirements,
  PredictionResultExtended,
  ConfidenceMetrics,
} from '../../core/types';
import { calcularEmpirico } from './empirical';
import { computeStructuralMass } from './structuralMass';
import { computeEstimatedCost } from './penalties';
import { predictWithML } from './mlSurrogate';
import { computeMLConfidence } from './mlConfidence';
import { FlightConditions } from '../flight/conditions';
import { compute3DAero } from './aero3d';

const NORMAL_CONFIDENCE: ConfidenceMetrics = {
  modelVersion: 'lifting-line-v2.1-struct',
  rmsePercent: 8.2,
  samplesInTrainingRange: Infinity,
  distanceFromTrainingCentroid: 0,
  isWithinSafeRange: true,
  warnings: [],
};

interface PredictionInput {
  params: LegacyWingPayload;
  requirements?: DesignRequirements;
  fidelity?: FidelityMode;
  flightConditions?: FlightConditions;
  useLargeML?: boolean;
}

const DEFAULT_REQUIREMENTS: DesignRequirements = {
  sector: 'uav',
  estimated_weight_kg: 5,
  material: 'al2024',
  flight_hours: 500,
  max_budget_eur: 5000,
  safety_factor: 2.0,
};

function computeNormalConfidence(
  params: LegacyWingPayload,
  flight?: FlightConditions
): ConfidenceMetrics {
  const warnings: string[] = [];

  // Compute CL_alpha for confidence estimation
  const dAlpha = 0.5;
  const aeroUp = calcularEmpirico({ ...params, alpha_deg: params.alpha_deg + dAlpha });
  const aeroDn = calcularEmpirico({ ...params, alpha_deg: params.alpha_deg - dAlpha });
  const CL_alpha = Math.abs((aeroUp.CL - aeroDn.CL) / (2 * dAlpha * Math.PI / 180));

  // CL_alpha sanity check
  if (CL_alpha > 10) warnings.push(`CL_alpha = ${CL_alpha.toFixed(1)}/rad — unusually high`);
  if (CL_alpha < 2) warnings.push(`CL_alpha = ${CL_alpha.toFixed(1)}/rad — unusually low`);

  // Distance from training range center
  const AR = (params.b ** 2) / Math.max(0.01, aeroUp.S);
  const distance = Math.sqrt(
    Math.pow((AR - 8) / 8, 2) +
    Math.pow((params.b - 5) / 5, 2) +
    Math.pow((params.alpha_deg - 4) / 8, 2)
  );

  // Compute RMSE estimate based on model complexity
  const baseRMSE = 8.2;
  const reCorrection = flight?.reynolds_number ? Math.pow(1e6 / Math.max(1e5, flight.reynolds_number), 0.15) : 1.0;
  const estimatedRMSE = baseRMSE * reCorrection * (1 + 0.1 * distance);

  return {
    modelVersion: `lifting-line-v2.1-struct-AR${AR.toFixed(0)}`,
    rmsePercent: Number(estimatedRMSE.toFixed(1)),
    samplesInTrainingRange: Infinity,
    distanceFromTrainingCentroid: Number(distance.toFixed(2)),
    isWithinSafeRange: distance < 2.0,
    warnings,
  };
}

export async function predict(input: PredictionInput): Promise<PredictionResultExtended> {
  const { params, fidelity = 'normal', useLargeML = false, flightConditions } = input;
  const requirements = input.requirements ?? DEFAULT_REQUIREMENTS;
  const startTime = performance.now();

  switch (fidelity) {
    case 'normal':
      return predictNormal(params, requirements, flightConditions, startTime);
    case 'advanced':
      return predictAdvanced(params, requirements, useLargeML, flightConditions, startTime);
    case 'neuralfoil':
      return predictNeuralFoil(params, requirements, flightConditions, startTime);
    case 'cfd_validation':
      throw new Error('CFD Validation mode is not yet available.');
    default:
      throw new Error(`Unknown fidelity mode: ${fidelity}`);
  }
}

function predictNormal(
  params: LegacyWingPayload,
  requirements: DesignRequirements,
  flightConditions: FlightConditions | undefined,
  startTime: number
): PredictionResultExtended {
  const aero = calcularEmpirico(params);

  const massBreakdown = computeStructuralMass(params, requirements, {
    S: aero.S,
    AR: aero.AR,
  });

  const costBreakdown = computeEstimatedCost(massBreakdown.totalKg, params, requirements);
  const inferenceTimeMs = performance.now() - startTime;

  return {
    CL: aero.CL,
    CD: aero.CD,
    Cm: aero.Cm ?? 0,
    LD: aero.LD ?? aero.CL / Math.max(0.001, aero.CD),
    S_m2: aero.S,
    AR: aero.AR,
    e: aero.e,
    weight_kg: massBreakdown.totalKg,
    fidelity: 'empirical',
    model_version: 'lifting-line-v2.1-struct',
    timestamp: new Date().toISOString(),
    details: {
      CD0: aero.CD0,
      CDi: aero.CDi,
      alpha0: aero.alpha0,
      a: aero.a,
    },
    fidelityMode: 'normal',
    confidenceMetrics: computeNormalConfidence(params, flightConditions),
    inferenceTimeMs,
  };
}

async function predictAdvanced(
  params: LegacyWingPayload,
  requirements: DesignRequirements,
  useLargeModel: boolean,
  flightConditions: FlightConditions | undefined,
  startTime: number
): Promise<PredictionResultExtended> {
  const mlResult = await predictWithML(params, useLargeModel);

  if (!mlResult) {
    console.warn('[FidelityEngine] ML model not loaded, falling back to normal mode');
    const fallback = predictNormal(params, requirements, flightConditions, startTime);
    fallback.fidelityMode = 'advanced';
    fallback.confidenceMetrics = {
      ...NORMAL_CONFIDENCE,
      modelVersion: 'fallback-lifting-line',
      warnings: ['ML model not loaded. Using lifting-line fallback.'],
      isWithinSafeRange: false,
    };
    return fallback;
  }

  const S_m2 = (params.b / 2) * (params.Cr + params.Ct);
  const AR = (params.b * params.b) / Math.max(0.01, S_m2);

  const massBreakdown = computeStructuralMass(params, requirements, { S: S_m2, AR });
  const confidence = computeMLConfidence(params, S_m2, mlResult.modelVersion);
  const inferenceTimeMs = performance.now() - startTime;

  return {
    CL: mlResult.CL,
    CD: mlResult.CD,
    Cm: mlResult.Cm,
    LD: mlResult.CL / Math.max(0.001, mlResult.CD),
    S_m2,
    AR,
    e: mlResult.e_oswald,
    weight_kg: massBreakdown.totalKg,
    fidelity: 'neuralfoil',
    model_version: mlResult.modelVersion,
    timestamp: new Date().toISOString(),
    fidelityMode: 'advanced',
    confidenceMetrics: confidence,
    inferenceTimeMs,
  };
}

async function predictNeuralFoil(
  params: LegacyWingPayload,
  requirements: DesignRequirements,
  flightConditions: FlightConditions | undefined,
  startTime: number
): Promise<PredictionResultExtended> {
  if (!flightConditions) {
    throw new Error('NeuralFoil mode requires flight conditions (altitude, velocity)');
  }

  const aero3dResult = await compute3DAero(params, flightConditions);

  const S_m2 = (params.b / 2) * (params.Cr + params.Ct);
  const AR = (params.b * params.b) / Math.max(0.01, S_m2);

  const massBreakdown = computeStructuralMass(params, requirements, { S: S_m2, AR });
  const inferenceTimeMs = performance.now() - startTime;

  return {
    CL: aero3dResult.CL_3D,
    CD: aero3dResult.CD_total_3D,
    Cm: aero3dResult.Cm_3D,
    LD: aero3dResult.LD_3D,
    S_m2,
    AR,
    e: aero3dResult.e_oswald,
    weight_kg: massBreakdown.totalKg,
    fidelity: 'neuralfoil',
    model_version: 'neuralfoil-vlm-v1.0',
    timestamp: new Date().toISOString(),
    fidelityMode: 'normal',
    confidenceMetrics: {
      modelVersion: 'neuralfoil-vlm',
      rmsePercent: 3.0,
      samplesInTrainingRange: 8000000,
      distanceFromTrainingCentroid: 0,
      isWithinSafeRange: aero3dResult.section2D.confidence > 0.7,
      warnings: aero3dResult.warnings,
    },
    inferenceTimeMs,
  };
}
