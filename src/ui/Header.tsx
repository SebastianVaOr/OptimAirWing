import React from 'react';
import {
  Plane, BarChart3, Zap, FileText, Bookmark, Settings, Award,
  GitCompare, Sliders, Sun, Moon, Globe, Download,
} from 'lucide-react';
import { OrganizationInfo } from '../core/types';
import { InfoTab } from './InfoSectionModal';

interface HeaderProps {
  org: OrganizationInfo;
  fidelity?: string;
  currentView?: 'landing' | 'simulator';
  onOpenOptimize: () => void;
  onOpenReport: () => void;
  onOpenSnapshots: () => void;
  onOpenAdmin: () => void;
  onOpenEnterpriseSecurity?: () => void;
  onOpenMarketReadiness?: () => void;
  onGoToLanding?: () => void;
  onOpenInfoSection?: (tab: InfoTab) => void;
  onOpenComparator?: () => void;
  onOpenAirfoilDesigner?: () => void;
  onOpenPolars?: () => void;
  onOpenExport?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  language?: string;
  onToggleLanguage?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  org, fidelity = 'empirical', currentView = 'simulator',
  onOpenOptimize, onOpenReport, onOpenSnapshots, onOpenAdmin,
  onGoToLanding, theme = 'dark', onToggleTheme, language = 'es', onToggleLanguage,
  onOpenComparator, onOpenPolars, onOpenExport,
}) => {
  const planDot = org.plan === 'enterprise' ? 'bg-[#67e8f9]' : org.plan === 'professional' ? 'bg-[#22d3ee]' : 'bg-[#5b6f8c]';

  return (
    <header className="sticky top-0 z-40 bg-[#05070c]/90 backdrop-blur-lg border-b border-[#16202f] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-[#22d3ee]/10 border border-[#22d3ee]/30 flex items-center justify-center hud-bracket">
          <Plane className="w-4 h-4 text-[#22d3ee]" />
        </div>
        <span className="font-display font-bold text-sm text-[#e8f1fb] tracking-tight hidden sm:inline">OptimAirWing</span>
        {fidelity && (
          <span className="hidden lg:inline-flex hud-label text-[9px] px-1.5 py-0.5 rounded bg-[#0e1624] border border-[#16202f] text-[#67e8f9]">
            {fidelity}
          </span>
        )}
      </div>

      {/* Center actions */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
        <button onClick={onOpenOptimize} className="chip" title="Optimizar (O)">
          <Zap className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span className="hidden sm:inline">Optimizar</span>
        </button>
        <button onClick={onOpenReport} className="chip" title="Reporte PDF (R)">
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reporte</span>
        </button>
        <button onClick={onOpenSnapshots} className="chip" title="Instantáneas (G)">
          <Bookmark className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Guardar</span>
        </button>
        <button onClick={onOpenComparator} className="chip" title="Comparar">
          <GitCompare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Comparar</span>
        </button>
        <button onClick={onOpenPolars} className="chip" title="Curvas polares">
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Polares</span>
        </button>
        <button onClick={onOpenExport} className="chip" title="Exportar (E)">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Plan badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0a0f18] border border-[#16202f]">
          <div className={`w-1.5 h-1.5 rounded-full ${planDot}`} />
          <span className="text-[11px] font-semibold text-[#8ea3bd] uppercase tracking-wider">{org.plan}</span>
          <span className="text-[11px] text-[#5b6f8c] font-mono">{org.monthly_predictions_used}/{org.monthly_predictions_limit}</span>
        </div>

        {/* Theme */}
        {onToggleTheme && (
          <button onClick={onToggleTheme} className="chip" title="Cambiar tema">
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Language */}
        {onToggleLanguage && (
          <button onClick={onToggleLanguage} className="chip" title="Idioma">
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase text-[11px] font-bold">{language}</span>
          </button>
        )}

        {/* Admin */}
        <button onClick={onOpenAdmin} className="chip" title="Admin">
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Landing */}
        {onGoToLanding && (
          <button onClick={onGoToLanding} className="chip" title="Inicio">
            <Plane className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Inicio</span>
          </button>
        )}
      </div>
    </header>
  );
};
