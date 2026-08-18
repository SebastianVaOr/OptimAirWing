import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../lib/errors';
import { db } from '../db/store';
import { PLAN_LIMITS } from '../db/plans';

export function requirePlan(minPlan: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const orgId = (req as any).orgId;
    if (!orgId) return next(new ForbiddenError());

    const org = db.getOrg(orgId);
    if (!org) return next(new ForbiddenError());

    const tiers = ['freemium', 'base', 'professional', 'enterprise'];
    const orgTier = tiers.indexOf(org.plan);
    const requiredTier = tiers.indexOf(minPlan);

    if (orgTier < requiredTier) {
      return next(new ForbiddenError(`Se requiere plan ${minPlan} o superior`));
    }

    (req as any).orgPlan = org.plan;
    next();
  };
}

export function checkCredit(
  type: 'predictions' | 'optimizations',
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const orgId = (req as any).orgId;
    if (!orgId) return next(new ForbiddenError());

    const org = db.getOrg(orgId);
    if (!org) return next(new ForbiddenError());

    const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.freemium;
    const used = type === 'predictions' ? org.predictions_used_month : org.optimizations_used_month;
    const limit = limits[type];

    if (used >= limit) {
      return next(new ForbiddenError(`Límite mensual de ${type} alcanzado. Actualiza tu plan.`));
    }

    next();
  };
}
