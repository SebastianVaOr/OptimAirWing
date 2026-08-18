import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';

interface CachedResponse {
  status: number;
  body: unknown;
  createdAt: number;
}

const completedKeys = new Map<string, CachedResponse>();
const TTL_MS = 3600 * 1000;

export function idempotent(ttlMs = TTL_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;
    if (!key) return next();

    const bodyHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
    const compositeKey = `${key}:${bodyHash}`;

    const existing = completedKeys.get(compositeKey);
    if (existing && Date.now() - existing.createdAt < ttlMs) {
      return res.status(existing.status).json(existing.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      // Persistir timestamp real (createdAt) para calcular el TTL correctamente
      completedKeys.set(compositeKey, { status: res.statusCode, body, createdAt: Date.now() });
      if (completedKeys.size > 10000) {
        const oldest = completedKeys.keys().next().value;
        if (oldest) completedKeys.delete(oldest);
      }
      return originalJson(body);
    };

    next();
  };
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of completedKeys) {
    if (now - val.createdAt > TTL_MS) completedKeys.delete(key);
  }
}, 60000);