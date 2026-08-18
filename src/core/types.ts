/**
 * Definición de Tipos Globales para OptimAirWing
 */

import { SectorViabilityDiagnostic } from '../domains/wing/sectorGuardrails';
import { BucklingAnalysisResult } from '../domains/wing/buckling';
import { CFDValidationResult } from '../domains/wing/cfdValidator';
import { MonteCarloAnalysisResult } from '../domains/wing/montecarlo';
import { FlightDynamicsResult } from '../domains/wing/flightDynamics';
import { VehicleCategory } from '../domains/vehicleDomain';

export interface LegacyWingPayload {
  nacaCode: string;
  Cr: number;
  Ct: number;
  b: number;
  sweep_deg: number;
  twist_deg: number;
  alpha_deg: number;
  Re?: number;
  Mach?: number;
  v_mps?: number;
  // F1 Multi-Element Wing Profile Configuration (Slots, Flaps, Gap & Overlap)
  isMultiElement?: boolean;
  numElements?: number; // 1, 2 or 3 elements (e.g. Mainplane + DRS Flap + Beam wing)
  flapGapMm?: number; // Slot gap between elements (e.g. 10 - 20 mm)
  flapOverlapMm?: number; // Overlap between TE and LE (e.g. 5 - 15 mm)
  flapAngleDeg?: number; // Flap deflection angle (e.g. 15 - 45 degrees)
}

export type LegacyWingInput = LegacyWingPayload;

export function mapSectorToVehicleCategory(sector: TargetSector): VehicleCategory {
  if (sector.startsWith('f1_') || sector === 'gt_spoiler') {
    return 'f1_motorsport';
  }
  if (sector.startsWith('hydrofoil_')) {
    return 'hydrofoil_nautical';
  }
  return 'aircraft';
}

export interface WingParams {
  schema_version: '1.0.0';
  geometry: {
    airfoil: {
      source: 'naca4' | 'naca5' | 'custom_csv';
      naca_code?: string;
      profile_id?: string;
      point_count?: number;
    };
    planform: {
      span_m: number;
      root_chord_m: number;
      taper_ratio: number;
      sweep_deg: number;
      twist_deg: number;
      dihedral_deg: number;
    };
  };
  operating_conditions: {
    alpha_deg: number;
    reynolds: number;
    mach: number;
  };
  ui_preferences?: {
    unit_system: 'si' | 'imperial';
  };
}

export interface AerialSectorState {
  targetSector: 'comercial' | 'uav' | 'glider' | 'sport' | 'evtol' | 'experimental';
  span_m: number;
  root_chord_m: number;
  tip_chord_m: number;
  sweep_deg: number;
  twist_deg: number;
  alpha_deg: number;
  nacaCode: string;
  material: StructuralMaterial;
  cruiseVelocityMs: number;
}

export interface F1SectorState {
  targetSector: 'f1_rear_wing' | 'f1_front_wing' | 'gt_spoiler';
  span_m: number; // Fijo 1.05m para F1 Rear Wing
  root_chord_m: number; // Fijo 0.30m
  tip_chord_m: number; // Fijo 0.25m
  sweep_deg: number; // Fijo 0°
  alpha_deg: number; // 8° a 18°
  nacaCode: string; // '6412' | '4415' | '4412' | '6415' | '2415'
  twist_deg: number; // -3° a 0°
  numElements: number;
  gurneyFlapMm: number;
  speedKmh: number;
  groundHeightMm: number;
}

export interface NauticalSectorState {
  targetSector: 'hydrofoil_racing' | 'hydrofoil_efoil' | 'hydrofoil_ferry';
  span_m: number;
  root_chord_m: number;
  tip_chord_m: number;
  sweep_deg: number;
  twist_deg: number;
  alpha_deg: number;
  nacaCode: string;
  speedKnots: number;
  immersionDepthM: number;
  waterDensityKgM3: number;
}

export interface PredictionResult {
  CL: number;
  CD: number;
  Cm: number;
  LD: number;
  S_m2: number;
  AR: number;
  e: number;
  weight_kg?: number;
  fidelity: 'empirical' | 'neuralfoil' | 'custom_onnx';
  model_version: string;
  confidence?: number;
  timestamp?: string;
  details?: {
    CD0?: number;
    CDi?: number;
    alpha0?: number;
    a?: number;
  };
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: string;
  params: LegacyWingPayload;
  wingParams: WingParams;
  result: PredictionResult;
}

export type TargetSector = 
  | 'comercial' 
  | 'uav' 
  | 'glider' 
  | 'sport' 
  | 'evtol' 
  | 'experimental'
  | 'f1_rear_wing'
  | 'f1_front_wing'
  | 'gt_spoiler'
  | 'hydrofoil_racing'
  | 'hydrofoil_efoil'
  | 'hydrofoil_ferry';
export type StructuralMaterial = 
  | 'al2024' 
  | 'al7075' 
  | 'carbon' 
  | 'carbon_t300' 
  | 'carbon_t700' 
  | 'fiberglass' 
  | 'fiberglass_s2' 
  | 'wood' 
  | 'titanium' 
  | 'steel4130' 
  | 'hybrid';

