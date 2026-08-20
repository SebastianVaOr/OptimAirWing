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
      <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center pointer-events-none hidden lg:flex">
        <span className="vertical-text pr-1">ANALYSIS</span>
      </div>

      <div className="breadcrumb">
        Mainpage<span className="breadcrumb-sep">/</span>Simulator<span className="breadcrumb-sep">/</span><span className="breadcrumb-active">Results</span>
      </div>

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

      {appState.selectedVehicle === 'f1_motorsport' && (
        <div className="bg-panel2 border border-df1/40 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-line pb-1">
            <span className="flex items-center gap-1 hud-label">
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
              <div className="hud-data text-df1">
                {vehiclePhysics.primaryForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-dim font-mono">({vehiclePhysics.primaryForceN.toFixed(0)} N)</div>
            </div>

            <div className="bg-ink p-2 rounded border border-df1/20">
              <div className="text-[10px] text-lo">Resistencia Drag</div>
              <div className="hud-data text-warn">
                {vehiclePhysics.dragForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-dim font-mono">({vehiclePhysics.dragForceN.toFixed(0)} N)</div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-ink p-2 rounded border border-df1/20">
            <span className="text-lo">Downforce / Drag Ratio:</span>
            <span className="hud-data text-bad">{vehiclePhysics.efficiencyRatio.toFixed(2)}</span>
          </div>

          {vehiclePhysics.f1Details && (
            <div className="text-[10.5px] text-lo space-y-1 bg-panel3 p-2 rounded border border-line">
              <div className="flex justify-between">
                <span>Carga a 250 km/h:</span>
                <span className="hud-data text-df1">{vehiclePhysics.f1Details.downforceAt250KmhKgf.toFixed(1)} kgf</span>
              </div>
              <div className="flex justify-between">
                <span>Efecto Suelo (Ground Boost):</span>
                <span className="hud-data text-ok">+{vehiclePhysics.f1Details.groundEffectBoostPct.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {appState.selectedVehicle === 'hydrofoil_nautical' && (
        <div className="bg-panel2 border border-dhydro/40 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-line pb-1">
            <span className="flex items-center gap-1 hud-label">
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
              <div className="hud-data text-dhydro">
                {vehiclePhysics.primaryForceKgf.toFixed(1)} kgf
              </div>
              <div className="text-[9px] text-dim font-mono">Agua de Mar</div>
            </div>

            <div className="bg-ink p-2 rounded border border-dhydro/20">
              <div className="text-[10px] text-lo">N° Cavitación σ</div>
              <div className={`hud-data ${
                vehiclePhysics.hydrofoilDetails?.cavitationRisk === 'critical' ? 'text-bad animate-pulse' :
                vehiclePhysics.hydrofoilDetails?.cavitationRisk === 'warning' ? 'text-warn' : 'text-ok'
              }`}>
                {vehiclePhysics.hydrofoilDetails?.cavitationNumber.toFixed(2)}
              </div>
              <div className="text-[9px] text-dim font-mono">Umbral &gt; 0.7</div>
            </div>
          </div>

          {vehiclePhysics.hydrofoilDetails && (
            <div className="text-[10.5px] p-2 rounded border bg-panel3 border-line flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Badge variant={vehiclePhysics.hydrofoilDetails.cavitationRisk === 'critical' ? 'bad' : vehiclePhysics.hydrofoilDetails.cavitationRisk === 'warning' ? 'warn' : 'ok'}>
                  <ShieldAlert className="w-3 h-3 inline" />
                  Estado del Foil
                </Badge>
              </div>
              <p className="text-[10px] text-lo">{vehiclePhysics.hydrofoilDetails.cavitationRiskLabel}</p>
              <div className="flex justify-between border-t border-line pt-1 text-[10px]">
                <span className="text-dim">Velocidad de Despegue de Casco:</span>
                <span className="hud-data text-dhydro">{vehiclePhysics.hydrofoilDetails.hullTakeoffSpeedKnots} nudos</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between bg-panel2 px-3 py-2 rounded-lg border border-line">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <span className="hud-label">Fidelidad:</span>
        </div>
        <Badge variant="accent" className="uppercase">
          {prediction.fidelity}
        </Badge>
      </div>

      <div className="bg-panel2 rounded-lg border border-line overflow-hidden text-xs">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Sustentación (CL)</td>
              <td className="p-2.5 text-right hud-data text-ok">{prediction.CL.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Resistencia (CD)</td>
              <td className="p-2.5 text-right hud-data text-warn">{prediction.CD.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-line/70 bg-accent/5">
              <td className="p-2.5 text-hi font-bold">Eficiencia (L/D)</td>
              <td className="p-2.5 text-right hud-data text-accent text-sm">{prediction.LD.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Momento (Cm)</td>
              <td className="p-2.5 text-right hud-data">{prediction.Cm.toFixed(4)}</td>
            </tr>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Superficie Alar (S)</td>
              <td className="p-2.5 text-right hud-data">{prediction.S_m2.toFixed(2)} m²</td>
            </tr>
            <tr className="border-b border-line/70">
              <td className="p-2.5 text-lo font-medium">Alargamiento (AR)</td>
              <td className="p-2.5 text-right hud-data">{prediction.AR.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="p-2.5 text-lo font-medium">Eficiencia Oswald (e)</td>
              <td className="p-2.5 text-right hud-data text-accent">{prediction.e.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
      </div>

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
