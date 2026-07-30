import { startOptimizationWorker } from './infra/queue';
import { logger } from './lib/logger';

logger.info('OptimAirWing Worker iniciado');

const worker = startOptimizationWorker();

process.on('SIGTERM', async () => {
  logger.info('Worker: señal SIGTERM recibida, cerrando...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Worker: señal SIGINT recibida, cerrando...');
  await worker.close();
  process.exit(0);
});
