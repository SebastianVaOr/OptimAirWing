import { describe, it, expect } from 'vitest';
import { legacyToWingParams, wingParamsToLegacy } from './store';

describe('legacyToWingParams', () => {
  it('converts legacy payload correctly', () => {
    const result = legacyToWingParams({
      nacaCode: '2412', Cr: 3, Ct: 1.5, b: 10, sweep_deg: 5, twist_deg: -2, alpha_deg: 4,
    });
    expect(result.schema_version).toBe('1.0.0');
    expect(result.geometry.planform.span_m).toBe(10);
    expect(result.geometry.planform.taper_ratio).toBe(0.5);
    expect(result.geometry.airfoil.naca_code).toBe('2412');
  });

  it('clamps taper ratio between 0.05 and 1.0', () => {
    const result = legacyToWingParams({
      nacaCode: '2412', Cr: 0.02, Ct: 2, b: 5, sweep_deg: 0, twist_deg: 0, alpha_deg: 2,
    });
    expect(result.geometry.planform.taper_ratio).toBe(1.0);
  });
});

describe('wingParamsToLegacy', () => {
  it('round-trips correctly', () => {
    const params = { nacaCode: '6412', Cr: 3, Ct: 1.5, b: 10, sweep_deg: 5, twist_deg: -2, alpha_deg: 4 };
    const wp = legacyToWingParams(params);
    const back = wingParamsToLegacy(wp);
    expect(back.nacaCode).toBe('6412');
    expect(back.Cr).toBe(3);
    expect(back.Ct).toBeCloseTo(1.5);
  });
});
