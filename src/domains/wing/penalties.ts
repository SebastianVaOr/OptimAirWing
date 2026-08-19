import { DesignRequirements, LegacyWingPayload, TargetSector, ViabilityAnalysis } from '../../core/types';
import { AerodynamicResult } from './empirical';
import { MATERIALS_DB } from './materials';
import { checkSweepStability, checkStallCharacteristics, computeQuantitativeStructuralAnalysis } from './stability';

import { checkSectorViability, SectorViabilityDiagnostic } from './sectorGuardrails';
import { analyzeBucklingStability } from './buckling';
import { runConsistencyCheck } from './empiricalSelfConsistency';
import { runMonteCarloSimulations } from './montecarlo';
import { computeLongitudinalStability } from './flightDynamics';
import { getSurrogateModelInfo } from './surrogateRegistry';
import { computeSparBox, nacaThicknessRatio } from './sparGeometry';

export type AeroData = AerodynamicResult | {
  CL: number;
  CD: number;
  Cm?: number;
  LD?: number;
  S?: number;
  S_m2?: number;
  AR: number;
  e: number;
};

export function compute_form_factor(sweep_deg: number, taper_ratio: number, twist_deg: number): number {
  const base = 0.05;
  const sweep_factor = 0.001 * Math.abs(sweep_deg); // +0.001 por grado de flecha
  const taper_factor = 0.02 * (1 - Math.min(1, Math.max(0.1, taper_ratio))); // +0.02 por taper bajo
  const twist_factor = 0.002 * Math.abs(twist_deg); // +0.002 por grado de twist
  return parseFloat(Math.min(0.12, base + sweep_factor + taper_factor + twist_factor).toFixed(4));
}

export function computeEstimatedWeight(
  params: LegacyWingPayload,
  aero: AeroData,
  req: DesignRequirements
): number {
  const mat = MATERIALS_DB[req.material] || MATERIALS_DB.al2024;
  const surfaceArea = 'S' in aero ? (aero.S ?? 10) : (aero.S_m2 || 10);
  const AR = aero.AR || ((params.b * params.b) / Math.max(0.01, surfaceArea));

  // Masa base de ensamblaje estructural por sector (largueros, herrajes de anclaje, costillas)
  let baseAssemblyMassKg = 0.5;
  if (req.sector?.startsWith('f1_') || req.sector === 'gt_spoiler') {
    baseAssemblyMassKg = 2.2; // Alerón F1 completo con endplates y soportes de carbono
  } else if (req.sector?.startsWith('hydrofoil_')) {
    baseAssemblyMassKg = 1.8; // Foil marino sumergido reforzado
  } else if (req.sector === 'comercial') {
    baseAssemblyMassKg = 15.0;
  }

  // Modelo físico híbrido: fracción estructural del MTOW (~10% a escala UAV, decreciente
  // con el tamaño según estadística tipo Roskam), ajustada por densidad del material y
  // carga alar. El factor de seguridad NO multiplica masa.
  const mtowKg = req.estimated_weight_kg || 25;
  const wingFraction = 0.10 * Math.pow(25 / Math.max(25, mtowKg), 0.12);
  const densityFactor = 0.6 + 0.4 * (mat.density / 2700);
  const spanLoadFactor = 1 + 0.06 * (AR - 5);

  const wingMassKg = mtowKg * wingFraction * densityFactor * spanLoadFactor + baseAssemblyMassKg;

  return Math.max(0.5, parseFloat(wingMassKg.toFixed(2)));
}

export function compute_structure_penalty(
  thickness: number,
  chord: number,
  span: number,
  bucklingFs?: number
): number {
  const thicknessRatio = thickness / Math.max(0.01, chord);
  let penaltyThickness = 1.0;
  if (thicknessRatio > 0.20) {
    penaltyThickness = Math.max(0.3, 1.0 - (thicknessRatio - 0.20) * 3);
  } else if (thicknessRatio < 0.06) {
    penaltyThickness = Math.max(0.3, 1.0 - (0.06 - thicknessRatio) * 5);
  }

  let penaltyBuckling = 1.0;
  // Solo se penaliza el riesgo real (fs < 1.5); el sobredimensionamiento NO se castiga
  if (bucklingFs !== undefined && bucklingFs < 1.5) {
    penaltyBuckling = bucklingFs < 1.0 ? 0.2 : 0.3 + 0.7 * (bucklingFs - 1.0) / 0.5;
  }

  return Math.max(0.1, penaltyThickness * penaltyBuckling);
}

