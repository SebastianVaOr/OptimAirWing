import React, { useState } from 'react';
import { X, Globe, ShieldCheck, Cpu, LineChart, Zap, Layers, FileText, CheckCircle2, Lock, Cookie, HelpCircle } from 'lucide-react';
import { Modal } from './primitives/Modal';

export type InfoTab = 'quienes-somos' | 'servicios' | 'planes' | 'normativa';

interface InfoSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: InfoTab;
  onSelectPlan?: (plan: 'freemium' | 'professional' | 'enterprise') => void;
}

export const InfoSectionModal: React.FC<InfoSectionModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'quienes-somos',
  onSelectPlan
}) => {
  const [activeTab, setActiveTab] = useState<InfoTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Información" size="lg">
        {/* Nav Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-ink border-b border-line overflow-x-auto text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('quienes-somos')}
            className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap cursor-pointer ${
              activeTab === 'quienes-somos'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-panel2 text-lo border-line hover:text-white'
            }`}
          >
            Quiénes Somos
          </button>
          <button
            onClick={() => setActiveTab('servicios')}
            className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap cursor-pointer ${
              activeTab === 'servicios'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-panel2 text-lo border-line hover:text-white'
            }`}
          >
            Servicios
          </button>
          <button
            onClick={() => setActiveTab('planes')}
            className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap cursor-pointer ${
              activeTab === 'planes'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-panel2 text-lo border-line hover:text-white'
            }`}
          >
            Planes y Precios
          </button>
          <button
            onClick={() => setActiveTab('normativa')}
            className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap cursor-pointer ${
              activeTab === 'normativa'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-panel2 text-lo border-line hover:text-white'
            }`}
          >
            Cookies & Legal
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {activeTab === 'quienes-somos' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-white">Reinventando el Diseño Aeronáutico</h2>
              <p className="text-lo leading-relaxed">
                OptimAirWing nació de la necesidad de poner las formulaciones de diseño preliminar al alcance de cualquier ingeniero, sin depender de clústeres CFD pesados.
              </p>
              <p className="text-lo leading-relaxed">
                Aplicamos las formulaciones analíticas clásicas de Prandtl y Helmbold sobre perfiles NACA para ofrecer predicciones instantáneas con rigor físico, validadas contra datos de referencia publicados.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-panel2 border border-line rounded-xl space-y-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <div className="font-bold text-white text-xs">Modelo Empírico de Línea Sustentadora</div>
                  <div className="text-xs text-lo">Aerodinámica clásica 2D/3D validada contra Abbott & von Doenhoff.</div>
                </div>
                <div className="p-4 bg-panel2 border border-line rounded-xl space-y-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div className="font-bold text-white text-xs">Conformidad Física</div>
                  <div className="text-xs text-lo">Filtro estructural y penalizaciones por flexión y divergencia aeroelástica.</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'servicios' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-white">Servicios de Ingeniería Aeroespacial</h2>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-panel2 border border-line rounded-xl">
                  <LineChart className="w-5 h-5 text-cyan-400 mb-2" />
                  <h3 className="font-bold text-white text-sm">Predicción Aerodinámica Instantánea</h3>
                  <p className="text-xs text-lo mt-1">Cálculo de CL, CD, Cm, L/D y factor de Oswald ajustado por Mach y Reynolds.</p>
                </div>

                <div className="p-4 bg-panel2 border border-line rounded-xl">
                  <Zap className="w-5 h-5 text-purple-400 mb-2" />
                  <h3 className="font-bold text-white text-sm">Optimizador Genético Aeroestructural</h3>
                  <p className="text-xs text-lo mt-1">Algoritmo con 80 generaciones para maximizar eficiencia bajo presupuesto y peso.</p>
                </div>

                <div className="p-4 bg-panel2 border border-line rounded-xl">
                  <Layers className="w-5 h-5 text-blue-400 mb-2" />
                  <h3 className="font-bold text-white text-sm">Visualizador 3D WebGL</h3>
                  <p className="text-xs text-lo mt-1">Inspección con mapa de presiones, malla 3D y vista de sección de perfil.</p>
                </div>

                <div className="p-4 bg-panel2 border border-line rounded-xl">
                  <FileText className="w-5 h-5 text-emerald-400 mb-2" />
                  <h3 className="font-bold text-white text-sm">Informes Técnicos Profesionales</h3>
                  <p className="text-xs text-lo mt-1">Exportación en PDF con tablas de geometría y advertencias de cumplimiento.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'planes' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-white">Planes y Precios</h2>
              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-panel2 border border-line rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white">Gratuito</h3>
                    <div className="text-xl font-black text-cyan-400 font-mono mt-1">0 € / mes</div>
                    <p className="text-xs text-lo mt-2">3 créditos/mes, modelo empírico básico.</p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onSelectPlan?.('freemium');
                    }}
                    className="mt-4 py-1.5 w-full rounded bg-panel2 text-cyan-300 font-bold text-xs hover:bg-cyan-500/20 transition cursor-pointer"
                  >
                    Elegir Plan
                  </button>
                </div>

                <div className="p-4 bg-panel2 border-2 border-cyan-400 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white">Profesional</h3>
                    <div className="text-xl font-black text-cyan-400 font-mono mt-1">250 € / mes</div>
                    <p className="text-xs text-lo mt-2">100 créditos/mes, modelo empírico de línea sustentadora, optimizador completo.</p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onSelectPlan?.('professional');
                    }}
                    className="mt-4 py-1.5 w-full rounded bg-cyan-500 text-ink font-bold text-xs hover:brightness-110 transition cursor-pointer"
                  >
                    Elegir Plan
                  </button>
                </div>

                <div className="p-4 bg-panel2 border border-line rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white">Empresa</h3>
                    <div className="text-xl font-black text-purple-400 font-mono mt-1">500 € / mes</div>
                    <p className="text-xs text-lo mt-2">I+D ilimitado, SLA e integración con clústeres propios.</p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onSelectPlan?.('enterprise');
                    }}
                    className="mt-4 py-1.5 w-full rounded bg-panel2 text-purple-300 font-bold text-xs hover:bg-purple-500/20 transition cursor-pointer"
                  >
                    Elegir Plan
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'normativa' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-white">Normativa & Cookies</h2>
              <div className="p-4 bg-panel2 border border-line rounded-xl space-y-3 text-xs text-lo leading-relaxed">
                <div className="flex items-center gap-2 text-white font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cumplimiento RGPD & ISO/IEC 27001</span>
                </div>
                <p>
                  OptimAirWing garantiza que todas las geometrías y parámetros introducidos en el simulador se procesan de forma estrictamente confidencial.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-cyan-400 font-semibold">
                  <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> SSL Cifrado 256-bit</span>
                  <span className="flex items-center gap-1"><Cookie className="w-3.5 h-3.5" /> Cookies Analíticas Mínimas</span>
                  <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Soporte Legal 24/7</span>
                </div>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
};
