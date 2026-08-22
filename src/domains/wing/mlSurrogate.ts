/**
 * ML Surrogate Model — ONNX Runtime Web Inference
 *
 * Loads and runs neural network surrogate models entirely in the browser.
 * No server required. Models are pre-trained with XFOIL data and exported to ONNX.
 *
 * Two model tiers:
 * - small (50KB, 64→32→6): Default, ~15ms inference on WebGPU
 * - large (200KB, 128→64→32→6): High-fidelity, ~30ms inference
 */

import { LegacyWingPayload } from '../../core/types';

export interface MLAeroResult {
  CL: number;
  CD: number;
  Cm: number;
  CL_max: number;
  alpha_stall: number;
  e_oswald: number;
  inferenceTimeMs: number;
  modelVersion: string;
}

let smallSession: any = null;
let largeSession: any = null;
let ortPromise: Promise<any> | null = null;

async function getOrt(): Promise<any> {
  if (!ortPromise) {
    ortPromise = import('onnxruntime-web' as string).catch(() => {
      console.warn('[ML] onnxruntime-web not installed. ML mode unavailable.');
      return null;
    });
  }
  return ortPromise;
}

const MODEL_PATHS = {
  small: '/models/surrogate_small.onnx',
  large: '/models/surrogate_large.onnx',
};

const MODEL_VERSIONS = {
  small: 'neural-surrogate-small-v1.0',
  large: 'neural-surrogate-large-v1.0',
};

/**
 * Input normalization statistics computed from training dataset (100k XFOIL samples).
 * These MUST match the scalers used during training.
 */
const INPUT_STATS = {
  span_m:     { mean: 10.0, std: 8.5 },
  AR:         { mean: 12.0, std: 5.2 },
  sweep_deg:  { mean: 5.0,  std: 12.0 },
  twist_deg:  { mean: -1.5, std: 2.5 },
  thickness:  { mean: 0.12, std: 0.03 },
  taper:      { mean: 0.6,  std: 0.22 },
  alpha_deg:  { mean: 5.0,  std: 5.0 },
  Re:         { mean: 3e6,  std: 2e6 },
};

const OUTPUT_STATS = {
  CL:        { mean: 0.52,  std: 0.45 },
  CD:        { mean: 0.018, std: 0.015 },
  Cm:        { mean: -0.04, std: 0.06 },
  CL_max:    { mean: 1.45,  std: 0.35 },
  alpha_stall: { mean: 12.0, std: 3.5 },
  e_oswald:  { mean: 0.78,  std: 0.12 },
};

function normalizeInput(params: LegacyWingPayload, S_m2: number): Float32Array {
  const AR = (params.b * params.b) / Math.max(0.01, S_m2);
  const taper = params.Ct / Math.max(0.01, params.Cr);
  const thickness = parseThickness(params.nacaCode);
  const Re = params.Re || computeReynolds(params.v_mps || 50, params.Cr);

  return new Float32Array([
    zScore(params.b, INPUT_STATS.span_m),
    zScore(AR, INPUT_STATS.AR),
    zScore(params.sweep_deg, INPUT_STATS.sweep_deg),
    zScore(params.twist_deg, INPUT_STATS.twist_deg),
    zScore(thickness, INPUT_STATS.thickness),
    zScore(taper, INPUT_STATS.taper),
    zScore(params.alpha_deg, INPUT_STATS.alpha_deg),
    zScore(Re, INPUT_STATS.Re),
  ]);
}

function denormalizeOutput(raw: Float32Array): MLAeroResult['CL'] extends number ? {
  CL: number; CD: number; Cm: number; CL_max: number; alpha_stall: number; e_oswald: number;
} : never {
  return {
    CL:        deZScore(raw[0], OUTPUT_STATS.CL),
    CD:        Math.max(0.001, deZScore(raw[1], OUTPUT_STATS.CD)),
    Cm:        deZScore(raw[2], OUTPUT_STATS.Cm),
    CL_max:    deZScore(raw[3], OUTPUT_STATS.CL_max),
    alpha_stall: deZScore(raw[4], OUTPUT_STATS.alpha_stall),
    e_oswald:  Math.max(0.3, Math.min(0.95, deZScore(raw[5], OUTPUT_STATS.e_oswald))),
  } as any;
}

function zScore(value: number, stats: { mean: number; std: number }): number {
  return (value - stats.mean) / Math.max(1e-8, stats.std);
}

function deZScore(value: number, stats: { mean: number; std: number }): number {
  return value * stats.std + stats.mean;
}

function parseThickness(nacaCode: string): number {
  const code = (nacaCode || '2412').trim();
  if (/^\d{4}$/.test(code)) return parseInt(code.slice(2), 10) / 100;
  if (/^\d{5}$/.test(code)) return parseInt(code.slice(3), 10) / 100;
  return 0.12;
}

function computeReynolds(velocityMs: number, chordM: number): number {
  const nu = 1.516e-5; // kinematic viscosity at sea level ISA
  return (velocityMs * chordM) / nu;
}

function computeWingArea(params: LegacyWingPayload): number {
  return (params.b / 2) * (params.Cr + params.Ct);
}

/**
 * Load ONNX model with fallback from WebGPU to WASM.
 */
async function loadModel(size: 'small' | 'large'): Promise<any> {
  const ort = await getOrt();
  if (!ort) return null;

  const providers: string[] = [];
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    providers.push('webgpu');
  }
  providers.push('wasm');

  return ort.InferenceSession.create(MODEL_PATHS[size], {
    executionProviders: providers,
    graphOptimizationLevel: 'all',
  });
}

/**
 * Check if ML models are loaded and ready for inference.
 */
export function isMLReady(): boolean {
  return smallSession !== null;
}

/**
 * Load the small model (50KB) into memory.
 * Should be called once on app startup.
 */
export async function initMLSurrogate(): Promise<void> {
  try {
    smallSession = await loadModel('small');
    console.log('[ML] Small surrogate model loaded');
  } catch (err) {
    console.warn('[ML] Failed to load small model:', err);
    smallSession = null;
  }
}

/**
 * Optionally preload the large model (200KB).
 */
export async function preloadLargeModel(): Promise<void> {
  if (largeSession) return;
  try {
    largeSession = await loadModel('large');
    console.log('[ML] Large surrogate model loaded');
  } catch (err) {
    console.warn('[ML] Failed to load large model:', err);
  }
}

/**
 * Run ML inference on wing parameters.
 * Falls back to null if model not loaded.
 */
export async function predictWithML(
  params: LegacyWingPayload,
  useLargeModel: boolean = false
): Promise<MLAeroResult | null> {
  const session = useLargeModel ? largeSession : smallSession;
  if (!session) return null;

  const ort = await getOrt();
  if (!ort) return null;

  const S_m2 = computeWingArea(params);
  const normalizedInput = normalizeInput(params, S_m2);
  const inputTensor = new ort.Tensor('float32', normalizedInput, [1, 8]);

  const startTime = performance.now();
  const results = await session.run({ wing_params: inputTensor });
  const inferenceTimeMs = performance.now() - startTime;

  const outputTensor = results.aero_coeffs || results.output || Object.values(results)[0];
  const raw = outputTensor.data as Float32Array;
  const denormalized = denormalizeOutput(raw);

  return {
    ...denormalized,
    inferenceTimeMs,
    modelVersion: useLargeModel ? MODEL_VERSIONS.large : MODEL_VERSIONS.small,
  };
}
