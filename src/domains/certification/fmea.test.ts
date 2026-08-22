import { describe, it, expect } from 'vitest';
import { computeFMEA, getRPNSeverityColor, getRPNSeverityLabel } from '../certification/fmea';
import { LegacyWingPayload, DesignRequirements } from '../../core/types';

const mockParams: LegacyWingPayload = {
  nacaCode: '2412',
  Cr: 1.5,
  Ct: 1.0,
  b: 10.0,
  sweep_deg: 3,
  twist_deg: -1,
  alpha_deg: 4,
  Re: 1e6,
  Mach: 0.05,
};

const mockRequirements: DesignRequirements = {
  sector: 'uav',
  estimated_weight_kg: 800,
  material: 'al2024',
  flight_hours: 500,
  max_budget_eur: 5000,
  safety_factor: 1.5,
};

const mockStructural = {
  bendingMomentNm: 500,
  maxStressMpa: 150,
  flexuralSafetyFactor: 1.52,
  safetyFactorCI: [1.38, 1.66] as [number, number],
  tipDeflectionMm: 50,
  tipDeflectionPercent: 1.2,
  divergenceSpeedMs: 85,
  divergenceMargin: 1.8,
  flutterRisk: 'bajo' as const,
  flutterSpeedMs: 120,
  flutterMargin: 2.5,
  aileronReversalRisk: 'bajo' as const,
  wingLoadingKgM2: 60,
  stallSpeedMs: 15.3,
  cruiseVelocityMs: 50,
};

describe('fmea', () => {
  describe('computeFMEA', () => {
    it('should return 10 FMEA items', () => {
      const result = computeFMEA(mockParams, mockStructural, mockRequirements);
      expect(result.items.length).toBe(10);
    });

    it('should sort items by RPN descending', () => {
      const result = computeFMEA(mockParams, mockStructural, mockRequirements);
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].rpn).toBeGreaterThanOrEqual(result.items[i].rpn);
      }
    });

    it('should have valid RPN values (1-1000)', () => {
      const result = computeFMEA(mockParams, mockStructural, mockRequirements);
      result.items.forEach(item => {
        expect(item.rpn).toBeGreaterThanOrEqual(1);
        expect(item.rpn).toBeLessThanOrEqual(1000);
        expect(item.severity).toBeGreaterThanOrEqual(1);
        expect(item.severity).toBeLessThanOrEqual(10);
        expect(item.occurrence).toBeGreaterThanOrEqual(1);
        expect(item.occurrence).toBeLessThanOrEqual(10);
        expect(item.detection).toBeGreaterThanOrEqual(1);
        expect(item.detection).toBeLessThanOrEqual(10);
      });
    });

    it('should detect critical risks for low safety factor', () => {
      const criticalStructural = {
        ...mockStructural,
        flexuralSafetyFactor: 1.2,
        safetyFactorCI: [1.0, 1.4] as [number, number],
      };
      const result = computeFMEA(mockParams, criticalStructural, mockRequirements);
      expect(result.criticalCount).toBeGreaterThan(0);
      expect(result.overallRisk).toBe('critical');
      expect(result.certificationStatus).toBe('fail');
    });

    it('should detect high risks for flutter', () => {
      const flutterStructural = {
        ...mockStructural,
        flutterRisk: 'alto' as const,
        divergenceMargin: 1.1,
      };
      const result = computeFMEA(mockParams, flutterStructural, mockRequirements);
      expect(result.maxRPN).toBeGreaterThan(100);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should have lower risk metrics for safe design', () => {
      const safeStructural = {
        ...mockStructural,
        flexuralSafetyFactor: 2.5,
        safetyFactorCI: [2.2, 2.8] as [number, number],
        divergenceMargin: 2.5,
        flutterRisk: 'bajo' as const,
        flutterSpeedMs: 150,
        aileronReversalRisk: 'bajo' as const,
      };
      const result = computeFMEA(mockParams, safeStructural, mockRequirements);
      expect(result.criticalCount).toBeLessThan(5);
      expect(result.maxRPN).toBeLessThan(700);
    });

    it('should include FAR references', () => {
      const result = computeFMEA(mockParams, mockStructural, mockRequirements);
      const withRefs = result.items.filter(i => i.farReference);
      expect(withRefs.length).toBeGreaterThan(5);
    });

    it('should compute average RPN correctly', () => {
      const result = computeFMEA(mockParams, mockStructural, mockRequirements);
      const calculatedAvg = result.items.reduce((sum, i) => sum + i.rpn, 0) / result.items.length;
      expect(result.avgRPN).toBeCloseTo(calculatedAvg, 0);
    });
  });

  describe('getRPNSeverityColor', () => {
    it('should return danger for RPN > 100', () => {
      expect(getRPNSeverityColor(150)).toBe('text-danger');
      expect(getRPNSeverityColor(500)).toBe('text-danger');
    });

    it('should return warn for RPN 50-100', () => {
      expect(getRPNSeverityColor(75)).toBe('text-warn');
      expect(getRPNSeverityColor(100)).toBe('text-warn');
    });

    it('should return ok for RPN < 50', () => {
      expect(getRPNSeverityColor(30)).toBe('text-ok');
      expect(getRPNSeverityColor(1)).toBe('text-ok');
    });
  });

  describe('getRPNSeverityLabel', () => {
    it('should return CRÍTICO for RPN > 100', () => {
      expect(getRPNSeverityLabel(150)).toBe('CRÍTICO');
    });

    it('should return ALTO for RPN 50-100', () => {
      expect(getRPNSeverityLabel(75)).toBe('ALTO');
    });

    it('should return ACEPTABLE for RPN < 50', () => {
      expect(getRPNSeverityLabel(30)).toBe('ACEPTABLE');
    });
  });
});
