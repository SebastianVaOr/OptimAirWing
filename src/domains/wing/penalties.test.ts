import { describe, it, expect } from 'vitest';
import { computeCostPenalty, computeWeightPenalty, computeFatiguePenalty, computeSectorPenalty, computeEstimatedWeight, compute_structure_penalty } from './penalties';
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

describe('computeEstimatedWeight', () => {
  const baseReq = { sector: 'uav', estimated_weight_kg: 25, material: 'al2024', flight_hours: 100, max_budget_eur: 15000, safety_factor: 2.5 };
  const params = { b: 5, Cr: 1.0, Ct: 0.4, sweep_deg: 0, twist_deg: 0, alpha_deg: 4, nacaCode: '2412' };
  const aero = { S: 3.5, AR: 7.14, CL: 0.6, CD: 0.03 } as any;

  it('produces a sane wing structural mass (~1.5-6 kg) for a 25 kg UAV, never > MTOW', () => {
    const w = computeEstimatedWeight(params as any, aero, baseReq as any);
    expect(w).toBeGreaterThan(1.5);
    expect(w).toBeLessThan(6);
    expect(w).toBeLessThan(25);
  });

  it('is independent of safety_factor (no ×SF mass inflation)', () => {
    const w15 = computeEstimatedWeight(params as any, aero, { ...baseReq, safety_factor: 1.5 } as any);
    const w40 = computeEstimatedWeight(params as any, aero, { ...baseReq, safety_factor: 4.0 } as any);
    expect(w15).toBe(w40);
  });
});

describe('compute_structure_penalty', () => {
  it('does NOT penalize over-design buckling FS (>10) — only real risk is penalized', () => {
    expect(compute_structure_penalty(0.12, 1.0, 5.0, 40)).toBe(1.0);
  });

  it('penalizes real buckling risk (fs < 1)', () => {
    expect(compute_structure_penalty(0.12, 1.0, 5.0, 0.5)).toBeLessThan(1);
  });
});

describe('computeFatiguePenalty', () => {
  const params = { b: 5, Cr: 1.0, Ct: 0.4, sweep_deg: 0, twist_deg: 0, alpha_deg: 4, nacaCode: '2412' } as any;

  it('returns 0 for low flight hours on durable material (bending stress far below endurance limit)', () => {
    const req = { sector: 'uav', estimated_weight_kg: 25, material: 'carbon', flight_hours: 10, safety_factor: 2.5 } as any;
    expect(computeFatiguePenalty(req, params)).toBe(0);
  });

  it('returns penalty when required cycles exceed material fatigue life', () => {
    // madera: fatigue_life 1e6 ciclos; 50000h * 120 ciclos/h = 6e6 > 1e6
    const req = { sector: 'uav', estimated_weight_kg: 25, material: 'wood', flight_hours: 50000, safety_factor: 2.5 } as any;
    expect(computeFatiguePenalty(req, params)).toBeGreaterThan(0);
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