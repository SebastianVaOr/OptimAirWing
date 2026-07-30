import { DesignRequirements, LegacyWingPayload, TargetSector, ViabilityAnalysis } from '../../core/types';
import { AerodynamicResult } from './empirical';
import { MATERIALS_DB } from './materials';
import { checkSweepStability, checkStallCharacteristics, computeQuantitativeStructuralAnalysis } from './stability';

import { checkSectorViability, SectorViabilityDiagnostic } from './sectorGuardrails';
import { analyzeBucklingStability } from './buckling';
import { submitAndPollCFD } from './cfdValidator';
import { runMonteCarloSimulations } from './montecarlo';
import { computeLongitudinalStability } from './flightDynamics';
import { getSurrogateModelInfo } from './surrogateRegistry';

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
  const nacaCode = params.nacaCode || '2412';
  const thicknessRatio = (parseInt(nacaCode.substring(2) || '12', 10)) / 100; // e.g. 0.12
  const meanChord = (params.Cr + params.Ct) / 2;
  const surfaceArea = 'S' in aero ? (aero.S ?? 10) : (aero.S_m2 || 10);
  const taperRatio = params.Ct / Math.max(0.01, params.Cr);
  
  // Forma de la estructura del ala: factor de forma dinámico (0.05 a 0.12)
  const formFactor = compute_form_factor(params.sweep_deg, taperRatio, params.twist_deg);
  const volumeEst = surfaceArea * (meanChord * thicknessRatio) * formFactor;
  
  // Factor de refuerzo estructural según estabilidad aeroelástica (flecha negativa, etc.)
  const stability = checkSweepStability(params.sweep_deg, params.twist_deg, req.material, params.b, params.Cr, params.Ct);
  const reinfFactor = stability.weight_penalty_factor || 1.0;

  // Masa base de ensamblaje estructural por sector (largueros, herrajes de anclaje, costillas)
  let baseAssemblyMassKg = 0.5;
  if (req.sector?.startsWith('f1_') || req.sector === 'gt_spoiler') {
    baseAssemblyMassKg = 2.2; // Alerón F1 completo con endplates y soportes de carbono
  } else if (req.sector?.startsWith('hydrofoil_')) {
    baseAssemblyMassKg = 1.8; // Foil marino sumergido reforzado
  } else if (req.sector === 'comercial') {
    baseAssemblyMassKg = 15.0;
  }

  // Peso estimado con factor de seguridad y refuerzos
  const rawWeightKg = volumeEst * mat.density * (1 + 0.02 * aero.AR) * reinfFactor + baseAssemblyMassKg;
  const totalWeightKg = rawWeightKg * (req.safety_factor || 1.5);
  
  return Math.max(0.5, parseFloat(totalWeightKg.toFixed(2)));
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
  if (bucklingFs && bucklingFs > 10.0) {
    penaltyBuckling = Math.max(0.1, 10.0 / bucklingFs);
  } else if (bucklingFs && bucklingFs < 1.0) {
    penaltyBuckling = 0.1;
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
  aero: AeroData
): number {
  const mat = MATERIALS_DB[req.material] || MATERIALS_DB.al2024;
  const stressProxy = aero.CL * 100 * req.safety_factor; // proxy de esfuerzo operativo
  const requiredCycles = req.flight_hours * 120; // ~120 ciclos/hora
  if (requiredCycles > mat.fatigue_life) {
    return 0.35; // Penalización sustancial por vida a fatiga excedida
  }
  if (stressProxy > mat.yield_strength * 0.7) {
    return 0.25;
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
  const monteCarloRes = runMonteCarloSimulations(params, 300, req, { CL: aero.CL, CD: aero.CD, S: sArea, AR: aero.AR });
  
  // Unificación de datos para erradicar el State Desync: Peso P50 y Coste P50 de Monte Carlo rigen la Sección A
  const estimatedWeightKg = monteCarloRes.Peso.p50;
  const estimatedCostEur = monteCarloRes.Coste.p50;
  const costObj = computeEstimatedCost(estimatedWeightKg, params, req);
  const formFactor = compute_form_factor(params.sweep_deg, taperRatio, params.twist_deg);
  
  const wPen = computeWeightPenalty(estimatedWeightKg, req.estimated_weight_kg);
  const cPen = computeCostPenalty(estimatedCostEur, req.max_budget_eur);
  const fPen = computeFatiguePenalty(req, aero);
  const sPen = computeSectorPenalty(req.sector, aero, params);
  
  const isMotorsport = req.sector?.startsWith('f1_') || req.sector === 'gt_spoiler';
  const isHydrofoil = req.sector?.startsWith('hydrofoil_');

  const totalPenalty = Math.min(0.85, wPen + cPen + fPen + sPen);
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
  const viabilityScore = Math.round(baseScore * (1 - totalPenalty));
  
  // CFD Validation
  const cfdVal = submitAndPollCFD(params, { CL: aero.CL, CD: aero.CD, Cm: aero.Cm ?? 0 });

  // Análisis Estructural Cuantitativo, Pandeo y Dinámica de Vuelo
  const quantStruct = computeQuantitativeStructuralAnalysis(
    params,
    { S: sArea, AR: aero.AR, CL: aero.CL },
    req,
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
    req.safety_factor || 2.5
  );

  // Puntuación de Viabilidad Ajustada por Riesgo Estructural, Pandeo, Deflexión y Discrepancia CFD
  let riskPenaltyFactor = 1.0;

  // RULE 4: LISTA NEGRA DE GEOMETRÍAS PROHIBIDAS (Descalificación Total = 0/100)
  if (stability.status === 'danger') {
    riskPenaltyFactor = 0.0; // Descalificación inmediata por inestabilidad catastrófica / geometría prohibida
  } else if (stability.status === 'warning') {
    riskPenaltyFactor *= 0.8;
  }

  // RULE 3: REGLA DEL 15% DE DISCREPANCIA CFD (Penalización del -50% si CFD difiere >15%)
  const hasCfdDiscrepancy = cfdVal.deltaCLPct > 15.0 || cfdVal.deltaCDPct > 15.0;
  if (hasCfdDiscrepancy) {
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

  if (buckAnal.fs_buckling > 10.0 && riskPenaltyFactor > 0) {
    const buckFactor = Math.max(0.1, 10.0 / buckAnal.fs_buckling);
    riskPenaltyFactor *= buckFactor;
  } else if (buckAnal.fs_buckling < 1.0) {
    riskPenaltyFactor *= 0.2;
  }

  const riskAdjustedScore = Math.max(0, Math.round(viabilityScore * riskPenaltyFactor));

  const costEfficiency = parseFloat((estimatedCostEur / Math.max(1, ldVal)).toFixed(2));
  const paybackMonths = Math.max(3, Math.round((estimatedCostEur / 1200) * (30 / Math.max(5, ldVal))));

  const recs: string[] = [];
  if (stability.status === 'danger') {
    recs.unshift(`🔴 DESCALIFICACIÓN DE LISTA NEGRA: ${stability.message}`);
  }
  if (hasCfdDiscrepancy) {
    recs.unshift(`🔴 REGLA DEL 15% CFD ACTIVA: La predicción empírica difiere del CFD en >15% (dCL: ${cfdVal.deltaCLPct}%, dCD: ${cfdVal.deltaCDPct}%). Score penalizado un -50%. DISEÑO NO CONFIABLE - REQUIERE ITERACIÓN.`);
  }
  if (flightDyn.staticMarginPct > 35.0) {
    recs.push(`⚠️ MARGEN ESTÁTICO: ${flightDyn.staticMarginPct}% (>35% MAC). Penalización por hipersensibilidad de control aplicada.`);
  }
  if (quantStruct.tipDeflectionPercent > 2.0) {
    recs.push(`⚠️ DEFLEXIÓN DE PUNTA: ${quantStruct.tipDeflectionMm.toFixed(1)} mm (${quantStruct.tipDeflectionPercent.toFixed(2)}% b > 2.0%). Penalización aeroelástica aplicada.`);
  }
  if (buckAnal.fs_buckling > 10.0) {
    recs.push(`⚠️ PANDEO EXCESIVO: FS Pandeo ${buckAnal.fs_buckling.toFixed(1)}x (>10.0x). Sobredimensionamiento extremo penalizado.`);
  }
  if (stability.status === 'warning') {
    recs.push(`ESTABILIDAD (${stability.status.toUpperCase()}): ${stability.message} -> ${stability.recommendation}`);
  }
  if (stall.status !== 'safe') {
    recs.push(`PÉRDIDA (STALL): ${stall.message} -> ${stall.recommendation}`);
  }
  if (estimatedWeightKg > req.estimated_weight_kg) {
    recs.push(`Peso estimado (${estimatedWeightKg} kg) supera el objetivo (${req.estimated_weight_kg} kg). Considere usar Fibra de Carbono o reducir la envergadura.`);
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
    cfdValidation: cfdVal,
    monteCarloAnalysis: runMonteCarloSimulations(params, 300, req, { CL: aero.CL, CD: aero.CD, S: sArea, AR: aero.AR }),
    flightDynamics: flightDyn,
    surrogateModelSource: getSurrogateModelInfo(undefined, req.optimization_level).name,
  };
}
