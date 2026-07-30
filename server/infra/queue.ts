import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../lib/logger';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const optimizationQueue = new Queue('optimizations', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 * 24 },
    removeOnFail: { age: 3600 * 24 * 7 },
  },
});

export interface OptimizationJobData {
  orgId: string;
  userId?: number;
  params: Record<string, unknown>;
  requirements: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface OptimizationJobResult {
  bestParams: Record<string, unknown>;
  bestFitness: number;
  historyBest: number[];
  historyAvg: number[];
  viability: Record<string, unknown>;
}

export async function enqueueOptimization(data: OptimizationJobData): Promise<string> {
  const job = await optimizationQueue.add('optimize', data, {
    jobId: data.idempotencyKey,
  });
  logger.info({ jobId: job.id, orgId: data.orgId }, 'Optimización encolada');
  return job.id ?? '';
}

export async function getJobResult(jobId: string): Promise<OptimizationJobResult | null> {
  const job = await optimizationQueue.getJob(jobId);
  if (!job) return null;
  if (job.failedReason) throw new Error(job.failedReason || 'Job falló');
  return job.returnvalue as OptimizationJobResult | null;
}

export function startOptimizationWorker() {
  const worker = new Worker<OptimizationJobData, OptimizationJobResult>(
    'optimizations',
    async (job: Job<OptimizationJobData>) => {
      logger.info({ jobId: job.id, orgId: job.data.orgId }, 'Procesando optimización');

      const { GeneticOptimizer } = await import('../../src/domains/wing/geneticOptimizer');
      const optimizer = new GeneticOptimizer();

      const result = await optimizer.run(
        job.data.params as any,
        job.data.requirements as any,
      );

      return {
        bestParams: result.bestParams as unknown as Record<string, unknown>,
        bestFitness: result.bestFitness,
        historyBest: result.historyBest,
        historyAvg: result.historyAvg,
        viability: result.viability as unknown as Record<string, unknown>,
      };
    },
    { connection, concurrency: 4 },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Optimización completada');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Optimización falló');
  });

  logger.info('Optimization worker iniciado (4 concurrentes)');
  return worker;
}
