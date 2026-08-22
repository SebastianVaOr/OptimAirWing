import React, { useState, useMemo } from 'react';
import { RefreshCw, ChevronRight, AlertCircle, BarChart2 } from 'lucide-react';
import { computeSecondOpinion, REFERENCE_DESIGNS, ReferenceDesign } from '../../../domains/validation/secondOpinion';
import { REFERENCE_AIRCRAFT, AircraftReference } from '../../../domains/validation/referenceAircraft';
import { store } from '../../../core/store';

export const SecondOpinionPanel: React.FC = () => {
  const appState = store.getState();
  const [selectedRef, setSelectedRef] = useState<string>('cessna172');
  const [showComparison, setShowComparison] = useState(false);

  if (!appState.prediction) return null;

  const legacyReference = REFERENCE_DESIGNS[selectedRef];
  const certifiedReference = REFERENCE_AIRCRAFT[selectedRef] as AircraftReference | undefined;
  const opinion = useMemo(() => computeSecondOpinion(appState.legacyParams, selectedRef), [appState.legacyParams, selectedRef]);

  const yourLD = appState.prediction.LD;
  const yourAR = appState.prediction.AR;
  const yourSpan = appState.legacyParams.b;
  const yourWeight = appState.prediction.weight_kg || 800;
  const yourS = appState.prediction.S_m2;

  const refLD = certifiedReference?.performance.L_D_cruise || legacyReference.L_D;
  const refAR = certifiedReference?.specifications.aspect_ratio || (legacyReference.span ** 2 / ((legacyReference.span / 2) * (legacyReference.Cr + legacyReference.Ct)));
  const refSpan = certifiedReference?.specifications.wingspan_m || legacyReference.span;
  const refWeight = certifiedReference?.structural.MTOW_kg || legacyReference.weight;
  const refS = certifiedReference?.specifications.wing_area_m2 || ((legacyReference.span / 2) * (legacyReference.Cr + legacyReference.Ct));

  const comparisonMetrics = [
    { 
      label: 'L/D', 
      your: yourLD, 
      ref: refLD, 
      unit: '', 
      higherIsBetter: true,
      format: (v: number) => v.toFixed(1) 
    },
    { 
      label: 'AR', 
      your: yourAR, 
      ref: refAR, 
      unit: '', 
      higherIsBetter: true,
      format: (v: number) => v.toFixed(1) 
    },
    { 
      label: 'Span', 
      your: yourSpan, 
      ref: refSpan, 
      unit: 'm', 
      higherIsBetter: false,
      format: (v: number) => v.toFixed(1) 
    },
    { 
      label: 'Wing Area', 
      your: yourS, 
      ref: refS, 
      unit: 'm²', 
      higherIsBetter: false,
      format: (v: number) => v.toFixed(1) 
    },
    { 
      label: 'MTOW', 
      your: yourWeight, 
      ref: refWeight, 
      unit: 'kg', 
      higherIsBetter: false,
      format: (v: number) => v.toFixed(0) 
    },
  ];

  const getBarWidth = (your: number, ref: number, higherIsBetter: boolean) => {
    const maxVal = Math.max(your, ref) * 1.2;
    const yourWidth = (your / maxVal) * 100;
    const refWidth = (ref / maxVal) * 100;
    return { yourWidth, refWidth };
  };

  return (
    <div className="bg-panel1 rounded-lg border border-line p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-bold text-hi">Segunda Opinión</h3>
        </div>
        <select
          value={selectedRef}
          onChange={(e) => setSelectedRef(e.target.value)}
          className="bg-ink border border-line rounded px-1.5 py-0.5 text-[10px] text-hi focus:outline-none"
        >
          {Object.entries(REFERENCE_DESIGNS).map(([key, ref]) => (
            <option key={key} value={key}>{ref.name}</option>
          ))}
        </select>
      </div>

      {/* Reference Info */}
      <div className="bg-panel2 p-2 rounded text-xs mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-hi">{(legacyReference as ReferenceDesign).name}</span>
          <span className="text-dim">{(legacyReference as ReferenceDesign).category}</span>
        </div>
        <p className="text-dim text-[10px] italic">"{(legacyReference as ReferenceDesign).notes}"</p>
        {certifiedReference && (
          <div className="mt-1 text-[9px] text-dim">
            Certificación: {certifiedReference.certification} | Fuentes: {certifiedReference.sources.length} refs
          </div>
        )}
      </div>

      {/* Comparison Table with Bars */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-2">
          <BarChart2 className="w-3 h-3 text-accent" />
          <span className="text-xs font-bold text-hi">Comparativa</span>
        </div>
        
        <div className="space-y-2">
          {comparisonMetrics.map((metric, i) => {
            const { yourWidth, refWidth } = getBarWidth(metric.your, metric.ref, metric.higherIsBetter);
            const diffPct = ((metric.your - metric.ref) / metric.ref) * 100;
            const isBetter = metric.higherIsBetter ? metric.your > metric.ref : metric.your < metric.ref;
            
            return (
              <div key={i} className="text-[10px]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-dim w-16">{metric.label}</span>
                  <span className={`font-bold ${isBetter ? 'text-ok' : diffPct === 0 ? 'text-hi' : 'text-warn'}`}>
                    {metric.format(metric.your)} {metric.unit}
                  </span>
                  <span className="text-dim">
                    vs {metric.format(metric.ref)} {metric.unit}
                  </span>
                </div>
                <div className="flex gap-1 h-1.5">
                  <div className="flex-1 bg-ink rounded overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-300" 
                      style={{ width: `${yourWidth}%` }} 
                    />
                  </div>
                  <div className="flex-1 bg-ink rounded overflow-hidden">
                    <div 
                      className="h-full bg-panel2 transition-all duration-300" 
                      style={{ width: `${refWidth}%` }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] text-dim mb-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-accent" />
          <span>Tu diseño</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-panel2 border border-line" />
          <span>Referencia</span>
        </div>
      </div>

      {/* Analysis */}
      <div className="mt-3">
        <h4 className="text-xs font-bold text-hi mb-1">Análisis</h4>
        <p className="text-xs text-lo leading-relaxed">{opinion.analysis}</p>
      </div>

      {/* Warnings */}
      {opinion.warnings.length > 0 && (
        <div className="mt-3 bg-danger/10 p-2 rounded">
          <div className="flex items-center gap-1 text-xs font-bold text-danger mb-1">
            <AlertCircle className="w-3 h-3" />
            Advertencias
          </div>
          <ul className="space-y-1">
            {opinion.warnings.map((w: string, i: number) => (
              <li key={i} className="text-[10px] text-lo">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="mt-3">
        <h4 className="text-xs font-bold text-hi mb-1">Recomendaciones</h4>
        <ul className="space-y-1">
          {opinion.recommendations.map((r: string, i: number) => (
            <li key={i} className="flex items-start gap-1.5 text-[10px] text-lo">
              <span className="text-accent">→</span>
              {r}
            </li>
          ))}
          {opinion.recommendations.length === 0 && (
            <li className="text-[10px] text-ok">✓ No hay recomendaciones críticas</li>
          )}
        </ul>
      </div>

      {/* Certification Context */}
      {certifiedReference && (
        <div className="mt-3 p-2 bg-accent/10 border border-accent/30 rounded">
          <h4 className="text-xs font-bold text-accent mb-1">Contexto de Certificación</h4>
          <div className="text-[10px] text-lo space-y-0.5">
            <div>• Este diseño fue certificado bajo {certifiedReference.certification}</div>
            <div>• FS requerido: {certifiedReference.structural.safety_factor}</div>
            <div>• L/D certificado: {certifiedReference.performance.L_D_max} (max) / {certifiedReference.performance.L_D_cruise} (crucero)</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecondOpinionPanel;
