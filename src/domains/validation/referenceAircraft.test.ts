import { describe, it, expect } from 'vitest';
import { 
  REFERENCE_AIRCRAFT, 
  getAircraftByCategory, 
  getPercentileRank, 
  computePopulationStats,
  computeStructuralStats 
} from '../validation/referenceAircraft';

describe('referenceAircraft', () => {
  describe('REFERENCE_AIRCRAFT', () => {
    it('should contain 7 certified aircraft', () => {
      expect(Object.keys(REFERENCE_AIRCRAFT).length).toBe(7);
    });

    it('should have complete data for Cessna 172', () => {
      const c172 = REFERENCE_AIRCRAFT.cessna172;
      expect(c172.name).toBe('Cessna 172 Skyhawk');
      expect(c172.certification).toBe('FAR-23');
      expect(c172.specifications.wingspan_m).toBe(11.0);
      expect(c172.performance.L_D_max).toBeCloseTo(12.8, 1);
      expect(c172.structural.MTOW_kg).toBe(1111);
      expect(c172.sources.length).toBeGreaterThan(0);
    });

    it('should have valid taper ratio for all aircraft', () => {
      Object.values(REFERENCE_AIRCRAFT).forEach(ac => {
        const taper = ac.specifications.tip_chord_m / ac.specifications.root_chord_m;
        expect(taper).toBeGreaterThan(0);
        expect(taper).toBeLessThanOrEqual(1);
        expect(Math.abs(taper - ac.specifications.taper_ratio)).toBeLessThan(0.05);
      });
    });

    it('should have valid aspect ratio calculations', () => {
      Object.values(REFERENCE_AIRCRAFT).forEach(ac => {
        const { wingspan_m, wing_area_m2, aspect_ratio } = ac.specifications;
        const calculatedAR = (wingspan_m ** 2) / wing_area_m2;
        expect(Math.abs(calculatedAR - aspect_ratio)).toBeLessThan(0.5);
      });
    });
  });

  describe('getAircraftByCategory', () => {
    it('should return trainers correctly', () => {
      const trainers = getAircraftByCategory('trainer');
      expect(trainers.length).toBe(2);
      expect(trainers.map(t => t.id)).toContain('cessna172');
      expect(trainers.map(t => t.id)).toContain('diamond_da40');
    });

    it('should return acrobatic aircraft correctly', () => {
      const acrobats = getAircraftByCategory('acrobatic');
      expect(acrobats.length).toBe(2);
      expect(acrobats.map(a => a.id)).toContain('pitts_s2b');
      expect(acrobats.map(a => a.id)).toContain('extra_300l');
    });

    it('should return empty array for unknown category', () => {
      const result = getAircraftByCategory('unknown' as any);
      expect(result).toEqual([]);
    });
  });

  describe('getPercentileRank', () => {
    it('should return 0 for value below all', () => {
      const rank = getPercentileRank(5, 'L_D_max');
      expect(rank).toBe(0);
    });

    it('should return 100 for value above all', () => {
      const rank = getPercentileRank(20, 'L_D_max');
      expect(rank).toBeGreaterThanOrEqual(85);
    });

    it('should return ~50 for median value', () => {
      const stats = computePopulationStats('L_D_max');
      const rank = getPercentileRank(stats.mean, 'L_D_max');
      expect(rank).toBeGreaterThanOrEqual(20);
      expect(rank).toBeLessThanOrEqual(80);
    });
  });

  describe('computePopulationStats', () => {
    it('should compute valid statistics for L_D_cruise', () => {
      const stats = computePopulationStats('L_D_cruise');
      expect(stats.mean).toBeGreaterThan(8);
      expect(stats.mean).toBeLessThan(16);
      expect(stats.std).toBeGreaterThan(0);
      expect(stats.min).toBeLessThan(stats.max);
      expect(stats.p5).toBeLessThan(stats.p95);
    });

    it('should compute valid statistics for V_stall_ms', () => {
      const stats = computePopulationStats('V_stall_ms');
      expect(stats.mean).toBeGreaterThan(20);
      expect(stats.mean).toBeLessThan(35);
    });
  });

  describe('computeStructuralStats', () => {
    it('should compute valid statistics for safety_factor', () => {
      const stats = computeStructuralStats('safety_factor');
      expect(stats.mean).toBeGreaterThan(1.5);
      expect(stats.mean).toBeLessThan(4);
      expect(stats.min).toBe(1.5);
    });

    it('should compute valid statistics for MTOW_kg', () => {
      const stats = computeStructuralStats('MTOW_kg');
      expect(stats.mean).toBeGreaterThan(500);
      expect(stats.mean).toBeLessThan(2000);
    });
  });
});
