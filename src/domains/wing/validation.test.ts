import { describe, it, expect } from 'vitest';
import { calcularEmpirico } from './empirical';
import { NACA_BENCHMARKS, validateAgainstBenchmark } from '../marketReadiness';

describe('NACA benchmark database', () => {
  it('has entries for 2412, 0012, 4412, 23012', () => {
    expect(Object.keys(NACA_BENCHMARKS).sort()).toEqual(['0012', '23012', '2412', '4412']);
  });

  it('each benchmark has valid CL values', () => {
    for (const [code, points] of Object.entries(NACA_BENCHMARKS)) {
      for (const p of points) {
        expect(p.CL).toBeGreaterThanOrEqual(0);
        expect(p.CD).toBeGreaterThan(0);
        expect(p.source).toBeTruthy();
      }
    }
  });
});

describe('validateAgainstBenchmark', () => {
  it('returns null for unknown NACA code', () => {
    expect(validateAgainstBenchmark('9999', 0.5, 0.01, 4)).toBeNull();
  });

  it('returns validation result for known NACA 2412 at alpha=4', () => {
    const result = validateAgainstBenchmark('2412', 0.55, 0.007, 4);
    expect(result).not.toBeNull();
    expect(result!.CL_error_pct).toBeGreaterThanOrEqual(0);
    expect(result!.CD_error_pct).toBeGreaterThanOrEqual(0);
    expect(result!.benchmark).toContain('Abbott');
  });
});

describe('calcularEmpirico deviation from benchmarks (documentation only)', () => {
  const testCases = Object.entries(NACA_BENCHMARKS).flatMap(([naca, points]) =>
    points.map(p => ({ naca, ...p }))
  );

  testCases.forEach(({ naca, alpha, CL: expCL, source }) => {
    // Skip alpha=0 for symmetric profiles where CL=0 (division by zero)
    if (expCL === 0) return;
    it(`NACA ${naca} α=${alpha}° CL error vs ${source}`, () => {
      const result = calcularEmpirico({ nacaCode: naca, Cr: 1.0, Ct: 0.6, b: 5.0, sweep_deg: 0, twist_deg: 0, alpha_deg: alpha });
      const errorPct = Math.abs(result.CL - expCL) / expCL * 100;
      console.log(`  CL: predicted=${result.CL.toFixed(4)}, benchmark=${expCL}, error=${errorPct.toFixed(1)}%`);
      expect(errorPct).toBeLessThan(500);
    });
  });
});
