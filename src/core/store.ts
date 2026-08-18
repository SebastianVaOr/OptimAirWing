/**
 * Central Reactive Pub/Sub Store para OptimAirWing
 */

import { LegacyWingPayload, WingParams, PredictionResult, Snapshot, OrganizationInfo, PlanTier, TargetSector, mapSectorToVehicleCategory } from './types';
import { VehicleCategory, F1Params, HydrofoilParams } from '../domains/vehicleDomain';
import { AppState, ApiKeyItem, BillingInvoice } from './storeTypes';
import { calcularEmpirico } from '../domains/wing/empirical';

export function legacyToWingParams(legacy: LegacyWingPayload): WingParams {
  const root_chord_m = Math.max(0.02, legacy.Cr);
  const taper_ratio = Math.max(0.05, Math.min(1.0, legacy.Ct / root_chord_m));

  return {
    schema_version: '1.0.0',
    geometry: {
      airfoil: {
        source: 'naca4',
        naca_code: legacy.nacaCode || '2412'
      },
      planform: {
        span_m: legacy.b,
        root_chord_m,
        taper_ratio,
        sweep_deg: legacy.sweep_deg,
        twist_deg: legacy.twist_deg,
        dihedral_deg: 0.0
      }
    },
    operating_conditions: {
      alpha_deg: legacy.alpha_deg,
      reynolds: legacy.Re || 1e6,
      mach: legacy.Mach ?? 0.05
    }
  };
}

export function wingParamsToLegacy(wp: WingParams): LegacyWingPayload {
  const Cr = wp.geometry.planform.root_chord_m;
  const Ct = Cr * wp.geometry.planform.taper_ratio;
  return {
    nacaCode: wp.geometry.airfoil.naca_code || '2412',
    Cr,
    Ct,
    b: wp.geometry.planform.span_m,
    sweep_deg: wp.geometry.planform.sweep_deg,
    twist_deg: wp.geometry.planform.twist_deg,
    alpha_deg: wp.operating_conditions.alpha_deg,
    Re: wp.operating_conditions.reynolds,
    Mach: wp.operating_conditions.mach
  };
}

export type { AppState, ApiKeyItem, BillingInvoice };

type Listener = (state: AppState) => void;

class Store {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    const initialLegacy: LegacyWingPayload = {
      nacaCode: '2412',
      Cr: 3.0,
      Ct: 1.5,
      b: 10.0,
      sweep_deg: 0,
      twist_deg: 0,
      alpha_deg: 4,
      Re: 1e6,
      Mach: 0.05
    };

    const initialWp = legacyToWingParams(initialLegacy);
    const initialEmpirical = calcularEmpirico(initialLegacy);

    const initialPrediction: PredictionResult = {
      CL: initialEmpirical.CL,
      CD: initialEmpirical.CD,
      Cm: initialEmpirical.Cm,
      LD: initialEmpirical.LD,
      S_m2: initialEmpirical.S,
      AR: initialEmpirical.AR,
      e: initialEmpirical.e,
      fidelity: 'empirical',
      model_version: '1.0.0-prandtl',
      timestamp: new Date().toISOString()
    };

    this.state = {
      selectedVehicle: 'aircraft',
      f1Params: { speedKmh: 260, groundHeightMm: 45, gurneyFlapMm: 6, numElements: 2 },
      hydroParams: { speedKnots: 28, immersionDepthM: 0.75, waterDensityKgM3: 1025, waterTempC: 18 },
      legacyParams: initialLegacy,
      wingParams: initialWp,
      prediction: initialPrediction,
      snapshots: [],
      org: {
        id: 'org_personal_demo',
        name: 'AeroLab Research Org',
        plan: 'freemium',
        monthly_predictions_used: 2,
        monthly_predictions_limit: 3,
        monthly_optimizations_used: 0,
        monthly_optimizations_limit: 1
      },
      tokenBalance: 2450,
      apiKeys: [
        {
          id: 'key_1',
          name: 'Main Production API Key',
          key: 'af_live_sk_98f2a174c82b90e1',
          created: '2026-07-20',
          permissions: 'full_enterprise',
          status: 'active'
        }
      ],
      invoices: [
        {
          id: 'inv_1001',
          date: '2026-07-15',
          description: 'Recarga Inicial - 2,500 Créditos',
          amountEur: 29.00,
          tokensAdded: 2500,
          status: 'paid'
        }
      ],
      isOptimizing: false,
      optProgress: { gen: 0, maxGen: 80, bestFit: 0, avgFit: 0 },
      optHistory: { best: [], avg: [] },
      activeTab: 'designer'
    };

