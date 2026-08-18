import type { PlanTier } from './store';

export interface PlanLimits {
  predictions: number;
  optimizations: number;
}

// Fuente única de verdad para los límites por plan (compartida por planEnforcer y db.getPlanLimits)
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  freemium: { predictions: 3, optimizations: 1 },
  base: { predictions: 30, optimizations: 10 },
  professional: { predictions: 100, optimizations: 50 },
  enterprise: { predictions: 100000, optimizations: 100000 },
};

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.freemium;
}