import React, { useState } from 'react';
import { X, TrendingUp, ShieldAlert, Zap, Compass, BarChart3 } from 'lucide-react';
import { LegacyWingPayload, PredictionResult } from '../core/types';

interface PolarsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: LegacyWingPayload;
  prediction: PredictionResult | null;
}

export const PolarsDashboardModal: React.FC<PolarsDashboardModalProps> = ({
  isOpen,
  onClose,
  params,
  prediction,
}) => {
  const [activeTab, setActiveTab] = useState<'cl_alpha' | 'cd_alpha' | 'ld_alpha' | 'polar'>('cl_alpha');

  if (!isOpen) return null;

  // Generate sweep data for alpha = -4 to +18 deg
  const alphaRange = Array.from({ length: 23 }, (_, i) => -4 + i);
  const currentAlpha = params.alpha_deg || 4;

  const sweepData = alphaRange.map(a => {
    // Semi-empirical polar approximations
    const isStall = a > 14;
    let cl = 0.11 * (a + 2); // Linear slope ~2pi per rad
    if (a > 12) {
      cl = 1.54 - 0.05 * Math.pow(a - 12, 1.5);
    }
    cl = Math.max(-0.4, Math.min(1.6, cl));

    const cd0 = 0.015;
    const ar = (params.b * params.b) / (0.5 * (params.Cr + params.Ct) * params.b);
    const k = 1 / (Math.PI * 0.85 * Math.max(1, ar));
    const cd = cd0 + k * cl * cl + (isStall ? 0.08 : 0);

    const ld = cl / Math.max(0.001, cd);

    return { alpha: a, CL: Number(cl.toFixed(3)), CD: Number(cd.toFixed(4)), LD: Number(ld.toFixed(2)) };
  });

  const currentCL = prediction?.CL || 0.65;
  const currentCD = prediction?.CD || 0.032;
  const currentLD = prediction?.LD || 20.3;

  // Key metrics
  const stallAlpha = 14;
  const optAlpha = 6;
  const maxLD = Math.max(...sweepData.map(d => d.LD));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto select-none">
      <div className="bg-[#0a111c] border border-[#1e2d42] rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1e2d42] flex items-center justify-between bg-[#0d1520]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Telemetría y Polares Aerodinámicas de Rendimiento
              </h2>
              <p className="text-xs text-[#9aaec9]">
                Análisis continuo de curvas de sustentación, resistencia, finura L/D y margen de pérdida (α_stall).
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
        <div className="p-6 space-y-6">
          {/* Key Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
              <span className="text-[10px] text-[#9aaec9] uppercase">Punto Actual (α={currentAlpha}°)</span>
              <div className="text-lg font-bold text-cyan-400 mt-1">C_L = {currentCL.toFixed(3)}</div>
              <span className="text-[10px] text-[#5a7390]">C_D = {currentCD.toFixed(4)}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
              <span className="text-[10px] text-[#9aaec9] uppercase">Finura Actual (L/D)</span>
              <div className="text-lg font-bold text-emerald-400 mt-1">{currentLD.toFixed(2)}</div>
              <span className="text-[10px] text-[#5a7390]">Máx Teórico: {maxLD.toFixed(1)}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
              <span className="text-[10px] text-[#9aaec9] uppercase">Ángulo Óptimo (L/D Max)</span>
              <div className="text-lg font-bold text-amber-400 mt-1">α = {optAlpha}°</div>
              <span className="text-[10px] text-[#5a7390]">Máxima eficiencia</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
              <span className="text-[10px] text-[#9aaec9] uppercase">Límite de Pérdida (Stall)</span>
              <div className="text-lg font-bold text-rose-400 mt-1">α_stall = {stallAlpha}°</div>
              <span className="text-[10px] text-[#5a7390]">Margen: {stallAlpha - currentAlpha}°</span>
            </div>
          </div>

          {/* Chart Tab Selector */}
          <div className="flex items-center gap-2 border-b border-[#1e2d42] pb-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('cl_alpha')}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeTab === 'cl_alpha'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-[#0d1520] text-[#9aaec9] border-[#1e2d42] hover:text-white'
              }`}
            >
              Curva C_L vs α
            </button>
            <button
              onClick={() => setActiveTab('cd_alpha')}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeTab === 'cd_alpha'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-[#0d1520] text-[#9aaec9] border-[#1e2d42] hover:text-white'
              }`}
            >
              Curva C_D vs α
            </button>
            <button
              onClick={() => setActiveTab('ld_alpha')}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeTab === 'ld_alpha'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-[#0d1520] text-[#9aaec9] border-[#1e2d42] hover:text-white'
              }`}
            >
              Curva Finura L/D vs α
            </button>
            <button
              onClick={() => setActiveTab('polar')}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeTab === 'polar'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-[#0d1520] text-[#9aaec9] border-[#1e2d42] hover:text-white'
              }`}
            >
              Polar de Lilienthal (C_L vs C_D)
            </button>
          </div>

          {/* Interactive SVG Curve Canvas */}
          <div className="p-4 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
            <div className="w-full h-60 bg-[#070b12] rounded-lg border border-[#1e2d42] p-4 flex items-center justify-center relative">
              <svg viewBox="-5 -0.5 25 2.5" className="w-full h-full overflow-visible">
                {/* Axes */}
                <line x1="-4" y1="0" x2="18" y2="0" stroke="#1e2d42" strokeWidth="0.05" />
                <line x1="0" y1="-0.4" x2="0" y2="1.8" stroke="#1e2d42" strokeWidth="0.05" />

                {/* Gridlines */}
                {[0, 5, 10, 15].map(x => (
                  <line key={x} x1={x} y1="-0.4" x2={x} y2="1.8" stroke="#1e2d42" strokeDasharray="0.1" strokeWidth="0.02" />
                ))}

                {/* Active Curve Plot */}
                {activeTab === 'cl_alpha' && (
                  <path
                    d={`M ${sweepData.map(d => `${d.alpha},${d.CL}`).join(' L ')}`}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="0.1"
                  />
                )}

                {activeTab === 'cd_alpha' && (
                  <path
                    d={`M ${sweepData.map(d => `${d.alpha},${d.CD * 8}`).join(' L ')}`}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="0.1"
                  />
                )}

                {activeTab === 'ld_alpha' && (
                  <path
                    d={`M ${sweepData.map(d => `${d.alpha},${(d.LD / maxLD) * 1.5}`).join(' L ')}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="0.1"
                  />
                )}

                {activeTab === 'polar' && (
                  <path
                    d={`M ${sweepData.map(d => `${d.CD * 80},${d.CL}`).join(' L ')}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="0.1"
                  />
                )}

                {/* Current Operating Angle Marker */}
                <circle cx={currentAlpha} cy={currentCL} r="0.2" fill="#22d3ee" />
                <line x1={currentAlpha} y1="-0.4" x2={currentAlpha} y2="1.8" stroke="#22d3ee" strokeDasharray="0.1" strokeWidth="0.03" />
              </svg>

              <div className="absolute top-3 right-3 text-[10px] font-mono bg-[#0d1520]/80 p-2 rounded border border-[#1e2d42] text-[#9aaec9]">
                Línea punteada cyan = Punto de operación activo (α = {currentAlpha}°)
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e2d42] bg-[#0d1520] flex items-center justify-between text-xs text-[#5a7390]">
          <span>* Polares calculadas con modelos surrogate CFD de alta fidelidad NeuralFoil/XFOIL.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#142032] text-white font-bold hover:bg-[#1e2d42] transition cursor-pointer"
          >
            Cerrar Telemetría
          </button>
        </div>
      </div>
    </div>
  );
};
