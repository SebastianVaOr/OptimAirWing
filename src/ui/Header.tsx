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

const btnBase = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200';

const actionBtn = (active = false) =>
  `${btnBase} border ${
    active
      ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]'
      : 'bg-[#111827] border-[#1e293b] text-[#94a3b8] hover:border-[#3b82f6]/30 hover:text-white'
  }`;

export const Header: React.FC<HeaderProps> = ({
  org, fidelity = 'empirical', currentView = 'simulator',
  onOpenOptimize, onOpenReport, onOpenSnapshots, onOpenAdmin,
  onGoToLanding, theme = 'dark', onToggleTheme, language = 'es', onToggleLanguage,
  onOpenComparator, onOpenPolars, onOpenExport,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/90 backdrop-blur-lg border-b border-[#1e293b] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center shadow-sm">
          <Plane className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm text-white tracking-tight hidden sm:inline">OptimAirWing</span>
      </div>

      {/* Center actions */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
        <button onClick={onOpenOptimize} className={actionBtn()} title="Optimizar (O)">
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Optimizar</span>
        </button>
        <button onClick={onOpenReport} className={actionBtn()} title="Reporte PDF (R)">
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reporte</span>
        </button>
        <button onClick={onOpenSnapshots} className={actionBtn()} title="Instantáneas (G)">
          <Bookmark className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Guardar</span>
        </button>
        <button onClick={onOpenComparator} className={actionBtn()} title="Comparar">
          <GitCompare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Comparar</span>
        </button>
        <button onClick={onOpenPolars} className={actionBtn()} title="Curvas polares">
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Polares</span>
        </button>
        <button onClick={onOpenExport} className={actionBtn()} title="Exportar (E)">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Plan badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111827] border border-[#1e293b]">
          <div className={`w-1.5 h-1.5 rounded-full ${org.plan === 'enterprise' ? 'bg-[#6366f1]' : org.plan === 'professional' ? 'bg-[#3b82f6]' : 'bg-[#64748b]'}`} />
          <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">{org.plan}</span>
          <span className="text-[11px] text-[#64748b] font-mono">{org.monthly_predictions_used}/{org.monthly_predictions_limit}</span>
        </div>

        {/* Theme */}
        {onToggleTheme && (
          <button onClick={onToggleTheme} className={`${btnBase} bg-[#111827] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#3b82f6]/30`} title="Cambiar tema">
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Language */}
        {onToggleLanguage && (
          <button onClick={onToggleLanguage} className={`${btnBase} bg-[#111827] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#3b82f6]/30 font-bold`} title="Idioma">
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase text-[11px]">{language}</span>
          </button>
        )}

        {/* Admin */}
        <button onClick={onOpenAdmin} className={`${btnBase} bg-[#111827] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#3b82f6]/30`} title="Admin">
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Landing */}
        {onGoToLanding && (
          <button onClick={onGoToLanding} className={`${btnBase} bg-[#111827] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#3b82f6]/30`} title="Inicio">
            <Plane className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Inicio</span>
          </button>
        )}
      </div>
    </header>
  );
};
