import React from 'react';
import {
  Plane, BarChart3, Zap, FileText, Bookmark, Settings,
  GitCompare, Sun, Moon, Globe, Download,
} from 'lucide-react';
import { OrganizationInfo } from '../core/types';
import { InfoTab } from './InfoSectionModal';
import { Chip } from './primitives/Chip';
import { Badge } from './primitives/Badge';

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
  const planVariant = org.plan === 'enterprise' ? 'accent' : org.plan === 'professional' ? 'accent' : 'default';

  return (
    <header className="sticky top-0 z-40 bg-ink/90 backdrop-blur-lg border-b border-line px-3 sm:px-4 py-2 flex items-center justify-between gap-2 select-none">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center hud-bracket">
          <Plane className="w-4 h-4 text-accent" aria-hidden="true" />
        </div>
        <span className="font-display font-bold text-sm text-hi tracking-tight hidden sm:inline">OptimAirWing</span>
        {fidelity && (
          <Badge variant="accent" className="hidden lg:inline-flex text-[9px]">
            {fidelity}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
        <Chip onClick={onOpenOptimize} icon={Zap} aria-label="Optimizar">
          <span className="hidden sm:inline">Optimizar</span>
        </Chip>
        <Chip onClick={onOpenReport} icon={FileText} aria-label="Reporte PDF">
          <span className="hidden sm:inline">Reporte</span>
        </Chip>
        <Chip onClick={onOpenSnapshots} icon={Bookmark} aria-label="Guardar instantánea">
          <span className="hidden sm:inline">Guardar</span>
        </Chip>
        <Chip onClick={onOpenComparator} icon={GitCompare} aria-label="Comparar diseños">
          <span className="hidden sm:inline">Comparar</span>
        </Chip>
        <Chip onClick={onOpenPolars} icon={BarChart3} aria-label="Curvas polares">
          <span className="hidden sm:inline">Polares</span>
        </Chip>
        <Chip onClick={onOpenExport} icon={Download} aria-label="Exportar">
          <span className="hidden sm:inline">Exportar</span>
        </Chip>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-panel border border-line">
          <Badge variant={planVariant}>{org.plan}</Badge>
          <span className="text-[11px] text-dim font-mono">{org.monthly_predictions_used}/{org.monthly_predictions_limit}</span>
        </div>

        {onToggleTheme && (
          <Chip
            onClick={onToggleTheme}
            icon={theme === 'dark' ? Sun : Moon}
            aria-label="Cambiar tema"
          />
        )}

        {onToggleLanguage && (
          <Chip onClick={onToggleLanguage} icon={Globe} aria-label="Cambiar idioma">
            <span className="uppercase text-[11px] font-bold">{language}</span>
          </Chip>
        )}

        <Chip onClick={onOpenAdmin} icon={Settings} aria-label="Panel de administración" />

        {onGoToLanding && (
          <Chip onClick={onGoToLanding} icon={Plane} aria-label="Ir al inicio">
            <span className="hidden sm:inline text-[11px]">Inicio</span>
          </Chip>
        )}
      </div>
    </header>
  );
};
