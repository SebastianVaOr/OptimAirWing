import React from 'react';
import { X, Download, FileText, Printer } from 'lucide-react';
import { LegacyWingPayload, PredictionResult } from '../core/types';
import { generateTechnicalReportHtml } from '../report/reportGenerator';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: LegacyWingPayload;
  prediction: PredictionResult | null;
  optHistory?: { best: number[]; avg: number[] };
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  params,
  prediction,
  optHistory
}) => {
  if (!isOpen || !prediction) return null;

  const reportHtml = generateTechnicalReportHtml(params, prediction, optHistory);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>OptimAirWing Report - NACA ${params.nacaCode}</title>
            <style>
              body { background: #070b12; color: #e8edf4; font-family: sans-serif; padding: 20px; }
            </style>
          </head>
          <body>
            ${reportHtml}
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a111c] border border-[#1e2d42] rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d42] bg-[#0d1520]">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <FileText className="w-5 h-5" />
            <span>Informe Técnico de Ingeniería Alar</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#131f2e] text-cyan-300 border border-[#1e2d42] hover:bg-cyan-500/20 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Exportar PDF</span>
            </button>
            <button onClick={onClose} className="text-[#9aaec9] hover:text-white transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
        </div>
      </div>
    </div>
  );
};
