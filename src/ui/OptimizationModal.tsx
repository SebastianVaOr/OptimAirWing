import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, StopCircle, CheckCircle, Cpu, Layers, Award, AlertTriangle, Activity, Lock, ArrowUpRight, Weight, Scale } from 'lucide-react';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { GeneticOptimizer } from '../domains/wing/geneticOptimizer';
import { DesignRequirements, LegacyWingPayload, OptimizationMode, OptimizationSourceMode, StructuralMaterial, TargetSector, ViabilityAnalysis } from '../core/types';
import { MATERIALS_DB } from '../domains/wing/materials';
import { checkSectorViability, getSectorLimits, getSectorPreset } from '../domains/wing/sectorGuardrails';
import { store } from '../core/store';
import { CreditsPurchaseModal } from './CreditsPurchaseModal';
import { OptimizationLockedParams } from './OptimizationLockedParams';
import { OptimizationForm } from './OptimizationForm';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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
  const [bestLD, setBestLD] = useState(0);
  const [liveScore, setLiveScore] = useState<number>(0);
  const [liveLD, setLiveLD] = useState<number>(0);
  const [liveWeight, setLiveWeight] = useState<number>(0);
  const [liveCost, setLiveCost] = useState<number>(0);
  const [bestCandidate, setBestCandidate] = useState<LegacyWingPayload | null>(null);
  const [viability, setViability] = useState<ViabilityAnalysis | undefined>(undefined);
  const [isFinished, setIsFinished] = useState(false);

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
  const [runCfdValidation, setRunCfdValidation] = useState<boolean>(true);

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
    let base = 1;
    switch (optLevel) {
      case 'full_custom': base = 7; break;
      case 'structural': base = 5; break;
      case 'neuralfoil': base = 2; break;
      case 'basic': default: base = 1; break;
    }
    if (optMode === 'balance' || optMode === 'weight') {
      base += 2;
    }
    return base;
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
                labels: { color: '#e8edf4', font: { size: 11 } }
              }
            },
            scales: {
              x: {
                grid: { color: '#1e2d42' },
                ticks: { color: '#9aaec9' }
              },
              y: {
                grid: { color: '#1e2d42' },
                ticks: { color: '#9aaec9' }
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
    setBestLD(0);
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
      run_cfd_validation: runCfdValidation,

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
      setBestLD(bestAero?.LD || bestFit);
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
      setBestLD(result.bestFitness);
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0a111c] border border-[#1e2d42] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[#1e2d42] bg-[#0d1520] shrink-0 gap-2">
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold">
            <Zap className="w-5 h-5 fill-current text-cyan-400" />
            <span className="text-sm sm:text-base">Optimizador Técnico-Económico OptimAirWing</span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Badges de Créditos & Botón Comprar */}
            <div className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 border ${
              creditsRemaining === 0
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : creditsRemaining < 3
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
            }`}>
              <Activity className="w-3.5 h-3.5" />
              <span>Créditos: {creditsRemaining} / {org.monthly_optimizations_limit}</span>
            </div>

            <button
              onClick={() => setShowBuyCredits(true)}
              className="px-2.5 py-1 rounded text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition cursor-pointer flex items-center gap-1"
            >
              <span>+ Comprar Créditos</span>
            </button>

            <button onClick={onClose} className="text-[#9aaec9] hover:text-white transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Alerta de Créditos Agotados o Bajos */}
          {creditsRemaining <= 0 && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-lg text-xs text-rose-200 flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-rose-300 uppercase tracking-wide">
                    Sin créditos de optimización disponibles
                  </span>
                  <span>
                    Ha alcanzado el límite de {org.monthly_optimizations_limit} optimizaciones para su plan ({org.plan.toUpperCase()}). Compre paquetes de créditos adicionales o actualice su plan.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowBuyCredits(true)}
                className="px-3 py-1.5 bg-rose-500 text-white font-bold rounded text-xs hover:bg-rose-600 transition shrink-0 cursor-pointer"
              >
                Comprar Paquete
              </button>
            </div>
          )}

          {/* Selección de Modo de Optimización & Nivel (Consumo de Créditos) */}
          <div className="bg-[#0d1520] border border-[#1e2d42] rounded-lg p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Nivel de Optimización & Consumo
              </span>
              <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Esta optimización consumirá {requiredCredits} crédito(s) (de {creditsRemaining} disponibles)
              </span>
            </div>

            {/* Modo de Optimización Multiobjetivo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9aaec9] flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-cyan-400" /> Modo de Optimización Objetivo:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOptMode('efficiency')}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    optMode === 'efficiency'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#070b12] border-[#1e2d42] text-[#9aaec9] hover:border-[#2a3f5c]'
                  }`}
                >
                  <span className="font-bold">Máxima Eficiencia</span>
                  <span className="text-[10px] text-[#5a7390]">Prioriza L/D (+0 cred)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptMode('weight')}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    optMode === 'weight'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#070b12] border-[#1e2d42] text-[#9aaec9] hover:border-[#2a3f5c]'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">
                    Mínimo Peso <span className="text-[9px] bg-cyan-500/30 text-cyan-200 px-1 rounded">+2 cred</span>
                  </span>
                  <span className="text-[10px] text-[#5a7390]">Prioriza reducir kg</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptMode('balance')}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    optMode === 'balance'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#070b12] border-[#1e2d42] text-[#9aaec9] hover:border-[#2a3f5c]'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">
                    Balance L/D vs Peso <span className="text-[9px] bg-cyan-500/30 text-cyan-200 px-1 rounded">+2 cred</span>
                  </span>
                  <span className="text-[10px] text-[#5a7390]">Compromiso óptimo</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => setOptLevel('basic')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  optLevel === 'basic'
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                    : 'bg-[#070b12] border-[#1e2d42] text-[#9aaec9] hover:border-[#2a3f5c]'
                }`}
              >
                <div>
                  <div className="font-bold text-[#e8edf4]">Básica</div>
                  <div className="text-[10px] text-[#5a7390] mt-0.5">Aerodinámica empírica sola</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 w-fit">
                  {1 + (optMode === 'balance' || optMode === 'weight' ? 2 : 0)} Créditos
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOptLevel('neuralfoil')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  optLevel === 'neuralfoil'
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                    : 'bg-[#070b12] border-[#1e2d42] text-[#9aaec9] hover:border-[#2a3f5c]'
                }`}
              >
                <div>
                  <div className="font-bold text-[#e8edf4]">NeuralFoil IA</div>
                  <div className="text-[10px] text-[#5a7390] mt-0.5">+ Inferencia red neuronal</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 w-fit">
                  {2 + (optMode === 'balance' || optMode === 'weight' ? 2 : 0)} Créditos
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOptLevel('structural')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  optLevel === 'structural'
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                    : 'bg-[#070b12] border-[#1e2d42] text-[#9aaec9] hover:border-[#2a3f5c]'
                }`}
              >
                <div>
                  <div className="font-bold text-[#e8edf4]">Estructural</div>
                  <div className="text-[10px] text-[#5a7390] mt-0.5">+ FS, deflexión y V_d</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 w-fit">
                  {5 + (optMode === 'balance' || optMode === 'weight' ? 2 : 0)} Créditos
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOptLevel('full_custom')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  optLevel === 'full_custom'
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                    : 'bg-[#070b12] border-[#1e2d42] text-[#9aaec9] hover:border-[#2a3f5c]'
                }`}
              >
                <div>
                  <div className="font-bold text-[#e8edf4]">Costes Reales</div>
                  <div className="text-[10px] text-[#5a7390] mt-0.5">+ Material & Mano de obra</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
                  {7 + (optMode === 'balance' || optMode === 'weight' ? 2 : 0)} Créditos
                </span>
              </button>
            </div>
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
            runCfdValidation={runCfdValidation} setRunCfdValidation={setRunCfdValidation}
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

          {/* Progress Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#9aaec9]">
                {isRunning ? `Generación ${currentGen} de ${maxGen}` : isFinished ? 'Optimización Técnico-Económica Finalizada' : 'Listo para iniciar'}
              </span>
              <span className="text-cyan-400 font-bold">
                {liveScore > 0 ? `Score: ${liveScore}/100 Pts` : viability ? `Score: ${viability.riskAdjustedScore}/100 Pts` : ''}
              </span>
              {viability?.monteCarloAnalysis && (
                <span className="text-[10px] text-[#5a7390] font-mono" title="Intervalo de confianza P50 ± P95 (Monte Carlo)">
                  &nbsp;| MC: L/D P50={viability.monteCarloAnalysis.LD.p50.toFixed(1)} P95={viability.monteCarloAnalysis.LD.p95.toFixed(1)}
                </span>
              )}
            </div>
            <div className="w-full bg-[#1e2d42] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-400 hover:text-rose-200 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* COMPARADOR Y DATOS EN VIVO DEL ALA OPTIMIZADA */}
          {(isRunning || bestCandidate) && (
            <div className="bg-[#0d1520] border border-cyan-500/40 rounded-lg p-3.5 flex flex-col gap-3 shadow-lg shadow-cyan-500/5">
              <div className="flex flex-wrap items-center justify-between border-b border-[#1e2d42] pb-2 gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    {isRunning ? 'Evolución en Vivo de Parámetros del Ala' : 'Comparativa: Ala Entrada vs Ala Optimizada'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-[#9aaec9]">Puntuación de Viabilidad (0-100):</span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-black border ${
                    (viability?.riskAdjustedScore ?? liveScore) >= 80
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : (viability?.riskAdjustedScore ?? liveScore) >= 60
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {viability?.riskAdjustedScore ?? liveScore} / 100 Pts
                  </span>
                </div>
              </div>

              {/* Grid Comparativo Parámetros del Ala */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {/* Envergadura b */}
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Envergadura (b)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[11px] text-[#9aaec9] line-through">{effectiveParams.b}m</span>
                    <span className="font-extrabold text-cyan-300 text-xs">→ {bestCandidate ? bestCandidate.b : effectiveParams.b} m</span>
                  </div>
                </div>

                {/* Cuerda Raíz Cr */}
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Cuerda Raíz (Cr)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[11px] text-[#9aaec9] line-through">{effectiveParams.Cr}m</span>
                    <span className="font-extrabold text-cyan-300 text-xs">→ {bestCandidate ? bestCandidate.Cr : effectiveParams.Cr} m</span>
                  </div>
                </div>

                {/* Cuerda Punta Ct */}
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Cuerda Punta (Ct)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[11px] text-[#9aaec9] line-through">{effectiveParams.Ct}m</span>
                    <span className="font-extrabold text-cyan-300 text-xs">→ {bestCandidate ? bestCandidate.Ct : effectiveParams.Ct} m</span>
                  </div>
                </div>

                {/* Perfil NACA */}
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Perfil NACA</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[11px] text-[#9aaec9] line-through">{effectiveParams.nacaCode}</span>
                    <span className="font-extrabold text-purple-300 text-xs">→ {bestCandidate ? bestCandidate.nacaCode : effectiveParams.nacaCode}</span>
                  </div>
                </div>

                {/* Flecha Sweep */}
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Flecha (Sweep)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[11px] text-[#9aaec9] line-through">{effectiveParams.sweep_deg}°</span>
                    <span className="font-extrabold text-amber-300 text-xs">→ {bestCandidate ? bestCandidate.sweep_deg : effectiveParams.sweep_deg}°</span>
                  </div>
                </div>

                {/* Torsión Twist */}
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Torsión (Twist)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[11px] text-[#9aaec9] line-through">{effectiveParams.twist_deg}°</span>
                    <span className="font-extrabold text-emerald-300 text-xs">→ {bestCandidate ? bestCandidate.twist_deg : effectiveParams.twist_deg}°</span>
                  </div>
                </div>
              </div>

              {/* Resumen Físico Resultante */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-[#1e2d42]/60">
                <div className="flex items-center gap-2 bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#5a7390] block">Eficiencia Aerodinámica (L/D)</span>
                    <strong className="text-cyan-300 text-xs">{liveLD > 0 ? liveLD.toFixed(2) : bestLD > 0 ? bestLD.toFixed(2) : '-'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <Weight className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#5a7390] block">Peso Estructural Est.</span>
                    <strong className="text-amber-300 text-xs">{liveWeight > 0 ? `${liveWeight.toFixed(1)} kg` : viability ? `${viability.estimatedWeightKg} kg` : '-'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[#070b12] p-2 rounded border border-[#1e2d42]">

                  <div>
                    <span className="text-[10px] text-[#5a7390] block">Coste Fabricación Est.</span>
                    <strong className="text-emerald-300 text-xs">{liveCost > 0 ? `${liveCost.toLocaleString()} €` : viability ? `${viability.estimatedCostEur.toLocaleString()} €` : '-'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Result Viability Dashboard Card if Available */}
          {viability && (
            <div className="bg-[#0d1520] border border-cyan-500/30 rounded-lg p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#1e2d42] pb-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" /> Evaluación Técnico-Económica & Estabilidad
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#070b12] border border-[#1e2d42] text-[#9aaec9]">
                    Base: {viability.viabilityScore}/100
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                    viability.stabilityStatus === 'danger'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : viability.stabilityStatus === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    Ajustado Riesgo: {viability.riskAdjustedScore ?? viability.viabilityScore} / 100
                  </span>
                </div>
              </div>

              {/* SEMÁFOROS DE SEGURIDAD ESTRUCTURAL CUANTITATIVA */}
              <div className="bg-[#070b12] p-3 rounded-lg border border-[#1e2d42] flex flex-col gap-2">
                <span className="text-[11px] font-bold text-[#9aaec9] uppercase tracking-wider">
                  Márgenes de Seguridad y Estabilidad Estructural (Semáforos Cuantitativos)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {/* FS Flexión */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1 ${
                    (viability.flexuralSafetyFactor ?? 2) >= 2.0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : (viability.flexuralSafetyFactor ?? 2) >= 1.5
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    <span className="text-[10px] opacity-80 uppercase font-semibold">FS Flexión</span>
                    <span className="font-extrabold text-sm">{viability.flexuralSafetyFactor ?? '-'}x</span>
                    <span className="text-[9px] opacity-75">Sostenido: {viability.maxStressMpa ?? '-'} MPa</span>
                  </div>

                  {/* Deflexión Punta */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1 ${
                    (viability.tipDeflectionPercent ?? 0) < 3.0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : (viability.tipDeflectionPercent ?? 0) <= 5.0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    <span className="text-[10px] opacity-80 uppercase font-semibold">Deflexión Punta</span>
                    <span className="font-extrabold text-sm">{viability.tipDeflectionMm ?? '-'} mm</span>
                    <span className="text-[9px] opacity-75">{viability.tipDeflectionPercent ?? '-'}% de envergadura</span>
                  </div>

                  {/* Velocidad Divergencia */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1 ${
                    (viability.divergenceMargin ?? 2) >= 2.0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : (viability.divergenceMargin ?? 2) >= 1.5
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    <span className="text-[10px] opacity-80 uppercase font-semibold">V_divergencia (V_d)</span>
                    <span className="font-extrabold text-sm">{viability.divergenceSpeedMs ?? '-'} m/s</span>
                    <span className="text-[9px] opacity-75">Margen: {viability.divergenceMargin ?? '-'}x V_crucero</span>
                  </div>

                  {/* Riesgo Flutter */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1 ${
                    viability.flutterRisk === 'bajo'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : viability.flutterRisk === 'medio'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
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
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
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
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Momento Flector Raíz</span>
                  <span className="font-bold text-[#e8edf4]">{viability.bendingMomentNm?.toLocaleString() ?? '-'} Nm</span>
                  <span className="text-[10px] text-[#9aaec9] block">Factor de Carga: {safetyFactor * 2.5}g</span>
                </div>
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Carga Alar & V_stall</span>
                  <span className="font-bold text-cyan-300">{viability.wingLoadingKgM2 ?? '-'} kg/m²</span>
                  <span className="text-[10px] text-[#9aaec9] block">V_pérdida: {viability.stallSpeedMs ?? '-'} m/s</span>
                </div>
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Coste Fab. Est.</span>
                  <span className="font-bold text-amber-300">{viability.estimatedCostEur.toLocaleString()} €</span>
                  <span className="text-[10px] text-[#9aaec9] block">(Máx: {maxBudgetEur.toLocaleString()} €)</span>
                </div>
                <div className="bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <span className="text-[#5a7390] block text-[10px]">Retorno Est.</span>
                  <span className="font-bold text-emerald-300">~{viability.paybackMonths} Meses</span>
                </div>
              </div>

              {viability.sensitivityRecommendations.length > 0 && (
                <div className="text-[11px] text-[#9aaec9] bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                  <strong className="text-cyan-400 block mb-0.5">Recomendaciones de Sensibilidad & Refuerzos:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {viability.sensitivityRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {bestCandidate && !isRunning && (
            <div className="flex justify-end gap-2">
              <button onClick={handleApply}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer text-xs font-bold shadow-md shadow-emerald-500/10"
                title="Aceptar diseño y aplicar a la mesa de trabajo">
                <span>Aceptar Diseño</span>
              </button>
            </div>
          )}

          {/* Chart Canvas Container */}
          <div className="w-full h-52 bg-[#070b12] rounded-lg border border-[#1e2d42] p-3">
            <canvas ref={chartCanvasRef} />
          </div>
        </div>
      </div>

      {/* Modal Popup para Comprar Créditos Extra */}
      <CreditsPurchaseModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />

      {/* Modal Popup para Confirmación de Guardarraíles Incompatibles */}
      {showGuardrailWarningConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a111c] border border-rose-500/50 rounded-xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>Advertencia de Inviabilidad Sectorial</span>
            </div>
            <div className="text-xs text-[#9aaec9] space-y-2">
              <p>
                La geometría actual (b: {effectiveParams.b} m, Cr: {effectiveParams.Cr} m) sobrepasa los límites característicos para el sector <strong className="text-white uppercase">{sector}</strong>.
              </p>
              <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded text-rose-300 text-[11px]">
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
            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e2d42]">
              <button
                onClick={() => setShowGuardrailWarningConfirm(false)}
                className="px-3 py-1.5 rounded bg-[#132030] text-[#9aaec9] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Ajustar Parámetros
              </button>
              <button
                onClick={() => {
                  setShowGuardrailWarningConfirm(false);
                  startOptimization(true);
                }}
                className="px-3 py-1.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
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
