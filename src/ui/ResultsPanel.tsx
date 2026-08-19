import React, { useState, useEffect } from 'react';
import { PredictionResult, LegacyWingPayload } from '../core/types';
import { Calculator, Bookmark, Activity, Info, Zap, CheckCircle2, RotateCcw, Car, Anchor, ShieldAlert, Download } from 'lucide-react';
import { store, AppState } from '../core/store';
import { computeVehiclePhysics } from '../domains/vehicleDomain';
import { Badge } from './primitives/Badge';

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
    <div className="w-full lg:w-80 lg:min-w-[320px] bg-panel border-t lg:border-t-0 lg:border-l border-line p-4 flex flex-col gap-3 select-none overflow-y-auto shrink-0 h-full">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2 text-accent font-bold text-sm">
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
            <Bookmark className="w-3 h-3 text-accent" />
            <span>Guardar</span>
          </button>
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="chip"
              title="Descargar CAD / PDF / CSV / Python"
            >
              <Download className="w-3 h-3 text-ok" />
              <span>Exportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta Específica de Física por Dominio de Vehículo (FASE 1) */}
      {appState.selectedVehicle === 'f1_motorsport' && (
        <div className="bg-df1/5 border border-df1/40 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-df1 border-b border-df1/20 pb-1">
            <span className="flex items-center gap-1">
              <Car className="w-4 h-4 text-df1" />
              <span>Física F1 & Downforce</span>
            </span>
            <Badge variant="default" className="text-[10px] font-mono">
              {vehiclePhysics.currentSpeedValue} km/h
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-ink p-2 rounded border border-df1/20">
              <div className="text-[10px] text-lo">Carga Downforce</div>
              <div className="text-sm font-mono font-extrabold text-df1">
                {vehiclePhysics.primaryForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-dim font-mono">({vehiclePhysics.primaryForceN.toFixed(0)} N)</div>
            </div>

            <div className="bg-ink p-2 rounded border border-df1/20">
              <div className="text-[10px] text-lo">Resistencia Drag</div>
              <div className="text-sm font-mono font-extrabold text-warn">
                {vehiclePhysics.dragForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-dim font-mono">({vehiclePhysics.dragForceN.toFixed(0)} N)</div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-ink p-2 rounded border border-df1/20">
            <span className="text-lo">Downforce / Drag Ratio:</span>
            <span className="font-mono font-bold text-bad text-sm">{vehiclePhysics.efficiencyRatio.toFixed(2)}</span>
          </div>

          {vehiclePhysics.f1Details && (
            <div className="text-[10.5px] text-lo space-y-1 bg-df1/5 p-2 rounded border border-df1/20">
              <div className="flex justify-between">
                <span>Carga a 250 km/h:</span>
                <span className="font-bold text-bad">{vehiclePhysics.f1Details.downforceAt250KmhKgf.toFixed(1)} kgf</span>
              </div>
              <div className="flex justify-between">
                <span>Efecto Suelo (Ground Boost):</span>
                <span className="font-bold text-ok">+{vehiclePhysics.f1Details.groundEffectBoostPct.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {appState.selectedVehicle === 'hydrofoil_nautical' && (
        <div className="bg-dhydro/5 border border-dhydro/40 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-dhydro border-b border-dhydro/20 pb-1">
            <span className="flex items-center gap-1">
              <Anchor className="w-4 h-4 text-dhydro" />
              <span>Hidrodinámica Hydrofoil</span>
            </span>
            <Badge variant="default" className="text-[10px] font-mono">
              {vehiclePhysics.currentSpeedValue} kts
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-ink p-2 rounded border border-dhydro/20">
              <div className="text-[10px] text-lo">Sustentación Foil</div>
              <div className="text-sm font-mono font-extrabold text-dhydro">
                {vehiclePhysics.primaryForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-dim font-mono">Agua de Mar</div>
            </div>

            <div className="bg-ink p-2 rounded border border-dhydro/20">
              <div className="text-[10px] text-lo">N° Cavitación σ</div>
              <div className={`text-sm font-mono font-extrabold ${
                vehiclePhysics.hydrofoilDetails?.cavitationRisk === 'critical' ? 'text-bad animate-pulse' :
                vehiclePhysics.hydrofoilDetails?.cavitationRisk === 'warning' ? 'text-warn' : 'text-ok'
              }`}>
                {vehiclePhysics.hydrofoilDetails?.cavitationNumber.toFixed(2)}
              </div>
              <div className="text-[9px] text-dim font-mono">Umbral &gt; 0.7</div>
            </div>
          </div>

          {vehiclePhysics.hydrofoilDetails && (
            <div className="text-[10.5px] p-2 rounded border bg-dhydro/5 border-dhydro/20 flex flex-col gap-1">
              <div className="text-accent2 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-dhydro" />
                <span>Estado del Foil:</span>
              </div>
              <p className="text-[10px] text-lo">{vehiclePhysics.hydrofoilDetails.cavitationRiskLabel}</p>
              <div className="flex justify-between border-t border-dhydro/10 pt-1 text-[10px]">
                <span className="text-dim">Velocidad de Despegue de Casco:</span>
                <span className="font-bold text-dhydro">{vehiclePhysics.hydrofoilDetails.hullTakeoffSpeedKnots} nudos</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Fidelity Tag */}
      <div className="flex items-center justify-between bg-panel2 px-3 py-2 rounded-lg border border-line">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <span className="text-xs text-lo">Fidelidad:</span>
        </div>
        <Badge variant="accent" className="uppercase">
          {prediction.fidelity}
        </Badge>
      </div>

      {/* Results Table */}
      <div className="bg-panel2 rounded-lg border border-line overflow-hidden text-xs">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Sustentación (CL)</td>
              <td className="p-2.5 text-right font-mono font-bold text-ok">{prediction.CL.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Resistencia (CD)</td>
              <td className="p-2.5 text-right font-mono font-bold text-warn">{prediction.CD.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-line/70 bg-accent/5">
              <td className="p-2.5 text-hi font-bold">Eficiencia (L/D)</td>
              <td className="p-2.5 text-right font-mono font-extrabold text-accent text-sm">{prediction.LD.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Momento (Cm)</td>
              <td className="p-2.5 text-right font-mono font-bold text-hi">{prediction.Cm.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Superficie Alar (S)</td>
              <td className="p-2.5 text-right font-mono font-bold text-hi">{prediction.S_m2.toFixed(2)} m²</td>
            </tr>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Alargamiento (AR)</td>
              <td className="p-2.5 text-right font-mono font-bold text-hi">{prediction.AR.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="p-2.5 text-lo font-medium">Eficiencia Oswald (e)</td>
              <td className="p-2.5 text-right font-mono font-bold text-accent">{prediction.e.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Guide: How to get High Scores (85-100 pts) */}
      <div className="bg-panel2 p-3 rounded-lg border border-accent/30 text-[11px] flex flex-col gap-2 text-lo">
        <div className="flex items-center gap-1.5 text-accent2 font-bold">
          <Zap className="w-3.5 h-3.5 fill-current text-accent" />
          <span>¿Cómo lograr Puntuaciones Altas?</span>
        </div>
        <ul className="flex flex-col gap-1.5 list-none pl-0 text-[10.5px]">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
            <span><strong>Alargamiento (AR 6-14):</strong> Aumente la envergadura y reduzca las cuerdas para reducir la resistencia inducida.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
            <span><strong>Perfil NACA:</strong> Use perfiles como NACA 2412 u 0012 con espesor entre 10% y 14%.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
            <span><strong>Sin Flecha Peligrosa:</strong> Evite flecha negativa con torsión positiva para eliminar penalizaciones aeroelásticas.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
            <span><strong>Usar Optimizador Genético:</strong> Active la opción <em>'Explorar desde cero'</em> en el Optimizador de la barra superior.</span>
          </li>
        </ul>
      </div>

      {/* Physics Tooltip Info Box */}
      <div className="bg-ink p-3 rounded-lg border border-line text-[11px] text-lo leading-relaxed flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-accent font-semibold">
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
