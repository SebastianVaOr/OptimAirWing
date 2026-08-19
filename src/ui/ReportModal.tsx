import React from 'react';
import { Printer, FileText } from 'lucide-react';
import { LegacyWingPayload, PredictionResult } from '../core/types';
import { generateTechnicalReportHtml } from '../report/reportGenerator';
import { Modal } from './primitives/Modal';
import { Button } from './primitives/Button';

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
  if (!prediction) return null;

  const reportHtml = generateTechnicalReportHtml(params, prediction, optHistory);

  const handlePrint = () => {
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
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Informe Técnico de Ingeniería Alar"
      size="lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-accent" aria-hidden="true" />
        <span className="text-accent font-bold text-xs uppercase tracking-wider">Informe de Ingeniería</span>
        <div className="ml-auto">
          <Button variant="secondary" size="sm" icon={Printer} onClick={handlePrint}>
            Imprimir / Exportar PDF
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 max-h-[60vh]">
        <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
      </div>
    </Modal>
  );
};
