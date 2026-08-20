import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, StopCircle, CheckCircle, Cpu, Layers, Award, AlertTriangle, Activity, Lock, ArrowUpRight, Weight, Scale } from 'lucide-react';
import { Chart, LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { GeneticOptimizer } from '../domains/wing/geneticOptimizer';
import { DesignRequirements, LegacyWingPayload, OptimizationMode, OptimizationSourceMode, StructuralMaterial, TargetSector, ViabilityAnalysis } from '../core/types';
import { MATERIALS_DB } from '../domains/wing/materials';
import { checkSectorViability, getSectorLimits, getSectorPreset } from '../domains/wing/sectorGuardrails';
import { store } from '../core/store';
import { CreditsPurchaseModal } from './CreditsPurchaseModal';
import { OptimizationLockedParams } from './OptimizationLockedParams';
import { OptimizationForm } from './OptimizationForm';

Chart.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBest: (params: LegacyWingPayload) => void;
  currentParams?: LegacyWingPayload;
  isLoading?: boolean;
}

export const OptimizationModal: React.FC<OptimizationModalProps> = ({
  isOpen,
  onClose,
  onApplyBest,
  currentParams
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const optimizerRef = useRef<GeneticOptimizer | null>(null);

  const [appState, setAppState] = useState(store.getState());
  const [isRunning, setIsRunning] = useState(false);
  const [currentGen, setCurrentGen] = useState(0);
  const [maxGen, setMaxGen] = useState(80);
  const [bestScore, setBestScore] = useState(0);
  const [liveScore, setLiveScore] = useState<number>(0);
  const [liveLD, setLiveLD] = useState<number>(0);
  const [liveWeight, setLiveWeight] = useState<number>(0);
  const [liveCost, setLiveCost] = useState<number>(0);
  const [bestCandidate, setBestCandidate] = useState<LegacyWingPayload | null>(null);
  const [viability, setViability] = useState<ViabilityAnalysis | undefined>(undefined);
  const [isFinished, setIsFinished] = useState(false);
  const [converged, setConverged] = useState(true);
  const [discardedRatio, setDiscardedRatio] = useState(0);

  // Formulario de Requerimientos Técnico-Económicos
  const [sector, setSector] = useState<TargetSector>('uav');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState<number>(25);
  const [material, setMaterial] = useState<StructuralMaterial>('carbon');
  const [flightHours, setFlightHours] = useState<number>(10);
  const [maxBudgetEur, setMaxBudgetEur] = useState<number>(15000);
  const [safetyFactor, setSafetyFactor] = useState<number>(2.5); // Default 2.5x
  const [cruiseVelocityMs, setCruiseVelocityMs] = useState<number>(50);

  // Novedades v8.0 / v11.0 / v11.1: Modos, Hard Constraints, Exploración Libre & Presets
  const [optMode, setOptMode] = useState<OptimizationMode>('balance');
  const [optModeType, setOptModeType] = useState<OptimizationSourceMode>('from_scratch');
  const [unconstrained, setUnconstrained] = useState<boolean>(false);
  const [maxWeightKg, setMaxWeightKg] = useState<number>(25);
  const [maxCostEur, setMaxCostEur] = useState<number>(15000);
  const [minLd, setMinLd] = useState<number>(12);
  const [fixedSpanM, setFixedSpanM] = useState<number>(0);
  const [discardedCount, setDiscardedCount] = useState<number>(0);

  const [costPerKgMaterial, setCostPerKgMaterial] = useState<number>(MATERIALS_DB['carbon']?.cost_kg || 120);
  const [laborCostPerHour, setLaborCostPerHour] = useState<number>(50);
  const [estimatedManufacturingHours, setEstimatedManufacturingHours] = useState<number>(20);
  const [optLevel, setOptLevel] = useState<'basic' | 'neuralfoil' | 'structural' | 'full_custom'>('neuralfoil');
  const [runConsistencyCheck, setrunConsistencyCheck] = useState<boolean>(true);

  // Handler para cargar presets al cambiar de sector
  const handleSectorChange = (newSector: TargetSector) => {
    setSector(newSector);
    const preset = getSectorPreset(newSector);
    setMaxWeightKg(preset.max_weight_kg);
    setEstimatedWeightKg(preset.max_weight_kg);
    setMaxCostEur(preset.max_cost_eur);
    setMaxBudgetEur(preset.max_cost_eur);
    setMinLd(preset.min_ld);
    setSafetyFactor(preset.safety_factor);
    setBestCandidate(null);
    setViability(undefined);
    setIsFinished(false);
    store.resetOptHistory();

    // Reglas automáticas de guiado por sector (Reglamentación FIA, Medio y Tipo de Vehículo)
    if (newSector.startsWith('f1_') || newSector === 'gt_spoiler') {
      store.setVehicleCategory('f1_motorsport');
      setOptMode('efficiency');
      if (newSector === 'f1_rear_wing') {
        setFixedSpanM(1.05); // Candado duro FIA F1 Alerón Trasero (1.05m exactos)
      } else if (newSector === 'f1_front_wing') {
        setFixedSpanM(1.80); // Candado duro FIA F1 Alerón Delantero (1.80m)
      } else {
        setFixedSpanM(1.60);
      }
    } else if (newSector.startsWith('hydrofoil_')) {
      store.setVehicleCategory('hydrofoil_nautical');
      setOptMode('balance');
      setFixedSpanM(preset.b);
    } else {
      store.setVehicleCategory('aircraft');
      setOptMode('balance');
      setFixedSpanM(0);
    }
  };

  // Modal de Comprar Créditos Extra
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  // Modal de Advertencia de Guardarraíles Sectoriales
  const [showGuardrailWarningConfirm, setShowGuardrailWarningConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultParamsFallback: LegacyWingPayload = { Cr: 1.2, Ct: 0.8, b: 5.0, sweep_deg: 0, twist_deg: 0, alpha_deg: 4, nacaCode: '2412' };
  const effectiveParams = currentParams || appState.legacyParams || defaultParamsFallback;
  const liveDiag = checkSectorViability(sector, effectiveParams);

  // Estados de Candados de Parámetros Geométricos
  const [lockB, setLockB] = useState<boolean>(false);
  const [lockCr, setLockCr] = useState<boolean>(false);
  const [lockCt, setLockCt] = useState<boolean>(false);
  const [lockSweep, setLockSweep] = useState<boolean>(false);
  const [lockTwist, setLockTwist] = useState<boolean>(false);
  const [lockAlpha, setLockAlpha] = useState<boolean>(false);
  const [lockNaca, setLockNaca] = useState<boolean>(false);

  const [valB, setValB] = useState<number>(effectiveParams.b);
  const [valCr, setValCr] = useState<number>(effectiveParams.Cr);
  const [valCt, setValCt] = useState<number>(effectiveParams.Ct);
  const [valSweep, setValSweep] = useState<number>(effectiveParams.sweep_deg);
  const [valTwist, setValTwist] = useState<number>(effectiveParams.twist_deg);
  const [valAlpha, setValAlpha] = useState<number>(effectiveParams.alpha_deg);
  const [valNaca, setValNaca] = useState<string>(effectiveParams.nacaCode);

  useEffect(() => {
    setValB(effectiveParams.b);
    setValCr(effectiveParams.Cr);
    setValCt(effectiveParams.Ct);
    setValSweep(effectiveParams.sweep_deg);
    setValTwist(effectiveParams.twist_deg);
    setValAlpha(effectiveParams.alpha_deg);
    setValNaca(effectiveParams.nacaCode);
  }, [effectiveParams]);

  useEffect(() => {
    const unsub = store.subscribe(s => setAppState(s));
    return () => unsub();
  }, []);

  // Sincronizar sector predeterminado según el tipo de vehículo seleccionado en la app
  useEffect(() => {
    if (!isOpen) return;
    if (appState.selectedVehicle === 'f1_motorsport' && !sector.startsWith('f1_') && sector !== 'gt_spoiler') {
      handleSectorChange('f1_rear_wing');
    } else if (appState.selectedVehicle === 'hydrofoil_nautical' && !sector.startsWith('hydrofoil_')) {
      handleSectorChange('hydrofoil_racing');
    } else if (appState.selectedVehicle === 'aircraft' && (sector.startsWith('f1_') || sector.startsWith('hydrofoil_') || sector === 'gt_spoiler')) {
      handleSectorChange('uav');
    }
  }, [isOpen, appState.selectedVehicle]);

  useEffect(() => {
    // Actualizar default cost/kg al cambiar de material
    if (MATERIALS_DB[material]) {
      setCostPerKgMaterial(MATERIALS_DB[material].cost_kg);
    }
  }, [material]);

  const { org } = appState;
  const creditsRemaining = Math.max(0, org.monthly_optimizations_limit - org.monthly_optimizations_used);

  const getRequiredCredits = () => {
    // FIX (8a): Coste único plano por corrida (1 crédito), independiente del nivel de optimización.
    // El nivel es una etiqueta de fidelidad/detalle del análisis, no un motor diferente.
    return 1;
  };

  const requiredCredits = getRequiredCredits();

  useEffect(() => {
    if (isOpen && chartCanvasRef.current && !chartInstanceRef.current) {
      const ctx = chartCanvasRef.current.getContext('2d');
      if (ctx) {
        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Puntuación de Viabilidad (0 - 100 pts)',
                data: [],
                borderColor: '#22d3ee',
                backgroundColor: 'rgba(34, 211, 238, 0.1)',
                borderWidth: 2,
                pointRadius: 2,
                tension: 0.2,
                fill: true
              },
              {
                label: 'Promedio Población',
                data: [],
                borderColor: '#60a5fa',
                borderWidth: 1.5,
                borderDash: [4, 4],
                pointRadius: 1,
                tension: 0.2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: '#e8f1fb', font: { size: 11 } }
              }
            },
            scales: {
              x: {
                grid: { color: '#16202f' },
                ticks: { color: '#8ea3bd' }
              },
              y: {
                grid: { color: '#16202f' },
                ticks: { color: '#8ea3bd' }
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startOptimization = async (overrideGuardrailCheck = false) => {
    if (creditsRemaining < requiredCredits) {
      setShowBuyCredits(true);
      return;
    }

    if (!overrideGuardrailCheck && liveDiag.status === 'rojo' && !showGuardrailWarningConfirm) {
      setShowGuardrailWarningConfirm(true);
      return;
    }

    store.clearReport();
    setIsRunning(true);
    setIsFinished(false);
    setCurrentGen(0);
    setBestScore(0);
    setConverged(true);
    setDiscardedRatio(0);
    setBestCandidate(null);
    setViability(undefined);

    // Consumir créditos según nivel de optimización y sincronizar con backend
    store.recordOptimizationUsed(requiredCredits);
    try {
      fetch('/api/v1/user/credits/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'optimization', level: optLevel, amount: requiredCredits })
      }).then(r => r.json()).then(data => {
        if (data.credits) store.updateOrgCredits(data.credits);
      }).catch(() => {});
    } catch (_) {}

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = [];
      chartInstanceRef.current.data.datasets[0].data = [];
      chartInstanceRef.current.data.datasets[1].data = [];
      chartInstanceRef.current.update('none');
    }

    const reqs: DesignRequirements = {
      sector,
      estimated_weight_kg: Number(estimatedWeightKg) || 25,
      material,
      flight_hours: Number(flightHours) || 10,
      max_budget_eur: Number(maxBudgetEur) || 15000,
      safety_factor: Number(safetyFactor) || 2.5,
      cruise_velocity_ms: Number(cruiseVelocityMs) || 50,
      cost_per_kg_material: Number(costPerKgMaterial) || 120,
      labor_cost_per_hour: Number(laborCostPerHour) || 50,
      estimated_manufacturing_hours: Number(estimatedManufacturingHours) || 20,
      optimization_level: optLevel,
      optimization_mode: optMode,
      optimization_mode_type: optModeType,
      run_consistency_check: runConsistencyCheck,

      // Hard constraints v11.1 y Candados de Parámetros
      unconstrained,
      max_weight_kg: unconstrained ? undefined : (Number(maxWeightKg) || undefined),
      max_cost_eur: unconstrained ? undefined : (Number(maxCostEur) || undefined),
      min_ld: unconstrained ? undefined : (Number(minLd) || undefined),
      fixed_span_m: unconstrained ? undefined : (lockB && Number(valB) > 0 ? Number(valB) : (Number(fixedSpanM) > 0 ? Number(fixedSpanM) : undefined)),

      locked_params: {
        b: lockB ? valB : undefined,
        Cr: lockCr ? valCr : undefined,
        Ct: lockCt ? valCt : undefined,
        sweep_deg: lockSweep ? valSweep : undefined,
        twist_deg: lockTwist ? valTwist : undefined,
        alpha_deg: lockAlpha ? valAlpha : undefined,
        nacaCode: lockNaca ? valNaca : undefined,
      }
    };

    const opt = new GeneticOptimizer();
    optimizerRef.current = opt;
    setMaxGen(opt.generations);
    setDiscardedCount(0);

    opt.onGeneration = (gen, bestFit, avgFit, bestParams, disc, viabilityScore, bestAero, bestWeight, bestCost) => {
      setCurrentGen(gen);
      const currentScore = viabilityScore ?? Math.round(bestFit);
      setLiveScore(currentScore);
      if (bestAero?.LD) setLiveLD(bestAero.LD);
      if (bestWeight) setLiveWeight(bestWeight);
      if (bestCost) setLiveCost(bestCost);
      setBestScore(bestFit);
      setBestCandidate(bestParams);
      if (disc !== undefined) setDiscardedCount(disc);

      if (chartInstanceRef.current) {
        chartInstanceRef.current.data.labels?.push(gen);
        chartInstanceRef.current.data.datasets[0].data.push(currentScore);
        chartInstanceRef.current.data.datasets[1].data.push(avgFit);
        chartInstanceRef.current.update('none');
      }
    };

    try {
      const result = await opt.run(currentParams, reqs);
      setBestCandidate(result.bestParams);
      setBestScore(result.bestFitness);
      setConverged(result.converged);
      setDiscardedRatio(result.discardedRatio);
      setViability(result.viability);
      setIsFinished(true);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error durante la optimización. Revisa los parámetros e intenta de nuevo.');
    } finally {
      setIsRunning(false);
    }
  };

  const stopOptimization = () => {
    if (optimizerRef.current) {
      optimizerRef.current.stop();
      setIsRunning(false);
    }
  };

  const handleApply = () => {
    if (!converged) return; // No aplicar un resultado arbitrario de una corrida no convergida
    if (bestCandidate) {
      if (viability?.stabilityStatus === 'danger') {
        const confirmMsg = `ADVERTENCIA CRÍTICA DE SEGURIDAD ESTRUCTURAL:\n\n${viability.stabilityMessage}\n\n¿Está seguro de aplicar esta configuración a la mesa de trabajo?`;
        if (!window.confirm(confirmMsg)) return;
      }
      onApplyBest(bestCandidate);
      onClose();
    }
  };

  const progressPercent = Math.min(100, (currentGen / maxGen) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="opt-modal-title">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative w-full max-w-4xl bg-panel border border-line rounded-xl shadow-[var(--shadow-lg)] overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-line bg-panel2 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 text-accent font-bold">
            <Zap className="w-5 h-5 fill-current text-accent" />
            <span id="opt-modal-title" className="text-sm sm:text-base">Optimizador Técnico-Económico OptimAirWing</span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Badges de Créditos & Botón Comprar */}
            <div className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 border ${
              creditsRemaining === 0
                ? 'bg-bad/10 border-bad/40 text-bad'
                : creditsRemaining < 3
                ? 'bg-warn/10 border-warn/40 text-warn'
                : 'bg-accent/10 border-accent/30 text-accent2'
            }`}>
              <Activity className="w-3.5 h-3.5" />
              <span>Créditos: {creditsRemaining} / {org.monthly_optimizations_limit}</span>
            </div>

            <button
              onClick={() => setShowBuyCredits(true)}
              className="px-2.5 py-1 rounded text-xs font-bold bg-accent/20 text-accent2 border border-accent/40 hover:bg-accent/30 transition cursor-pointer flex items-center gap-1"
            >
              <span>+ Comprar Créditos</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-lo hover:text-hi hover:bg-well transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Alerta de Créditos Agotados o Bajos */}
          {creditsRemaining <= 0 && (
            <div className="p-3 bg-bad/15 border border-bad/40 rounded-lg text-xs text-bad flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-bad shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-bad uppercase tracking-wide">
                    Sin créditos de optimización disponibles
                  </span>
                  <span>
                    Ha alcanzado el límite de {org.monthly_optimizations_limit} optimizaciones para su plan ({org.plan.toUpperCase()}). Compre paquetes de créditos adicionales o actualice su plan.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowBuyCredits(true)}
                className="px-3 py-1.5 bg-bad text-hi font-bold rounded text-xs hover:brightness-110 transition shrink-0 cursor-pointer"
              >
                Comprar Paquete
              </button>
            </div>
          )}

          {/* Selección de Modo de Optimización & Nivel (Consumo de Créditos) */}
          <div className="bg-panel2 border border-line rounded-lg p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Nivel de Optimización & Consumo
              </span>
              <span className="text-xs text-warn font-semibold bg-warn/10 px-2 py-0.5 rounded border border-warn/30">
                Esta optimización consumirá 1 crédito (de {creditsRemaining} disponibles)
              </span>
            </div>

            {/* Modo de Optimización Multiobjetivo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-lo flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-accent" /> Modo de Optimización Objetivo:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {([
                  { mode: 'efficiency', label: 'Máxima Eficiencia', desc: 'Prioriza L/D' },
                  { mode: 'weight', label: 'Mínimo Peso', desc: 'Prioriza reducir kg' },
                  { mode: 'balance', label: 'Balance L/D vs Peso', desc: 'Compromiso óptimo' },
                ] as const).map(({ mode, label, desc }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setOptMode(mode)}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                      optMode === mode
                        ? 'bg-accent/20 border-accent text-accent2'
                        : 'bg-ink border-line text-lo hover:border-line2'
                    }`}
                  >
                    <span className="font-bold">{label}</span>
                    <span className="text-[10px] text-dim">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-1">
              {([
                { level: 'basic', label: 'Básica', desc: 'Estimación de referencia rápida', creditColor: 'accent' },
                { level: 'neuralfoil', label: 'Estándar', desc: 'Fidelidad estándar del análisis', creditColor: 'dhydro' },
                { level: 'structural', label: 'Avanzada', desc: 'Detalle avanzado (estructura y FS)', creditColor: 'accent-deep' },
                { level: 'full_custom', label: 'Completa', desc: 'Detalle completo (costes y MC)', creditColor: 'warn' },
              ] as const).map(({ level, label, desc, creditColor }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setOptLevel(level)}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                    optLevel === level
                      ? 'bg-accent/15 border-accent text-accent2 shadow-md shadow-accent/10'
                      : 'bg-ink border-line text-lo hover:border-line2'
                  }`}
                >
                  <div>
                    <div className="font-bold text-hi">{label}</div>
                    <div className="text-[10px] text-dim mt-0.5">{desc}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent2 border border-accent/30 w-fit">
                    1 Crédito
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-dim leading-relaxed">
              Todos los niveles utilizan el mismo motor de optimización; el nivel es una etiqueta de fidelidad/detalle del análisis, no un motor diferente. Cada corrida consume 1 crédito.
            </p>
          </div>

          <OptimizationForm
            sector={sector} setSector={handleSectorChange}
            estimatedWeightKg={estimatedWeightKg} setEstimatedWeightKg={setEstimatedWeightKg}
            material={material} setMaterial={setMaterial}
            flightHours={flightHours} setFlightHours={setFlightHours}
            maxBudgetEur={maxBudgetEur} setMaxBudgetEur={setMaxBudgetEur}
            safetyFactor={safetyFactor} setSafetyFactor={setSafetyFactor}
            cruiseVelocityMs={cruiseVelocityMs} setCruiseVelocityMs={setCruiseVelocityMs}
            optMode={optMode} setOptMode={setOptMode}
            optModeType={optModeType} setOptModeType={setOptModeType}
            unconstrained={unconstrained} setUnconstrained={setUnconstrained}
            maxWeightKg={maxWeightKg} setMaxWeightKg={setMaxWeightKg}
            maxCostEur={maxCostEur} setMaxCostEur={setMaxCostEur}
            minLd={minLd} setMinLd={setMinLd}
            fixedSpanM={fixedSpanM} setFixedSpanM={setFixedSpanM}
            costPerKgMaterial={costPerKgMaterial} setCostPerKgMaterial={setCostPerKgMaterial}
            laborCostPerHour={laborCostPerHour} setLaborCostPerHour={setLaborCostPerHour}
            estimatedManufacturingHours={estimatedManufacturingHours} setEstimatedManufacturingHours={setEstimatedManufacturingHours}
            optLevel={optLevel} setOptLevel={setOptLevel}
            runConsistencyCheck={runConsistencyCheck} setrunConsistencyCheck={setrunConsistencyCheck}
            discardedCount={discardedCount}
            currentParams={effectiveParams}
            selectedVehicle={appState.selectedVehicle}
          />

          <OptimizationLockedParams
            lockB={lockB} setLockB={setLockB}
            lockCr={lockCr} setLockCr={setLockCr}
            lockCt={lockCt} setLockCt={setLockCt}
            lockSweep={lockSweep} setLockSweep={setLockSweep}
            lockTwist={lockTwist} setLockTwist={setLockTwist}
            lockAlpha={lockAlpha} setLockAlpha={setLockAlpha}
            lockNaca={lockNaca} setLockNaca={setLockNaca}
            valB={valB} setValB={setValB}
            valCr={valCr} setValCr={setValCr}
            valCt={valCt} setValCt={setValCt}
            valSweep={valSweep} setValSweep={setValSweep}
            valTwist={valTwist} setValTwist={setValTwist}
            valAlpha={valAlpha} setValAlpha={setValAlpha}
            valNaca={valNaca} setValNaca={setValNaca}
          />

          {/* Start Optimization Button */}
          {!isRunning && !isFinished && (
            <button
              onClick={() => startOptimization(false)}
              disabled={creditsRemaining < requiredCredits}
              className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                creditsRemaining < requiredCredits
                  ? 'bg-line text-dim border border-line cursor-not-allowed'
                  : 'bg-accent text-ink hover:bg-accent2 shadow-md shadow-accent/20'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Ejecutar Optimización</span>
              <span className="text-[10px] font-mono opacity-70">(1 crédito)</span>
            </button>
          )}

          {isRunning && (
            <button
              onClick={stopOptimization}
              className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 bg-bad/20 text-bad border border-bad/40 hover:bg-bad/30 transition cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              <span>Detener Optimización</span>
            </button>
          )}

          {/* Progress Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-lo">
                {isRunning ? `Generación ${currentGen} de ${maxGen}` : isFinished ? 'Optimización Técnico-Económica Finalizada' : 'Listo para iniciar'}
              </span>
              <span className="text-accent font-bold">
                {isRunning && liveScore > 0 ? `Fitness (óptimo): ${liveScore}/100` : viability ? `Puntuación ajustada a riesgo: ${viability.riskAdjustedScore}/100` : ''}
              </span>
              {viability?.monteCarloAnalysis && (
                <span className="text-[10px] text-dim font-mono" title="Intervalo de confianza P50 ± P95 (Monte Carlo)">
                  &nbsp;| MC: L/D P50={viability.monteCarloAnalysis.LD.p50.toFixed(1)} P95={viability.monteCarloAnalysis.LD.p95.toFixed(1)}
                </span>
              )}
            </div>
            <div className="w-full bg-line h-2 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-bad/20 border border-bad/50 rounded-lg text-bad text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-bad shrink-0" />
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="ml-auto text-bad hover:brightness-125 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* COMPARADOR Y DATOS EN VIVO DEL ALA OPTIMIZADA */}
          {(isRunning || bestCandidate) && (
            <div className="bg-panel2 border border-accent/40 rounded-lg p-3.5 flex flex-col gap-3 shadow-lg shadow-accent/5">
              <div className="flex flex-wrap items-center justify-between border-b border-line pb-2 gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent animate-pulse" />
                  <span className="text-xs font-bold text-accent2 uppercase tracking-wider">
                    {isRunning ? 'Evolución en Vivo de Parámetros del Ala' : 'Comparativa: Ala Entrada vs Ala Optimizada'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-lo">
                    {isRunning ? 'Fitness (óptimo):' : 'Puntuación ajustada a riesgo:'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-black border ${
                    (isRunning ? liveScore : viability?.riskAdjustedScore ?? bestScore) >= 80
                      ? 'bg-ok/20 text-ok border-ok/40'
                      : (isRunning ? liveScore : viability?.riskAdjustedScore ?? bestScore) >= 60
                      ? 'bg-accent/20 text-accent2 border-accent/40'
                      : 'bg-warn/20 text-warn border-warn/40'
                  }`}>
                    {isRunning ? liveScore : viability?.riskAdjustedScore ?? bestScore} / 100 Pts
                  </span>
                </div>
              </div>

              {/* Grid Comparativo Parámetros del Ala */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {[
                  { label: 'Envergadura (b)', old: `${effectiveParams.b}m`, val: `${bestCandidate ? bestCandidate.b : effectiveParams.b} m`, tone: 'text-accent2' },
                  { label: 'Cuerda Raíz (Cr)', old: `${effectiveParams.Cr}m`, val: `${bestCandidate ? bestCandidate.Cr : effectiveParams.Cr} m`, tone: 'text-accent2' },
                  { label: 'Cuerda Punta (Ct)', old: `${effectiveParams.Ct}m`, val: `${bestCandidate ? bestCandidate.Ct : effectiveParams.Ct} m`, tone: 'text-accent2' },
                  { label: 'Perfil NACA', old: effectiveParams.nacaCode, val: `→ ${bestCandidate ? bestCandidate.nacaCode : effectiveParams.nacaCode}`, tone: 'text-accent2' },
                  { label: 'Flecha (Sweep)', old: `${effectiveParams.sweep_deg}°`, val: `→ ${bestCandidate ? bestCandidate.sweep_deg : effectiveParams.sweep_deg}°`, tone: 'text-warn' },
                  { label: 'Torsión (Twist)', old: `${effectiveParams.twist_deg}°`, val: `→ ${bestCandidate ? bestCandidate.twist_deg : effectiveParams.twist_deg}°`, tone: 'text-ok' },
                ].map(({ label, old, val, tone }, i) => (
                  <div key={i} className="bg-ink p-2 rounded border border-line">
                    <span className="text-dim block text-[10px]">{label}</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-[11px] text-lo line-through">{old}</span>
                      <span className={`font-extrabold ${tone} text-xs`}>{val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen Físico Resultante */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-line/60">
                <div className="flex items-center gap-2 bg-ink p-2 rounded border border-line">
                  <Zap className="w-4 h-4 text-accent shrink-0" />
                  <div>
                    <span className="text-[10px] text-dim block">Eficiencia Aerodinámica (L/D)</span>
                    <strong className="text-accent2 text-xs">{liveLD > 0 ? liveLD.toFixed(2) : '-'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-ink p-2 rounded border border-line">
                  <Weight className="w-4 h-4 text-warn shrink-0" />
                  <div>
                    <span className="text-[10px] text-dim block">Peso Estructural Est.</span>
                    <strong className="text-warn text-xs">{liveWeight > 0 ? `${liveWeight.toFixed(1)} kg` : viability ? `${viability.estimatedWeightKg} kg` : '-'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-ink p-2 rounded border border-line">
                  <div>
                    <span className="text-[10px] text-dim block">Coste Fabricación Est.</span>
                    <strong className="text-ok text-xs">{liveCost > 0 ? `${liveCost.toLocaleString()} €` : viability ? `${viability.estimatedCostEur.toLocaleString()} €` : '-'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Result Viability Dashboard Card if Available */}
          {viability && (
            <div className="bg-panel2 border border-accent/30 rounded-lg p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-ok" /> Evaluación Técnico-Económica & Estabilidad
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-ink border border-line text-lo">
                    Base: {viability.viabilityScore}/100
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                    viability.stabilityStatus === 'danger'
                      ? 'bg-bad/20 text-bad border-bad/40'
                      : viability.stabilityStatus === 'warning'
                      ? 'bg-warn/20 text-warn border-warn/40'
                      : 'bg-ok/20 text-ok border-ok/40'
                  }`}>
                    Ajustado Riesgo: {viability.riskAdjustedScore ?? viability.viabilityScore} / 100
                  </span>
                </div>
              </div>

              {/* SEMÁFOROS DE SEGURIDAD ESTRUCTURAL CUANTITATIVA */}
              <div className="bg-ink p-3 rounded-lg border border-line flex flex-col gap-2">
                <span className="text-[11px] font-bold text-lo uppercase tracking-wider">
                  Márgenes de Seguridad y Estabilidad Estructural (Semáforos Cuantitativos)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {/* FS Flexión */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1 ${
                    (viability.flexuralSafetyFactor ?? 2) >= 2.0
                      ? 'bg-ok/10 border-ok/30 text-ok'
                      : (viability.flexuralSafetyFactor ?? 2) >= 1.5
                      ? 'bg-warn/10 border-warn/30 text-warn'
                      : 'bg-bad/10 border-bad/30 text-bad'
                  }`}>
                    <span className="text-[10px] opacity-80 uppercase font-semibold">FS Flexión</span>
                    <span className="font-extrabold text-sm">{viability.flexuralSafetyFactor ?? '-'}x</span>
                    <span className="text-[9px] opacity-75">Sostenido: {viability.maxStressMpa ?? '-'} MPa</span>
                  </div>

                  {/* Deflexión Punta */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1 ${
                    (viability.tipDeflectionPercent ?? 0) < 3.0
                      ? 'bg-ok/10 border-ok/30 text-ok'
                      : (viability.tipDeflectionPercent ?? 0) <= 5.0
                      ? 'bg-warn/10 border-warn/30 text-warn'
                      : 'bg-bad/10 border-bad/30 text-bad'
                  }`}>
                    <span className="text-[10px] opacity-80 uppercase font-semibold">Deflexión Punta</span>
                    <span className="font-extrabold text-sm">{viability.tipDeflectionMm ?? '-'} mm</span>
                    <span className="text-[9px] opacity-75">{viability.tipDeflectionPercent ?? '-'}% de envergadura</span>
                  </div>

                  {/* Velocidad Divergencia */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1 ${
                    (viability.divergenceMargin ?? 2) >= 2.0
                      ? 'bg-ok/10 border-ok/30 text-ok'
                      : (viability.divergenceMargin ?? 2) >= 1.5
                      ? 'bg-warn/10 border-warn/30 text-warn'
                      : 'bg-bad/10 border-bad/30 text-bad'
                  }`}>
                    <span className="text-[10px] opacity-80 uppercase font-semibold">V_divergencia (V_d)</span>
                    <span className="font-extrabold text-sm">{viability.divergenceSpeedMs ?? '-'} m/s</span>
                    <span className="text-[9px] opacity-75">Margen: {viability.divergenceMargin ?? '-'}x V_crucero</span>
                  </div>

                  {/* Riesgo Flutter */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1 ${
                    viability.flutterRisk === 'bajo'
                      ? 'bg-ok/10 border-ok/30 text-ok'
                      : viability.flutterRisk === 'medio'
                      ? 'bg-warn/10 border-warn/30 text-warn'
                      : 'bg-bad/10 border-bad/30 text-bad'
                  }`}>
                    <span className="text-[10px] opacity-80 uppercase font-semibold">Riesgo Flutter</span>
                    <span className="font-extrabold text-sm uppercase">{viability.flutterRisk ?? 'Bajo'}</span>
                    <span className="text-[9px] opacity-75">Acoplamiento Flexo-Torsional</span>
                  </div>
                </div>
              </div>

              {/* Banner de Advertencia de Estabilidad Aeroelástica si no es 'safe' */}
              {viability.stabilityStatus && viability.stabilityStatus !== 'safe' && (
                <div className={`p-2.5 rounded border text-xs flex items-start gap-2 ${
                  viability.stabilityStatus === 'danger'
                    ? 'bg-bad/10 border-bad/30 text-bad'
                    : 'bg-warn/10 border-warn/30 text-warn'
                }`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold uppercase tracking-wider text-[11px]">
                      {viability.stabilityStatus === 'danger' ? 'PELIGRO ESTRUCTURAL (DIVERGENCIA AEROELÁSTICA)' : 'ADVERTENCIA DE ESTABILIDAD'}
                    </span>
                    <span>{viability.stabilityMessage}</span>
                    {viability.stabilityRecommendation && (
                      <span className="text-[11px] opacity-90 italic">Recomendación: {viability.stabilityRecommendation}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-ink p-2 rounded border border-line">
                  <span className="text-dim block text-[10px]">Momento Flector Raíz</span>
                  <span className="font-bold text-hi">{viability.bendingMomentNm?.toLocaleString() ?? '-'} Nm</span>
                  <span className="text-[10px] text-lo block">Factor de Carga: {safetyFactor * 2.5}g</span>
                </div>
                <div className="bg-ink p-2 rounded border border-line">
                  <span className="text-dim block text-[10px]">Carga Alar & V_stall</span>
                  <span className="font-bold text-accent2">{viability.wingLoadingKgM2 ?? '-'} kg/m²</span>
                  <span className="text-[10px] text-lo block">V_pérdida: {viability.stallSpeedMs ?? '-'} m/s</span>
                </div>
                <div className="bg-ink p-2 rounded border border-line">
                  <span className="text-dim block text-[10px]">Coste Fab. Est.</span>
                  <span className="font-bold text-warn">{viability.estimatedCostEur.toLocaleString()} €</span>
                  <span className="text-[10px] text-lo block">(Máx: {maxBudgetEur.toLocaleString()} €)</span>
                </div>
                <div className="bg-ink p-2 rounded border border-line">
                  <span className="text-dim block text-[10px]">Retorno Est.</span>
                  <span className="font-bold text-ok">~{viability.paybackMonths} Meses</span>
                </div>
              </div>

              {viability.sensitivityRecommendations.length > 0 && (
                <div className="text-[11px] text-lo bg-ink p-2 rounded border border-line">
                  <strong className="text-accent block mb-0.5">Recomendaciones de Sensibilidad & Refuerzos:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {viability.sensitivityRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!converged && bestCandidate && !isRunning && (
            <div className="p-3 bg-warn/15 border border-warn/40 rounded-lg text-xs text-warn flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase tracking-wide text-warn">
                  La optimización no convergió
                </span>
                <span>
                  El {Math.round(discardedRatio * 100)}% de los diseños evaluados fue descartado por las restricciones. El resultado mostrado es una aproximación; revise las restricciones o active «Exploración Libre» antes de aplicar.
                </span>
              </div>
            </div>
          )}

          {bestCandidate && !isRunning && (
            <div className="flex justify-end gap-2">
              <button onClick={handleApply}
                disabled={!converged}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition cursor-pointer text-xs font-bold shadow-md ${
                  converged
                    ? 'bg-ok/20 text-ok border-ok/40 hover:bg-ok/30 shadow-ok/10'
                    : 'bg-line text-dim border-line cursor-not-allowed'
                }`}
                title={converged
                  ? 'Aceptar diseño y aplicar a la mesa de trabajo'
                  : 'Optimización no convergida: revise las restricciones o active Exploración Libre'}>
                <span>Aceptar Diseño</span>
              </button>
            </div>
          )}

          {/* Chart Canvas Container */}
          <div className="w-full h-52 bg-ink rounded-lg border border-line p-3">
            <canvas ref={chartCanvasRef} />
          </div>
        </div>
      </div>

      {/* Modal Popup para Comprar Créditos Extra */}
      <CreditsPurchaseModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />

      {/* Modal Popup para Confirmación de Guardarraíles Incompatibles */}
      {showGuardrailWarningConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-bad/50 rounded-xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2 text-bad font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-bad shrink-0" />
              <span>Advertencia de Inviabilidad Sectorial</span>
            </div>
            <div className="text-xs text-lo space-y-2">
              <p>
                La geometría actual (b: {effectiveParams.b} m, Cr: {effectiveParams.Cr} m) sobrepasa los límites característicos para el sector <strong className="text-hi uppercase">{sector}</strong>.
              </p>
              <div className="bg-bad/10 border border-bad/30 p-2.5 rounded text-bad text-[11px]">
                <ul className="list-disc list-inside space-y-1">
                  {liveDiag.issues.map((iss, idx) => (
                    <li key={idx}>{iss}</li>
                  ))}
                </ul>
              </div>
              <p>
                Si continúa, el Algoritmo Genético acotará automáticamente la geometría a los límites del sector y aplicará penalizaciones.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setShowGuardrailWarningConfirm(false)}
                className="px-3 py-1.5 rounded bg-panel2 text-lo hover:text-hi text-xs font-semibold cursor-pointer"
              >
                Ajustar Parámetros
              </button>
              <button
                onClick={() => {
                  setShowGuardrailWarningConfirm(false);
                  startOptimization(true);
                }}
                className="px-3 py-1.5 rounded bg-bad hover:brightness-110 text-hi text-xs font-bold cursor-pointer"
              >
                Continuar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
