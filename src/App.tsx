/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { store, AppState } from './core/store';
import { Header } from './ui/Header';
import { ParameterPanel } from './ui/ParameterPanel';
import { ThreeViewer } from './ui/ThreeViewer';
import { ResultsPanel } from './ui/ResultsPanel';
import { LegalDisclaimerBadge } from './ui/LegalDisclaimerBadge';
import { OptimizationModal } from './ui/OptimizationModal';
import { ReportModal } from './ui/ReportModal';
import { SnapshotsModal } from './ui/SnapshotsModal';
import { AdminPanelModal } from './ui/AdminPanelModal';
import { EnterpriseSecurityModal } from './ui/EnterpriseSecurityModal';
import { MarketReadinessModal } from './ui/MarketReadinessModal';
import { InfoSectionModal, InfoTab } from './ui/InfoSectionModal';
import { DesignComparatorModal } from './ui/DesignComparatorModal';
import { AirfoilDesignerModal } from './ui/AirfoilDesignerModal';
import { PolarsDashboardModal } from './ui/PolarsDashboardModal';
import { ExportDownloadModal } from './ui/ExportDownloadModal';
import { LandingPage } from './ui/LandingPage';
import { LegacyWingPayload } from './core/types';
import { fetchLegacyPrediction } from './api/client';
import { useTheme } from './core/theme';
import { useAutoSave } from './core/autoSave';
import { useTranslation } from 'react-i18next';

const Spinner = () => (
  <div className="flex items-center justify-center gap-2 py-6">
    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    <span className="text-xs text-accent font-semibold">Cargando...</span>
  </div>
);

