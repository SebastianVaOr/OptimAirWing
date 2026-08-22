import React from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { DesignLoads } from '../../../domains/structural/designLoads';

interface VnDiagramProps {
  loads: DesignLoads;
  compact?: boolean;
}

export const VnDiagram: React.FC<VnDiagramProps> = ({ loads, compact = false }) => {
  const width = compact ? 200 : 320;
  const height = compact ? 150 : 240;
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const V_max = loads.V_NE_m_s * 1.1;
  const n_max = loads.n_limit_positive * 1.3;
  const n_min = loads.n_limit_negative * 1.3;

  const scaleX = (V: number) => margin.left + (V / V_max) * plotW;
  const scaleY = (n: number) => margin.top + plotH / 2 - (n / n_max) * (plotH / 2);

  // Maneuver envelope polygon
  const maneuverPoints = loads.vn_maneuver_envelope
    .map(p => `${scaleX(p.V)},${scaleY(p.n)}`)
    .join(' ');

  // Gust envelope curve
  const gustPoints = loads.vn_gust_envelope
    .map(p => `${scaleX(p.V)},${scaleY(p.n)}`)
    .join(' ');

  // Operating point (V_C, n=1)
  const opX = scaleX(loads.V_C_m_s);
  const opY = scaleY(1);

  return (
    <div className="flex flex-col gap-1.5 bg-panel2 p-3 rounded-lg border border-line">
      <label className="hud-label flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-accent" />
          <span>Diagrama V-n (FAR 23)</span>
        </span>
        {loads.is_far23_compliant ? (
          <span className="text-[9px] text-ok">✓ FAR 23</span>
        ) : (
          <span className="text-[9px] text-bad">✗ Non-compliant</span>
        )}
      </label>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: compact ? 150 : 240 }}>
        {/* Axes */}
        <line x1={margin.left} y1={margin.top + plotH / 2} x2={margin.left + plotW} y2={margin.top + plotH / 2} stroke="#555" strokeWidth="0.5" />
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke="#555" strokeWidth="0.5" />

        {/* Zero line for n */}
        <line x1={margin.left} y1={scaleY(0)} x2={margin.left + plotW} y2={scaleY(0)} stroke="#333" strokeWidth="0.3" strokeDasharray="3,3" />

        {/* n=1 line */}
        <line x1={margin.left} y1={scaleY(1)} x2={margin.left + plotW} y2={scaleY(1)} stroke="#444" strokeWidth="0.3" strokeDasharray="2,2" />

        {/* Maneuver envelope */}
        <polygon
          points={maneuverPoints}
          fill="rgba(0,150,255,0.08)"
          stroke="#0096ff"
          strokeWidth="1.2"
        />

        {/* Gust envelope */}
        <polyline
          points={gustPoints}
          fill="none"
          stroke="#ff9600"
          strokeWidth="1"
          strokeDasharray="4,2"
        />

        {/* V_A line */}
        <line
          x1={scaleX(loads.V_A_m_s)} y1={margin.top}
          x2={scaleX(loads.V_A_m_s)} y2={margin.top + plotH}
          stroke="#666" strokeWidth="0.5" strokeDasharray="2,4"
        />
        <text x={scaleX(loads.V_A_m_s)} y={margin.top + plotH + 12} fill="#888" fontSize="8" textAnchor="middle">V_A</text>

        {/* V_C line */}
        <line
          x1={scaleX(loads.V_C_m_s)} y1={margin.top}
          x2={scaleX(loads.V_C_m_s)} y2={margin.top + plotH}
          stroke="#666" strokeWidth="0.5" strokeDasharray="2,4"
        />
        <text x={scaleX(loads.V_C_m_s)} y={margin.top + plotH + 12} fill="#888" fontSize="8" textAnchor="middle">V_C</text>

        {/* V_D line */}
        <line
          x1={scaleX(loads.V_D_m_s)} y1={margin.top}
          x2={scaleX(loads.V_D_m_s)} y2={margin.top + plotH}
          stroke="#666" strokeWidth="0.5" strokeDasharray="2,4"
        />
        <text x={scaleX(loads.V_D_m_s)} y={margin.top + plotH + 12} fill="#888" fontSize="8" textAnchor="middle">V_D</text>

        {/* Operating point */}
        <circle cx={opX} cy={opY} r="4" fill="#00ff88" stroke="#00cc66" strokeWidth="1" />

        {/* Axis labels */}
        <text x={margin.left + plotW / 2} y={height - 3} fill="#888" fontSize="8" textAnchor="middle">V (m/s)</text>
        <text x={8} y={margin.top + plotH / 2} fill="#888" fontSize="8" textAnchor="middle" transform={`rotate(-90, 8, ${margin.top + plotH / 2})`}>n (g)</text>
      </svg>

      {/* Legend */}
      {!compact && (
        <div className="flex flex-wrap gap-3 text-[9px] text-dim">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500 inline-block" /> Maniobra
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-orange-500 inline-block border-dashed" /> Ráfaga
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block" /> Pto. operativo
          </span>
        </div>
      )}

      {/* Warnings */}
      {loads.warnings.length > 0 && !compact && (
        <div className="flex flex-col gap-1 mt-1">
          {loads.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1 text-[9px] text-warn">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
