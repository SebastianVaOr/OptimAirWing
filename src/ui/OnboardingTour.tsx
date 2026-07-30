import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Zap, Sliders, BarChart3, Download, Users, Shield } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const steps = [
  { icon: Zap, title: 'Bienvenido a OptimAirWing', desc: 'Motor de simulación y optimización aerodinámica. Diseña, simula y optimiza alas para aeronaves, F1, náutica y más.', color: 'text-cyan-400' },
  { icon: Sliders, title: 'Ajusta los Parámetros', desc: 'Configura envergadura, cuerda, perfil NACA, ángulo de flecha y twist. El simulador 3D se actualiza en tiempo real.', color: 'text-emerald-400' },
  { icon: BarChart3, title: 'Resultados Aerodinámicos', desc: 'CL, CD, L/D, eficiencia. El motor empírico calcula sustentación, arrastre y momento en segundos.', color: 'text-amber-400' },
  { icon: Zap, title: 'Optimización Genética', desc: 'Selecciona un objetivo (máxima eficiencia, mínimo peso, etc.) y el algoritmo genético encuentra el diseño óptimo.', color: 'text-purple-400' },
  { icon: Download, title: 'Exporta tu Diseño', desc: 'Descarga el modelo STEP para CFD avanzado o fabricación. Compatible con SolidWorks, CATIA, FreeCAD.', color: 'text-rose-400' },
  { icon: Users, title: 'Colabora', desc: 'Invita miembros a tu organización. Comparte y revisa diseños en equipo.', color: 'text-blue-400' },
  { icon: Shield, title: 'Seguro y Listo', desc: 'Tus datos están protegidos con cifrado bcrypt, JWT rotados y sesiones seguras. ¿Empezamos?', color: 'text-cyan-400' },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const s = steps[step];
  const Icon = s.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" role="dialog" aria-label="Tour guiado">
      <div className="bg-[#0a111c] border border-[#1e2d42] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-8 flex flex-col items-center text-center gap-5">
          <div className={`p-4 rounded-full bg-[#0d1520] border border-[#1e2d42] ${s.color}`}>
            <Icon className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{s.title}</h3>
            <p className="text-sm text-[#9aaec9] mt-2 leading-relaxed">{s.desc}</p>
          </div>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition ${i === step ? 'bg-cyan-400 w-4' : 'bg-[#1e2d42]'}`} />
            ))}
          </div>

          <div className="flex gap-3 w-full">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-2 rounded-lg border border-[#1e2d42] text-[#9aaec9] text-xs font-bold cursor-pointer hover:bg-[#0d1520] flex items-center justify-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Anterior
              </button>
            )}
            <button onClick={() => { if (isLast) { onComplete(); onClose(); } else setStep(s => s + 1); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1 ${isLast ? 'bg-emerald-500 text-white' : 'bg-cyan-500 text-slate-950'}`}>
              {isLast ? <><Check className="w-3.5 h-3.5" /> Comenzar</> : <><span>Siguiente</span><ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>

          {!isLast && (
            <button onClick={() => { onComplete(); onClose(); }} className="text-[10px] text-[#5a7390] hover:text-white cursor-pointer">
              Saltar tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
