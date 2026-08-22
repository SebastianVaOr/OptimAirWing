import { LegacyWingPayload, WingParams, PredictionResult, Snapshot, OrganizationInfo, PlanTier, TargetSector, FidelityMode, ConfidenceMetrics } from './types';
import { VehicleCategory } from '../domains/vehicleDomain';
import { F1Params, HydrofoilParams } from '../domains/vehicleDomain';
import { FlightMode, FlightConditions } from '../domains/flight/conditions';

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  created: string;
  permissions: 'read_only' | 'execute_sim' | 'full_enterprise';
  status: 'active' | 'revoked';
}

export interface BillingInvoice {
  id: string;
  date: string;
  description: string;
  amountEur: number;
  tokensAdded: number;
  status: 'paid' | 'pending';
  receiptPdfUrl?: string;
}

export interface AppState {
  selectedVehicle: VehicleCategory;
  f1Params: F1Params;
  hydroParams: HydrofoilParams;
  legacyParams: LegacyWingPayload;
  wingParams: WingParams;
  prediction: PredictionResult | null;
  snapshots: Snapshot[];
  org: OrganizationInfo;
  tokenBalance: number;
  apiKeys: ApiKeyItem[];
  invoices: BillingInvoice[];
  isOptimizing: boolean;
  optProgress: { gen: number; maxGen: number; bestFit: number; avgFit: number };
  optHistory: { best: number[]; avg: number[] };
  activeTab: 'designer' | 'snapshots' | 'docs';
  fidelityMode: FidelityMode;
  confidenceMetrics: ConfidenceMetrics | null;

  // Flight conditions
  flightMode: FlightMode;
  flightPresetId: string;
  flightConditions: FlightConditions | null;
  manualAltitude_m: number;
  manualVelocity_ms: number;
}
