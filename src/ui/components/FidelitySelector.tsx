import React, { useState } from 'react';
import { Zap, Brain, Cloud, Target, Check, Loader2, AlertTriangle } from 'lucide-react';
import { FidelityMode, FIDELITY_MODES, FidelityModeConfig } from '../../core/types';

interface FidelitySelectorProps {
  selected: FidelityMode;
  onSelect: (mode: FidelityMode) => void;
  currentCredits?: number;
  disabled?: boolean;
}

const iconMap: Record<FidelityMode, React.ReactNode> = {
  normal: <Zap className="w-5 h-5" />,
  advanced: <Brain className="w-5 h-5" />,
  neuralfoil: <Target className="w-5 h-5" />,
  cfd_validation: <Cloud className="w-5 h-5" />,
};

const colorMap: Record<FidelityMode, string> = {
  normal: 'border-accent/30 bg-accent/5',
  advanced: 'border-purple-500/30 bg-purple-500/5',
  neuralfoil: 'border-cyan-500/30 bg-cyan-500/5',
  cfd_validation: 'border-amber-500/30 bg-amber-500/5',
};

const selectedColorMap: Record<FidelityMode, string> = {
  normal: 'border-accent ring-2 ring-accent/20 bg-accent/10',
  advanced: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10',
  neuralfoil: 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/10',
  cfd_validation: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10',
};

const textColorMap: Record<FidelityMode, string> = {
  normal: 'text-accent',
  advanced: 'text-purple-400',
  neuralfoil: 'text-cyan-400',
  cfd_validation: 'text-amber-400',
};

export const FidelitySelector: React.FC<FidelitySelectorProps> = ({
  selected,
  onSelect,
  currentCredits = 0,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-hi">Modo de Predicción</h3>
        <span className="text-[10px] text-dim bg-panel2 px-2 py-0.5 rounded border border-line">
          {currentCredits} créditos disponibles
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FIDELITY_MODES.map((mode) => (
          <FidelityCard
            key={mode.id}
            mode={mode}
            isSelected={selected === mode.id}
            onSelect={() => onSelect(mode.id)}
            currentCredits={currentCredits}
            disabled={disabled || !mode.available}
          />
        ))}
      </div>

      <p className="text-[10px] text-dim text-center mt-1">
        Todos los modos corren en tu navegador. Sin servidor. Sin costes ocultos.
      </p>
    </div>
  );
};

interface FidelityCardProps {
  mode: FidelityModeConfig;
  isSelected: boolean;
  onSelect: () => void;
  currentCredits: number;
  disabled: boolean;
}

const FidelityCard: React.FC<FidelityCardProps> = ({
  mode,
  isSelected,
  onSelect,
  currentCredits,
  disabled,
}) => {
  const canAfford = currentCredits >= mode.credits;
  const isDisabled = disabled || !mode.available || (!canAfford && !isSelected);

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`
        relative flex flex-col p-3 rounded-lg border text-left transition-all duration-200
        ${isSelected ? selectedColorMap[mode.id] : colorMap[mode.id]}
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'}
        ${!mode.available ? 'opacity-50' : ''}
      `}
    >
      {mode.badge && (
        <span className={`
          absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded
          ${mode.badge === 'RECOMENDADO'
            ? 'bg-purple-500 text-white'
            : 'bg-amber-500/80 text-black'
          }
        `}>
          {mode.badge}
        </span>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className={textColorMap[mode.id]}>{iconMap[mode.id]}</span>
        <span className="text-xs font-bold text-hi">{mode.name}</span>
      </div>

      <p className="text-[10px] text-dim mb-3 leading-relaxed min-h-[36px]">
        {mode.description}
      </p>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-3">
        <div>
          <span className="text-dim">Velocidad: </span>
          <span className="text-hi font-medium">{mode.speed}</span>
        </div>
        <div>
          <span className="text-dim">Precisión: </span>
          <span className="text-hi font-medium">{mode.accuracy}</span>
        </div>
        <div>
          <span className="text-dim">Motor: </span>
          <span className="text-hi font-medium">{mode.technology.split(' ')[0]}</span>
        </div>
        <div>
          <span className="text-dim">Coste: </span>
          <span className={`font-bold ${mode.credits === 0 ? 'text-ok' : 'text-hi'}`}>
            {mode.credits === 0 ? 'GRATIS' : `${mode.credits} créditos`}
          </span>
        </div>
      </div>

      <div className={`
        flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-bold
        ${isSelected
          ? 'bg-panel2 text-hi border border-line'
          : isDisabled
          ? 'bg-panel2/50 text-dim border border-line/50'
          : 'bg-panel2 text-hi border border-line hover:border-hi/30'
        }
      `}>
        {!mode.available ? (
          <>
            <AlertTriangle className="w-3 h-3" />
            Próximamente
          </>
        ) : isSelected ? (
          <>
            <Check className="w-3 h-3" />
            Seleccionado
          </>
        ) : isDisabled && !canAfford ? (
          <>
            <Loader2 className="w-3 h-3" />
            Sin créditos
          </>
        ) : (
          'Seleccionar'
        )}
      </div>
    </button>
  );
};
