import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, Check, Lock, FileText } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: true,
    simulationData: true
  });

  useEffect(() => {
    const saved = localStorage.getItem('optimairwing_cookie_consent');
    if (!saved) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('optimairwing_cookie_consent', JSON.stringify({
      necessary: true,
      analytics: true,
      simulationData: true,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
    setShowDetailsModal(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('optimairwing_cookie_consent', JSON.stringify({
      ...preferences,
      necessary: true,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
    setShowDetailsModal(false);
  };

  if (!showBanner && !showDetailsModal) return null;

  return (
    <>
      {/* Bottom Sticky Cookie Banner */}
      {showBanner && !showDetailsModal && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#0a0f18]/95 border-t border-[#16202f] backdrop-blur-md shadow-2xl">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="text-xs text-[#8ea3bd] leading-relaxed">
                <span className="font-bold text-[#e8f1fb] block text-sm mb-0.5">
                  Uso de Cookies y Tratamiento de Datos de Simulación
                </span>
                Utilizamos cookies técnicas necesarias para autenticación y cookies analíticas para optimizar el rendimiento de la caché del motor de predicción. Cumplimos estrictamente con RGPD e ISO/IEC 27001 para la protección de sus diseños aeronáuticos.
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowDetailsModal(true)}
                className="px-3.5 py-2 rounded-lg bg-[#0e1624] text-xs font-semibold text-[#8ea3bd] border border-[#16202f] hover:text-white hover:border-[#223048] transition cursor-pointer"
              >
                Configurar
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#05070c] font-bold text-xs transition shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                Aceptar Todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f18] border border-[#16202f] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#16202f] bg-[#0e1624]">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Política de Cookies & Normativa de Datos OptimAirWing</span>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-[#8ea3bd] hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh] text-xs">
              <p className="text-[#8ea3bd] leading-relaxed">
                OptimAirWing procesa la geometría alar y las coordenadas aerodinámicas localmente en su navegador y mediante llamadas cifradas de baja latencia a nuestro servidor de predicción.
              </p>

              {/* Necessary */}
              <div className="bg-[#0e1624] p-4 rounded-lg border border-[#16202f] flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-[#e8f1fb]">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cookies Técnicas Necesarias</span>
                  </div>
                  <p className="text-[#5b6f8c] mt-1 text-[11px]">
                    Requeridas para la sesión de usuario, almacenamiento de snapshots locales y validación del plan de suscripción activo. No se pueden desactivar.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 uppercase shrink-0">
                  Obligatorio
                </span>
              </div>

              {/* Analytics */}
              <div className="bg-[#0e1624] p-4 rounded-lg border border-[#16202f] flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-[#e8f1fb]">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Telemetría y Rendimiento de Inferencia</span>
                  </div>
                  <p className="text-[#5b6f8c] mt-1 text-[11px]">
                    Nos permite evaluar los tiempos de respuesta del motor de predicción y medir la convergencia del algoritmo genético.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={e => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#16202f] bg-[#05070c] text-cyan-500 focus:ring-cyan-500/20 cursor-pointer mt-1"
                />
              </div>

              {/* Simulation Data */}
              <div className="bg-[#0e1624] p-4 rounded-lg border border-[#16202f] flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-[#e8f1fb]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Caché Local de Geometría Alar</span>
                  </div>
                  <p className="text-[#5b6f8c] mt-1 text-[11px]">
                    Permite la persistencia de perfiles NACA y estados del túnel de viento virtual entre recargas de la aplicación.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.simulationData}
                  onChange={e => setPreferences(p => ({ ...p, simulationData: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#16202f] bg-[#05070c] text-cyan-500 focus:ring-cyan-500/20 cursor-pointer mt-1"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#0e1624] border-t border-[#16202f] flex items-center justify-end gap-2">
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 rounded-lg bg-[#0e1624] text-xs font-bold text-cyan-300 border border-[#16202f] hover:bg-cyan-500/20 transition cursor-pointer"
              >
                Guardar Configuración
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#05070c] font-bold text-xs transition shadow-md cursor-pointer"
              >
                Aceptar Todas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
