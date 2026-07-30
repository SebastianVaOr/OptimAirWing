import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Sliders,
  Download,
  Activity,
  Layers,
  Award,
  FileCode,
  Flame,
  BarChart2,
  Table,
  Zap,
  TrendingUp,
  FileText
} from 'lucide-react';
import { store, AppState } from '../core/store';
import {
  runWindTunnelValidation,
  computeParameterSensitivity,
  generateSTEPFileContent,
  generateSolidWorksPythonScript,
  computeFatigueLife,
  KNOWN_INDUSTRY_WINGS,
  ValidationReport,
  SensitivityItem,
  FatigueAnalysisResult
} from '../domains/marketReadiness';

interface MarketReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketReadinessModal: React.FC<MarketReadinessModalProps> = ({ isOpen, onClose }) => {
  const [appState, setAppState] = useState<AppState>(store.getState());
  const [activeTab, setActiveTab] = useState<'validation' | 'sensitivity' | 'cad' | 'fatigue' | 'benchmarks'>('validation');

  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [sensitivityData, setSensitivityData] = useState<SensitivityItem[]>([]);
  const [fatigueReport, setFatigueReport] = useState<FatigueAnalysisResult | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState('CFRP Carbon Fiber High-Modulus');

  useEffect(() => {
    const unsub = store.subscribe(s => setAppState(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (appState.prediction) {
      const vReport = runWindTunnelValidation(appState.legacyParams, appState.prediction, appState.selectedVehicle);
      setValidationReport(vReport);

      const sData = computeParameterSensitivity(appState.legacyParams, appState.prediction, appState.selectedVehicle, appState.f1Params);
      setSensitivityData(sData);

      const fReport = computeFatigueLife(appState.legacyParams, appState.prediction, selectedMaterial);
      setFatigueReport(fReport);
    }
  }, [appState.legacyParams, appState.prediction, appState.selectedVehicle, appState.f1Params, selectedMaterial]);

  if (!isOpen) return null;

  const handleDownloadSTEP = () => {
    const content = generateSTEPFileContent(appState.legacyParams);
    const blob = new Blob([content], { type: 'model/step' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimairwing_wing_naca${appState.legacyParams.nacaCode}.stp`;
    a.click();
  };

  const handleDownloadPythonCAD = () => {
    const content = generateSolidWorksPythonScript(appState.legacyParams);
    const blob = new Blob([content], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimairwing_loft_fusion360.py`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-5xl bg-[#0a111c] border border-[#1e2d42] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d42] bg-[#0d1520]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#e8edf4] flex items-center gap-2">
                <span>Módulos Imbatibles OptimAirWing (Market-Ready)</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Commercial Suite</span>
              </h2>
              <p className="text-xs text-[#9aaec9]">Validación con túneles de viento, análisis de sensibilidad, CAD STEP, fatiga y benchmarks de industria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9aaec9] hover:text-white hover:bg-[#131f2e] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-[#070b12] border-b border-[#1e2d42] overflow-x-auto">
          <button
            onClick={() => setActiveTab('validation')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'validation'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-[#9aaec9] hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>1. Validación Túnel Real / NASA</span>
          </button>

          <button
            onClick={() => setActiveTab('sensitivity')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'sensitivity'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-[#9aaec9] hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>2. Sensibilidad a Parámetros</span>
          </button>

          <button
            onClick={() => setActiveTab('cad')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'cad'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-[#9aaec9] hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4 text-blue-400" />
            <span>3. Exportación CAD (STEP / IGES)</span>
          </button>

          <button
            onClick={() => setActiveTab('fatigue')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'fatigue'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-[#9aaec9] hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>4. Fatiga y Vida Útil</span>
          </button>

          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'benchmarks'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-[#9aaec9] hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <span>5. Modo Benchmark</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* TAB 1: VALIDACIÓN DATOS REALES / NASA / F1 */}
          {activeTab === 'validation' && validationReport && (
            <div className="flex flex-col gap-5">
              <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Dataset Experimental Target:</span>
                    <span className="text-cyan-400 font-mono">{validationReport.benchmarkName}</span>
                  </h3>
                  <p className="text-xs text-[#9aaec9] mt-0.5">Número de Reynolds Re = {(validationReport.reynoldsNumber / 1e6).toFixed(1)} M | Calibración con túnel de viento presurizado</p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#5a7390] uppercase tracking-wider">Grado de Precisión</div>
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded border border-emerald-500/30 mt-1">
                    {validationReport.accuracyGrade}
                  </div>
                </div>
              </div>

              {/* Correlation & Error Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-[#070b12] p-3 rounded-lg border border-[#1e2d42]">
                  <div className="text-[11px] text-[#9aaec9]">Sustentación CL Predicha / Exp</div>
                  <div className="text-lg font-mono font-bold text-cyan-300 mt-1">
                    {validationReport.currentAlphaCL.toFixed(3)} / <span className="text-emerald-400">{validationReport.expCL.toFixed(3)}</span>
                  </div>
                  <div className="text-[10px] text-[#5a7390] font-mono">Error Abs: {validationReport.clErrorPct.toFixed(2)}%</div>
                </div>

                <div className="bg-[#070b12] p-3 rounded-lg border border-[#1e2d42]">
                  <div className="text-[11px] text-[#9aaec9]">Resistencia CD Predicha / Exp</div>
                  <div className="text-lg font-mono font-bold text-amber-300 mt-1">
                    {validationReport.currentAlphaCD.toFixed(4)} / <span className="text-emerald-400">{validationReport.expCD.toFixed(4)}</span>
                  </div>
                  <div className="text-[10px] text-[#5a7390] font-mono">Error Abs: {validationReport.cdErrorPct.toFixed(2)}%</div>
                </div>

                <div className="bg-[#070b12] p-3 rounded-lg border border-[#1e2d42]">
                  <div className="text-[11px] text-[#9aaec9]">Correlación Pearson (R²)</div>
                  <div className="text-lg font-mono font-bold text-purple-400 mt-1">
                    {validationReport.correlationR2.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">Excelente Ajuste &gt; 0.95</div>
                </div>

                <div className="bg-[#070b12] p-3 rounded-lg border border-[#1e2d42]">
                  <div className="text-[11px] text-[#9aaec9]">RMSE Coeficientes</div>
                  <div className="text-lg font-mono font-bold text-blue-400 mt-1">
                    {validationReport.rmseCL.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-[#5a7390] font-mono">Root Mean Square Error</div>
                </div>
              </div>

              {/* Experimental vs Model Table */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Table className="w-4 h-4 text-cyan-400" />
                  <span>Curva Polar Polinomial: Tunel de Viento vs Modelo OptimAirWing</span>
                </h4>
                <div className="bg-[#0d1520] rounded-xl border border-[#1e2d42] overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#070b12] text-[#9aaec9] uppercase font-mono text-[10px] border-b border-[#1e2d42]">
                      <tr>
                        <th className="p-3">Ángulo α (deg)</th>
                        <th className="p-3">CL Exp (Túnel)</th>
                        <th className="p-3">CD Exp (Túnel)</th>
                        <th className="p-3">Cm Exp (Momento)</th>
                        <th className="p-3">Fuente de Datos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2d42]/60">
                      {validationReport.dataPoints.map((pt, idx) => (
                        <tr key={idx} className="hover:bg-[#131f2e]/50 transition font-mono">
                          <td className="p-3 text-cyan-300 font-bold">{pt.alpha_deg}°</td>
                          <td className="p-3 text-emerald-400 font-bold">{pt.CL_exp.toFixed(3)}</td>
                          <td className="p-3 text-amber-300">{pt.CD_exp.toFixed(4)}</td>
                          <td className="p-3 text-purple-300">{pt.Cm_exp.toFixed(3)}</td>
                          <td className="p-3 text-[11px] text-[#9aaec9] font-sans">{pt.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SENSIBILIDAD A PARÁMETROS */}
          {activeTab === 'sensitivity' && (
            <div className="flex flex-col gap-5">
              <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Análisis de Sensibilidad Paramétrica (Sobol Index & Tornado Charts)</span>
                </h3>
                <p className="text-xs text-[#9aaec9] mt-1">
                  Muestra el impacto de variaciones infinitesimales de cada parámetro geométrico en la eficiencia L/D y la sustentación.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {sensitivityData.map((item, idx) => (
                  <div key={idx} className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42] flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-[#1e2d42] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{item.parameterName}</span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          Base: {item.baseValue} {item.unit}
                        </span>
                      </div>
                      <div className="text-xs text-[#9aaec9]">
                        Variación probada: <span className="text-amber-300 font-mono font-bold">{item.variationTested}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Impact Bar L/D */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#9aaec9]">Impacto en Eficiencia Aerodinámica (L/D):</span>
                          <span className={`font-mono font-bold ${item.deltaLDPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.deltaLDPct >= 0 ? '+' : ''}{item.deltaLDPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#070b12] rounded-full overflow-hidden border border-[#1e2d42]">
                          <div
                            className={`h-full ${item.deltaLDPct >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                            style={{ width: `${Math.min(100, Math.abs(item.deltaLDPct) * 8)}%` }}
                          />
                        </div>
                      </div>

                      {/* Impact Bar Primary Force */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#9aaec9]">Impacto en Fuerza Principal (Lift/Downforce):</span>
                          <span className={`font-mono font-bold ${item.deltaPrimaryForcePct >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                            {item.deltaPrimaryForcePct >= 0 ? '+' : ''}{item.deltaPrimaryForcePct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#070b12] rounded-full overflow-hidden border border-[#1e2d42]">
                          <div
                            className="h-full bg-cyan-400"
                            style={{ width: `${Math.min(100, Math.abs(item.deltaPrimaryForcePct) * 6)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#9aaec9] bg-[#070b12] p-2 rounded border border-[#1e2d42]">
                      💡 <strong className="text-white">Recomendación de Diseño:</strong> {item.actionableInsight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INTEGRACIÓN CAD (STEP / IGES) */}
          {activeTab === 'cad' && (
            <div className="flex flex-col gap-5">
              <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span>Exportador de Geometría CAD Industrial (STEP AP203 / IGES / Python Loft)</span>
                </h3>
                <p className="text-xs text-[#9aaec9] mt-1">
                  Exporte superficies B-Spline cerradas listas para importación directa en SolidWorks, CATIA V5, Siemens NX y Autodesk Fusion 360.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42] flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-2">
                      <Download className="w-4 h-4 text-cyan-400" />
                      <span>Archivo Estándar ISO 10303 STEP (.STP)</span>
                    </h4>
                    <p className="text-[11px] text-[#9aaec9] mt-2">
                      Genera la geometría sólida B-Spline de la superficie del perfil NACA {appState.legacyParams.nacaCode} con estrechamiento y flecha.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSTEP}
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar STEP (.STP)</span>
                  </button>
                </div>

                <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42] flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Script Python Lofting Automático (SolidWorks / Fusion 360)</span>
                    </h4>
                    <p className="text-[11px] text-[#9aaec9] mt-2">
                      Script para generación automática de bocetos 3D, planos de construcción y operación Loft de perfiles aerodinámicos.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPythonCAD}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Script Python (.py)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FATIGA Y VIDA ÚTIL */}
          {activeTab === 'fatigue' && fatigueReport && (
            <div className="flex flex-col gap-5">
              <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span>Análisis de Fatiga Cíclica & Regla de Miner</span>
                  </h3>
                  <p className="text-xs text-[#9aaec9] mt-0.5">Estimación de ciclos hasta la falla estructural por esfuerzos de flexión aerodinámica</p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#9aaec9]">Material:</label>
                  <select
                    value={selectedMaterial}
                    onChange={e => setSelectedMaterial(e.target.value)}
                    className="bg-[#070b12] border border-[#1e2d42] rounded px-3 py-1 text-xs text-cyan-300 focus:outline-none cursor-pointer"
                  >
                    <option value="CFRP Carbon Fiber High-Modulus">CFRP Fibra de Carbono High-Modulus</option>
                    <option value="Aluminum 7075-T6 Aero">Aluminio Aeronáutico 7075-T6</option>
                    <option value="Titanium Ti-6Al-4V Grade 5">Titanio Grado 5 Ti-6Al-4V</option>
                  </select>
                </div>
              </div>

              {/* Status Verdict */}
              <div className="p-4 bg-[#070b12] rounded-xl border border-[#1e2d42] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#5a7390] uppercase tracking-wider">Veredicto de Durabilidad Estratégica</div>
                  <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{fatigueReport.verdict}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#5a7390] uppercase tracking-wider">Factor de Seguridad a Fatiga ($SF_f$)</div>
                  <div className="text-xl font-mono font-extrabold text-cyan-300 mt-0.5">
                    {fatigueReport.safetyFactorFatigue}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42]">
                  <div className="text-xs text-[#9aaec9]">Ciclos de Carga hasta Falla ($N_f$)</div>
                  <div className="text-xl font-mono font-bold text-amber-400 mt-1">
                    {fatigueReport.cyclesToFailureN.toLocaleString()} <span className="text-xs text-[#5a7390]">ciclos</span>
                  </div>
                  <p className="text-[10px] text-[#5a7390] mt-1">Calculado mediante curva S-N de Wöhler</p>
                </div>

                <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42]">
                  <div className="text-xs text-[#9aaec9]">Horas Operativas Estimadas</div>
                  <div className="text-xl font-mono font-bold text-cyan-300 mt-1">
                    {fatigueReport.estimatedLifeHours.toLocaleString()} <span className="text-xs text-[#5a7390]">horas de vuelo</span>
                  </div>
                  <p className="text-[10px] text-[#5a7390] mt-1">Bajo espectro de ráfaga severa</p>
                </div>

                <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42]">
                  <div className="text-xs text-[#9aaec9]">Vueltas de Competición F1 / Regatas</div>
                  <div className="text-xl font-mono font-bold text-purple-400 mt-1">
                    {fatigueReport.racingLapsEstimate.toLocaleString()} <span className="text-xs text-[#5a7390]">vueltas</span>
                  </div>
                  <p className="text-[10px] text-[#5a7390] mt-1">45 cambios de carga por vuelta</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MODO BENCHMARK */}
          {activeTab === 'benchmarks' && (
            <div className="flex flex-col gap-5">
              <div className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-400" />
                  <span>Comparativa Benchmark con Alas de Referencia de la Industria</span>
                </h3>
                <p className="text-xs text-[#9aaec9] mt-1">
                  Compare el rendimiento de su diseño actual con las geometrías más emblemáticas de aviación, motorsport y náutica.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {KNOWN_INDUSTRY_WINGS.map(wing => (
                  <div key={wing.id} className="bg-[#0d1520] p-4 rounded-xl border border-[#1e2d42] flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{wing.name}</span>
                        <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {wing.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9aaec9] mt-1">{wing.description}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#070b12] p-2.5 rounded-lg border border-[#1e2d42] text-xs font-mono">
                      <div>
                        <div className="text-[9px] text-[#5a7390]">CL Ref</div>
                        <div className="text-cyan-300 font-bold">{wing.referenceCL}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#5a7390]">CD Ref</div>
                        <div className="text-amber-300 font-bold">{wing.referenceCD}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#5a7390]">L/D Ratio</div>
                        <div className="text-emerald-400 font-bold">{wing.referenceLD}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1e2d42] bg-[#070b12] flex items-center justify-between text-xs text-[#9aaec9]">
          <span>OptimAirWing Commercial Intelligence Suite</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#131f2e] text-white hover:bg-[#1e2d42] transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
