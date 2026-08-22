/**
 * Cross-Validation Engine
 *
 * Compares predictions from NeuralFoil/empirical models against
 * experimental UIUC wind tunnel data. Generates validation reports.
 *
 * Reference: Selig, M.S. et al. UIUC Low-Speed Airfoil Test Vol 1-3.
 */

import { UIPolar, UIPolarPoint, downloadUIUCDataset, getUniqueAirfoils } from './uiucDownloader';

export interface AirfoilValidation {
  airfoil: string;
  nPoints: number;
  CL_MAE: number;
  CD_MAE: number;
  CL_R2: number;
  CD_R2: number;
  pass: boolean;
}

export interface ValidationReport {
  timestamp: string;
  nAirfoils: number;
  nDataPoints: number;
  modelVersion: string;
  CL: {
    meanAbsoluteError: number;
    rootMeanSquareError: number;
    maxError: number;
    correlationR2: number;
  };
  CD: {
    meanAbsoluteError: number;
    rootMeanSquareError: number;
    maxError: number;
    correlationR2: number;
  };
  perAirfoil: AirfoilValidation[];
  confidenceAssessment: 'excellent' | 'good' | 'adequate' | 'poor';
  meanAbsoluteErrors: { CL: number; CD: number };
}

type Predictor = (nacaCode: string, alpha_deg: number, Re: number) => { CL: number; CD: number };

function computeR2(actual: number[], predicted: number[]): number {
  if (actual.length < 2) return 0;
  const mean = actual.reduce((s, v) => s + v, 0) / actual.length;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < actual.length; i++) {
    const diff = actual[i] - predicted[i];
    ssRes += diff * diff;
    ssTot += (actual[i] - mean) ** 2;
  }
  return ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
}

function computeMAE(actual: number[], predicted: number[]): number {
  if (actual.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    sum += Math.abs(actual[i] - predicted[i]);
  }
  return sum / actual.length;
}

function computeRMSE(actual: number[], predicted: number[]): number {
  if (actual.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    sum += (actual[i] - predicted[i]) ** 2;
  }
  return Math.sqrt(sum / actual.length);
}

function computeMaxError(actual: number[], predicted: number[]): number {
  let maxErr = 0;
  for (let i = 0; i < actual.length; i++) {
    maxErr = Math.max(maxErr, Math.abs(actual[i] - predicted[i]));
  }
  return maxErr;
}

export async function runCrossValidation(
  predictor: Predictor,
  dataset?: UIPolar[]
): Promise<ValidationReport> {
  const polars = dataset ?? await downloadUIUCDataset();
  const airfoils = getUniqueAirfoils(polars);

  const allPredCL: number[] = [];
  const allExpCL: number[] = [];
  const allPredCD: number[] = [];
  const allExpCD: number[] = [];
  const perAirfoil: AirfoilValidation[] = [];

  for (const airfoil of airfoils) {
    const airfoilPolars = polars.filter(p => p.airfoil === airfoil);
    const predCL: number[] = [];
    const expCL: number[] = [];
    const predCD: number[] = [];
    const expCD: number[] = [];

    for (const polar of airfoilPolars) {
      for (const point of polar.points) {
        const pred = predictor(airfoil, point.alpha, polar.Re);
        predCL.push(pred.CL);
        expCL.push(point.CL);
        predCD.push(pred.CD);
        expCD.push(point.CD);
      }
    }

    if (predCL.length > 0) {
      const CL_MAE = computeMAE(expCL, predCL);
      const CD_MAE = computeMAE(expCD, predCD);
      const CL_R2 = computeR2(expCL, predCL);
      const CD_R2 = computeR2(expCD, predCD);

      perAirfoil.push({
        airfoil,
        nPoints: predCL.length,
        CL_MAE: Number(CL_MAE.toFixed(4)),
        CD_MAE: Number(CD_MAE.toFixed(4)),
        CL_R2: Number(CL_R2.toFixed(3)),
        CD_R2: Number(CD_R2.toFixed(3)),
        pass: CL_MAE < 0.1,
      });

      allPredCL.push(...predCL);
      allExpCL.push(...expCL);
      allPredCD.push(...predCD);
      allExpCD.push(...expCD);
    }
  }

  const CL_MAE = computeMAE(allExpCL, allPredCL);
  const CD_MAE = computeMAE(allExpCD, allPredCD);

  let confidenceAssessment: ValidationReport['confidenceAssessment'] = 'poor';
  if (CL_MAE < 0.03) confidenceAssessment = 'excellent';
  else if (CL_MAE < 0.06) confidenceAssessment = 'good';
  else if (CL_MAE < 0.10) confidenceAssessment = 'adequate';

  return {
    timestamp: new Date().toISOString(),
    nAirfoils: airfoils.length,
    nDataPoints: allExpCL.length,
    modelVersion: 'analytical-v1.0',
    CL: {
      meanAbsoluteError: Number(CL_MAE.toFixed(4)),
      rootMeanSquareError: Number(computeRMSE(allExpCL, allPredCL).toFixed(4)),
      maxError: Number(computeMaxError(allExpCL, allPredCL).toFixed(4)),
      correlationR2: Number(computeR2(allExpCL, allPredCL).toFixed(4)),
    },
    CD: {
      meanAbsoluteError: Number(CD_MAE.toFixed(4)),
      rootMeanSquareError: Number(computeRMSE(allExpCD, allPredCD).toFixed(4)),
      maxError: Number(computeMaxError(allExpCD, allPredCD).toFixed(4)),
      correlationR2: Number(computeR2(allExpCD, allPredCD).toFixed(4)),
    },
    perAirfoil,
    confidenceAssessment,
    meanAbsoluteErrors: { CL: Number(CL_MAE.toFixed(4)), CD: Number(CD_MAE.toFixed(4)) },
  };
}
