import React, { useState } from 'react';
import { X, GitCompare, ArrowRight, TrendingUp, TrendingDown, CheckCircle2, Copy } from 'lucide-react';
import { LegacyWingPayload, PredictionResult } from '../core/types';
import { generateNaca4Points } from '../domains/wing/naca';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto select-none">
      <div className="bg-[#0a111c] border border-[#1e2d42] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1e2d42] flex items-center justify-between bg-[#0d1520]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Comparador Multi-Diseño A/B Benchmarking
              </h2>
              <p className="text-xs text-[#9aaec9]">
                Compare métricas, finura aerodinámica (L/D), pesos y perfil superpuesto en tiempo real.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#142032] text-[#9aaec9] hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Estado de Referencia</span>
              <p className="text-sm text-[#e8edf4]">
                {designA ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Diseño A Fijado (NACA {designA.params.nacaCode}, b={designA.params.b}m)
                  </span>
                ) : (
                  'Aún no has fijado un Diseño A de referencia. Haz clic para fijar los parámetros actuales como baseline.'
                )}
              </p>
            </div>
            <button
              onClick={handleSetDesignA}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Copy className="w-4 h-4" />
              <span>{designA ? 'Actualizar Baseline (Diseño A)' : 'Fijar Actual como Diseño A'}</span>
            </button>
          </div>

          {/* Side by Side Comparison Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Design A Card */}
            <div className={`p-4 rounded-xl border transition ${designA ? 'bg-[#0d1520] border-cyan-500/30' : 'bg-[#0a111c] border-[#1e2d42] opacity-60'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  DISEÑO A (Baseline)
                </span>
                {designA && (
                  <span className="text-xs text-[#9aaec9] font-mono">NACA {designA.params.nacaCode}</span>
                )}
              </div>

              {designA ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                    <span className="text-[#9aaec9]">Envergadura (b):</span>
                    <span className="text-white font-bold">{designA.params.b.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                    <span className="text-[#9aaec9]">Cuerda Raíz (Cr):</span>
                    <span className="text-white font-bold">{designA.params.Cr.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                    <span className="text-[#9aaec9]">Ángulo Ataque (α):</span>
                    <span className="text-white font-bold">{designA.params.alpha_deg}°</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                    <span className="text-[#9aaec9]">Coef. Sustentación (C_L):</span>
                    <span className="text-cyan-300 font-bold">{designA.prediction?.CL?.toFixed(3) || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                    <span className="text-[#9aaec9]">Coef. Resistencia (C_D):</span>
                    <span className="text-rose-300 font-bold">{designA.prediction?.CD?.toFixed(4) || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                    <span className="text-[#9aaec9]">Finura Aerodinámica (L/D):</span>
                    <span className="text-emerald-400 font-bold">{designA.prediction?.LD?.toFixed(2) || '-'}</span>
                  </div>
                  {designA.prediction?.weight_kg && (
                    <div className="flex justify-between py-1">
                      <span className="text-[#9aaec9]">Peso Estimado:</span>
                      <span className="text-amber-300 font-bold">{designA.prediction.weight_kg.toFixed(1)} kg</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-center p-6 text-xs text-[#5a7390]">
                  Haz clic en "Fijar Actual como Diseño A" para guardar una captura de comparación.
                </div>
              )}
            </div>

            {/* Design B Card */}
            <div className="p-4 rounded-xl bg-[#0d1520] border border-amber-500/30">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DISEÑO B (Actual)
                </span>
                <span className="text-xs text-[#9aaec9] font-mono">NACA {currentParams.nacaCode}</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                  <span className="text-[#9aaec9]">Envergadura (b):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{currentParams.b.toFixed(2)} m</span>
                    {designA && (
                      <span className={`text-[10px] ${getDelta(currentParams.b, designA.params.b).isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {getDelta(currentParams.b, designA.params.b).pct}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                  <span className="text-[#9aaec9]">Cuerda Raíz (Cr):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{currentParams.Cr.toFixed(2)} m</span>
                    {designA && (
                      <span className={`text-[10px] ${getDelta(currentParams.Cr, designA.params.Cr).isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {getDelta(currentParams.Cr, designA.params.Cr).pct}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                  <span className="text-[#9aaec9]">Ángulo Ataque (α):</span>
                  <span className="text-white font-bold">{currentParams.alpha_deg}°</span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                  <span className="text-[#9aaec9]">Coef. Sustentación (C_L):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300 font-bold">{currentPrediction?.CL?.toFixed(3) || '-'}</span>
                    {designA && currentPrediction?.CL && designA.prediction?.CL && (
                      <span className={`text-[10px] font-bold ${getDelta(currentPrediction.CL, designA.prediction.CL).isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {getDelta(currentPrediction.CL, designA.prediction.CL).pct}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                  <span className="text-[#9aaec9]">Coef. Resistencia (C_D):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-300 font-bold">{currentPrediction?.CD?.toFixed(4) || '-'}</span>
                    {designA && currentPrediction?.CD && designA.prediction?.CD && (
                      <span className={`text-[10px] font-bold ${getDelta(currentPrediction.CD, designA.prediction.CD).isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {getDelta(currentPrediction.CD, designA.prediction.CD).pct}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-[#1e2d42]/60">
                  <span className="text-[#9aaec9]">Finura Aerodinámica (L/D):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{currentPrediction?.LD?.toFixed(2) || '-'}</span>
                    {designA && currentPrediction?.LD && designA.prediction?.LD && (
                      <span className={`text-[10px] font-bold ${getDelta(currentPrediction.LD, designA.prediction.LD).isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {getDelta(currentPrediction.LD, designA.prediction.LD).pct}
                      </span>
                    )}
                  </div>
                </div>

                {currentPrediction?.weight_kg && (
                  <div className="flex justify-between py-1">
                    <span className="text-[#9aaec9]">Peso Estimado:</span>
                    <span className="text-amber-300 font-bold">{currentPrediction.weight_kg.toFixed(1)} kg</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Superposed Airfoil SVG Canvas */}
          <div className="p-4 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
            <h3 className="text-xs font-bold text-[#e8edf4] mb-3 flex items-center justify-between">
              <span>Superposición de Perfiles Aero 2D (NACA A vs NACA B)</span>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className="text-cyan-400 font-bold">― Diseño A (NACA {designA?.params.nacaCode || 'N/A'})</span>
                <span className="text-amber-400 font-bold">― Diseño B (NACA {currentParams.nacaCode})</span>
              </div>
            </h3>

            <div className="w-full h-44 bg-[#070b12] rounded-lg border border-[#1e2d42] p-2 flex items-center justify-center">
              <svg viewBox="-0.1 -0.3 1.2 0.6" className="w-full h-full overflow-visible">
                {/* Center Line Grid */}
                <line x1="-0.1" y1="0" x2="1.1" y2="0" stroke="#1e2d42" strokeDasharray="0.02" strokeWidth="0.005" />
                <line x1="0.25" y1="-0.25" x2="0.25" y2="0.25" stroke="#1e2d42" strokeDasharray="0.02" strokeWidth="0.005" />

                {/* Profile A Path */}
                {pointsA && pointsA.upper && (
                  <path
                    d={`M ${pointsA.upper.map(p => `${p.x},${-p.y}`).join(' L ')} L ${pointsA.lower.slice().reverse().map(p => `${p.x},${-p.y}`).join(' L ')} Z`}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="0.01"
                    strokeDasharray="0.015 0.005"
                  />
                )}

                {/* Profile B Path */}
                {pointsB && pointsB.upper && (
                  <path
                    d={`M ${pointsB.upper.map(p => `${p.x},${-p.y}`).join(' L ')} L ${pointsB.lower.slice().reverse().map(p => `${p.x},${-p.y}`).join(' L ')} Z`}
                    fill="rgba(245, 158, 11, 0.15)"
                    stroke="#f59e0b"
                    strokeWidth="0.012"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1e2d42] bg-[#0d1520] flex items-center justify-between">
          <span className="text-xs text-[#5a7390]">
            * Los deltas indican variación porcentual respecto al baseline del Diseño A.
          </span>
          {designA && (
            <button
              onClick={() => {
                onApplyParams(designA.params);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 transition cursor-pointer"
            >
              Cargar Parámetros de Diseño A
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