export function computeEstimatedCost(
  weightKg: number,
  params: LegacyWingPayload,
  req: DesignRequirements
): { totalCost: number; materialCost: number; laborCost: number; manufacturingHours: number } {
  const mat = MATERIALS_DB[req.material] || MATERIALS_DB.al2024;
  const costPerKg = req.cost_per_kg_material && req.cost_per_kg_material > 0
    ? req.cost_per_kg_material
    : mat.cost_kg;

  const laborCostPerHour = req.labor_cost_per_hour && req.labor_cost_per_hour > 0
    ? req.labor_cost_per_hour
    : 50;

  const sweep = Math.abs(params.sweep_deg || 0);
  const twist = Math.abs(params.twist_deg || 0);
  const taper = params.Ct / Math.max(0.01, params.Cr);

  let complexity = 1.0;
  complexity += 0.01 * sweep;
  complexity += 0.02 * twist;
  complexity += 0.01 * (1.0 - Math.min(1.0, taper));

  const laborHours = 10 * (1.0 + 0.01 * twist);
  const manufacturingHours = req.estimated_manufacturing_hours && req.estimated_manufacturing_hours > 0
    ? req.estimated_manufacturing_hours
    : Math.round(laborHours);

  const materialCost = Math.round(weightKg * costPerKg * complexity);
  const laborCost = Math.round(laborCostPerHour * manufacturingHours);
  const totalCost = Math.max(50, materialCost + laborCost);

  return { totalCost, materialCost, laborCost, manufacturingHours };
}

export function computeWeightPenalty(
  estimatedWeightKg: number,
  targetWeightKg: number,
  fsReal?: number,
  fsTarget?: number
): number {
  let penalty = 0;
  if (targetWeightKg > 0 && estimatedWeightKg > targetWeightKg) {
    const ratio = estimatedWeightKg / targetWeightKg;
    penalty += Math.min(0.9, 1 - Math.exp(-0.8 * (ratio - 1)));
  }
  // Penalización por Factor de Seguridad Dinámico
  if (fsReal !== undefined && fsTarget !== undefined && fsTarget > 0) {
    if (fsReal < fsTarget) {
      penalty += (fsTarget - fsReal) * 0.5; // Penaliza falta de seguridad
    } else if (fsReal > fsTarget * 1.2) {
      penalty += (fsReal / fsTarget - 1.2) * 0.3; // Penaliza sobredimensionamiento / peso extra
    }
  }
  return Math.min(0.95, penalty);
}

export function computeCostPenalty(estimatedCostEur: number, maxBudgetEur: number): number {
  if (maxBudgetEur <= 0) return 0;
  if (estimatedCostEur <= maxBudgetEur) return 0;
  const ratio = estimatedCostEur / maxBudgetEur;
  return Math.min(0.95, 1 - Math.exp(-1.5 * (ratio - 1)));
}

export function computeFatiguePenalty(
  req: DesignRequirements,
  params: LegacyWingPayload
): number {
  const mat = MATERIALS_DB[req.material] || MATERIALS_DB.al2024;
  // Tensión de flexión real derivada de la caja de larguero y la carga de maniobra L = W·n
  const rootChord = Math.max(0.05, params.Cr || 1);
  const box = computeSparBox(rootChord, nacaThicknessRatio(params.nacaCode));
  const n = req.maneuver_load_factor_g ?? 2.5;
  const W = req.estimated_weight_kg || 25;
  const b = params.b || 5;
  const M_root = (W * 9.81 * n) * b / 8;
  const sigmaMpa = ((M_root * (box.h_m / 2)) / Math.max(1e-9, box.I_m4)) / 1e6;
  const requiredCycles = req.flight_hours * 120; // ~120 ciclos/hora
  if (requiredCycles > mat.fatigue_life) {
    return 0.35; // Penalización sustancial por vida a fatiga excedida
  }
  if (sigmaMpa > mat.yield_strength * 0.7) {
    return 0.25; // Tensión por encima del límite de resistencia a fatiga (0.7·σ_y)
  }
  return 0;
}

export function computeSectorPenalty(
  sector: TargetSector,
  aero: AeroData,
  params: LegacyWingPayload
): number {
  const sArea = 'S' in aero ? (aero.S ?? 10) : (aero.S_m2 || 10);
  const diag = checkSectorViability(sector, params, { S: sArea, AR: aero.AR });
  return diag.penalty;
}

