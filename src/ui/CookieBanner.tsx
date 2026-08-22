import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Lock, FileText, ExternalLink } from 'lucide-react';
import { Modal, Button } from './primitives';

export const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,     // GDPR: opt-in by default (disabled until consent)
    simulationData: false  // GDPR: opt-in by default (disabled until consent)
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
      timestamp: new Date().toISOString(),
      consentVersion: '2.0',
      legalBasis: 'Art. 6.1.a RGPD (Consentimiento explícito)',
    }));
    setShowBanner(false);
    setShowDetailsModal(false);
  };

  const handleRejectOptional = () => {
    localStorage.setItem('optimairwing_cookie_consent', JSON.stringify({
      necessary: true,
      analytics: false,
      simulationData: false,
      timestamp: new Date().toISOString(),
      consentVersion: '2.0',
      legalBasis: 'Art. 6.1.b RGPD (Solo cookies necesarias)',
    }));
    setShowBanner(false);
    setShowDetailsModal(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('optimairwing_cookie_consent', JSON.stringify({
      ...preferences,
      necessary: true, // Always on
      timestamp: new Date().toISOString(),
      consentVersion: '2.0',
      legalBasis: preferences.analytics || preferences.simulationData
        ? 'Art. 6.1.a RGPD (Consentimiento explícito)'
        : 'Art. 6.1.b RGPD (Solo cookies necesarias)',
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
                  Uso de Cookies y Tratamiento de Datos (RGPD)
                </span>
                Utilizamos cookies estrictamente necesarias para la autenticación. Las cookies analíticas y de caché de simulación 
                solo se activan con su consentimiento explícito conforme al Art. 6.1 del Reglamento General de Protección de Datos (UE) 2016/679.
                <button 
                  onClick={() => setShowDetailsModal(true)}
                  className="text-accent hover:underline ml-1 inline-flex items-center gap-0.5"
                >
                  Política de Privacidad <ExternalLink className="w-3 h-3" />
                </button>
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
                variant="secondary"
                size="sm"
                onClick={handleRejectOptional}
              >
                Solo Necesarias
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
        title="Política de Cookies & Protección de Datos (RGPD)"
        size="md"
      >
        <div className="flex flex-col gap-4 text-xs">
          <p className="text-lo leading-relaxed">
            OptimAirWing procesa la geometría alar y las coordenadas aerodinámicas localmente en su navegador y mediante llamadas cifradas a nuestro servidor de predicción. 
            Conforme al Art. 13 del RGPD, le informamos sobre el tratamiento de sus datos:
          </p>

          {/* Necessary */}
          <div className="bg-panel2 p-4 rounded-lg border border-line flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-hi">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span>Cookies Técnicas Necesarias</span>
              </div>
              <p className="text-dim mt-1 text-[11px]">
                Requeridas para la sesión de usuario (JWT), almacenamiento de snapshots locales y validación CSRF. 
                No se pueden desactivar. <strong>Base legal: Art. 6.1.b RGPD</strong> (ejecución del contrato de servicio).
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
                <span>Telemetría y Rendimiento</span>
              </div>
              <p className="text-dim mt-1 text-[11px]">
                Nos permite evaluar los tiempos de respuesta del motor de predicción y medir la convergencia del algoritmo genético. 
                Los datos son anonimizados y no se comparten con terceros. 
                <strong> Base legal: Art. 6.1.a RGPD</strong> (consentimiento explícito).
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
                Todos los datos se almacenan exclusivamente en su navegador (localStorage). 
                <strong> Base legal: Art. 6.1.a RGPD</strong> (consentimiento explícito).
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.simulationData}
              onChange={e => setPreferences(p => ({ ...p, simulationData: e.target.checked }))}
              className="w-4 h-4 rounded border-line bg-ink text-accent focus:ring-accent/20 cursor-pointer mt-1"
            />
          </div>

          {/* Data Rights */}
          <div className="bg-panel2 p-3 rounded-lg border border-line text-[11px] text-dim">
            <strong className="text-hi">Sus derechos (Art. 15-22 RGPD):</strong> Puede solicitar acceso, rectificación, 
            eliminación o portabilidad de sus datos en cualquier momento contactando a nuestro Delegado de Protección de Datos 
            en <span className="text-accent">dpo@optimairwing.app</span>. 
            Tiene derecho a retirar su consentimiento sin que ello afecte a la licitud del tratamiento previo.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={handleRejectOptional}>
              Solo Necesarias
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSavePreferences}>
              Guardar Selección
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
