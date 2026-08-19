import React, { useState } from 'react';
import { GitCompare, ArrowRight, TrendingUp, TrendingDown, CheckCircle2, Copy } from 'lucide-react';
import { LegacyWingPayload, PredictionResult } from '../core/types';
import { generateNaca4Points } from '../domains/wing/naca';
import { Modal } from './primitives/Modal';
import { Button } from './primitives/Button';

interface DesignComparatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: LegacyWingPayload;
  currentPrediction: PredictionResult | null;
  onApplyParams: (params: LegacyWingPayload) => void;
}

export const DesignComparatorModal: React.FC<DesignComparatorModalProps> = ({
  isOpen,
  onClose,
  currentParams,
  currentPrediction,
  onApplyParams,
}) => {
  const [designA, setDesignA] = useState<{ params: LegacyWingPayload; prediction: PredictionResult | null } | null>(null);

  const handleSetDesignA = () => {
    setDesignA({
      params: { ...currentParams },
      prediction: currentPrediction ? { ...currentPrediction } : null,
    });
  };

  const getDelta = (valB: number, valA: number) => {
    if (!valA) return { diff: 0, pct: '0%', isPositive: true };
    const diff = valB - valA;
    const pct = ((diff / Math.abs(valA)) * 100).toFixed(1);
    return { diff, pct: `${diff >= 0 ? '+' : ''}${pct}%`, isPositive: diff >= 0 };
  };

  // Generate 2D points for overlay SVG plot
  const pointsA = designA ? generateNaca4Points(designA.params.nacaCode, 60) : null;
  const pointsB = generateNaca4Points(currentParams.nacaCode, 60);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Comparador Multi-Diseño A/B Benchmarking"
      description="Compare métricas, finura aerodinámica (L/D), pesos y perfil superpuesto en tiempo real."
      size="xl"
    >
      {/* Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-panel2 border border-line mb-6">
        <div>
          <span className="text-xs font-bold text-accent uppercase tracking-wider">Estado de Referencia</span>
          <p className="text-sm text-hi">
            {designA ? (
              <span className="text-ok font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Diseño A Fijado (NACA {designA.params.nacaCode}, b={designA.params.b}m)
              </span>
            ) : (
              'Aún no has fijado un Diseño A de referencia. Haz clic para fijar los parámetros actuales como baseline.'
            )}
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={Copy} onClick={handleSetDesignA} className="shrink-0">
          {designA ? 'Actualizar Baseline (Diseño A)' : 'Fijar Actual como Diseño A'}
        </Button>
      </div>

      {/* Side by Side Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Design A Card */}
        <div className={`p-4 rounded-xl border transition ${designA ? 'bg-panel2 border-accent/30' : 'bg-ink border-line opacity-60'}`}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-accent/20 text-accent2 border border-accent/30">
              DISEÑO A (Baseline)
            </span>
            {designA && (
              <span className="text-xs text-lo font-mono">NACA {designA.params.nacaCode}</span>
            )}
          </div>

          {designA ? (
            <div className="space-y-3 font-mono text-xs">
              {[
                { label: 'Envergadura (b):', value: `${designA.params.b.toFixed(2)} m` },
                { label: 'Cuerda Raíz (Cr):', value: `${designA.params.Cr.toFixed(2)} m` },
                { label: 'Ángulo Ataque (α):', value: `${designA.params.alpha_deg}°` },
                { label: 'Coef. Sustentación (C_L):', value: designA.prediction?.CL?.toFixed(3) || '-', tone: 'text-accent' },
                { label: 'Coef. Resistencia (C_D):', value: designA.prediction?.CD?.toFixed(4) || '-', tone: 'text-bad' },
                { label: 'Finura Aerodinámica (L/D):', value: designA.prediction?.LD?.toFixed(2) || '-', tone: 'text-ok' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-line/60">
                  <span className="text-lo">{row.label}</span>
                  <span className={`font-bold ${row.tone || 'text-hi'}`}>{row.value}</span>
                </div>
              ))}
              {designA.prediction?.weight_kg && (
                <div className="flex justify-between py-1">
                  <span className="text-lo">Peso Estimado:</span>
                  <span className="text-warn font-bold">{designA.prediction.weight_kg.toFixed(1)} kg</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-center p-6 text-xs text-dim">
              Haz clic en "Fijar Actual como Diseño A" para guardar una captura de comparación.
            </div>
          )}
        </div>

        {/* Design B Card */}
        <div className="p-4 rounded-xl bg-panel2 border border-warn/30">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-warn/20 text-warn border border-warn/30">
              DISEÑO B (Actual)
            </span>
            <span className="text-xs text-lo font-mono">NACA {currentParams.nacaCode}</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {[
              { label: 'Envergadura (b):', val: currentParams.b, unit: ' m', deltaVal: designA?.params.b },
              { label: 'Cuerda Raíz (Cr):', val: currentParams.Cr, unit: ' m', deltaVal: designA?.params.Cr },
              { label: 'Ángulo Ataque (α):', val: currentParams.alpha_deg, unit: '°' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-line/60">
                <span className="text-lo">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-hi font-bold">{typeof row.val === 'number' ? row.val.toFixed(2) : row.val}{row.unit}</span>
                  {row.deltaVal !== undefined && designA && (
                    <span className={`text-[10px] ${getDelta(typeof row.val === 'number' ? row.val : 0, row.deltaVal).isPositive ? 'text-ok' : 'text-bad'}`}>
                      {getDelta(typeof row.val === 'number' ? row.val : 0, row.deltaVal).pct}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {[
              { label: 'Coef. Sustentación (C_L):', val: currentPrediction?.CL, deltaVal: designA?.prediction?.CL, tone: 'text-accent', swapColors: false },
              { label: 'Coef. Resistencia (C_D):', val: currentPrediction?.CD, deltaVal: designA?.prediction?.CD, tone: 'text-bad', swapColors: true },
              { label: 'Finura Aerodinámica (L/D):', val: currentPrediction?.LD, deltaVal: designA?.prediction?.LD, tone: 'text-ok', swapColors: false },
            ].map((row, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-line/60">
                <span className="text-lo">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`${row.tone} font-bold`}>{row.val?.toFixed(row.val < 1 ? 4 : 3) || '-'}</span>
                  {row.val !== undefined && row.deltaVal !== undefined && designA && (
                    <span className={`text-[10px] font-bold ${getDelta(row.val, row.deltaVal).isPositive ? (row.swapColors ? 'text-bad' : 'text-ok') : (row.swapColors ? 'text-ok' : 'text-bad')}`}>
                      {getDelta(row.val, row.deltaVal).pct}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {currentPrediction?.weight_kg && (
              <div className="flex justify-between py-1">
                <span className="text-lo">Peso Estimado:</span>
                <span className="text-warn font-bold">{currentPrediction.weight_kg.toFixed(1)} kg</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Superposed Airfoil SVG Canvas */}
      <div className="p-4 rounded-xl bg-panel2 border border-line">
        <h3 className="text-xs font-bold text-hi mb-3 flex items-center justify-between">
          <span>Superposición de Perfiles Aero 2D (NACA A vs NACA B)</span>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-accent font-bold">― Diseño A (NACA {designA?.params.nacaCode || 'N/A'})</span>
            <span className="text-warn font-bold">― Diseño B (NACA {currentParams.nacaCode})</span>
          </div>
        </h3>

        <div className="w-full h-44 bg-ink rounded-lg border border-line p-2 flex items-center justify-center">
          <svg viewBox="-0.1 -0.3 1.2 0.6" className="w-full h-full overflow-visible">
            {/* Center Line Grid */}
            <line x1="-0.1" y1="0" x2="1.1" y2="0" stroke="var(--color-line)" strokeDasharray="0.02" strokeWidth="0.005" />
            <line x1="0.25" y1="-0.25" x2="0.25" y2="0.25" stroke="var(--color-line)" strokeDasharray="0.02" strokeWidth="0.005" />

            {/* Profile A Path */}
            {pointsA && pointsA.upper && (
              <path
                d={`M ${pointsA.upper.map(p => `${p.x},${-p.y}`).join(' L ')} L ${pointsA.lower.slice().reverse().map(p => `${p.x},${-p.y}`).join(' L ')} Z`}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="0.01"
                strokeDasharray="0.015 0.005"
              />
            )}

            {/* Profile B Path */}
            {pointsB && pointsB.upper && (
              <path
                d={`M ${pointsB.upper.map(p => `${p.x},${-p.y}`).join(' L ')} L ${pointsB.lower.slice().reverse().map(p => `${p.x},${-p.y}`).join(' L ')} Z`}
                fill="rgba(251, 191, 36, 0.15)"
                stroke="var(--color-warn)"
                strokeWidth="0.012"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-line flex items-center justify-between">
        <span className="text-xs text-dim">
          * Los deltas indican variación porcentual respecto al baseline del Diseño A.
        </span>
        {designA && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onApplyParams(designA.params);
              onClose();
            }}
          >
            Cargar Parámetros de Diseño A
          </Button>
        )}
      </div>
    </Modal>
  );
};
