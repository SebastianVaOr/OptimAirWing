import { describe, it, expect } from 'vitest';
import { calcularEmpirico } from './empirical';

describe('calcularEmpirico', () => {
  const baseParams = {
    nacaCode: '2412', Cr: 1.2, Ct: 0.8, b: 5.0,
    sweep_deg: 0, twist_deg: 0, alpha_deg: 4
  };

  it('returns CL > 0 for positive alpha', () => {
    const res = calcularEmpirico(baseParams);
    expect(res.CL).toBeGreaterThan(0);
    expect(res.CD).toBeGreaterThan(0);
  });

  it('computes L/D ratio correctly', () => {
    const res = calcularEmpirico(baseParams);
    expect(res.LD).toBeCloseTo(res.CL / res.CD, 1);
  });

  it('increases CL with alpha', () => {
    const low = calcularEmpirico({ ...baseParams, alpha_deg: 2 });
    const high = calcularEmpirico({ ...baseParams, alpha_deg: 8 });
    expect(high.CL).toBeGreaterThan(low.CL);
  });

  it('has finite S and AR', () => {
    const res = calcularEmpirico(baseParams);
    expect(res.S).toBeGreaterThan(0);
    expect(res.AR).toBeGreaterThan(0);
  });

  it('multi-element F1 wing with flap generates different CL', () => {
    // Gap/overlap escalados a la cuerda: gap_opt ≈ 0.015·c_flap, overlap_opt ≈ 0.01·c_flap
    // c_flap ≈ 0.25·mean_chord = 0.25·1.0 = 0.25m → gap_opt ≈ 3.75mm, overlap_opt ≈ 2.5mm
    const multi = calcularEmpirico({ ...baseParams, isMultiElement: true, numElements: 2, flapAngleDeg: 10, flapGapMm: 4, flapOverlapMm: 3 });
    expect(multi.CL).toBeGreaterThan(0.5);
    expect(multi.CD).toBeGreaterThan(0);
  });
});
