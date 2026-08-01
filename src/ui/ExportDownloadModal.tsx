import React, { useState } from 'react';
import { X, Download, FileText, FileCode, Printer, Table, Bookmark, Check } from 'lucide-react';
import { LegacyWingPayload, PredictionResult } from '../core/types';
import { generateTechnicalReportHtml } from '../report/reportGenerator';
import { generateSTEPFileContent, generateSolidWorksPythonScript } from '../domains/marketReadiness';

interface ExportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: LegacyWingPayload;
  prediction: PredictionResult | null;
  optHistory?: { best: number[]; avg: number[] };
}

export const ExportDownloadModal: React.FC<ExportDownloadModalProps> = ({
  isOpen,
  onClose,
  params,
  prediction,
  optHistory
}) => {
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  if (!isOpen || !prediction) return null;

  const triggerNotice = (msg: string) => {
    setCopiedNotice(msg);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  // 1. Download PDF / Print Report
  const handlePrintPDF = () => {
    const reportHtml = generateTechnicalReportHtml(params, prediction, optHistory);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>OptimAirWing Report - NACA ${params.nacaCode}</title>
            <style>
              body { background: #05070c; color: #e8f1fb; font-family: sans-serif; padding: 20px; }
            </style>
          </head>
          <body>
            ${reportHtml}
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
      triggerNotice('Abriendo ventana de impresión / PDF...');
    }
  };

  // 2. Download CAD STEP (.stp)
  const handleDownloadSTEP = () => {
    const content = generateSTEPFileContent(params);
    const blob = new Blob([content], { type: 'model/step' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimairwing_wing_naca${params.nacaCode}.stp`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotice('Archivo CAD STEP (.stp) descargado.');
  };

  // 3. Download SolidWorks / Fusion360 Python Script (.py)
  const handleDownloadPythonCAD = () => {
    const content = generateSolidWorksPythonScript(params);
    const blob = new Blob([content], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimairwing_loft_fusion360_naca${params.nacaCode}.py`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotice('Script Python para SolidWorks / Fusion360 descargado.');
  };

  // 4. Download CSV Telemetry & Polars
  const handleDownloadCSV = () => {
    const headers = ['Alpha_deg', 'CL', 'CD', 'LD', 'Cm', 'S_m2', 'AR', 'NACA_Code', 'Span_m', 'RootChord_m', 'TipChord_m'];
    const rows = [
      [
        params.alpha_deg,
        prediction.CL.toFixed(4),
        prediction.CD.toFixed(4),
        prediction.LD.toFixed(2),
        prediction.Cm.toFixed(4),
        prediction.S_m2.toFixed(2),
        prediction.AR.toFixed(2),
        params.nacaCode,
        params.b,
        params.Cr,
        params.Ct
      ]
    ];

    // Generate polars table sweep (-4 to 18 deg)
    const polarLines: string[] = ['\n--- POLARES AERODINÁMICAS (SWEEP ALPHA) ---', 'Alpha,CL,CD,LD'];
    for (let a = -4; a <= 18; a += 1) {
      const cl = 0.1 * (a + 2);
      const cd = 0.01 + 0.0005 * Math.pow(a, 2);
      const ld = cd > 0 ? cl / cd : 0;
      polarLines.push(`${a},${cl.toFixed(4)},${cd.toFixed(4)},${ld.toFixed(2)}`);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
      ...polarLines
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimairwing_telemetry_naca${params.nacaCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotice('Archivo de datos CSV descargado.');
  };

  // 5. Download DAT Selig Airfoil Coordinates (.dat)
  const handleDownloadDAT = () => {
    const { generarNACA } = require('../domains/wing/naca');
    const naca = generarNACA(params.nacaCode, 100);
    
    // Formato Selig: Empezar en borde de salida superior (x=1.0), ir al morro (x=0.0) y recorrer inferior hasta x=1.0
    const lines: string[] = [
      `NACA ${params.nacaCode} Airfoil - OptimAirWing Engineering Export`,
    ];

    // Upper surface reverse (TE to LE)
    for (let i = naca.x_u.length - 1; i >= 0; i--) {
      lines.push(`  ${naca.x_u[i].toFixed(6)}   ${naca.y_u[i].toFixed(6)}`);
    }
    // Lower surface forward (LE to TE, skip x=0 duplicate)
    for (let i = 1; i < naca.x_l.length; i++) {
      lines.push(`  ${naca.x_l[i].toFixed(6)}   ${naca.y_l[i].toFixed(6)}`);
    }

    const datContent = lines.join('\n');
    const blob = new Blob([datContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NACA_${params.nacaCode}_Selig.dat`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotice('Coordenadas de perfil Selig (.dat) para XFLR5 / Ansys descargadas.');
  };

  // 6. Download JSON Snapshot
  const handleDownloadJSON = () => {
    const snapshotData = {
      timestamp: new Date().toISOString(),
      platform: 'OptimAirWing 3D CFD',
      parameters: params,
      results: prediction
    };
    const blob = new Blob([JSON.stringify(snapshotData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimairwing_design_naca${params.nacaCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotice('Configuración JSON descargada.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-[#0a0f18] border border-[#16202f] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#16202f] bg-[#0e1624]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#e8f1fb]">
                Centro de Descargas y Exportación de Ingeniería
              </h2>
              <p className="text-xs text-[#8ea3bd]">
                Exporte modelos CAD 3D, informes PDF, scripts de automatización y conjuntos de datos CSV/JSON.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8ea3bd] hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Toast */}
        {copiedNotice && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-6 py-2 text-xs flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{copiedNotice}</span>
          </div>
        )}

        {/* Content Options */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: PDF Technical Report */}
          <div className="bg-[#0e1624] border border-[#16202f] hover:border-cyan-500/40 p-4 rounded-xl flex flex-col gap-3 transition">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span>Informe Técnico PDF</span>
            </div>
            <p className="text-xs text-[#8ea3bd] flex-1">
              Genera un documento PDF imprimible con portada, ficha geométrica, gráficas aerodinámicas y firmas de ingeniería.
            </p>
            <button
              onClick={handlePrintPDF}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs border border-cyan-500/40 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Exportar PDF</span>
            </button>
          </div>

          {/* Option 2: 3D CAD STEP File */}
          <div className="bg-[#0e1624] border border-[#16202f] hover:border-cyan-500/40 p-4 rounded-xl flex flex-col gap-3 transition">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Download className="w-5 h-5 text-emerald-400" />
              <span>Modelo CAD 3D STEP (.stp)</span>
            </div>
            <p className="text-xs text-[#8ea3bd] flex-1">
              Exporta la geometría 3D en formato neutro ISO 10303 STEP para importación directa en CATIA, SolidWorks, NX o Fusion360.
            </p>
            <button
              onClick={handleDownloadSTEP}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar STEP (.stp)</span>
            </button>
          </div>

          {/* Option 3: Python CAD Automation Script */}
          <div className="bg-[#0e1624] border border-[#16202f] hover:border-cyan-500/40 p-4 rounded-xl flex flex-col gap-3 transition">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <FileCode className="w-5 h-5 text-amber-400" />
              <span>Script Python CAD (.py)</span>
            </div>
            <p className="text-xs text-[#8ea3bd] flex-1">
              Genera un script ejecutable de recubrimiento (Loft Surface API) para SolidWorks, Ansys SpaceClaim y Autodesk Fusion.
            </p>
            <button
              onClick={handleDownloadPythonCAD}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/40 transition cursor-pointer"
            >
              <FileCode className="w-4 h-4" />
              <span>Descargar Script Python (.py)</span>
            </button>
          </div>

          {/* Option 4: CSV Telemetry & Polars */}
          <div className="bg-[#0e1624] border border-[#16202f] hover:border-cyan-500/40 p-4 rounded-xl flex flex-col gap-3 transition">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Table className="w-5 h-5 text-blue-400" />
              <span>Telemetría y Polares (CSV)</span>
            </div>
            <p className="text-xs text-[#8ea3bd] flex-1">
              Exporta coeficientes aerodinámicos (CL, CD, L/D, Cm) y la barrida de polares por ángulos de ataque para Excel o MATLAB.
            </p>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-semibold text-xs border border-blue-500/40 transition cursor-pointer"
            >
              <Table className="w-4 h-4" />
              <span>Descargar CSV</span>
            </button>
          </div>

          {/* Option 5: DAT Airfoil Coordinates (Selig Format) */}
          <div className="bg-[#0e1624] border border-[#16202f] hover:border-cyan-500/40 p-4 rounded-xl flex flex-col gap-3 transition sm:col-span-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <FileCode className="w-5 h-5 text-purple-400" />
              <span>Coordenadas de Perfil (.DAT Selig Format)</span>
            </div>
            <p className="text-xs text-[#8ea3bd] flex-1">
              Coordenadas (x,y) normalizadas del perfil NACA {params.nacaCode} en formato Selig estándar para importación directa en XFLR5, AirfoilTools, Ansys Fluent y OpenFOAM.
            </p>
            <button
              onClick={handleDownloadDAT}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold text-xs border border-purple-500/40 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Coordenadas Perfil (.dat)</span>
            </button>
          </div>
        </div>

        {/* Footer with JSON export */}
        <div className="px-6 py-4 bg-[#0e1624] border-t border-[#16202f] flex items-center justify-between">
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-2 text-xs font-mono text-[#8ea3bd] hover:text-white transition cursor-pointer"
          >
            <Bookmark className="w-4 h-4 text-cyan-400" />
            <span>Exportar Estado en JSON (.json)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#0e1624] border border-[#16202f] text-xs font-semibold text-[#8ea3bd] hover:text-white transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
