import React, { useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingDown, HelpCircle } from 'lucide-react';
import { store } from '../../../core/store';
import { computeEngineeringJudgment } from '../../../domains/engineering/judgment';
import { computeFMEA, getRPNSeverityColor, getRPNSeverityLabel } from '../../../domains/certification/fmea';

export const CertificationDashboard: React.FC = () => {
  const appState = store.getState() as any;

  if (!appState.prediction) return null;

  const structural = {
    bendingMomentNm: 500,
    maxStressMpa: 150,
    flexuralSafetyFactor: 1.52,
    safetyFactorCI: [1.38, 1.66] as [number, number],
    tipDeflectionMm: 50,
    tipDeflectionPercent: 1.2,
    divergenceSpeedMs: 85,
    divergenceMargin: 1.8,
    flutterRisk: 'bajo' as const,
    flutterSpeedMs: 120,
    flutterMargin: 2.5,
    aileronReversalRisk: 'bajo' as const,
    wingLoadingKgM2: (appState.prediction.weight_kg || 800) / appState.prediction.S_m2,
    stallSpeedMs: 15.3,
    cruiseVelocityMs: 50,
  };

  const requirements = {
    sector: 'uav' as const,
    estimated_weight_kg: appState.prediction.weight_kg || 800,
    material: 'al2024' as const,
    flight_hours: 500,
    max_budget_eur: 5000,
    safety_factor: 1.5,
    maneuver_load_factor_g: 2.5,
  };

  const judgment = useMemo(() => 
    computeEngineeringJudgment(
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
      structural,
      requirements,
      appState.flightConditions
    ),
    [appState.legacyParams, appState.prediction, appState.flightConditions]
  );

  const fmea = useMemo(() => 
    computeFMEA(appState.legacyParams, structural, requirements),
    [appState.legacyParams, structural]
  );

  const riskLevel = fmea.overallRisk === 'critical' ? 'CRÍTICO' : 
                    fmea.overallRisk === 'high' ? 'ALTO' : 
                    fmea.overallRisk === 'medium' ? 'MEDIO' : 'BAJO';

  const riskColor = fmea.overallRisk === 'critical' ? 'text-danger' : 
                     fmea.overallRisk === 'high' ? 'text-warn' : 
                     fmea.overallRisk === 'medium' ? 'text-accent' : 'text-ok';

  return (
    <div className="bg-panel1 rounded-lg border border-line p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-bold text-hi">Certificación & Riesgo</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs font-bold ${riskColor}`}>{riskLevel}</span>
          <span className="text-[10px] text-dim">| RPN máx: {fmea.maxRPN}</span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-panel2 p-2 rounded text-center">
          <div className="text-lg font-bold text-ok">{10 - fmea.criticalCount - fmea.highCount}</div>
          <div className="text-[10px] text-dim">Aceptables</div>
        </div>
        <div className="bg-panel2 p-2 rounded text-center">
          <div className="text-lg font-bold text-warn">{fmea.highCount}</div>
          <div className="text-[10px] text-dim">Altos</div>
        </div>
        <div className="bg-panel2 p-2 rounded text-center">
          <div className="text-lg font-bold text-danger">{fmea.criticalCount}</div>
          <div className="text-[10px] text-dim">Críticos</div>
        </div>
        <div className="bg-panel2 p-2 rounded text-center">
          <div className="text-lg font-bold text-accent">{fmea.avgRPN.toFixed(0)}</div>
          <div className="text-[10px] text-dim">RPN Prom</div>
        </div>
      </div>

      {/* Structural Summary */}
      <div className="bg-panel2 p-2 rounded mb-3">
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-dim">FS (95% CI):</span>
            <span className={`font-bold ${structural.flexuralSafetyFactor >= requirements.safety_factor ? 'text-ok' : 'text-warn'}`}>
              {structural.flexuralSafetyFactor.toFixed(2)} [{structural.safetyFactorCI[0].toFixed(2)}, {structural.safetyFactorCI[1].toFixed(2)}]
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">V_stall:</span>
            <span className="text-hi">{structural.stallSpeedMs.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">Margen divergencia:</span>
            <span className={`font-bold ${structural.divergenceMargin >= 1.5 ? 'text-ok' : 'text-warn'}`}>
              {structural.divergenceMargin.toFixed(2)}x
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">Flutter:</span>
            <span className={`font-bold ${structural.flutterRisk === 'bajo' ? 'text-ok' : structural.flutterRisk === 'medio' ? 'text-warn' : 'text-danger'}`}>
              {structural.flutterRisk.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* FMEA Table */}
      <div className="mb-3">
        <h4 className="text-xs font-bold text-hi mb-2">Análisis FMEA</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left text-dim py-1">Componente</th>
                <th className="text-left text-dim py-1">Modo de Fallo</th>
                <th className="text-center text-dim py-1">S</th>
                <th className="text-center text-dim py-1">O</th>
                <th className="text-center text-dim py-1">D</th>
                <th className="text-center text-dim py-1">RPN</th>
              </tr>
            </thead>
            <tbody>
              {fmea.items.slice(0, 6).map((item, i) => (
                <tr key={i} className="border-b border-line/50">
                  <td className="py-1 text-hi">{item.component}</td>
                  <td className="py-1 text-lo">{item.failureMode.slice(0, 25)}...</td>
                  <td className="py-1 text-center">{item.severity}</td>
                  <td className="py-1 text-center">{item.occurrence}</td>
                  <td className="py-1 text-center">{item.detection}</td>
                  <td className={`py-1 text-center font-bold ${getRPNSeverityColor(item.rpn)}`}>
                    {item.rpn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Items */}
      {fmea.criticalCount > 0 && (
        <div className="mb-3 bg-danger/10 p-2 rounded border border-danger/30">
          <div className="flex items-center gap-1 mb-2">
            <XCircle className="w-3 h-3 text-danger" />
            <span className="text-xs font-bold text-danger">Elementos Críticos (RPN &gt; 100)</span>
          </div>
          {fmea.items.filter(i => i.rpn > 100).slice(0, 3).map((item, i) => (
            <div key={i} className="mb-1 last:mb-0">
              <div className="text-[10px] font-semibold text-hi">{item.component}</div>
              <div className="text-[10px] text-lo">{item.mitigation}</div>
              {item.farReference && (
                <div className="text-[9px] text-dim">Ref: {item.farReference}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Certification Status */}
      <div className={`p-2 rounded flex items-center justify-between ${
        fmea.certificationStatus === 'pass' ? 'bg-ok/20 border border-ok/50' :
        fmea.certificationStatus === 'conditional' ? 'bg-warn/20 border border-warn/50' :
        'bg-danger/20 border border-danger/50'
      }`}>
        <div className="flex items-center gap-2">
          {fmea.certificationStatus === 'pass' ? (
            <CheckCircle className="w-4 h-4 text-ok" />
          ) : fmea.certificationStatus === 'conditional' ? (
            <AlertTriangle className="w-4 h-4 text-warn" />
          ) : (
            <XCircle className="w-4 h-4 text-danger" />
          )}
          <span className="text-xs font-bold">
            Estado: {fmea.certificationStatus === 'pass' ? 'APTO' : 
                     fmea.certificationStatus === 'conditional' ? 'CONDICIONAL' : 'NO APTO'}
          </span>
        </div>
        <span className="text-[10px] text-dim">FAR-23</span>
      </div>

      {/* Recommendations */}
      {fmea.recommendations.length > 0 && (
        <div className="mt-3 p-2 bg-accent/10 border border-accent/30 rounded">
          <h4 className="text-xs font-bold text-accent mb-1">Recomendaciones</h4>
          <ul className="space-y-1">
            {fmea.recommendations.map((r, i) => (
              <li key={i} className="text-[10px] text-lo flex items-start gap-1">
                <span className="text-accent">→</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CertificationDashboard;
