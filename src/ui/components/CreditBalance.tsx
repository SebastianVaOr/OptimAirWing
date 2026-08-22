import React from 'react';
import { Coins, Zap, Brain } from 'lucide-react';
import { FidelityMode } from '../../core/types';

interface CreditBalanceProps {
  credits: number;
  lastModeUsed?: FidelityMode;
  costThisSession?: number;
}

export const CreditBalance: React.FC<CreditBalanceProps> = ({
  credits,
  lastModeUsed,
  costThisSession = 0,
}) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-panel2 border border-line text-[11px]">
      <div className="flex items-center gap-1.5">
        <Coins className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-dim">Créditos:</span>
        <span className="font-bold text-hi">{credits}</span>
      </div>

      {costThisSession > 0 && (
        <div className="flex items-center gap-1 text-dim">
          <span>-{costThisSession}</span>
          {lastModeUsed === 'advanced' ? (
            <Brain className="w-3 h-3 text-purple-400" />
          ) : (
            <Zap className="w-3 h-3 text-accent" />
          )}
        </div>
      )}

      {credits < 5 && (
        <button className="text-accent hover:underline ml-auto">
          Comprar más
        </button>
      )}
    </div>
  );
};
