import { Request, Response, NextFunction } from 'express';

interface WindowEntry {
  count: number;
  resetAt: number;
}

const orgStore = new Map<string, WindowEntry>();
const ipStore = new Map<string, WindowEntry>();

const TENANT_LIMITS: Record<string, { max: number; window: number }> = {
  freemium: { max: 60, window: 60000 },
  professional: { max: 300, window: 60000 },
  enterprise: { max: 1000, window: 60000 },
};

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const orgId = (req as any).orgId;
  const plan = (req as any).orgPlan || 'freemium';
  const limits = TENANT_LIMITS[plan] || TENANT_LIMITS.freemium;
  const now = Date.now();

  const useOrg = orgId && plan !== 'freemium';
  const store = useOrg ? orgStore : ipStore;
  const key = useOrg ? `org:${orgId}` : `ip:${req.ip || 'unknown'}`;

  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + limits.window };
    store.set(key, entry);
    return next();
  }

  if (entry.count >= limits.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Demasiadas solicitudes',
      plan,
      limit: limits.max,
      retryAfterMs: entry.resetAt - now,
    });
  }

  entry.count++;
  next();
}

// Cleanup cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of orgStore) {
    if (now > entry.resetAt) orgStore.delete(key);
  }
  for (const [key, entry] of ipStore) {
    if (now > entry.resetAt) ipStore.delete(key);
  }
}, 300000);
