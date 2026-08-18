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
    // El modelo empírico de línea sustentadora es el motor por defecto.
    // NeuralFoil no está integrado: is_available() === false.
    this.predictors.push(new EmpiricalPredictor());
    this.predictors.push(new NeuralFoilPredictor());
  }

  predictWithFallback(params: WingParams): PredictionResult {
    for (const predictor of this.predictors) {
      try {
        if (predictor.is_available()) {
          const result = predictor.predict(params);
          // Etiquetado honesto: el único motor disponible es el empírico lifting-line
          return { ...result, fidelity: 'empirical', model_version: '1.0-lifting-line' };
        }
      } catch (err) {
        console.warn(`Predictor '${predictor.name}' falló, degradando a siguiente predictor:`, err);
      }
    }

    // Fallback absoluto
    const fallback = new EmpiricalPredictor();
    return { ...fallback.predict(params), fidelity: 'empirical', model_version: '1.0-lifting-line' };
  }
}

export const predictorRegistry = new PredictorRegistry();
