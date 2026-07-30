import React, { useState, useEffect } from 'react';
import { PredictionResult, LegacyWingPayload } from '../core/types';
import { Calculator, Bookmark, Activity, Info, Zap, CheckCircle2, RotateCcw, Car, Anchor, ShieldAlert, Download } from 'lucide-react';
import { store, AppState } from '../core/store';
import { computeVehiclePhysics } from '../domains/vehicleDomain';

interface ResultsPanelProps {
  prediction: PredictionResult | null;
  params: LegacyWingPayload;
  onSaveSnapshot: () => void;
  onOpenExport?: () => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ prediction, params, onSaveSnapshot, onOpenExport }) => {
  const [appState, setAppState] = useState<AppState>(store.getState());

  useEffect(() => {
    const unsub = store.subscribe(s => setAppState(s));
    return () => unsub();
  }, []);

  if (!prediction) return null;

  const vehiclePhysics = computeVehiclePhysics(
    appState.selectedVehicle,
    { CL: prediction.CL, CD: prediction.CD, S_m2: prediction.S_m2, Cr: params.Cr },
    appState.f1Params,
    appState.hydroParams
  );

  return (
    <div className="w-full lg:w-80 lg:min-w-[320px] bg-[#0a111c] border-t lg:border-t-0 lg:border-l border-[#1e2d42] p-4 flex flex-col gap-3 select-none overflow-y-auto shrink-0 h-full">
      <div className="flex items-center justify-between border-b border-[#1e2d42] pb-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
          <Calculator className="w-4 h-4" />
          <span>Resultados</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => store.clearReport()}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#131f2e] text-[#9aaec9] hover:text-rose-400 border border-[#1e2d42] hover:border-rose-500/30 transition cursor-pointer"
            title="Limpiar datos e historial de optimizaciones previas"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
          <button
            onClick={onSaveSnapshot}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition cursor-pointer"
            title="Guardar Snapshot (G)"
          >
            <Bookmark className="w-3 h-3" />
            <span>Guardar</span>
          </button>
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
              title="Descargar CAD / PDF / CSV / Python"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Exportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta Específica de Física por Dominio de Vehículo (FASE 1) */}
      {appState.selectedVehicle === 'f1_motorsport' && (
        <div className="bg-[#180a0a] border border-red-500/40 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-red-400 border-b border-red-500/20 pb-1">
            <span className="flex items-center gap-1">
              <Car className="w-4 h-4 text-red-400" />
              <span>Física F1 & Downforce</span>
            </span>
            <span className="text-[10px] font-mono bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30 text-red-300">
              {vehiclePhysics.currentSpeedValue} km/h
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#070b12] p-2 rounded border border-red-500/20">
              <div className="text-[10px] text-[#9aaec9]">Carga Downforce</div>
              <div className="text-sm font-mono font-extrabold text-red-400">
                {vehiclePhysics.primaryForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-[#5a7390] font-mono">({vehiclePhysics.primaryForceN.toFixed(0)} N)</div>
            </div>

            <div className="bg-[#070b12] p-2 rounded border border-red-500/20">
              <div className="text-[10px] text-[#9aaec9]">Resistencia Drag</div>
              <div className="text-sm font-mono font-extrabold text-amber-400">
                {vehiclePhysics.dragForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-[#5a7390] font-mono">({vehiclePhysics.dragForceN.toFixed(0)} N)</div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-[#070b12] p-2 rounded border border-red-500/20">
            <span className="text-[#9aaec9]">Downforce / Drag Ratio:</span>
            <span className="font-mono font-bold text-red-300 text-sm">{vehiclePhysics.efficiencyRatio.toFixed(2)}</span>
          </div>

          {vehiclePhysics.f1Details && (
            <div className="text-[10.5px] text-[#9aaec9] space-y-1 bg-[#250d0d]/40 p-2 rounded border border-red-500/20">
              <div className="flex justify-between">
                <span>Carga a 250 km/h:</span>
                <span className="font-bold text-red-300">{vehiclePhysics.f1Details.downforceAt250KmhKgf.toFixed(1)} kgf</span>
              </div>
              <div className="flex justify-between">
                <span>Efecto Suelo (Ground Boost):</span>
                <span className="font-bold text-emerald-400">+{vehiclePhysics.f1Details.groundEffectBoostPct.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {appState.selectedVehicle === 'hydrofoil_nautical' && (
        <div className="bg-[#0a1828] border border-blue-500/40 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-blue-400 border-b border-blue-500/20 pb-1">
            <span className="flex items-center gap-1">
              <Anchor className="w-4 h-4 text-blue-400" />
              <span>Hidrodinámica Hydrofoil</span>
            </span>
            <span className="text-[10px] font-mono bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-300">
              {vehiclePhysics.currentSpeedValue} kts
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#070b12] p-2 rounded border border-blue-500/20">
              <div className="text-[10px] text-[#9aaec9]">Sustentación Foil</div>
              <div className="text-sm font-mono font-extrabold text-blue-400">
                {vehiclePhysics.primaryForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-[#5a7390] font-mono">Agua de Mar</div>
            </div>

            <div className="bg-[#070b12] p-2 rounded border border-blue-500/20">
              <div className="text-[10px] text-[#9aaec9]">N° Cavitación σ</div>
              <div className={`text-sm font-mono font-extrabold ${
                vehiclePhysics.hydrofoilDetails?.cavitationRisk === 'critical' ? 'text-rose-400 animate-pulse' :
                vehiclePhysics.hydrofoilDetails?.cavitationRisk === 'warning' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {vehiclePhysics.hydrofoilDetails?.cavitationNumber.toFixed(2)}
              </div>
              <div className="text-[9px] text-[#5a7390] font-mono">Umbral &gt; 0.7</div>
            </div>
          </div>

          {vehiclePhysics.hydrofoilDetails && (
            <div className="text-[10.5px] p-2 rounded border bg-[#05111e] border-blue-500/20 flex flex-col gap-1">
              <div className="text-blue-200 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                <span>Estado del Foil:</span>
              </div>
              <p className="text-[10px] text-[#9aaec9]">{vehiclePhysics.hydrofoilDetails.cavitationRiskLabel}</p>
              <div className="flex justify-between border-t border-blue-500/10 pt-1 text-[10px]">
                <span className="text-[#5a7390]">Velocidad de Despegue de Casco:</span>
                <span className="font-bold text-blue-300">{vehiclePhysics.hydrofoilDetails.hullTakeoffSpeedKnots} nudos</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Fidelity Tag */}
      <div className="flex items-center justify-between bg-[#0d1520] px-3 py-2 rounded-lg border border-[#1e2d42]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-[#9aaec9]">Fidelidad:</span>
        </div>
        <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30 uppercase">
          {prediction.fidelity}
        </span>
      </div>

      {/* Results Table */}
      <div className="bg-[#0d1520] rounded-lg border border-[#1e2d42] overflow-hidden text-xs">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-[#1e2d42]/60">
              <td className="p-2.5 text-[#9aaec9] font-medium">Sustentación (CL)</td>
              <td className="p-2.5 text-right font-mono font-bold text-emerald-400">{prediction.CL.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-[#1e2d42]/60">
              <td className="p-2.5 text-[#9aaec9] font-medium">Resistencia (CD)</td>
              <td className="p-2.5 text-right font-mono font-bold text-amber-400">{prediction.CD.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-[#1e2d42]/60 bg-cyan-500/5">
              <td className="p-2.5 text-[#e8edf4] font-bold">Eficiencia (L/D)</td>
              <td className="p-2.5 text-right font-mono font-extrabold text-cyan-300 text-sm">{prediction.LD.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-[#1e2d42]/60">
              <td className="p-2.5 text-[#9aaec9] font-medium">Momento (Cm)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#e8edf4]">{prediction.Cm.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-[#1e2d42]/60">
              <td className="p-2.5 text-[#9aaec9] font-medium">Superficie Alar (S)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#e8edf4]">{prediction.S_m2.toFixed(2)} m²</td>
            </tr>
            <tr className="border-b border-[#1e2d42]/60">
              <td className="p-2.5 text-[#9aaec9] font-medium">Alargamiento (AR)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#e8edf4]">{prediction.AR.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="p-2.5 text-[#9aaec9] font-medium">Eficiencia Oswald (e)</td>
              <td className="p-2.5 text-right font-mono font-bold text-cyan-400">{prediction.e.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Guide: How to get High Scores (85-100 pts) */}
      <div className="bg-[#0d1520] p-3 rounded-lg border border-cyan-500/30 text-[11px] flex flex-col gap-2 text-[#9aaec9]">
        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
          <Zap className="w-3.5 h-3.5 fill-current text-cyan-400" />
          <span>¿Cómo lograr Puntuaciones Altas?</span>
        </div>
        <ul className="flex flex-col gap-1.5 list-none pl-0 text-[10.5px]">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Alargamiento (AR 6-14):</strong> Aumente la envergadura y reduzca las cuerdas para reducir la resistencia inducida.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Perfil NACA:</strong> Use perfiles como NACA 2412 u 0012 con espesor entre 10% y 14%.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Sin Flecha Peligrosa:</strong> Evite flecha negativa con torsión positiva para eliminar penalizaciones aeroelásticas.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Usar Optimizador Genético:</strong> Active la opción <em>'Explorar desde cero'</em> en el Optimizador de la barra superior.</span>
          </li>
        </ul>
      </div>

      {/* Physics Tooltip Info Box */}
      <div className="bg-[#070b12] p-3 rounded-lg border border-[#1e2d42] text-[11px] text-[#9aaec9] leading-relaxed flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
          <Info className="w-3.5 h-3.5" />
          <span>Detalles Físicos del Modelo</span>
        </div>
        <p>
          Calculado con corrección de Helmbold para planta alar trapezoidal. La resistencia inducida varía inversamente con el alargamiento alar (AR) y la eficiencia de Oswald (e).
        </p>
      </div>
    </div>
  );
};
