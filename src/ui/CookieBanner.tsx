import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Lock, FileText } from 'lucide-react';
import { Modal, Button } from './primitives';

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
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-panel/95 border-t border-line backdrop-blur-md shadow-2xl">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="text-xs text-lo leading-relaxed">
                <span className="font-bold text-hi block text-sm mb-0.5">
                  Uso de Cookies y Tratamiento de Datos de Simulación
                </span>
                Utilizamos cookies técnicas necesarias para autenticación y cookies analíticas para optimizar el rendimiento de la caché del motor de predicción. Cumplimos estrictamente con RGPD e ISO/IEC 27001 para la protección de sus diseños aeronáuticos.
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDetailsModal(true)}
              >
                Configurar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAcceptAll}
              >
                Aceptar Todas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Política de Cookies & Normativa de Datos OptimAirWing"
        size="md"
      >
        <div className="flex flex-col gap-4 text-xs">
          <p className="text-lo leading-relaxed">
            OptimAirWing procesa la geometría alar y las coordenadas aerodinámicas localmente en su navegador y mediante llamadas cifradas de baja latencia a nuestro servidor de predicción.
          </p>

          {/* Necessary */}
          <div className="bg-panel2 p-4 rounded-lg border border-line flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-hi">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span>Cookies Técnicas Necesarias</span>
              </div>
              <p className="text-dim mt-1 text-[11px]">
                Requeridas para la sesión de usuario, almacenamiento de snapshots locales y validación del plan de suscripción activo. No se pueden desactivar.
              </p>
            </div>
            <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded border border-accent/20 uppercase shrink-0">
              Obligatorio
            </span>
          </div>

          {/* Analytics */}
          <div className="bg-panel2 p-4 rounded-lg border border-line flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-hi">
                <FileText className="w-3.5 h-3.5 text-dhydro" />
                <span>Telemetría y Rendimiento de Inferencia</span>
              </div>
              <p className="text-dim mt-1 text-[11px]">
                Nos permite evaluar los tiempos de respuesta del motor de predicción y medir la convergencia del algoritmo genético.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={e => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
              className="w-4 h-4 rounded border-line bg-ink text-accent focus:ring-accent/20 cursor-pointer mt-1"
            />
          </div>

          {/* Simulation Data */}
          <div className="bg-panel2 p-4 rounded-lg border border-line flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-hi">
                <ShieldCheck className="w-3.5 h-3.5 text-ok" />
                <span>Caché Local de Geometría Alar</span>
              </div>
              <p className="text-dim mt-1 text-[11px]">
                Permite la persistencia de perfiles NACA y estados del túnel de viento virtual entre recargas de la aplicación.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.simulationData}
              onChange={e => setPreferences(p => ({ ...p, simulationData: e.target.checked }))}
              className="w-4 h-4 rounded border-line bg-ink text-accent focus:ring-accent/20 cursor-pointer mt-1"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={handleSavePreferences}>
              Guardar Configuración
            </Button>
            <Button variant="primary" size="sm" onClick={handleAcceptAll}>
              Aceptar Todas
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
