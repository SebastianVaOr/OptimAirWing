/**
 * Cliente de API para OptimAirWing (v1 predict, legacy adapter, admin endpoints)
 */

import { LegacyWingPayload, PredictionResult, WingParams } from '../core/types';

export async function fetchLegacyPrediction(payload: LegacyWingPayload, signal?: AbortSignal): Promise<PredictionResult> {
  try {
    const res = await fetch('/v1/predict/legacy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('Backend API no disponible, usando fallback empírico local:', err);
    // Local fallback
    const { calcularEmpirico } = await import('../domains/wing/empirical');
    const emp = calcularEmpirico(payload);
    return {
      CL: emp.CL,
      CD: emp.CD,
      Cm: emp.Cm,
      LD: emp.LD,
      S_m2: emp.S,
      AR: emp.AR,
      e: emp.e,
      fidelity: 'empirical',
      model_version: '1.0.0-fallback-local',
      timestamp: new Date().toISOString(),
      details: {
        CD0: emp.CD0,
        CDi: emp.CDi,
        alpha0: emp.alpha0,
        a: emp.a
      }
    };
  }
}

export async function fetchWingPrediction(params: WingParams, signal?: AbortSignal): Promise<PredictionResult> {
  try {
    const res = await fetch('/v1/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('API /v1/predict fallo, redirigiendo a adaptador legacy local');
    const { wingParamsToLegacy } = await import('../core/store');
    const legacy = wingParamsToLegacy(params);
    return fetchLegacyPrediction(legacy);
  }
}

export async function updateAdminOrgPlan(orgId: string, plan: string): Promise<{ success: boolean; plan: string; error?: string }> {
  const adminKey = import.meta.env.VITE_ADMIN_SECRET_KEY || 'admin_secret_key_123';
  const res = await fetch(`/admin/org/${orgId}/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey
    },
    body: JSON.stringify({ plan, prorate: true })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, plan, error: body.message || `HTTP ${res.status}` };
  }
  return res.json();
}

export async function fetchOptimizationApi(
  initialParams?: LegacyWingPayload,
  requirements?: import('../core/types').DesignRequirements,
  signal?: AbortSignal
) {
  try {
    const res = await fetch('/v1/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initial_params: initialParams,
        requirements: requirements,
        optimization_level: requirements?.optimization_level,
        optimization_mode: requirements?.optimization_mode,
        optimization_mode_type: requirements?.optimization_mode_type,
        unconstrained: requirements?.unconstrained,
        max_weight_kg: requirements?.max_weight_kg,
        max_cost_eur: requirements?.max_cost_eur,
        min_ld: requirements?.min_ld,
        fixed_span_m: requirements?.fixed_span_m
      }),
      signal
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('Backend /v1/optimize no disponible, ejecutando en hilo local:', err);
    const { GeneticOptimizer } = await import('../domains/wing/geneticOptimizer');
    const optimizer = new GeneticOptimizer();
    return await optimizer.run(initialParams, requirements);
  }
}

