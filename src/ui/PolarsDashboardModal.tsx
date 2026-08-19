import React, { useState } from 'react';
import { TrendingUp, ShieldAlert, Zap, Compass, BarChart3 } from 'lucide-react';
import { LegacyWingPayload, PredictionResult } from '../core/types';
import { calcularEmpirico } from '../domains/wing/empirical';
import { Modal } from './primitives/Modal';

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

  // Generate sweep data for alpha = -4 to +18 deg
  const alphaRange = Array.from({ length: 23 }, (_, i) => -4 + i);
  const currentAlpha = params.alpha_deg || 4;

  // Barrido con el mismo motor empírico de línea sustentadora usado en el resto de la app
  const sweepData = alphaRange.map(a => {
    const emp = calcularEmpirico({ ...params, alpha_deg: a });
    return { alpha: a, CL: emp.CL, CD: emp.CD, LD: emp.LD };
  });

  const currentCL = prediction?.CL || 0.65;
  const currentCD = prediction?.CD || 0.032;
  const currentLD = prediction?.LD || 20.3;

  // Key metrics
  const stallAlpha = 14;
  const optAlpha = 6;
  const maxLD = Math.max(...sweepData.map(d => d.LD));

  const tabs = [
    { id: 'cl_alpha' as const, label: 'Curva C_L vs α' },
    { id: 'cd_alpha' as const, label: 'Curva C_D vs α' },
    { id: 'ld_alpha' as const, label: 'Curva Finura L/D vs α' },
    { id: 'polar' as const, label: 'Polar de Lilienthal (C_L vs C_D)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Telemetría y Polares Aerodinámicas de Rendimiento"
      description="Análisis continuo de curvas de sustentación, resistencia, finura L/D y margen de pérdida (α_stall)."
      size="xl"
    >
      {/* Key Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono mb-6">
        <div className="p-3 rounded-xl bg-panel2 border border-line">
          <span className="text-[10px] text-lo uppercase">Punto Actual (α={currentAlpha}°)</span>
          <div className="text-lg font-bold text-accent mt-1">C_L = {currentCL.toFixed(3)}</div>
          <span className="text-[10px] text-dim">C_D = {currentCD.toFixed(4)}</span>
        </div>

        <div className="p-3 rounded-xl bg-panel2 border border-line">
          <span className="text-[10px] text-lo uppercase">Finura Actual (L/D)</span>
          <div className="text-lg font-bold text-ok mt-1">{currentLD.toFixed(2)}</div>
          <span className="text-[10px] text-dim">Máx Teórico: {maxLD.toFixed(1)}</span>
        </div>

        <div className="p-3 rounded-xl bg-panel2 border border-line">
          <span className="text-[10px] text-lo uppercase">Ángulo Óptimo (L/D Max)</span>
          <div className="text-lg font-bold text-warn mt-1">α = {optAlpha}°</div>
          <span className="text-[10px] text-dim">Máxima eficiencia</span>
        </div>

        <div className="p-3 rounded-xl bg-panel2 border border-line">
          <span className="text-[10px] text-lo uppercase">Límite de Pérdida (Stall)</span>
          <div className="text-lg font-bold text-bad mt-1">α_stall = {stallAlpha}°</div>
          <span className="text-[10px] text-dim">Margen: {stallAlpha - currentAlpha}°</span>
        </div>
      </div>

      {/* Chart Tab Selector */}
      <div className="flex items-center gap-2 border-b border-line pb-2 mb-6 text-xs font-semibold">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-accent/20 text-accent2 border-accent/40'
                : 'bg-panel2 text-lo border-line hover:text-hi'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interactive SVG Curve Canvas */}
      <div className="p-4 rounded-xl bg-panel2 border border-line">
        <div className="w-full h-60 bg-ink rounded-lg border border-line p-4 flex items-center justify-center relative">
          <svg viewBox="-5 -0.5 25 2.5" className="w-full h-full overflow-visible">
            {/* Axes */}
            <line x1="-4" y1="0" x2="18" y2="0" stroke="var(--color-line)" strokeWidth="0.05" />
            <line x1="0" y1="-0.4" x2="0" y2="1.8" stroke="var(--color-line)" strokeWidth="0.05" />

            {/* Gridlines */}
            {[0, 5, 10, 15].map(x => (
              <line key={x} x1={x} y1="-0.4" x2={x} y2="1.8" stroke="var(--color-line)" strokeDasharray="0.1" strokeWidth="0.02" />
            ))}

            {/* Active Curve Plot */}
            {activeTab === 'cl_alpha' && (
              <path
                d={`M ${sweepData.map(d => `${d.alpha},${d.CL}`).join(' L ')}`}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="0.1"
              />
            )}

            {activeTab === 'cd_alpha' && (
              <path
                d={`M ${sweepData.map(d => `${d.alpha},${d.CD * 8}`).join(' L ')}`}
                fill="none"
                stroke="var(--color-bad)"
                strokeWidth="0.1"
              />
            )}

            {activeTab === 'ld_alpha' && (
              <path
                d={`M ${sweepData.map(d => `${d.alpha},${(d.LD / maxLD) * 1.5}`).join(' L ')}`}
                fill="none"
                stroke="var(--color-ok)"
                strokeWidth="0.1"
              />
            )}

            {activeTab === 'polar' && (
              <path
                d={`M ${sweepData.map(d => `${d.CD * 80},${d.CL}`).join(' L ')}`}
                fill="none"
                stroke="var(--color-warn)"
                strokeWidth="0.1"
              />
            )}

            {/* Current Operating Angle Marker */}
            <circle cx={currentAlpha} cy={currentCL} r="0.2" fill="var(--color-accent)" />
            <line x1={currentAlpha} y1="-0.4" x2={currentAlpha} y2="1.8" stroke="var(--color-accent)" strokeDasharray="0.1" strokeWidth="0.03" />
          </svg>

          <div className="absolute top-3 right-3 text-[10px] font-mono bg-panel2/80 p-2 rounded border border-line text-lo">
            Línea punteada cyan = Punto de operación activo (α = {currentAlpha}°)
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-line flex items-center justify-between text-xs text-dim">
        <span>* Polares calculadas con el modelo empírico de línea sustentadora (lifting-line).</span>
      </div>
    </Modal>
  );
};