export function computeViabilityAnalysis(
  params: LegacyWingPayload,
  aero: AeroData,
  req: DesignRequirements
): ViabilityAnalysis {
  const stability = checkSweepStability(params.sweep_deg, params.twist_deg, req.material, params.b, params.Cr, params.Ct);
  const taperRatio = params.Ct / Math.max(0.01, params.Cr);
  const stall = checkStallCharacteristics(taperRatio, params.sweep_deg, params.twist_deg);

  // 1. ANÁLISIS DE MONTE CARLO Y MOTOR DE COSTES UNIFICADO (Single Source of Truth)
  const sArea = 'S' in aero ? (aero.S ?? 10) : (aero.S_m2 || 10);
  // Una sola corrida de Monte Carlo reutilizada para scoring y para el reporte
  const monteCarloRes = runMonteCarloSimulations(params, 300, req, { CL: aero.CL, CD: aero.CD, S: sArea, AR: aero.AR });
  
  // Unificación de datos para erradicar el State Desync: Peso P50 y Coste P50 de Monte Carlo rigen la Sección A
  const estimatedWeightKg = monteCarloRes.Peso.p50;
  const estimatedCostEur = monteCarloRes.Coste.p50;
  const costObj = computeEstimatedCost(estimatedWeightKg, params, req);
  const formFactor = compute_form_factor(params.sweep_deg, taperRatio, params.twist_deg);
  
  // Peso estructural del ala comparado contra un presupuesto estructural (~15% MTOW),
  // no contra el MTOW completo: el ala no es todo el avión.
  const structuralBudgetKg = Math.max(1, req.estimated_weight_kg * 0.15);
  const wPen = computeWeightPenalty(estimatedWeightKg, structuralBudgetKg);
  const cPen = computeCostPenalty(estimatedCostEur, req.max_budget_eur);
  const fPen = computeFatiguePenalty(req, params);
  const sPen = computeSectorPenalty(req.sector, aero, params);
  
  const isMotorsport = req.sector?.startsWith('f1_') || req.sector === 'gt_spoiler';
  const isHydrofoil = req.sector?.startsWith('hydrofoil_');

  const totalPenalty = Math.min(1.5, wPen + cPen + fPen + sPen);
  const ldVal = 'LD' in aero && aero.LD ? aero.LD : (aero.CL / Math.max(0.001, aero.CD));
  const maxTargetLD = 
    isMotorsport
      ? 5.5
      : isHydrofoil
      ? 16.0
      : req.sector === 'glider'
      ? 30.0
      : req.sector === 'comercial'
      ? 24.0
      : 18.0;

  const baseScore = Math.min(100, Math.max(0, (ldVal / maxTargetLD) * 100));
  // Penalización exponencial: nunca cruza cero, monotónica, mejor discriminación
  const viabilityScore = Math.round(baseScore * Math.exp(-totalPenalty));
  
  // Cross-check de consistencia (solo si el usuario lo solicita explícitamente)
  const consistencyResult = req.run_consistency_check === true
    ? runConsistencyCheck(params, { CL: aero.CL, CD: aero.CD, Cm: aero.Cm ?? 0 })
    : undefined;

  // Análisis Estructural Cuantitativo, Pandeo y Dinámica de Vuelo
  // totalWeightKg = MTOW completo; wingMassKg = masa estructural del ala (para inercia torsional)
  const quantStruct = computeQuantitativeStructuralAnalysis(
    params,
    { S: sArea, AR: aero.AR, CL: aero.CL },
    req,
    req.estimated_weight_kg,
    estimatedWeightKg
  );
  const flightDyn = computeLongitudinalStability(
    params,
    { CL: aero.CL, CD: aero.CD, Cm: aero.Cm ?? 0, S: sArea, AR: aero.AR },
    req.cruise_velocity_ms || 50
  );
  const buckAnal = analyzeBucklingStability(
    params,
    (MATERIALS_DB[req.material] || MATERIALS_DB.al2024).elastic_modulus,
    estimatedWeightKg,
    req.maneuver_load_factor_g ?? 2.5
  );

  // Puntuación de Viabilidad Ajustada por Riesgo Estructural, Pandeo, Deflexión y Discrepancia CROSS-CHECK
  let riskPenaltyFactor = 1.0;

  // RULE 4: LISTA NEGRA DE GEOMETRÍAS PROHIBIDAS (Descalificación Total = 0/100)
  if (stability.status === 'danger') {
    riskPenaltyFactor = 0.0; // Descalificación inmediata por inestabilidad catastrófica / geometría prohibida
  } else if (stability.status === 'warning') {
    riskPenaltyFactor *= 0.8;
  }

  // RULE 3: REGLA DEL 15% CROSS-CHECK (solo aplica si run_consistency_check === true)
  const hasDiscrepancy = !!consistencyResult && (consistencyResult.deltaCLPct > 15.0 || consistencyResult.deltaCDPct > 15.0);
  if (hasDiscrepancy) {
    riskPenaltyFactor *= 0.50; // Reducción a la mitad de la nota por falta de confiabilidad
  }

  // Penalizaciones de dinámica de vuelo solo aplicables a aeronaves
  if (!isMotorsport && !isHydrofoil && riskPenaltyFactor > 0) {
    if (flightDyn.staticMarginPct > 35.0) {
      riskPenaltyFactor *= 0.7; // Penalización por margen estático excesivo
    } else if (flightDyn.staticMarginPct < 5.0) {
      riskPenaltyFactor *= 0.8; // Penalización por margen estático escaso
    }
  }

  if (quantStruct.tipDeflectionPercent > 2.0 && riskPenaltyFactor > 0) {
    const defFactor = Math.max(0.2, 2.0 / quantStruct.tipDeflectionPercent);
    riskPenaltyFactor *= defFactor;
  }

  // Solo se penaliza el riesgo real de pandeo (fs < 1.0); el sobredimensionamiento no se castiga
  if (buckAnal.fs_buckling < 1.0 && riskPenaltyFactor > 0) {
    riskPenaltyFactor *= 0.2;
  }

  const riskAdjustedScore = Math.max(0, Math.round(viabilityScore * riskPenaltyFactor));

  const costEfficiency = parseFloat((estimatedCostEur / Math.max(1, ldVal)).toFixed(2));
  const paybackMonths = Math.max(3, Math.round((estimatedCostEur / 1200) * (30 / Math.max(5, ldVal))));

  const recs: string[] = [];
  if (stability.status === 'danger') {
    recs.unshift(`🔴 DESCALIFICACIÓN DE LISTA NEGRA: ${stability.message}`);
  }
  if (hasDiscrepancy) {
    recs.unshift(`🔴 REGLA DEL 15% CROSS-CHECK ACTIVA: La predicción empírica difiere del CROSS-CHECK en >15% (dCL: ${consistencyResult.deltaCLPct}%, dCD: ${consistencyResult.deltaCDPct}%). Score penalizado un -50%. DISEÑO NO CONFIABLE - REQUIERE ITERACIÓN.`);
  }
  if (flightDyn.staticMarginPct > 35.0) {
    recs.push(`⚠️ MARGEN ESTÁTICO: ${flightDyn.staticMarginPct}% (>35% MAC). Penalización por hipersensibilidad de control aplicada.`);
  }
  if (quantStruct.tipDeflectionPercent > 2.0) {
    recs.push(`⚠️ DEFLEXIÓN DE PUNTA: ${quantStruct.tipDeflectionMm.toFixed(1)} mm (${quantStruct.tipDeflectionPercent.toFixed(2)}% b > 2.0%). Penalización aeroelástica aplicada.`);
  }
  if (buckAnal.fs_buckling < 1.5) {
    recs.push(`⚠️ PANDEO: FS Pandeo ${buckAnal.fs_buckling.toFixed(1)}x (<1.5x). Riesgo estructural real de pandeo del larguero.`);
  }
  if (stability.status === 'warning') {
    recs.push(`ESTABILIDAD (${stability.status.toUpperCase()}): ${stability.message} -> ${stability.recommendation}`);
  }
  if (stall.status !== 'safe') {
    recs.push(`PÉRDIDA (STALL): ${stall.message} -> ${stall.recommendation}`);
  }
  if (estimatedWeightKg > structuralBudgetKg) {
    recs.push(`Peso estructural del ala (${estimatedWeightKg} kg) supera el presupuesto estructural (~15% del MTOW ${req.estimated_weight_kg} kg). Considere usar Fibra de Carbono o reducir la envergadura.`);
  }
  if (estimatedCostEur > req.max_budget_eur) {
    recs.push(`Coste de fabricación (${estimatedCostEur} €) excede el presupuesto (${req.max_budget_eur} €). Reduzca el ángulo de flecha o cambie el material a Aluminio 2024.`);
  }
  if (aero.AR > 22) {
    recs.push(`Alargamiento de ${aero.AR.toFixed(1)} implica riesgo de aeroelasticidad y pandeo. Se sugiere reducir la envergadura o aumentar la cuerda raíz.`);
  }
  if (Math.abs(params.twist_deg) > 5) {
    recs.push(`Torsión alar de ${params.twist_deg}° aumenta la complejidad de curvado en moldes (+20% coste).`);
  }
  if (recs.length === 0) {
    recs.push('El diseño cumple holgadamente todos los criterios estructurales, económicos y de desempeño aeronáutico.');
  }

  let reinforcementsNeeded = 'Ninguno';
  if (stability.weight_penalty_factor > 1.2) {
    reinforcementsNeeded = '+30% Masa: Largueros dobles Carbono T700 + Costillas anti-torsión';
  } else if (stability.weight_penalty_factor > 1.1) {
    reinforcementsNeeded = '+15% Masa: Refuerzo de larguero principal contra divergencia aeroelástica';
  }

  const fsTarget = req.safety_factor || 2.5;
  const fsReal = quantStruct.flexuralSafetyFactor || 2.5;
  let fsStatus: 'Ajustado' | 'Sobredimensionado' | 'Infradimensionado' = 'Ajustado';
  if (fsReal < fsTarget) {
    fsStatus = 'Infradimensionado';
  } else if (fsReal > fsTarget * 1.2) {
    fsStatus = 'Sobredimensionado';
  }

  // Recomendaciones específicas para optimización de peso y coste (Sección B.6)
  const weightOptimizationRecommendations: string[] = [];
  if (fsStatus === 'Sobredimensionado') {
    const savingsKg = (estimatedWeightKg * 0.12).toFixed(1);
    weightOptimizationRecommendations.push(
      `Reducir el espesor del larguero principal un 10-15% para ahorrar ~${savingsKg} kg sin comprometer el FS objetivo (${fsTarget}x).`
    );
  } else if (fsStatus === 'Infradimensionado') {
    weightOptimizationRecommendations.push(
      `Aumentar el canto del larguero un 15% o añadir cintas de carbono en la raíz para alcanzar el FS objetivo (${fsTarget}x).`
    );
  } else {
    weightOptimizationRecommendations.push(
      `Estructura optimizada: El Factor de Seguridad real (${fsReal}x) se ajusta al objetivo (${fsTarget}x) reduciendo peso superfluo.`
    );
  }

  if (req.material === 'wood' || req.material === 'al2024' || req.material === 'fiberglass') {
    const matSavingsKg = (estimatedWeightKg * 0.25).toFixed(1);
    weightOptimizationRecommendations.push(
      `Cambiar a un material con mayor resistencia específica (Fibra de Carbono T700) reduciría el peso estructural hasta un 25% (~${matSavingsKg} kg).`
    );
  }

  return {
    viabilityScore,
    riskAdjustedScore,
    estimatedWeightKg,
    estimatedCostEur,
    materialCostEur: costObj.materialCost,
    laborCostEur: costObj.laborCost,
    costEfficiencyEurPerLD: costEfficiency,
    paybackMonths,
    weightPenalty: parseFloat(wPen.toFixed(3)),
    costPenalty: parseFloat(cPen.toFixed(3)),
    fatiguePenalty: parseFloat(fPen.toFixed(3)),
    sectorPenalty: parseFloat(sPen.toFixed(3)),
    formFactor,
    sensitivityRecommendations: recs,
    stabilityStatus: stability.status,
    stabilityMessage: stability.message,
    stabilityRecommendation: stability.recommendation,
    stallMessage: stall.message,
    reinforcementsNeeded,
    globalSafetyFactor: fsTarget,

    // Novedades v8.0 / v9.0: FS Dinámico, Recomendaciones y Guardarraíles
    fsTarget,
    fsReal,
    fsStatus,
    weightOptimizationRecommendations,
    optimizationMode: req.optimization_mode || 'balance',
    sectorViabilityDiagnostic: checkSectorViability(req.sector, params, { S: sArea, AR: aero.AR }),

    // Métricas cuantitativas
    bendingMomentNm: quantStruct.bendingMomentNm,
    maxStressMpa: quantStruct.maxStressMpa,
    flexuralSafetyFactor: quantStruct.flexuralSafetyFactor,
    tipDeflectionMm: quantStruct.tipDeflectionMm,
    tipDeflectionPercent: quantStruct.tipDeflectionPercent,
    divergenceSpeedMs: quantStruct.divergenceSpeedMs,
    divergenceMargin: quantStruct.divergenceMargin,
    flutterRisk: quantStruct.flutterRisk,
    aileronReversalRisk: quantStruct.aileronReversalRisk,
    wingLoadingKgM2: quantStruct.wingLoadingKgM2,
    stallSpeedMs: quantStruct.stallSpeedMs,
    cruiseVelocityMs: quantStruct.cruiseVelocityMs,

    // Novedades v10.0: Pre-diseño Espacial
    bucklingAnalysis: buckAnal,
    consistencyCheck: consistencyResult,
    monteCarloAnalysis: monteCarloRes,
    flightDynamics: flightDyn,
    surrogateModelSource: getSurrogateModelInfo(undefined, req.optimization_level).name,
  };
}


