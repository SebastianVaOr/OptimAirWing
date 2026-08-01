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
    <div className="w-full lg:w-80 lg:min-w-[320px] bg-[#0a0f18] border-t lg:border-t-0 lg:border-l border-[#16202f] p-4 flex flex-col gap-3 select-none overflow-y-auto shrink-0 h-full">
      <div className="flex items-center justify-between border-b border-[#16202f] pb-2">
        <div className="flex items-center gap-2 text-[#22d3ee] font-bold text-sm">
          <Calculator className="w-4 h-4" />
          <span className="font-display">Resultados</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => store.clearReport()}
            className="chip"
            title="Limpiar datos e historial de optimizaciones previas"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
          <button
            onClick={onSaveSnapshot}
            className="chip"
            title="Guardar Snapshot (G)"
          >
            <Bookmark className="w-3 h-3 text-[#22d3ee]" />
            <span>Guardar</span>
          </button>
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="chip"
              title="Descargar CAD / PDF / CSV / Python"
            >
              <Download className="w-3 h-3 text-[#34d399]" />
              <span>Exportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta Específica de Física por Dominio de Vehículo (FASE 1) */}
      {appState.selectedVehicle === 'f1_motorsport' && (
        <div className="bg-[#1a0b0b] border border-[#f87171]/40 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#f87171] border-b border-[#f87171]/20 pb-1">
            <span className="flex items-center gap-1">
              <Car className="w-4 h-4 text-[#f87171]" />
              <span>Física F1 & Downforce</span>
            </span>
            <span className="text-[10px] font-mono bg-[#f87171]/15 px-1.5 py-0.5 rounded border border-[#f87171]/30 text-[#fda4af]">
              {vehiclePhysics.currentSpeedValue} km/h
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#05070c] p-2 rounded border border-[#f87171]/20">
              <div className="text-[10px] text-[#8ea3bd]">Carga Downforce</div>
              <div className="text-sm font-mono font-extrabold text-[#f87171]">
                {vehiclePhysics.primaryForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-[#5b6f8c] font-mono">({vehiclePhysics.primaryForceN.toFixed(0)} N)</div>
            </div>

            <div className="bg-[#05070c] p-2 rounded border border-[#f87171]/20">
              <div className="text-[10px] text-[#8ea3bd]">Resistencia Drag</div>
              <div className="text-sm font-mono font-extrabold text-[#fbbf24]">
                {vehiclePhysics.dragForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-[#5b6f8c] font-mono">({vehiclePhysics.dragForceN.toFixed(0)} N)</div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-[#05070c] p-2 rounded border border-[#f87171]/20">
            <span className="text-[#8ea3bd]">Downforce / Drag Ratio:</span>
            <span className="font-mono font-bold text-[#fda4af] text-sm">{vehiclePhysics.efficiencyRatio.toFixed(2)}</span>
          </div>

          {vehiclePhysics.f1Details && (
            <div className="text-[10.5px] text-[#8ea3bd] space-y-1 bg-[#250d0d]/40 p-2 rounded border border-[#f87171]/20">
              <div className="flex justify-between">
                <span>Carga a 250 km/h:</span>
                <span className="font-bold text-[#fda4af]">{vehiclePhysics.f1Details.downforceAt250KmhKgf.toFixed(1)} kgf</span>
              </div>
              <div className="flex justify-between">
                <span>Efecto Suelo (Ground Boost):</span>
                <span className="font-bold text-[#34d399]">+{vehiclePhysics.f1Details.groundEffectBoostPct.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {appState.selectedVehicle === 'hydrofoil_nautical' && (
        <div className="bg-[#0a1828] border border-[#60a5fa]/40 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#60a5fa] border-b border-[#60a5fa]/20 pb-1">
            <span className="flex items-center gap-1">
              <Anchor className="w-4 h-4 text-[#60a5fa]" />
              <span>Hidrodinámica Hydrofoil</span>
            </span>
            <span className="text-[10px] font-mono bg-[#60a5fa]/15 px-1.5 py-0.5 rounded border border-[#60a5fa]/30 text-[#93c5fd]">
              {vehiclePhysics.currentSpeedValue} kts
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#05070c] p-2 rounded border border-[#60a5fa]/20">
              <div className="text-[10px] text-[#8ea3bd]">Sustentación Foil</div>
              <div className="text-sm font-mono font-extrabold text-[#60a5fa]">
                {vehiclePhysics.primaryForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-[#5b6f8c] font-mono">Agua de Mar</div>
            </div>

            <div className="bg-[#05070c] p-2 rounded border border-[#60a5fa]/20">
              <div className="text-[10px] text-[#8ea3bd]">N° Cavitación σ</div>
              <div className={`text-sm font-mono font-extrabold ${
                vehiclePhysics.hydrofoilDetails?.cavitationRisk === 'critical' ? 'text-[#fb7185] animate-pulse' :
                vehiclePhysics.hydrofoilDetails?.cavitationRisk === 'warning' ? 'text-[#fbbf24]' : 'text-[#34d399]'
              }`}>
                {vehiclePhysics.hydrofoilDetails?.cavitationNumber.toFixed(2)}
              </div>
              <div className="text-[9px] text-[#5b6f8c] font-mono">Umbral &gt; 0.7</div>
            </div>
          </div>

          {vehiclePhysics.hydrofoilDetails && (
            <div className="text-[10.5px] p-2 rounded border bg-[#05111e] border-[#60a5fa]/20 flex flex-col gap-1">
              <div className="text-[#bfdbfe] font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#60a5fa]" />
                <span>Estado del Foil:</span>
              </div>
              <p className="text-[10px] text-[#8ea3bd]">{vehiclePhysics.hydrofoilDetails.cavitationRiskLabel}</p>
              <div className="flex justify-between border-t border-[#60a5fa]/10 pt-1 text-[10px]">
                <span className="text-[#5b6f8c]">Velocidad de Despegue de Casco:</span>
                <span className="font-bold text-[#93c5fd]">{vehiclePhysics.hydrofoilDetails.hullTakeoffSpeedKnots} nudos</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Fidelity Tag */}
      <div className="flex items-center justify-between bg-[#0e1624] px-3 py-2 rounded-lg border border-[#16202f]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#22d3ee]" />
          <span className="text-xs text-[#8ea3bd]">Fidelidad:</span>
        </div>
        <span className="text-xs font-mono font-bold text-[#67e8f9] bg-[#22d3ee]/10 px-2 py-0.5 rounded border border-[#22d3ee]/30 uppercase">
          {prediction.fidelity}
        </span>
      </div>

      {/* Results Table */}
      <div className="bg-[#0e1624] rounded-lg border border-[#16202f] overflow-hidden text-xs">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-[#16202f]/70">
              <td className="p-2.5 text-[#8ea3bd] font-medium">Sustentación (CL)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#34d399]">{prediction.CL.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-[#16202f]/70">
              <td className="p-2.5 text-[#8ea3bd] font-medium">Resistencia (CD)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#fbbf24]">{prediction.CD.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-[#16202f]/70 bg-[#22d3ee]/5">
              <td className="p-2.5 text-[#e8f1fb] font-bold">Eficiencia (L/D)</td>
              <td className="p-2.5 text-right font-mono font-extrabold text-[#22d3ee] text-sm">{prediction.LD.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-[#16202f]/70">
              <td className="p-2.5 text-[#8ea3bd] font-medium">Momento (Cm)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#e8f1fb]">{prediction.Cm.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-[#16202f]/70">
              <td className="p-2.5 text-[#8ea3bd] font-medium">Superficie Alar (S)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#e8f1fb]">{prediction.S_m2.toFixed(2)} m²</td>
            </tr>
            <tr className="border-b border-[#16202f]/70">
              <td className="p-2.5 text-[#8ea3bd] font-medium">Alargamiento (AR)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#e8f1fb]">{prediction.AR.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="p-2.5 text-[#8ea3bd] font-medium">Eficiencia Oswald (e)</td>
              <td className="p-2.5 text-right font-mono font-bold text-[#22d3ee]">{prediction.e.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Guide: How to get High Scores (85-100 pts) */}
      <div className="bg-[#0e1624] p-3 rounded-lg border border-[#22d3ee]/30 text-[11px] flex flex-col gap-2 text-[#8ea3bd]">
        <div className="flex items-center gap-1.5 text-[#67e8f9] font-bold">
          <Zap className="w-3.5 h-3.5 fill-current text-[#22d3ee]" />
          <span>¿Cómo lograr Puntuaciones Altas?</span>
        </div>
        <ul className="flex flex-col gap-1.5 list-none pl-0 text-[10.5px]">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399] shrink-0 mt-0.5" />
            <span><strong>Alargamiento (AR 6-14):</strong> Aumente la envergadura y reduzca las cuerdas para reducir la resistencia inducida.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399] shrink-0 mt-0.5" />
            <span><strong>Perfil NACA:</strong> Use perfiles como NACA 2412 u 0012 con espesor entre 10% y 14%.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399] shrink-0 mt-0.5" />
            <span><strong>Sin Flecha Peligrosa:</strong> Evite flecha negativa con torsión positiva para eliminar penalizaciones aeroelásticas.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399] shrink-0 mt-0.5" />
            <span><strong>Usar Optimizador Genético:</strong> Active la opción <em>'Explorar desde cero'</em> en el Optimizador de la barra superior.</span>
          </li>
        </ul>
      </div>

      {/* Physics Tooltip Info Box */}
      <div className="bg-[#05070c] p-3 rounded-lg border border-[#16202f] text-[11px] text-[#8ea3bd] leading-relaxed flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[#22d3ee] font-semibold">
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
