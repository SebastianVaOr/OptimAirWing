import React, { useState, useEffect } from 'react';
import { Check, Sliders } from 'lucide-react';
import { generateNaca4Points } from '../domains/wing/naca';
import { Modal } from './primitives/Modal';
import { Button } from './primitives/Button';

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

  const activeCode = `${camberPct}${camberPos}${thicknessPct < 10 ? '0' + thicknessPct : thicknessPct}`;
  const points = generateNaca4Points(activeCode, 80);

  const handleApply = () => {
    onApplyNaca(activeCode);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generador y Morphing de Perfiles NACA Interactivo"
      description="Diseñe la geometría exacta del perfil 2D ajustando curvatura, espesor y posición de curvatura máxima."
      size="lg"
    >
      {/* Active NACA Display */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-panel2 border border-line mb-6">
        <div>
          <span className="text-xs font-bold text-accent uppercase tracking-wider">Código Generado</span>
          <div className="text-2xl font-mono font-extrabold text-hi">
            NACA <span className="text-accent">{activeCode}</span>
          </div>
        </div>
        <div className="text-right text-xs text-lo space-y-0.5 font-mono">
          <div>Curvatura Máx: <span className="text-hi font-bold">{camberPct}% c</span></div>
          <div>Posición Curvatura: <span className="text-hi font-bold">{camberPos * 10}% c</span></div>
          <div>Espesor Máximo: <span className="text-hi font-bold">{thicknessPct}% c</span></div>
        </div>
      </div>

      {/* Interactive Sliders */}
      <div className="grid md:grid-cols-3 gap-4 p-4 rounded-xl bg-panel2 border border-line mb-6">
        {/* Camber % */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-lo">1. Curvatura (Camber)</span>
            <span className="text-accent font-mono">{camberPct}%</span>
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
          <p className="text-[10px] text-dim">0% = Perfil Simétrico. &gt;0% = Mayor sustentación $C_L$.</p>
        </div>

        {/* Camber Position */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-lo">2. Posición Curvatura</span>
            <span className="text-accent font-mono">{camberPos * 10}%</span>
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
          <p className="text-[10px] text-dim">Ubicación del punto más curvo a lo largo de la cuerda.</p>
        </div>

        {/* Thickness % */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-lo">3. Espesor Relativo</span>
            <span className="text-accent font-mono">{thicknessPct}%</span>
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
          <p className="text-[10px] text-dim">Mayor espesor = Mayor rigidez estructural y menor Flutter.</p>
        </div>
      </div>

      {/* Airfoil SVG Interactive Plot */}
      <div className="p-4 rounded-xl bg-panel2 border border-line space-y-2 mb-6">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-hi">Vista 2D Geometría de Perfil</span>
          <div className="flex items-center gap-3 text-[10px] font-mono text-lo">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent"></span> Extradós / Intradós
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warn"></span> Centro Aerodinámico (0.25c)
            </span>
          </div>
        </div>

        <div className="w-full h-52 bg-ink rounded-lg border border-line p-2 flex items-center justify-center">
          <svg viewBox="-0.1 -0.35 1.2 0.7" className="w-full h-full overflow-visible">
            {/* Center Line Grid */}
            <line x1="-0.1" y1="0" x2="1.1" y2="0" stroke="var(--color-line)" strokeDasharray="0.02" strokeWidth="0.005" />
            <line x1="0.25" y1="-0.3" x2="0.25" y2="0.3" stroke="var(--color-line)" strokeDasharray="0.02" strokeWidth="0.005" />

            {/* Profile Filled Shape */}
            {points && points.upper && (
              <path
                d={`M ${points.upper.map(p => `${p.x},${-p.y}`).join(' L ')} L ${points.lower.slice().reverse().map(p => `${p.x},${-p.y}`).join(' L ')} Z`}
                fill="rgba(34, 211, 238, 0.12)"
                stroke="var(--color-accent)"
                strokeWidth="0.012"
              />
            )}

            {/* Aerodynamic Center Marker (0.25c) */}
            <circle cx="0.25" cy="0" r="0.018" fill="var(--color-warn)" />
            <text x="0.28" y="0.05" fill="var(--color-warn)" fontSize="0.035" fontWeight="bold">0.25c</text>
          </svg>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-line flex items-center justify-between">
        <span className="text-xs text-dim">
          * El perfil NACA {activeCode} se sincronizará en todos los cálculos aerodinámicos y el renderizado 3D.
        </span>
        <Button size="sm" icon={Check} onClick={handleApply}>
          Aplicar NACA {activeCode} al Simulador
        </Button>
      </div>
    </Modal>
  );
};