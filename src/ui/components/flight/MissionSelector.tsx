import React from 'react';
import { Radar, Mountain, Zap, Box, Map, Waves } from 'lucide-react';
import { MISSION_PRESETS, MissionPreset } from '../../../domains/flight/presets';

const iconMap: Record<string, React.ElementType> = {
  recon_drone: Radar,
  hale_glider: Mountain,
  acrobatic: Zap,
  cargo: Box,
  survey_mapping: Map,
  maritime_patrol: Waves,
};

interface MissionSelectorProps {
  selectedPresetId: string;
  onSelect: (preset: MissionPreset) => void;
  disabled?: boolean;
}

export const MissionSelector: React.FC<MissionSelectorProps> = ({
  selectedPresetId,
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2 bg-panel2 p-3 rounded-lg border border-line">
      <label className="hud-label flex items-center justify-between">
        <span>Misión del Vehículo</span>
        <span className="badge-accent">PRESETS</span>
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {MISSION_PRESETS.map(preset => {
          const Icon = iconMap[preset.id] ?? Radar;
          const active = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              disabled={disabled}
              onClick={() => onSelect(preset)}
              className={`flex items-start gap-2 p-2 rounded border text-left transition cursor-pointer ${
                active
                  ? 'border-accent bg-accent/10 text-hi'
                  : 'border-line bg-ink/50 text-lo hover:border-accent/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${active ? 'text-accent' : 'text-dim'}`} />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold truncate">{preset.name}</span>
                <span className="text-[9px] text-dim">{preset.altitude_m}m · {preset.velocity_m_s}m/s</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
