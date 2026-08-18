/**
 * Caja de larguero compartida para los módulos estructurales.
 * Caja hueca realista: profundidad 55% del espesor relativo, ancho 35% de la cuerda.
 */

export interface SparBox {
  I_m4: number; // Inercia de flexión sobre el eje horizontal
  A_m2: number; // Área de la sección transversal
  h_m: number;  // Profundidad de la caja (canto del larguero)
}

export function nacaThicknessRatio(nacaCode?: string): number {
  const code = (nacaCode || '2412').trim();
  if (/^\d{4}$/.test(code)) {
    return parseInt(code.slice(2), 10) / 100;
  }
  if (/^\d{5}$/.test(code)) {
    return parseInt(code.slice(3), 10) / 100;
  }
  return 0.12;
}

export function computeSparBox(rootChordM: number, tOverC: number): SparBox {
  const h = Math.max(1e-3, 0.55 * rootChordM * Math.max(0.05, tOverC));
  const w = Math.max(1e-3, 0.35 * rootChordM);
  const tWall = Math.max(0.0015, 0.002 * rootChordM);
  const wIn = Math.max(1e-4, w - 2 * tWall);
  const hIn = Math.max(1e-4, h - 2 * tWall);
  const I_m4 = Math.max(1e-9, (w * h * h * h - wIn * hIn * hIn * hIn) / 12);
  const A_m2 = Math.max(1e-6, w * h - wIn * hIn);
  return { I_m4, A_m2, h_m: h };
}

export function computeSparTorsionConstant(box: SparBox, rootChordM: number): number {
  const w = Math.max(1e-3, 0.35 * rootChordM);
  const tWall = Math.max(0.0015, 0.002 * rootChordM);
  const A_enc = w * box.h_m;
  const perimeter = 2 * (w + box.h_m);
  // Constante de torsión de pared delgada de una sola célula: J ≈ 4·A²·t / perímetro
  return (4 * A_enc * A_enc * tWall) / Math.max(1e-9, perimeter);
}