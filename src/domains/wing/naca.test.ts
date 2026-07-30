import { describe, it, expect } from 'vitest';
import { generarNACA } from './naca';

describe('generarNACA', () => {
  it('generates correct number of points', () => {
    const res = generarNACA('2412', 100);
    expect(res.x_u).toHaveLength(100);
    expect(res.y_u).toHaveLength(100);
    expect(res.x_l).toHaveLength(100);
    expect(res.y_l).toHaveLength(100);
  });

  it('upper surface starts near zero and ends near zero', () => {
    const res = generarNACA('0012', 50);
    expect(res.y_u[0]).toBeCloseTo(0, 2);
    expect(res.y_u[res.y_u.length - 1]).toBeCloseTo(0, 2);
  });

  it('symmetric NACA 0012 has zero camber', () => {
    const res = generarNACA('0012', 50);
    for (let i = 0; i < res.y_u.length; i++) {
      expect(res.y_u[i]).toBeCloseTo(-res.y_l[i], 2);
    }
  });

  it('cambered NACA 4412 has positive camber', () => {
    const res = generarNACA('4412', 80);
    const maxUpper = Math.max(...res.y_u);
    const minLower = Math.min(...res.y_l);
    expect(maxUpper).toBeGreaterThan(Math.abs(minLower));
  });

  it('thickness ratio matches naca code', () => {
    const res = generarNACA('2412', 60);
    const maxUpper = Math.max(...res.y_u);
    const minLower = Math.min(...res.y_l);
    const maxThickness = maxUpper - minLower;
    expect(maxThickness).toBeCloseTo(0.12, 1);
  });
});
