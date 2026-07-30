import Redis from 'ioredis';
import { logger } from '../lib/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 3000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.warn({ err }, 'Redis connection error (usando fallback en memoria)');
});

redis.on('connect', () => logger.info('Redis conectado'));

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.connect();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export async function cachedGet<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch { /* fallback */ }

  const value = await fetcher();
  try {
    await redis.setex(key, ttlSec, JSON.stringify(value));
  } catch { /* fallback */ }
  return value;
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch { /* fallback */ }
}

export { Redis };
