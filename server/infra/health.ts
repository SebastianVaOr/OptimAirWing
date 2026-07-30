import { pgPool } from './postgres';
import { redis } from './redis';
import { pythonBackend } from '../pythonBackend';
import { logger } from '../lib/logger';
import { circuitBreaker } from '../lib/circuitBreaker';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: { status: string; latencyMs: number };
    redis: { status: string; latencyMs: number };
    pythonCfd: { status: string };
    disk: { status: string; usagePct: number };
    memory: { status: string; usagePct: number };
  };
}

const startTime = Date.now();

export async function getHealth(): Promise<HealthStatus> {
  const checks = {
    database: { status: 'unknown', latencyMs: 0 },
    redis: { status: 'unknown', latencyMs: 0 },
    pythonCfd: { status: 'unknown' },
    disk: { status: 'unknown', usagePct: 0 },
    memory: { status: 'unknown', usagePct: 0 },
  };

  // Database
  try {
    const dbStart = Date.now();
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: 'unhealthy', latencyMs: -1 };
  }

  // Redis
  try {
    const rStart = Date.now();
    await redis.ping();
    checks.redis = { status: 'healthy', latencyMs: Date.now() - rStart };
  } catch {
    checks.redis = { status: 'degraded', latencyMs: -1 };
  }

  // Python CFD (con circuit breaker)
  try {
    const cfd = await circuitBreaker(() => pythonBackend.healthCheck(), {
      name: 'python-cfd',
      failureThreshold: 3,
      recoveryTimeoutMs: 30000,
    });
    checks.pythonCfd = { status: cfd.fastapi ? 'healthy' : 'degraded' };
  } catch {
    checks.pythonCfd = { status: 'unhealthy' };
  }

  // Disk
  try {
    const { execSync } = require('child_process');
    const df = execSync('df / | tail -1').toString().trim().split(/\s+/);
    const usagePct = parseInt(df[4]?.replace('%', '') || '0');
    checks.disk = { status: usagePct > 90 ? 'degraded' : 'healthy', usagePct };
  } catch {
    checks.disk = { status: 'unknown', usagePct: 0 };
  }

  // Memory
  try {
    const usage = process.memoryUsage();
    const usagePct = Math.round((usage.heapUsed / usage.heapTotal) * 100);
    checks.memory = { status: usagePct > 90 ? 'degraded' : 'healthy', usagePct };
  } catch {
    checks.memory = { status: 'unknown', usagePct: 0 };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');

  return {
    status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks,
  };
}
