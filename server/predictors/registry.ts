import { WingParams, PredictionResult } from '../../src/core/types';
import { EmpiricalPredictor } from './empiricalPredictor';
import { NeuralFoilPredictor } from './neuralfoilPredictor';

export interface Predictor {
  name: string;
  schema_version: string;
  fidelity: 'empirical' | 'neuralfoil' | 'custom_onnx';
  is_available(): boolean;
  predict(params: WingParams): PredictionResult;
}

export class PredictorRegistry {
  private predictors: Predictor[] = [];

  constructor() {
    this.predictors.push(new NeuralFoilPredictor());
    this.predictors.push(new EmpiricalPredictor());
  }

  predictWithFallback(params: WingParams): PredictionResult {
    for (const predictor of this.predictors) {
      try {
        if (predictor.is_available()) {
          return predictor.predict(params);
        }
      } catch (err) {
        console.warn(`Predictor '${predictor.name}' falló, degradando a siguiente predictor:`, err);
      }
    }

    // Fallback absoluto
    const fallback = new EmpiricalPredictor();
    return fallback.predict(params);
  }
}

export const predictorRegistry = new PredictorRegistry();
