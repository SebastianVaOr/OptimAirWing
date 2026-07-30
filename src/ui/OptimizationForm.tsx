import React from 'react';
import { Sliders, ShieldAlert, Activity } from 'lucide-react';
import { TargetSector, OptimizationMode, StructuralMaterial, OptimizationSourceMode, LegacyWingPayload } from '../core/types';
import { checkSectorViability, getSectorPreset, SECTOR_PRESETS } from '../domains/wing/sectorGuardrails';
import { MATERIALS_DB } from '../domains/wing/materials';
import { store } from '../core/store';

interface Props {
  sector: TargetSector; setSector: (v: TargetSector) => void;
  estimatedWeightKg: number; setEstimatedWeightKg: (v: number) => void;
  material: StructuralMaterial; setMaterial: (v: StructuralMaterial) => void;
  flightHours: number; setFlightHours: (v: number) => void;
  maxBudgetEur: number; setMaxBudgetEur: (v: number) => void;
  safetyFactor: number; setSafetyFactor: (v: number) => void;
  cruiseVelocityMs: number; setCruiseVelocityMs: (v: number) => void;
  optMode: OptimizationMode; setOptMode: (v: OptimizationMode) => void;
  optModeType: OptimizationSourceMode; setOptModeType: (v: OptimizationSourceMode) => void;
  unconstrained: boolean; setUnconstrained: (v: boolean) => void;
  maxWeightKg: number; setMaxWeightKg: (v: number) => void;
  maxCostEur: number; setMaxCostEur: (v: number) => void;
  minLd: number; setMinLd: (v: number) => void;
  fixedSpanM: number; setFixedSpanM: (v: number) => void;
  costPerKgMaterial: number; setCostPerKgMaterial: (v: number) => void;
  laborCostPerHour: number; setLaborCostPerHour: (v: number) => void;
  estimatedManufacturingHours: number; setEstimatedManufacturingHours: (v: number) => void;
  optLevel: string; setOptLevel: React.Dispatch<React.SetStateAction<'basic' | 'neuralfoil' | 'structural' | 'full_custom'>>;
  runCfdValidation: boolean; setRunCfdValidation: (v: boolean) => void;
  discardedCount: number;
  currentParams: LegacyWingPayload;
  selectedVehicle: string;
}

