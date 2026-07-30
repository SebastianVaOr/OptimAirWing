import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, Zap, Info, Compass } from 'lucide-react';
import { generateNaca4Points } from '../domains/wing/naca';

interface AirfoilDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNaca: string;
  onApplyNaca: (nacaCode: string) => void;
}

export const AirfoilDesignerModal: React.FC<AirfoilDesignerModalProps> = ({
  isOpen,
  onClose,
  currentNaca,
  onApplyNaca,
}) => {
  const [camberPct, setCamberPct] = useState(2); // Digit 1
  const [camberPos, setCamberPos] = useState(4); // Digit 2
  const [thicknessPct, setThicknessPct] = useState(12); // Digits 3-4

  useEffect(() => {
    if (currentNaca && currentNaca.length === 4) {
      const m = parseInt(currentNaca[0], 10);
      const p = parseInt(currentNaca[1], 10);
      const t = parseInt(currentNaca.substring(2), 10);
      if (!isNaN(m)) setCamberPct(m);
      if (!isNaN(p)) setCamberPos(p);
      if (!isNaN(t)) setThicknessPct(t);
    }
  }, [currentNaca, isOpen]);

  if (!isOpen) return null;

  const activeCode = `${camberPct}${camberPos}${thicknessPct < 10 ? '0' + thicknessPct : thicknessPct}`;
  const points = generateNaca4Points(activeCode, 80);

  const handleApply = () => {
    onApplyNaca(activeCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto select-none">
      <div className="bg-[#0a111c] border border-[#1e2d42] rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1e2d42] flex items-center justify-between bg-[#0d1520]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Generador y Morphing de Perfiles NACA Interactivo
              </h2>
              <p className="text-xs text-[#9aaec9]">
                Diseñe la geometría exacta del perfil 2D ajustando curvatura, espesor y posición de curvatura máxima.
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
          {/* Active NACA Display */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Código Generado</span>
              <div className="text-2xl font-mono font-extrabold text-white">
                NACA <span className="text-cyan-400">{activeCode}</span>
              </div>
            </div>
            <div className="text-right text-xs text-[#9aaec9] space-y-0.5 font-mono">
              <div>Curvatura Máx: <span className="text-white font-bold">{camberPct}% c</span></div>
              <div>Posición Curvatura: <span className="text-white font-bold">{camberPos * 10}% c</span></div>
              <div>Espesor Máximo: <span className="text-white font-bold">{thicknessPct}% c</span></div>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="grid md:grid-cols-3 gap-4 p-4 rounded-xl bg-[#0d1520] border border-[#1e2d42]">
            {/* Camber % */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#9aaec9]">1. Curvatura (Camber)</span>
                <span className="text-cyan-400 font-mono">{camberPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="9"
                step="1"
                value={camberPct}
                onChange={e => setCamberPct(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-[#5a7390]">0% = Perfil Simétrico. &gt;0% = Mayor sustentación $C_L$.</p>
            </div>

            {/* Camber Position */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#9aaec9]">2. Posición Curvatura</span>
                <span className="text-cyan-400 font-mono">{camberPos * 10}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="9"
                step="1"
                value={camberPos}
                onChange={e => setCamberPos(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-[#5a7390]">Ubicación del punto más curvo a lo largo de la cuerda.</p>
            </div>

            {/* Thickness % */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#9aaec9]">3. Espesor Relativo</span>
                <span className="text-cyan-400 font-mono">{thicknessPct}%</span>
              </div>
              <input
                type="range"
                min="4"
                max="28"
                step="1"
                value={thicknessPct}
                onChange={e => setThicknessPct(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-[#5a7390]">Mayor espesor = Mayor rigidez estructural y menor Flutter.</p>
            </div>
          </div>

          {/* Airfoil SVG Interactive Plot */}
          <div className="p-4 rounded-xl bg-[#0d1520] border border-[#1e2d42] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#e8edf4]">Vista 2D Geometría de Perfil</span>
              <div className="flex items-center gap-3 text-[10px] font-mono text-[#9aaec9]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Extradós / Intradós
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Centro Aerodinámico (0.25c)
                </span>
              </div>
            </div>

            <div className="w-full h-52 bg-[#070b12] rounded-lg border border-[#1e2d42] p-2 flex items-center justify-center">
              <svg viewBox="-0.1 -0.35 1.2 0.7" className="w-full h-full overflow-visible">
                {/* Center Line Grid */}
                <line x1="-0.1" y1="0" x2="1.1" y2="0" stroke="#1e2d42" strokeDasharray="0.02" strokeWidth="0.005" />
                <line x1="0.25" y1="-0.3" x2="0.25" y2="0.3" stroke="#1e2d42" strokeDasharray="0.02" strokeWidth="0.005" />

                {/* Profile Filled Shape */}
                {points && points.upper && (
                  <path
                    d={`M ${points.upper.map(p => `${p.x},${-p.y}`).join(' L ')} L ${points.lower.slice().reverse().map(p => `${p.x},${-p.y}`).join(' L ')} Z`}
                    fill="rgba(34, 211, 238, 0.12)"
                    stroke="#22d3ee"
                    strokeWidth="0.012"
                  />
                )}

                {/* Aerodynamic Center Marker (0.25c) */}
                <circle cx="0.25" cy="0" r="0.018" fill="#f59e0b" />
                <text x="0.28" y="0.05" fill="#f59e0b" fontSize="0.035" fontWeight="bold">0.25c</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e2d42] bg-[#0d1520] flex items-center justify-between">
          <span className="text-xs text-[#5a7390]">
            * El perfil NACA {activeCode} se sincronizará en todos los cálculos CFD y renderizado 3D.
          </span>
          <button
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar NACA {activeCode} al Simulador</span>
          </button>
        </div>
      </div>
    </div>
  );
};
