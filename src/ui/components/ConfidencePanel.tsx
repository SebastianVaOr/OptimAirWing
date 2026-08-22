import React from 'react';
import { Info, AlertTriangle, CheckCircle, XCircle, Clock, Gauge } from 'lucide-react';
import { ConfidenceMetrics, FidelityMode } from '../../core/types';

interface ConfidencePanelProps {
  metrics: ConfidenceMetrics;
  fidelityMode: FidelityMode;
  inferenceTimeMs?: number;
}

export const ConfidencePanel: React.FC<ConfidencePanelProps> = ({
  metrics,
  fidelityMode,
  inferenceTimeMs,
}) => {
  const accuracyStatus = metrics.rmsePercent < 5
    ? 'excellent'
    : metrics.rmsePercent < 10
    ? 'good'
    : 'warning';

  const statusColors = {
    excellent: 'text-ok',
    good: 'text-accent',
    warning: 'text-warn',
  };

  const modelDisplayName = fidelityMode === 'normal'
    ? 'Lifting-Line v2.1 (Raymer Structural)'
    : fidelityMode === 'advanced'
    ? metrics.modelVersion.includes('large')
      ? 'Neural Surrogate Large (200KB ONNX)'
      : 'Neural Surrogate Small (50KB ONNX)'
    : 'SU2 CFD (Cloud)';

  return (
    <div className="bg-panel2 rounded-lg border border-line p-3">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-bold text-hi">Métricas de Confianza</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <MetricRow
          label="Modelo"
          value={modelDisplayName}
        />
        <MetricRow
          label="Precisión vs Túnel Viento"
          value={`${metrics.rmsePercent}% RMSE`}
          status={accuracyStatus}
        />
        <MetricRow
          label="Casos en rango de entrenamiento"
          value={metrics.samplesInTrainingRange === Infinity
            ? 'N/A (analítico)'
            : metrics.samplesInTrainingRange.toLocaleString()
          }
        />
        <MetricRow
          label="Distancia del centro"
          value={`${(metrics.distanceFromTrainingCentroid * 100).toFixed(1)}%`}
          status={metrics.distanceFromTrainingCentroid < 0.5
            ? 'excellent'
            : metrics.distanceFromTrainingCentroid < 0.7
            ? 'good'
            : 'warning'
          }
        />
        {inferenceTimeMs !== undefined && (
          <MetricRow
            label="Tiempo de inferencia"
            value={inferenceTimeMs < 1
              ? '< 1ms'
              : `${inferenceTimeMs.toFixed(1)}ms`
            }
          />
        )}
        <MetricRow
          label="Rango seguro"
          value={metrics.isWithinSafeRange ? 'Sí' : 'No'}
          status={metrics.isWithinSafeRange ? 'excellent' : 'warning'}
        />
      </div>

      {metrics.warnings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {metrics.warnings.map((warning, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-[10px] p-2 rounded bg-warn/5 border border-warn/20 text-warn"
            >
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {metrics.isWithinSafeRange && metrics.warnings.length === 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ok">
          <CheckCircle className="w-3 h-3" />
          <span>Predicción dentro del rango seguro de entrenamiento.</span>
        </div>
      )}
    </div>
  );
};

interface MetricRowProps {
  label: string;
  value: string;
  status?: 'excellent' | 'good' | 'warning';
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, status }) => {
  const statusIcon = status === 'excellent'
    ? <CheckCircle className="w-3 h-3 text-ok shrink-0" />
    : status === 'warning'
    ? <AlertTriangle className="w-3 h-3 text-warn shrink-0" />
    : null;

  const valueColor = status === 'excellent'
    ? 'text-ok'
    : status === 'good'
    ? 'text-accent'
    : status === 'warning'
    ? 'text-warn'
    : 'text-hi';

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-dim">{label}:</span>
      <div className="flex items-center gap-1">
        <span className={`font-medium ${valueColor}`}>{value}</span>
        {statusIcon}
      </div>
    </div>
  );
};
