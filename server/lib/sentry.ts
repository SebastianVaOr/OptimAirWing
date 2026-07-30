import * as Sentry from '@sentry/node';
import { logger } from './logger';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.warn('SENTRY_DSN no configurado — Sentry desactivado');
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
  });
  logger.info('Sentry inicializado');
}