export default function App() {
  const [state, setState] = useState<AppState>(store.getState());
  const [viewMode, setViewMode] = useState<'landing' | 'simulator'>('landing');
  const [mobileTab, setMobileTab] = useState<'params' | 'viewer' | 'results'>('viewer');
  const [isPredicting, setIsPredicting] = useState(false);

  const [isOptimizeOpen, setIsOptimizeOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isEnterpriseSecurityOpen, setIsEnterpriseSecurityOpen] = useState(false);
  const [isMarketReadinessOpen, setIsMarketReadinessOpen] = useState(false);
  const [isComparatorOpen, setIsComparatorOpen] = useState(false);
  const [isAirfoilDesignerOpen, setIsAirfoilDesignerOpen] = useState(false);
  const [isPolarsOpen, setIsPolarsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [infoModalTab, setInfoModalTab] = useState<InfoTab | null>(null);

  const { theme, toggle: toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  useAutoSave(state.legacyParams);

  useEffect(() => {
    const unsubscribe = store.subscribe(newState => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Fetch prediction on parameter updates
  useEffect(() => {
    let isCancelled = false;

    const syncPrediction = async () => {
      setIsPredicting(true);
      try {
        const result = await fetchLegacyPrediction(state.legacyParams);
        if (!isCancelled) {
          store.setPrediction(result);
        }
      } finally {
        if (!isCancelled) setIsPredicting(false);
      }
    };

    syncPrediction();

    return () => {
      isCancelled = true;
    };
  }, [state.legacyParams]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'g' && !e.shiftKey) {
        e.preventDefault();
        setIsSnapshotsOpen(prev => !prev);
      } else if (key === 'o') {
        e.preventDefault();
        setIsOptimizeOpen(prev => !prev);
      } else if (key === 'r') {
        e.preventDefault();
        setIsReportOpen(prev => !prev);
      } else if (key === 'e') {
        e.preventDefault();
        setIsExportOpen(prev => !prev);
      } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // undo
        const prevParams = store.getState().legacyParams;
        store.updateLegacyParams(prevParams);
      } else if (key === '1') {
        setMobileTab('params');
      } else if (key === '2') {
        setMobileTab('viewer');
      } else if (key === '3') {
        setMobileTab('results');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleParamChange = (updated: Partial<LegacyWingPayload>) => {
    store.updateLegacyParams(updated);
  };

  const handleApplyBestFromOptimizer = (params: LegacyWingPayload) => {
    store.updateLegacyParams(params);
  };

  const handleOpenInfoSection = (tab: InfoTab) => {
    setInfoModalTab(tab);
  };

  if (viewMode === 'landing') {
    return (
      <div className="flex flex-col min-h-screen w-full bg-ink text-hi">
        <LandingPage onEnterSimulator={() => setViewMode('simulator')} />
        <InfoSectionModal
          isOpen={infoModalTab !== null}
          onClose={() => setInfoModalTab(null)}
          initialTab={infoModalTab || 'quienes-somos'}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-ink text-hi overflow-hidden select-none">
      {/* Fixed Top Navigation Bar */}
      <Header
        org={state.org}
        fidelity={state.prediction?.fidelity}
        currentView="simulator"
        onOpenOptimize={() => setIsOptimizeOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenEnterpriseSecurity={() => setIsEnterpriseSecurityOpen(true)}
        onOpenMarketReadiness={() => setIsMarketReadinessOpen(true)}
        onOpenComparator={() => setIsComparatorOpen(true)}
        onOpenAirfoilDesigner={() => setIsAirfoilDesignerOpen(true)}
        onOpenPolars={() => setIsPolarsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onGoToLanding={() => setViewMode('landing')}
        onOpenInfoSection={handleOpenInfoSection}
        theme={theme}
        onToggleTheme={toggleTheme}
        language={i18n.language}
        onToggleLanguage={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
      />

      {/* Mobile/Tablet Segmented View Bar */}
      <div className="flex lg:hidden items-center justify-around bg-panel border-b border-line px-2 py-1.5 text-xs font-semibold shrink-0">
        <button
          onClick={() => setMobileTab('params')}
          className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
            mobileTab === 'params'
              ? 'chip-active'
              : 'bg-ink text-lo border-line'
          }`}
        >
          Parámetros
        </button>
        <button
          onClick={() => setMobileTab('viewer')}
          className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
            mobileTab === 'viewer'
              ? 'chip-active'
              : 'bg-ink text-lo border-line'
          }`}
        >
          Vista 3D
        </button>
        <button
          onClick={() => setMobileTab('results')}
          className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
            mobileTab === 'results'
              ? 'chip-active'
              : 'bg-ink text-lo border-line'
          }`}
        >
          Resultados
        </button>
      </div>

      {/* Main Simulator Workspace */}
      <div className="flex flex-col lg:flex-row flex-1 h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {/* Left Geometry Controls */}
        <div className={`w-full lg:w-80 shrink-0 h-full overflow-y-auto ${mobileTab === 'params' ? 'block' : 'hidden lg:block'}`}>
          <ParameterPanel params={state.legacyParams} onChange={handleParamChange} />
        </div>

        {/* Center 3D Viewport Stage */}
        <main className={`flex-1 flex flex-col relative h-full min-h-[350px] lg:min-h-0 overflow-hidden ${mobileTab === 'viewer' ? 'flex' : 'hidden lg:flex'}`}>
          <ThreeViewer params={state.legacyParams} />

          {/* Fixed Legal Disclaimer Badge Overlay (Positioned stacked above Wind Tunnel HUD without overlap) */}
          <div className="absolute bottom-16 left-3 max-w-md z-10 pointer-events-auto">
            <LegalDisclaimerBadge compact />
          </div>
        </main>

        {/* Right Performance Results */}
        <div className={`w-full lg:w-80 shrink-0 h-full overflow-y-auto ${mobileTab === 'results' ? 'block' : 'hidden lg:block'}`}>
          {isPredicting ? (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          ) : (
            <ResultsPanel
              prediction={state.prediction}
              params={state.legacyParams}
              onSaveSnapshot={() => store.addSnapshot()}
              onOpenExport={() => setIsExportOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <OptimizationModal
        isOpen={isOptimizeOpen}
        onClose={() => setIsOptimizeOpen(false)}
        onApplyBest={handleApplyBestFromOptimizer}
        currentParams={state.legacyParams}
        isLoading={state.isOptimizing}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        params={state.legacyParams}
        prediction={state.prediction}
        optHistory={state.optHistory}
      />

      <SnapshotsModal
        isOpen={isSnapshotsOpen}
        onClose={() => setIsSnapshotsOpen(false)}
        snapshots={state.snapshots}
        onLoadSnapshot={snap => store.loadSnapshot(snap)}
      />

      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        org={state.org}
        onPlanChange={plan => store.setOrgPlan(plan)}
      />

      <EnterpriseSecurityModal
        isOpen={isEnterpriseSecurityOpen}
        onClose={() => setIsEnterpriseSecurityOpen(false)}
      />

      <MarketReadinessModal
        isOpen={isMarketReadinessOpen}
        onClose={() => setIsMarketReadinessOpen(false)}
      />

      <DesignComparatorModal
        isOpen={isComparatorOpen}
        onClose={() => setIsComparatorOpen(false)}
        currentParams={state.legacyParams}
        currentPrediction={state.prediction}
        onApplyParams={handleParamChange}
      />

      <AirfoilDesignerModal
        isOpen={isAirfoilDesignerOpen}
        onClose={() => setIsAirfoilDesignerOpen(false)}
        currentNaca={state.legacyParams.nacaCode}
        onApplyNaca={nacaCode => handleParamChange({ nacaCode })}
      />

      <PolarsDashboardModal
        isOpen={isPolarsOpen}
        onClose={() => setIsPolarsOpen(false)}
        params={state.legacyParams}
        prediction={state.prediction}
      />

      <ExportDownloadModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        params={state.legacyParams}
        prediction={state.prediction}
        optHistory={state.optHistory}
      />

      <InfoSectionModal
        isOpen={infoModalTab !== null}
        onClose={() => setInfoModalTab(null)}
        initialTab={infoModalTab || 'quienes-somos'}
      />
    </div>
  );
}
