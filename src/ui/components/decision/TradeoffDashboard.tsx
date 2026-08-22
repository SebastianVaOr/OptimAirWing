import React, { useState, useMemo } from 'react';
import { store } from '../../../core/store';
import { computeTradeoffs } from '../../../domains/optimization/tradeoffs';
import { TrendingUp, TrendingDown, Target, BarChart3, Info, Sliders } from 'lucide-react';

export const TradeoffDashboard: React.FC = () => {
  const appState = store.getState() as any;
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [objectiveX, setObjectiveX] = useState<'weight' | 'cost'>('weight');
  const [objectiveY, setObjectiveY] = useState<'L_D' | 'CL_max'>('L_D');
  const [weightBias, setWeightBias] = useState(0.5);
  const [ldBias, setLdBias] = useState(0.5);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const result = useMemo(() => 
    computeTradeoffs(appState.legacyParams, appState.flightConditions, 200),
    [appState.legacyParams, appState.flightConditions]
  );

  if (!appState.prediction) return null;

  const { paretoFront, interiorPoints, sensitivity, yourDesignPosition } = result;
  const yourLD = appState.prediction.LD;
  const yourWeight = appState.prediction.weight_kg;

  // Scale functions for chart
  const getX = (d: any) => objectiveX === 'weight' ? d.objectives.weight_kg : d.objectives.cost_eur;
  const getY = (d: any) => objectiveY === 'L_D' ? d.objectives.L_D : d.objectives.CL_max;
  const yourX = objectiveX === 'weight' ? yourWeight : 4200;
  const yourY = objectiveY === 'L_D' ? yourLD : 1.4;

  const allPoints = [...paretoFront, ...interiorPoints];
  const xValues = allPoints.map(getX);
  const yValues = allPoints.map(getY);
  const xMin = Math.min(...xValues) * 0.95;
  const xMax = Math.max(...xValues) * 1.05;
  const yMin = Math.min(...yValues) * 0.9;
  const yMax = Math.max(...yValues) * 1.05;

  const scaleX = (val: number) => ((val - xMin) / (xMax - xMin)) * 280;
  const scaleY = (val: number) => 180 - ((val - yMin) / (yMax - yMin)) * 180;

  return (
    <div className="bg-panel1 rounded-lg border border-line p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-bold text-hi">Análisis de Trade-offs</h3>
        </div>
        <button onClick={() => setShowSensitivity(!showSensitivity)} className="text-xs text-accent hover:underline flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {showSensitivity ? 'Ocultar' : 'Ver'} sensibilidad
        </button>
      </div>

      {/* Your position summary */}
      <div className="bg-panel2 p-2 rounded mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-lo">Tu diseño:</span>
          <span className={yourDesignPosition.isParetoOptimal ? 'text-ok font-bold' : 'text-warn'}>
            {yourDesignPosition.isParetoOptimal ? '✓ En frontera de Pareto' : `A ${(yourDesignPosition.distanceToFront * 100).toFixed(0)}% de la frontera`}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-dim">Percentil L/D:</span>
          <span className="text-hi">{yourDesignPosition.percentileRank}°</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative bg-ink rounded-lg p-2 mb-3" style={{ width: '320px', height: '220px' }}>
        <svg width="312" height="200" className="overflow-visible">
          {/* Grid */}
          <line x1="0" y1="200" x2="312" y2="200" stroke="#333" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="200" stroke="#333" strokeWidth="1" />

          {/* Pareto front */}
          {paretoFront.sort((a: any, b: any) => getX(a) - getX(b)).map((d: any, i: number) => {
            if (i === 0) return null;
            const prev = paretoFront.sort((a: any, b: any) => getX(a) - getX(b))[i - 1];
            return (
              <React.Fragment key={i}>
                <line x1={32 + scaleX(getX(prev))} y1={20 + scaleY(getY(prev))} x2={32 + scaleX(getX(d))} y2={20 + scaleY(getY(d))} stroke="#22c55e" strokeWidth="2" />
                <circle cx={32 + scaleX(getX(d))} cy={20 + scaleY(getY(d))} r="3" fill="#22c55e" />
              </React.Fragment>
            );
          })}
          {paretoFront.length > 0 && <circle cx={32 + scaleX(getX(paretoFront[0]))} cy={20 + scaleY(getY(paretoFront[0]))} r="3" fill="#22c55e" />}

          {/* Interior points */}
          {interiorPoints.map((d: any, i: number) => (
            <circle key={i} cx={32 + scaleX(getX(d))} cy={20 + scaleY(getY(d))} r="2" fill="#6366f1" opacity="0.4" />
          ))}

          {/* Your design */}
          <circle cx={32 + scaleX(yourX)} cy={20 + scaleY(yourY)} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
          <text x={32 + scaleX(yourX)} y={20 + scaleY(yourY) - 10} textAnchor="middle" fill="#fff" fontSize="10">TU DISEÑO</text>
        </svg>

        {/* Axis labels */}
        <div className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-dim">{objectiveX === 'weight' ? 'Peso (kg)' : 'Coste (€)'}</div>
        <div className="absolute top-0 left-1 text-[10px] text-dim rotate-90 origin-left" style={{ left: '-8px', top: '50%' }}>{objectiveY === 'L_D' ? 'L/D' : 'CL_max'}</div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs mb-3">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-dim">Frontera de Pareto</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500/40" /><span className="text-dim">Diseños dominados</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-dim">Tu diseño</span></div>
      </div>

      {/* Sensitivity panel */}
      {showSensitivity && (
        <div className="bg-panel2 rounded p-2">
          <h4 className="text-xs font-bold text-hi mb-2">Sensibilidad de parámetros</h4>
          <div className="space-y-1">
            {sensitivity.slice(0, 5).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-dim">{s.parameter}</span>
                <div className="flex-1 h-1.5 bg-ink rounded overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${Math.min(s.impact_L_D * 10, 100)}%` }} />
                </div>
                <span className="w-8 text-right text-accent">{s.impact_L_D.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-dim mt-2">↑ Impacto en L/D para ±10% cambio en parámetro</p>
        </div>
      )}
    </div>
  );
};

export default TradeoffDashboard;