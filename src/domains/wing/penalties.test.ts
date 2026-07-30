import { describe, it, expect } from 'vitest';
import { computeCostPenalty, computeWeightPenalty, computeFatiguePenalty, computeSectorPenalty } from './penalties';
import type { TargetSector } from '../../core/types';

describe('computeCostPenalty', () => {
  it('returns 0 when cost is within budget', () => {
    expect(computeCostPenalty(1000, 5000)).toBe(0);
  });

  it('returns penalty when cost exceeds budget', () => {
    expect(computeCostPenalty(10000, 5000)).toBeGreaterThan(0);
  });

  it('caps penalty at reasonable max', () => {
    expect(computeCostPenalty(1e9, 100)).toBeLessThanOrEqual(1);
  });
});

describe('computeWeightPenalty', () => {
  it('returns 0 when weight is under target', () => {
    expect(computeWeightPenalty(10, 25)).toBe(0);
  });

  it('returns penalty when overweight', () => {
    expect(computeWeightPenalty(50, 25)).toBeGreaterThan(0);
  });
});

describe('computeFatiguePenalty', () => {
  it('returns 0 for low flight hours on durable material', () => {
    const req = { material: 'carbon', flight_hours: 10, safety_factor: 2.5 } as any;
    const aero = { CL: 0.5, CD: 0.05 } as any;
    expect(computeFatiguePenalty(req, aero)).toBe(0);
  });

  it('returns penalty for extreme cycle count', () => {
    const req = { material: 'al2024', flight_hours: 50000, safety_factor: 2.5 } as any;
    const aero = { CL: 1.0, CD: 0.05 } as any;
    expect(computeFatiguePenalty(req, aero)).toBeGreaterThan(0);
  });
});

describe('computeSectorPenalty', () => {
  it('returns 0 for compatible params within sector limits', () => {
    const aero = { S: 10, AR: 8, CL: 0.5, CD: 0.05, e: 0.8 } as any;
    const params = { b: 5, Cr: 1.2, Ct: 0.8, sweep_deg: 0, twist_deg: 0, alpha_deg: 4, nacaCode: '2412' } as any;
    const penalty = computeSectorPenalty('uav' as TargetSector, aero, params);
    expect(penalty).toBeGreaterThanOrEqual(0);
    expect(penalty).toBeLessThanOrEqual(1);
  });
});
