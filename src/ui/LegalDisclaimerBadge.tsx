import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const LegalDisclaimerBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 text-warn text-xs ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}>
      <AlertTriangle className="w-4 h-4 shrink-0 text-warn" />
      <span className="leading-tight text-[11px]">
        <strong>Aviso Legal:</strong> Las predicciones de esta plataforma son estimaciones de diseño conceptual. No sustituyen ensayos en túnel de viento, simulación CFD validada, ni procesos de certificación aeronáutica.
      </span>
    </div>
  );
};