    // Intentar sincronizar créditos desde servidor de forma asíncrona
    this.syncCreditsFromServer();
  }

  async syncCreditsFromServer(): Promise<void> {
    try {
      const res = await fetch('/v1/user/credits');
      if (res.ok) {
        const data = await res.json();
        this.updateOrgCredits(data);
      }
    } catch (_) {}
  }

  updateOrgCredits(creditsData: {
    plan?: PlanTier;
    predictions_used?: number;
    predictions_limit?: number;
    optimizations_used?: number;
    optimizations_limit?: number;
    extra_credits?: number;
    total_optimizations_limit?: number;
  }): void {
    const newOrg = {
      ...this.state.org,
      plan: creditsData.plan || this.state.org.plan,
      monthly_predictions_used: creditsData.predictions_used ?? this.state.org.monthly_predictions_used,
      monthly_predictions_limit: creditsData.predictions_limit ?? this.state.org.monthly_predictions_limit,
      monthly_optimizations_used: creditsData.optimizations_used ?? this.state.org.monthly_optimizations_used,
      monthly_optimizations_limit: creditsData.total_optimizations_limit ?? creditsData.optimizations_limit ?? this.state.org.monthly_optimizations_limit,
      extra_credits_purchased: creditsData.extra_credits ?? this.state.org.extra_credits_purchased
    };

    this.state = {
      ...this.state,
      org: newOrg
    };
    this.notify();
  }

  // FIX (6): Verificación server-side para consumir créditos de optimización con fallback a validación local si no hay backend
  // Créditos planos: 1 crédito por corrida, sin importar el nivel de optimización (no se envía nivel ni monto derivado)
  async recordOptimizationUsed(amount = 1): Promise<boolean> {
    try {
      const res = await fetch('/v1/user/credits/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'optimization' })
      });

      if (res.ok) {
        const updatedCredits = await res.json();
        this.updateOrgCredits(updatedCredits);
        return true;
      }

      // Si el servidor responde explícitamente 403 o 429 (cuota agotada en backend)
      if (res.status === 403 || res.status === 429) {
        const errorData = await res.json().catch(() => ({ message: 'Cuota de optimizaciones agotada en el servidor' }));
        console.error('[SaaS Guard] Solicitud de crédito rechazada por el servidor:', res.status, errorData);
        throw new Error(errorData.message || 'Cuota de optimización insuficiente.');
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('insuficiente') || err.message.includes('agotada'))) {
        throw err;
      }
      console.warn('[SaaS Guard] Backend no disponible o error de red, ejecutando validación local:', err);
    }

    // Fallback local (entorno dev/SPA sin backend o respuesta 404)
    if (this.state.org.monthly_optimizations_used >= this.state.org.monthly_optimizations_limit) {
      throw new Error('Límite mensual de optimizaciones alcanzado en su plan.');
    }

    const newUsed = this.state.org.monthly_optimizations_used + amount;
    this.updateOrgCredits({ optimizations_used: newUsed });
    return true;
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l(this.state));
  }

  updateLegacyParams(partial: Partial<LegacyWingPayload>): void {
    const newLegacy = { ...this.state.legacyParams, ...partial };
    const newWp = legacyToWingParams(newLegacy);

    // Recalcular preliminarmente en cliente
    const emp = calcularEmpirico(newLegacy);
    const newPrediction: PredictionResult = {
      ...this.state.prediction!,
      CL: emp.CL,
      CD: emp.CD,
      Cm: emp.Cm,
      LD: emp.LD,
      S_m2: emp.S,
      AR: emp.AR,
      e: emp.e,
      timestamp: new Date().toISOString()
    };

    this.state = {
      ...this.state,
      legacyParams: newLegacy,
      wingParams: newWp,
      prediction: newPrediction
    };
    this.notify();
  }

  setPrediction(pred: PredictionResult): void {
    this.state = {
      ...this.state,
      prediction: pred,
      org: {
        ...this.state.org,
        monthly_predictions_used: this.state.org.monthly_predictions_used + 1
      }
    };
    this.notify();
  }

  setOptimizing(isOpt: boolean): void {
    this.state = { ...this.state, isOptimizing: isOpt };
    this.notify();
  }

  updateOptProgress(gen: number, maxGen: number, bestFit: number, avgFit: number): void {
    const newBest = [...this.state.optHistory.best, bestFit];
    const newAvg = [...this.state.optHistory.avg, avgFit];
    this.state = {
      ...this.state,
      optProgress: { gen, maxGen, bestFit, avgFit },
      optHistory: { best: newBest, avg: newAvg }
    };
    this.notify();
  }

  resetOptHistory(): void {
    this.clearReport();
  }

  clearReport(): void {
    this.state = {
      ...this.state,
      isOptimizing: false,
      optProgress: { gen: 0, maxGen: 80, bestFit: 0, avgFit: 0 },
      optHistory: { best: [], avg: [] }
    };
    this.notify();
  }

  addSnapshot(name?: string): void {
    const snapName = name || `Diseño #${this.state.snapshots.length + 1} (${this.state.legacyParams.nacaCode})`;
    const newSnap: Snapshot = {
      id: `snap_${Date.now()}`,
      name: snapName,
      timestamp: new Date().toLocaleString(),
      params: { ...this.state.legacyParams },
      wingParams: { ...this.state.wingParams },
      result: { ...this.state.prediction! }
    };

    this.state = {
      ...this.state,
      snapshots: [newSnap, ...this.state.snapshots]
    };
    this.notify();
  }

  loadSnapshot(snap: Snapshot): void {
    this.updateLegacyParams(snap.params);
  }

  setOrgPlan(plan: PlanTier): void {
    // Límites unificados con el servidor (server/db/plans.ts): freemium 3 pred / 1 opt
    const limits = {
      freemium: { pred: 3, opt: 1 },
      base: { pred: 30, opt: 10 },
      professional: { pred: 100, opt: 50 },
      enterprise: { pred: 100000, opt: 100000 }
    }[plan];

    this.state = {
      ...this.state,
      org: {
        ...this.state.org,
        plan,
        monthly_predictions_limit: limits.pred,
        monthly_optimizations_limit: limits.opt
      }
    };
    this.notify();
  }

  setVehicleCategory(vehicle: VehicleCategory): void {
    let legacyDefaults: Partial<LegacyWingPayload> = {};
    if (vehicle === 'f1_motorsport') {
      legacyDefaults = {
        b: 1.05,
        Cr: 0.30,
        Ct: 0.25,
        sweep_deg: 0,
        alpha_deg: 12,
        nacaCode: '6412',
        twist_deg: 0,
        isMultiElement: true,
        numElements: 2,
        flapGapMm: 12,
        flapOverlapMm: 8,
        flapAngleDeg: 28
      };
    } else if (vehicle === 'hydrofoil_nautical') {
      legacyDefaults = {
        b: 1.20,
        Cr: 0.22,
        Ct: 0.15,
        sweep_deg: 5,
        alpha_deg: 4,
        nacaCode: '0012',
        twist_deg: 0,
        isMultiElement: false
      };
    } else {
      legacyDefaults = {
        b: 10.0,
        Cr: 3.0,
        Ct: 1.5,
        sweep_deg: 0,
        alpha_deg: 4,
        nacaCode: '2412',
        twist_deg: 0,
        isMultiElement: false
      };
    }

    const newLegacy = { ...this.state.legacyParams, ...legacyDefaults };
    const newWp = legacyToWingParams(newLegacy);
    const emp = calcularEmpirico(newLegacy);

    this.state = {
      ...this.state,
      selectedVehicle: vehicle,
      legacyParams: newLegacy,
      wingParams: newWp,
      prediction: {
        ...this.state.prediction!,
        CL: emp.CL,
        CD: emp.CD,
        Cm: emp.Cm,
        LD: emp.LD,
        S_m2: emp.S,
        AR: emp.AR,
        e: emp.e,
        timestamp: new Date().toISOString()
      }
    };
    this.notify();
  }

  // Método para establecer el sector objetivo mapeando a VehicleCategory para el visor 3D
  setSelectedSector(sector: TargetSector): void {
    const category = mapSectorToVehicleCategory(sector);
    if (category !== this.state.selectedVehicle) {
      this.setVehicleCategory(category);
    }
  }

  updateF1Params(partial: Partial<F1Params>): void {
    this.state = {
      ...this.state,
      f1Params: { ...this.state.f1Params, ...partial }
    };
    this.notify();
  }

  updateHydroParams(partial: Partial<HydrofoilParams>): void {
    this.state = {
      ...this.state,
      hydroParams: { ...this.state.hydroParams, ...partial }
    };
    this.notify();
  }

  purchaseTokens(amountTokens: number, costEur: number, desc: string): void {
    const newInvoice: BillingInvoice = {
      id: `inv_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: desc,
      amountEur: costEur,
      tokensAdded: amountTokens,
      status: 'paid'
    };

    this.state = {
      ...this.state,
      tokenBalance: this.state.tokenBalance + amountTokens,
      invoices: [newInvoice, ...this.state.invoices]
    };
    this.notify();
  }

  generateApiKey(name: string, permissions: 'read_only' | 'execute_sim' | 'full_enterprise', serverKeyItem?: ApiKeyItem): ApiKeyItem {
    let newKeyItem: ApiKeyItem;

    if (serverKeyItem) {
      newKeyItem = serverKeyItem;
    } else {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const randomHex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      newKeyItem = {
        id: `key_${Date.now()}`,
        name: name || 'API Key ' + (this.state.apiKeys.length + 1),
        key: `af_live_sk_${randomHex}`,
        created: new Date().toISOString().split('T')[0],
        permissions,
        status: 'active'
      };
    }

    this.state = {
      ...this.state,
      apiKeys: [newKeyItem, ...this.state.apiKeys]
    };
    this.notify();
    return newKeyItem;
  }

  revokeApiKey(id: string): void {
    this.state = {
      ...this.state,
      apiKeys: this.state.apiKeys.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k)
    };
    this.notify();
  }

  setActiveTab(tab: 'designer' | 'snapshots' | 'docs'): void {
    this.state = { ...this.state, activeTab: tab };
    this.notify();
  }
}

export const store = new Store();
