import React, { useState } from 'react';
import { Download, FileText, FileCode, Printer, Table, Bookmark, Check } from 'lucide-react';
import { LegacyWingPayload, PredictionResult } from '../core/types';
import { generateTechnicalReportHtml } from '../report/reportGenerator';
import { generateSTEPFileContent, generateSolidWorksPythonScript } from '../domains/marketReadiness';
import { calcularEmpirico } from '../domains/wing/empirical';
import { Modal } from './primitives/Modal';

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

    // Generate polars table sweep (-4 to 18 deg) con el motor empírico de línea sustentadora
    const polarLines: string[] = ['\n--- POLARES AERODINÁMICAS (SWEEP ALPHA) ---', 'Alpha,CL,CD,LD'];
    for (let a = -4; a <= 18; a += 1) {
      const emp = calcularEmpirico({ ...params, alpha_deg: a });
      polarLines.push(`${a},${emp.CL.toFixed(4)},${emp.CD.toFixed(4)},${emp.LD.toFixed(2)}`);
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
      platform: 'OptimAirWing - Modelo empírico de línea sustentadora (lifting-line)',
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Centro de Descargas y Exportación de Ingeniería"
      description="Exporte modelos CAD 3D, informes PDF, scripts de automatización y conjuntos de datos CSV/JSON."
      size="lg"
    >
      {/* Notice Toast */}
      {copiedNotice && (
        <div className="bg-ok/20 border-b border-ok/40 text-ok px-5 py-2 text-xs flex items-center gap-2 font-mono -mx-5 -mt-5 mb-4 rounded-t-lg">
          <Check className="w-4 h-4 text-ok" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Content Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Option 1: PDF Technical Report */}
        <div className="bg-panel2 border border-line hover:border-accent/40 p-4 rounded-xl flex flex-col gap-3 transition">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <FileText className="w-5 h-5 text-accent" />
            <span>Informe Técnico PDF</span>
          </div>
          <p className="text-xs text-lo flex-1">
            Genera un documento PDF imprimible con portada, ficha geométrica, gráficas aerodinámicas y firmas de ingeniería.
          </p>
          <button
            onClick={handlePrintPDF}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent2 font-semibold text-xs border border-accent/40 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Exportar PDF</span>
          </button>
        </div>

        {/* Option 2: 3D CAD Step File */}
        <div className="bg-panel2 border border-line hover:border-accent/40 p-4 rounded-xl flex flex-col gap-3 transition">
          <div className="flex items-center gap-2 text-ok font-bold text-sm">
            <Download className="w-5 h-5 text-ok" />
            <span>Modelo CAD 3D STEP (.stp)</span>
          </div>
          <p className="text-xs text-lo flex-1">
            Exporta la geometría 3D en formato neutro ISO 10303 STEP para importación directa en CATIA, SolidWorks, NX o Fusion360.
          </p>
          <button
            onClick={handleDownloadSTEP}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-ok/20 hover:bg-ok/30 text-ok font-semibold text-xs border border-ok/40 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar STEP (.stp)</span>
          </button>
        </div>

        {/* Option 3: Python CAD Automation Script */}
        <div className="bg-panel2 border border-line hover:border-accent/40 p-4 rounded-xl flex flex-col gap-3 transition">
          <div className="flex items-center gap-2 text-warn font-bold text-sm">
            <FileCode className="w-5 h-5 text-warn" />
            <span>Script Python CAD (.py)</span>
          </div>
          <p className="text-xs text-lo flex-1">
            Genera un script ejecutable de recubrimiento (Loft Surface API) para SolidWorks, Ansys SpaceClaim y Autodesk Fusion.
          </p>
          <button
            onClick={handleDownloadPythonCAD}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-warn/20 hover:bg-warn/30 text-warn font-semibold text-xs border border-warn/40 transition cursor-pointer"
          >
            <FileCode className="w-4 h-4" />
            <span>Descargar Script Python (.py)</span>
          </button>
        </div>

        {/* Option 4: CSV Telemetry & Polars */}
        <div className="bg-panel2 border border-line hover:border-accent/40 p-4 rounded-xl flex flex-col gap-3 transition">
          <div className="flex items-center gap-2 text-dhydro font-bold text-sm">
            <Table className="w-5 h-5 text-dhydro" />
            <span>Telemetría y Polares (CSV)</span>
          </div>
          <p className="text-xs text-lo flex-1">
            Exporta coeficientes aerodinámicos (CL, CD, L/D, Cm) y la barrida de polares por ángulos de ataque para Excel o MATLAB.
          </p>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-dhydro/20 hover:bg-dhydro/30 text-dhydro font-semibold text-xs border border-dhydro/40 transition cursor-pointer"
          >
            <Table className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
        </div>

        {/* Option 5: DAT Airfoil Coordinates (Selig Format) */}
        <div className="bg-panel2 border border-line hover:border-accent/40 p-4 rounded-xl flex flex-col gap-3 transition sm:col-span-2">
          <div className="flex items-center gap-2 font-bold text-sm" style={{ color: 'color-mix(in srgb, #a78bfa 85%, var(--color-hi))' }}>
            <FileCode className="w-5 h-5" style={{ color: 'color-mix(in srgb, #a78bfa 85%, var(--color-hi))' }} />
            <span>Coordenadas de Perfil (.DAT Selig Format)</span>
          </div>
          <p className="text-xs text-lo flex-1">
            Coordenadas (x,y) normalizadas del perfil NACA {params.nacaCode} en formato Selig estándar para importación directa en XFLR5, AirfoilTools, Ansys Fluent y OpenFOAM.
          </p>
          <button
            onClick={handleDownloadDAT}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer"
            style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#c4b5fd', borderColor: 'rgba(167,139,250,0.4)' }}
          >
            <Download className="w-4 h-4" />
            <span>Descargar Coordenadas Perfil (.dat)</span>
          </button>
        </div>
      </div>

      {/* Footer with JSON export */}
      <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
        <button
          onClick={handleDownloadJSON}
          className="flex items-center gap-2 text-xs font-mono text-lo hover:text-hi transition cursor-pointer"
        >
          <Bookmark className="w-4 h-4 text-accent" />
          <span>Exportar Estado en JSON (.json)</span>
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-panel2 border border-line text-xs font-semibold text-lo hover:text-hi transition cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
};