export type PlanTier = 'freemium' | 'base' | 'professional' | 'enterprise';
export type OptimizationMode = 'efficiency' | 'weight' | 'balance';
export type OptimizationSourceMode = 'from_sliders' | 'from_scratch';

export interface ParetoDesignItem {
  id: string;
  name: string;
  recommendation: string;
  params: LegacyWingPayload;
  aero: { CL: number; CD: number; LD: number; S: number; AR: number };
  weight_kg: number;
  cost_eur: number;
  fs: number;
}

export interface DesignComparisonItem {
  parameter: string;
  previousValue: string;
  currentValue: string;
  deltaPercent: string;
  isImprovement: boolean;
  interpretation: string;
}

export interface DesignRequirements {
  sector: TargetSector;
  estimated_weight_kg: number;
  material: StructuralMaterial;
  flight_hours: number;
  max_budget_eur: number;
  safety_factor: number; // Margen sobre tensiones límite (1.5 - 4.0). NO es factor de carga.
  maneuver_load_factor_g?: number; // Factor de carga de maniobra (n-g). Default 2.5
  cruise_altitude_m?: number; // Altitud de crucero (m) para densidad ISA. Default por sector.
  cruise_velocity_ms?: number; // Velocidad de crucero (m/s) - default 50
  cost_per_kg_material?: number; // €/kg (custom u opcional)
  labor_cost_per_hour?: number; // €/h (default 50 €/h)
  estimated_manufacturing_hours?: number; // h (default 10-30h)
  optimization_level?: 'basic' | 'neuralfoil' | 'structural' | 'full_custom';
  optimization_mode?: OptimizationMode;
  optimization_mode_type?: OptimizationSourceMode;
  run_cfd_validation?: boolean;

  // Novedades v11.0 / v11.1: Restricciones Hard y Exploración Libre
  unconstrained?: boolean; // Si es true, desactiva rechazos hard para exploración libre
  max_weight_kg?: number; // Peso máximo estricto (AG no supera este valor)
  max_cost_eur?: number; // Coste máximo estricto (AG no supera este valor)
  min_ld?: number; // L/D mínimo estricto
  fixed_span_m?: number; // Envergadura fija opcional
  
  // Candados de Parámetros Fijos
  locked_params?: {
    b?: number;
    Cr?: number;
    Ct?: number;
    sweep_deg?: number;
    twist_deg?: number;
    alpha_deg?: number;
    nacaCode?: string;
  };
}

export interface ViabilityAnalysis {
  viabilityScore: number;
  riskAdjustedScore?: number;
  estimatedWeightKg: number;
  estimatedCostEur: number;
  materialCostEur?: number;
  laborCostEur?: number;
  costEfficiencyEurPerLD: number;
  paybackMonths: number;
  weightPenalty: number;
  costPenalty: number;
  fatiguePenalty: number;
  sectorPenalty: number;
  formFactor?: number;
  sensitivityRecommendations: string[];
  stabilityStatus?: 'safe' | 'warning' | 'danger';
  stabilityMessage?: string;
  stabilityRecommendation?: string;
  stallMessage?: string;
  reinforcementsNeeded?: string;
  globalSafetyFactor?: number;
  
  // Novedades v8.0 / v9.0: FS dinámico, Recomendaciones y Diagnóstico Sectorial
  fsTarget?: number;
  fsReal?: number;
  fsStatus?: 'Ajustado' | 'Sobredimensionado' | 'Infradimensionado';
  weightOptimizationRecommendations?: string[];
  optimizationMode?: OptimizationMode;
  sectorViabilityDiagnostic?: SectorViabilityDiagnostic;

  // Métricas cuantitativas estructurales y aeroelásticas
  bendingMomentNm?: number;
  maxStressMpa?: number;
  flexuralSafetyFactor?: number;
  tipDeflectionMm?: number;
  tipDeflectionPercent?: number;
  divergenceSpeedMs?: number;
  divergenceMargin?: number;
  flutterRisk?: 'bajo' | 'medio' | 'alto';
  aileronReversalRisk?: 'bajo' | 'medio' | 'alto';
  wingLoadingKgM2?: number;
  stallSpeedMs?: number;
  cruiseVelocityMs?: number;

  // Novedades v10.0: Pre-diseño Espacial
  bucklingAnalysis?: BucklingAnalysisResult;
  cfdValidation?: CFDValidationResult;
  monteCarloAnalysis?: MonteCarloAnalysisResult;
  flightDynamics?: FlightDynamicsResult;
  surrogateModelSource?: string;

  // Novedades v11.0: Decisiones Empresariales, Frente de Pareto & Evolución
  paretoDesigns?: ParetoDesignItem[];
  previousDesignComparison?: DesignComparisonItem[];
  discardedDesignsCount?: number;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  plan: PlanTier;
  monthly_predictions_used: number;
  monthly_predictions_limit: number;
  monthly_optimizations_used: number;
  monthly_optimizations_limit: number;
  extra_credits_purchased?: number;
}
