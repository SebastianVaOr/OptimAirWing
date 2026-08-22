import React from 'react';
import { Gauge, Wind, Cloud, AlertTriangle, CheckCircle } from 'lucide-react';
import { FlightConditions } from '../../../domains/flight/conditions';

interface DerivedSpeedsPanelProps {
  conditions: FlightConditions;
}

export const DerivedSpeedsPanel: React.FC<DerivedSpeedsPanelProps> = ({ conditions }) => {
  const V = conditions.velocity_m_s;
  const Vstall = conditions.V_stall_m_s;
  const margin = Vstall > 0 ? (V / Vstall - 1) * 100 : 0;
  const isCloseToStall = margin < 30;

  return (
    <div className="flex flex-col gap-2 bg-panel2 p-3 rounded-lg border border-line">
      <label className="hud-label flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-accent" />
          <span>Condiciones de Vuelo</span>
        </span>
        <span className="text-[9px] text-dim">ISA</span>
      </label>

      {/* ISA Properties */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-dim">ρ (densidad)</span>
          <span className="text-lo font-mono">{conditions.isa.density_kg_m3.toFixed(3)} kg/m³</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">a (sonido)</span>
          <span className="text-lo font-mono">{conditions.isa.speedOfSound_m_s.toFixed(0)} m/s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">q (presión din.)</span>
          <span className="text-lo font-mono">{conditions.dynamicPressure_Pa.toFixed(0)} Pa</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">Reynolds</span>
          <span className="text-lo font-mono">{(conditions.reynolds_number / 1e6).toFixed(1)}×10⁶</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">Mach</span>
          <span className="text-lo font-mono">{conditions.mach_number.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">Carga alar</span>
          <span className="text-lo font-mono">{conditions.wingLoading_kg_m2.toFixed(1)} kg/m²</span>
        </div>
      </div>

      {/* Derived Extreme Speeds */}
      <div className="border-t border-line pt-2">
        <div className="text-[9px] font-semibold text-dim mb-1">PUNTOS EXTREMOS (Diseño Estructural)</div>
        <div className="flex flex-col gap-1 text-[10px]">
          <div className="flex justify-between items-center">
            <span className="text-dim">V_stall</span>
            <span className="font-mono text-warn">{Vstall.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-dim">V_crucero</span>
            <span className="font-mono text-ok">{V.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-dim">V_ráfaga (1.5×)</span>
            <span className="font-mono text-accent">{conditions.V_gust_m_s.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-dim">V_buceo (2.0×)</span>
            <span className="font-mono text-bad">{conditions.V_dive_m_s.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-dim">V_flutter (2.4×)</span>
            <span className="font-mono text-dim">{conditions.V_flutter_limit_m_s.toFixed(1)} m/s</span>
          </div>
        </div>
      </div>

      {/* Stall margin */}
      <div className="border-t border-line pt-2">
        <div className="flex items-center gap-1.5">
          {isCloseToStall ? (
            <AlertTriangle className="w-3 h-3 text-warn" />
          ) : (
            <CheckCircle className="w-3 h-3 text-ok" />
          )}
          <span className={`text-[10px] ${isCloseToStall ? 'text-warn' : 'text-ok'}`}>
            Margen sobre stall: {margin.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Gust load factor */}
      <div className="border-t border-line pt-2">
        <div className="text-[9px] font-semibold text-dim mb-1">FACTOR DE CARGA POR RÁFAGA</div>
        <div className="flex justify-between text-[10px]">
          <span className="text-dim">n_gust</span>
          <span className="font-mono text-ok">
            {conditions.n_gust.toFixed(2)} g
          </span>
        </div>
      </div>
    </div>
  );
};
