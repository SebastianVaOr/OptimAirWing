import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { logger } from './logger';

let sdk: NodeSDK | null = null;

export function initTracing() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    logger.info('OpenTelemetry no configurado (OTEL_EXPORTER_OTLP_ENDPOINT ausente)');
    return;
  }

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations(),
      new ExpressInstrumentation(),
    ],
  });

  sdk.start();
  logger.info('OpenTelemetry tracing iniciado');
}

export async function shutdownTracing() {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry shutdown completado');
    } catch (err) {
      logger.error({ err }, 'Error en OpenTelemetry shutdown');
    }
  }
}
