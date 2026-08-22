import { describe, it, expect } from 'vitest';
import { 
  computeEngineeringJudgment, 
  getVerdictColor, 
  getSeverityColor,
  Verdict 
} from '../engineering/judgment';
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

const mockAero = {
  CL: 0.52,
  CD: 0.012,
  Cm: -0.05,
  LD: 11.5,
  S: 12.5,
  AR: 8.0,
  e: 0.82,
  CD0: 0.008,
  CDi: 0.004,
  alpha0: 0,
  a: 5.5,
  CL_max: 1.5,
  alpha_stall_deg: 12,
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

describe('judgment', () => {
  describe('computeEngineeringJudgment', () => {
    it('should return a valid judgment object', () => {
      const result = computeEngineeringJudgment(mockParams, mockAero, mockStructural, mockRequirements);
      
      expect(result.verdict).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.summary).toBeDefined();
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.tradeoffs).toBeInstanceOf(Array);
    });

    it('should include calibrated score and percentile', () => {
      const result = computeEngineeringJudgment(mockParams, mockAero, mockStructural, mockRequirements);
      
      expect(result.calibratedScore).toBeDefined();
      expect(result.calibratedScore).toBeGreaterThanOrEqual(0);
      expect(result.calibratedScore).toBeLessThanOrEqual(100);
      expect(result.percentileRank).toBeDefined();
      expect(result.percentileRank).toBeGreaterThanOrEqual(0);
      expect(result.percentileRank).toBeLessThanOrEqual(100);
    });

    it('should include RPN with bootstrap CI', () => {
      const result = computeEngineeringJudgment(mockParams, mockAero, mockStructural, mockRequirements);
      
      expect(result.rpn).toBeDefined();
      expect(result.rpn).toBeGreaterThan(0);
      expect(result.rpnCI).toBeDefined();
      expect(result.rpnCI![0]).toBeLessThanOrEqual(result.rpn!);
      expect(result.rpnCI![1]).toBeGreaterThanOrEqual(result.rpn!);
    });

    it('should reject design with critical safety factor', () => {
      const criticalStructural = {
        ...mockStructural,
        flexuralSafetyFactor: 1.2,
        safetyFactorCI: [1.0, 1.4] as [number, number],
      };
      
      const result = computeEngineeringJudgment(mockParams, mockAero, criticalStructural, mockRequirements);
      
      expect(result.verdict).toBe('review_required');
      expect(result.score).toBeLessThan(60);
      expect(result.warnings.some(w => w.severity === 'critical')).toBe(true);
    });

    it('should accept design with high safety factor', () => {
      const safeStructural = {
        ...mockStructural,
        flexuralSafetyFactor: 2.5,
        safetyFactorCI: [2.2, 2.8] as [number, number],
      };
      
      const result = computeEngineeringJudgment(mockParams, mockAero, safeStructural, mockRequirements);
      
      expect(result.verdict).toBe('accept');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should detect flutter risk', () => {
      const flutterStructural = {
        ...mockStructural,
        flutterRisk: 'alto' as const,
        flutterSpeedMs: 60,
      };
      
      const result = computeEngineeringJudgment(mockParams, mockAero, flutterStructural, mockRequirements);
      
      expect(result.warnings.some(w => w.id === 'FLUTTER_HIGH')).toBe(true);
    });

    it('should detect stall margin issues', () => {
      const highAlphaAero = {
        ...mockAero,
        alpha_stall_deg: 10,
      };
      
      const result = computeEngineeringJudgment(
        { ...mockParams, alpha_deg: 8 },
        highAlphaAero,
        mockStructural,
        mockRequirements
      );
      
      expect(result.warnings.some(w => w.id.includes('STALL'))).toBe(true);
    });

    it('should detect sweep issues for low-speed sector', () => {
      const highSweepParams = { ...mockParams, sweep_deg: 25 };
      
      const result = computeEngineeringJudgment(highSweepParams, mockAero, mockStructural, mockRequirements);
      
      expect(result.warnings.some(w => w.id === 'SWEEP_RANGE')).toBe(true);
    });

    it('should generate rationale for aerodynamic category', () => {
      const result = computeEngineeringJudgment(mockParams, mockAero, mockStructural, mockRequirements);
      
      expect(result.rationale.aerodynamic.length).toBeGreaterThan(0);
    });

    it('should sort warnings by severity', () => {
      const criticalStructural = {
        ...mockStructural,
        flexuralSafetyFactor: 1.2,
        flutterRisk: 'alto' as const,
      };
      
      const result = computeEngineeringJudgment(mockParams, mockAero, criticalStructural, mockRequirements);
      
      const severities = result.warnings.map(w => w.severity);
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      
      for (let i = 1; i < severities.length; i++) {
        expect(severityOrder[severities[i - 1]]).toBeLessThanOrEqual(severityOrder[severities[i]]);
      }
    });
  });

  describe('getVerdictColor', () => {
    it('should return correct colors for each verdict', () => {
      expect(getVerdictColor('accept')).toBe('text-ok');
      expect(getVerdictColor('optimize')).toBe('text-accent');
      expect(getVerdictColor('review_required')).toBe('text-warn');
      expect(getVerdictColor('rejected')).toBe('text-danger');
    });
  });

  describe('getSeverityColor', () => {
    it('should return correct colors for each severity', () => {
      expect(getSeverityColor('critical')).toBe('text-danger');
      expect(getSeverityColor('high')).toBe('text-warn');
      expect(getSeverityColor('medium')).toBe('text-accent');
      expect(getSeverityColor('low')).toBe('text-dim');
    });
  });
});
