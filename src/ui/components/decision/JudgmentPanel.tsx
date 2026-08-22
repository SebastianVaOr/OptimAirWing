import React, { useState } from 'react';
import { store } from '../../../core/store';
import { computeEngineeringJudgment, getVerdictColor, getSeverityColor } from '../../../domains/engineering/judgment';
import { Shield, AlertTriangle, Lightbulb, TrendingUp, Info, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface MetricTooltip {
  field: string;
  formula?: string;
  breakdown?: string;
  uncertainty?: string;
  sources?: string[];
}

const METRIC_TOOLTIPS: Record<string, MetricTooltip> = {
  score: {
    field: 'Engineering Score',
    formula: 'Base 100 - penalties for warnings - structural deficiencies',
    breakdown: 'Critical: -25, High: -10, Medium: -5, Low: -1 per warning',
    uncertainty: '±8% for 95% CI',
    sources: ['FAR-23 certification criteria', 'Raymer aircraft design'],
  },
  rpn: {
    field: 'Risk Priority Number',
    formula: 'Severity (1-10) × Occurrence (1-10) × Detection (1-10)',
    breakdown: 'RPN > 100: Critical | 50-100: High | < 50: Acceptable',
    uncertainty: '95% CI via bootstrap resampling',
    sources: ['FMEA methodology', 'AS/EN 61508'],
  },
  verdict: {
    field: 'Engineering Verdict',
    formula: 'Decision tree: score + warning severity + structural adequacy',
    breakdown: 'Accept (≥80, 0 critical) → Optimize (≥50, <2 critical) → Review',
    uncertainty: 'Confidence varies by data quality',
    sources: ['Expert aerospace judgment', 'Industry standards'],
  },
};

export const JudgmentPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [showTradeoffs, setShowTradeoffs] = useState(false);
  const [tooltipField, setTooltipField] = useState<string | null>(null);
  const appState = store.getState() as any;

  if (!appState.prediction) return null;

  const judgment = computeEngineeringJudgment(
    appState.legacyParams,
    {
      CL: appState.prediction.CL,
      CD: appState.prediction.CD,
      Cm: appState.prediction.Cm,
      LD: appState.prediction.LD,
      S: appState.prediction.S_m2,
      AR: appState.prediction.AR,
      e: appState.prediction.e,
      CD0: (appState.prediction as any).CD0 || 0,
      CDi: (appState.prediction as any).CDi || 0,
      alpha0: 0,
      a: 5.5,
      CL_max: 1.4,
      alpha_stall_deg: 12,
    },
    {
      bendingMomentNm: 500,
      maxStressMpa: 150,
      flexuralSafetyFactor: 1.52,
      safetyFactorCI: [1.38, 1.66],
      tipDeflectionMm: 50,
      tipDeflectionPercent: 1.2,
      divergenceSpeedMs: 85,
      divergenceMargin: 1.8,
      flutterRisk: 'bajo' as const,
      flutterSpeedMs: 120,
      flutterMargin: 2.5,
      aileronReversalRisk: 'bajo' as const,
      wingLoadingKgM2: appState.prediction.weight_kg / appState.prediction.S_m2,
      stallSpeedMs: 15.3,
      cruiseVelocityMs: 50,
    },
    {
      sector: 'uav' as const,
      estimated_weight_kg: appState.prediction.weight_kg,
      material: 'al2024' as const,
      flight_hours: 500,
      max_budget_eur: 5000,
      safety_factor: 1.5,
      maneuver_load_factor_g: 2.5,
    },
    appState.flightConditions
  );

  const verdictColor = getVerdictColor(judgment.verdict);
  const hasCriticalWarnings = judgment.warnings.some((w: any) => w.severity === 'critical');
  const rpnThreshold = judgment.rpn && judgment.rpn > 100;

  const renderTooltip = (field: string) => {
    const tip = METRIC_TOOLTIPS[field];
    if (!tip || tooltipField !== field) return null;
    return (
      <div className="absolute z-50 bg-panel2 border border-line rounded-lg p-3 shadow-xl text-xs w-64 -top-2 right-0">
        <div className="font-bold text-hi mb-1">{tip.field}</div>
        <div className="text-dim mb-2">{tip.formula}</div>
        <div className="bg-ink p-1.5 rounded mb-2 text-[10px] font-mono">{tip.breakdown}</div>
        <div className="text-warn text-[10px]">Incertidumbre: {tip.uncertainty}</div>
        <div className="text-dim text-[9px] mt-2 border-t border-line pt-1">
          Refs: {tip.sources?.join(', ')}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-panel1 rounded-lg border border-line overflow-hidden">
      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-panel2/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${verdictColor}`} />
          <div>
            <h3 className="text-sm font-bold text-hi">Ingeniero Virtual</h3>
            <p className="text-[11px] text-dim">{judgment.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex flex-col items-end">
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${verdictColor}`}>{judgment.score}/100</span>
              <button
                onClick={(e) => { e.stopPropagation(); setTooltipField(tooltipField === 'score' ? null : 'score'); }}
                className="text-dim hover:text-hi transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              {renderTooltip('score')}
            </div>
            {judgment.rpn && (
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-bold ${rpnThreshold ? 'text-danger' : judgment.rpn > 50 ? 'text-warn' : 'text-ok'}`}>
                  RPN: {judgment.rpn}
                  {judgment.rpnCI && ` [${judgment.rpnCI[0]}-${judgment.rpnCI[1]}]`}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setTooltipField(tooltipField === 'rpn' ? null : 'rpn'); }}
                  className="text-dim hover:text-hi transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
                {renderTooltip('rpn')}
              </div>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-line">
          {judgment.warnings.filter((w: any) => w.severity === 'critical').length > 0 && (
            <div className="p-3 bg-danger/10 border-b border-line">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <span className="text-xs font-bold text-danger">CRÍTICO</span>
              </div>
              {judgment.warnings.filter((w: any) => w.severity === 'critical').map((w: any, i: number) => (
                <div key={i} className="mb-2 last:mb-0">
                  <p className="text-xs text-ink">{w.message}</p>
                  <p className="text-[10px] text-dim mt-1">{w.recommendation}</p>
                </div>
              ))}
            </div>
          )}

          <div className="p-3">
            {judgment.warnings.length === 0 ? (
              <p className="text-xs text-ok text-center py-2">✓ Sin advertencias</p>
            ) : (
              <div className="space-y-1.5">
                {judgment.warnings.slice(0, 6).map((w: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${w.severity === 'critical' ? 'bg-danger' : w.severity === 'high' ? 'bg-warn' : 'bg-accent'}`} />
                    <div>
                      <span className={getSeverityColor(w.severity)}>{w.message}</span>
                      <p className="text-[10px] text-dim mt-0.5">{w.technicalContext}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {judgment.suggestions.length > 0 && (
            <div className="p-3 bg-panel2 border-t border-line">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-accent">SUGERENCIAS</span>
              </div>
              <ul className="space-y-1">
                {judgment.suggestions.slice(0, 3).map((s: any, i: number) => (
                  <li key={i} className="text-xs text-lo">
                    <span className="font-semibold">{s.action}</span>
                    <span className="text-dim"> → {s.expectedImpact}</span>
                    <span className="text-[10px] text-warn block">{s.tradeNote}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setShowTradeoffs(!showTradeoffs)}
            className="w-full py-2 flex items-center justify-center gap-2 text-xs text-accent hover:bg-panel2 transition-colors border-t border-line"
          >
            <TrendingUp className="w-4 h-4" />
            {showTradeoffs ? 'Ocultar' : 'Ver'} análisis de trade-offs
          </button>

          {showTradeoffs && judgment.tradeoffs.length > 0 && (
            <div className="p-3 border-t border-line">
              {judgment.tradeoffs.map((t: any, i: number) => (
                <div key={i} className="mb-2 last:mb-0 p-2 bg-panel2 rounded text-xs">
                  <p className="font-semibold text-hi mb-1">{t.description}</p>
                  <p className="text-dim text-[10px]">{t.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JudgmentPanel;