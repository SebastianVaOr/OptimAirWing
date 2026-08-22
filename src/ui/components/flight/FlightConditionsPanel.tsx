import React from 'react';
import { MissionSelector } from './MissionSelector';
import { DerivedSpeedsPanel } from './DerivedSpeedsPanel';
import { Radar, Settings2 } from 'lucide-react';
import { FlightMode, FlightConditions } from '../../../domains/flight/conditions';
import { MissionPreset } from '../../../domains/flight/presets';

interface FlightConditionsPanelProps {
  mode: FlightMode;
  onModeChange: (mode: FlightMode) => void;
  selectedPresetId: string;
  onPresetSelect: (preset: MissionPreset) => void;
  conditions: FlightConditions | null;
  manualAltitude?: number;
  manualVelocity?: number;
  onManualAltitudeChange?: (h: number) => void;
  onManualVelocityChange?: (v: number) => void;
}

const MODES: { id: FlightMode; label: string; description: string }[] = [
  { id: 'basic', label: 'Básico', description: 'Selecciona tipo de misión' },
  { id: 'intermediate', label: 'Intermedio', description: 'V y h manuales' },
  { id: 'advanced', label: 'Experto', description: 'W/S + CL → V derivada' },
  { id: 'auto', label: 'Auto-Opt', description: 'Optimización automática' },
];

export const FlightConditionsPanel: React.FC<FlightConditionsPanelProps> = ({
  mode,
  onModeChange,
  selectedPresetId,
  onPresetSelect,
  conditions,
  manualAltitude = 0,
  manualVelocity = 20,
  onManualAltitudeChange,
  onManualVelocityChange,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Mode selector */}
      <div className="flex flex-col gap-1.5 bg-panel2 p-2 rounded-lg border border-line">
        <label className="hud-label flex items-center gap-1.5">
          <Radar className="w-3.5 h-3.5 text-accent" />
          <span>Modo de Condiciones</span>
        </label>
        <div className="grid grid-cols-2 gap-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`px-2 py-1.5 rounded text-[10px] font-semibold transition border cursor-pointer ${
                mode === m.id
                  ? 'chip-active border-accent'
                  : 'border-line text-lo hover:border-accent/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-[9px] text-dim">{MODES.find(m => m.id === mode)?.description}</span>
      </div>

      {/* Mode-specific inputs */}
      {mode === 'basic' && (
        <MissionSelector
          selectedPresetId={selectedPresetId}
          onSelect={onPresetSelect}
        />
      )}

      {mode === 'intermediate' && (
        <div className="flex flex-col gap-2 bg-panel2 p-3 rounded-lg border border-line">
          <label className="hud-label flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-accent" />
            <span>Condiciones Manuales</span>
          </label>
          <div className="flex flex-col gap-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-dim">Altitud</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={manualAltitude}
                  onChange={e => onManualAltitudeChange?.(parseFloat(e.target.value) || 0)}
                  className="ctl-number w-20"
                  min={0}
                  max={25000}
                  step={100}
                />
                <span className="text-dim">m</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dim">Velocidad</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={manualVelocity}
                  onChange={e => onManualVelocityChange?.(parseFloat(e.target.value) || 0)}
                  className="ctl-number w-20"
                  min={0}
                  max={100}
                  step={1}
                />
                <span className="text-dim">m/s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'advanced' && (
        <div className="flex flex-col gap-2 bg-panel2 p-3 rounded-lg border border-line">
          <label className="hud-label flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-accent" />
            <span>Diseño para Punto de Vuelo</span>
          </label>
          <div className="text-[9px] text-dim mb-1">
            Introduce peso, área y CL deseado. La velocidad se deriva automáticamente.
          </div>
          <div className="flex flex-col gap-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-dim">Altitud</span>
              <div className="flex items-center gap-1">
                <input type="number" value={manualAltitude} onChange={e => onManualAltitudeChange?.(parseFloat(e.target.value) || 0)} className="ctl-number w-20" min={0} max={25000} step={100} />
                <span className="text-dim">m</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dim">Velocidad (derivada)</span>
              <span className="font-mono text-accent">
                {conditions ? `${conditions.velocity_m_s.toFixed(1)} m/s` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {mode === 'auto' && (
        <div className="bg-panel2 p-3 rounded-lg border border-line">
          <div className="hud-label flex items-center gap-1.5 mb-1">
            <Settings2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Auto-Optimización MDO</span>
          </div>
          <div className="text-[9px] text-dim">
            El optimizador determina V, h y CL óptimos para maximizar alcance usando Breguet.
          </div>
        </div>
      )}

      {/* Derived speeds panel */}
      {conditions && <DerivedSpeedsPanel conditions={conditions} />}
    </div>
  );
};