export const OptimizationForm: React.FC<Props> = (p) => {
  const effectiveParams = p.currentParams || store.getState().legacyParams;
  const liveDiag = checkSectorViability(p.sector, effectiveParams);

  const handleSectorChange = (newSector: TargetSector) => {
    p.setSector(newSector);
    const preset = getSectorPreset(newSector);
    p.setMaxWeightKg(preset.max_weight_kg);
    p.setEstimatedWeightKg(preset.max_weight_kg);
    p.setMaxCostEur(preset.max_cost_eur);
    p.setMaxBudgetEur(preset.max_cost_eur);
    p.setMinLd(preset.min_ld);
    p.setSafetyFactor(preset.safety_factor);
    if (newSector.startsWith('f1_') || newSector === 'gt_spoiler') {
      store.setVehicleCategory('f1_motorsport');
      p.setOptMode('efficiency');
    } else if (newSector.startsWith('hydrofoil_')) {
      store.setVehicleCategory('hydrofoil_nautical');
      p.setOptMode('balance');
    } else {
      store.setVehicleCategory('aircraft');
      p.setOptMode('balance');
    }
  };

  return (
    <div className="bg-[#0d1520] border border-[#1e2d42] rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[#1e2d42] pb-2">
        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5" /> Requerimientos de Misión & Presupuesto
        </span>
        <span className="text-[11px] text-[#5a7390]">Parámetros de entrada para el Algoritmo Genético</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-[#9aaec9] font-medium">Sector / Aplicación</label>
            {liveDiag.status === 'rojo' && <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/30">Incompatible</span>}
          </div>
          <select value={p.sector} onChange={e => handleSectorChange(e.target.value as TargetSector)}
            className="bg-[#070b12] border border-[#1e2d42] text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none font-medium">
            <optgroup label="🏎️ Motorsport">
              <option value="f1_rear_wing">F1 Alerón Trasero DRS</option>
              <option value="f1_front_wing">F1 Alerón Delantero</option>
              <option value="gt_spoiler">GT3 Spoiler</option>
            </optgroup>
            <optgroup label="🚤 Náutica">
              <option value="hydrofoil_racing">Hydrofoil Regata AC75</option>
              <option value="hydrofoil_efoil">Surf / E-Foil</option>
              <option value="hydrofoil_ferry">Hydrofoil Ferry</option>
            </optgroup>
            <optgroup label="✈️ Aeronáutica">
              <option value="uav">Dron / UAV</option>
              <option value="comercial">Aviación Comercial</option>
              <option value="glider">Velero</option>
              <option value="sport">Deportiva</option>
              <option value="evtol">eVTOL</option>
              <option value="experimental">Experimental</option>
            </optgroup>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[#9aaec9] font-medium">Peso Objetivo (kg)</label>
          <input type="number" min="0.5" max="5000" value={p.estimatedWeightKg}
            onChange={e => p.setEstimatedWeightKg(parseFloat(e.target.value) || 1)}
            className="bg-[#070b12] border border-[#1e2d42] text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[#9aaec9] font-medium">Material</label>
          <select value={p.material} onChange={e => { const v = e.target.value as StructuralMaterial; p.setMaterial(v); p.setCostPerKgMaterial(MATERIALS_DB[v]?.cost_kg || 120); }}
            className="bg-[#070b12] border border-[#1e2d42] text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none">
            {Object.entries(MATERIALS_DB).map(([k, m]) => (
              <option key={k} value={k}>{m.name} ({m.cost_kg} €/kg)</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[#9aaec9] font-medium">Velocidad (m/s)</label>
          <input type="number" min="5" max="200" value={p.cruiseVelocityMs}
            onChange={e => p.setCruiseVelocityMs(parseFloat(e.target.value) || 50)}
            className="bg-[#070b12] border border-[#1e2d42] text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[#9aaec9] font-medium">Presupuesto Máx (€)</label>
          <input type="number" min="100" max="500000" value={p.maxBudgetEur}
            onChange={e => p.setMaxBudgetEur(parseFloat(e.target.value) || 1000)}
            className="bg-[#070b12] border border-[#1e2d42] text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-[#9aaec9] font-medium">FS (1.5-4.0)</label>
            <span className={`px-2 py-0.5 rounded text-xs font-black ${p.safetyFactor < 2 ? 'bg-rose-500/20 text-rose-300' : p.safetyFactor > 3.2 ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
              {p.safetyFactor.toFixed(1)}x
            </span>
          </div>
          <input type="range" min="1.5" max="4.0" step="0.1" value={p.safetyFactor}
            onChange={e => p.setSafetyFactor(parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer my-1" />
        </div>

        {/* Hard Constraints Section */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-[#070b12] border border-cyan-500/30 rounded-lg p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1e2d42] pb-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Restricciones Hard
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 rounded text-xs text-emerald-300 font-bold">
              <input type="checkbox" checked={p.unconstrained} onChange={e => p.setUnconstrained(e.target.checked)}
                className="accent-emerald-400 w-4 h-4 rounded cursor-pointer" />
              <span>Exploración Libre</span>
            </label>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[#9aaec9] text-[11px]">Peso Máx (kg)</label>
              <input type="number" disabled={p.unconstrained} value={p.maxWeightKg}
                onChange={e => p.setMaxWeightKg(parseFloat(e.target.value) || 0)}
                className={`bg-[#0d1520] border text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 ${p.unconstrained ? 'opacity-40' : 'border-[#1e2d42]'}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[#9aaec9] text-[11px]">Coste Máx (€)</label>
              <input type="number" disabled={p.unconstrained} value={p.maxCostEur}
                onChange={e => p.setMaxCostEur(parseFloat(e.target.value) || 0)}
                className={`bg-[#0d1520] border text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 ${p.unconstrained ? 'opacity-40' : 'border-[#1e2d42]'}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[#9aaec9] text-[11px]">L/D Mínimo</label>
              <input type="number" disabled={p.unconstrained} value={p.minLd}
                onChange={e => p.setMinLd(parseFloat(e.target.value) || 0)}
                className={`bg-[#0d1520] border text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 ${p.unconstrained ? 'opacity-40' : 'border-[#1e2d42]'}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[#9aaec9] text-[11px]">Envergadura Fija (m)</label>
              <input type="number" disabled={p.unconstrained} value={p.fixedSpanM}
                onChange={e => p.setFixedSpanM(parseFloat(e.target.value) || 0)}
                className={`bg-[#0d1520] border text-[#e8edf4] rounded px-2.5 py-1.5 focus:border-cyan-500 ${p.unconstrained ? 'opacity-40' : 'border-[#1e2d42]'}`} />
            </div>
          </div>

          {p.discardedCount > 300 && !p.unconstrained && (
            <div className="bg-amber-500/15 border border-amber-500/40 text-amber-200 rounded p-2.5 text-xs flex items-center gap-2">
              <span>Restricciones demasiado estrictas ({p.discardedCount} diseños descartados). Active "Exploración Libre" o aumente los límites.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
