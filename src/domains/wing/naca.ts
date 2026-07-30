/**
 * Módulo NACA Airfoil Generator
 * Extraído y validado del código legacy. Soporta perfiles NACA de 4 y 5 dígitos.
 */

export interface NACAPoints {
  x_u: number[];
  y_u: number[];
  x_l: number[];
  y_l: number[];
  m: number;
  p: number;
  t: number;
}

export function generarNACA(codigo: string, numPuntos = 200): NACAPoints {
  let cleanCode = codigo ? codigo.trim() : '2412';
  
  // Validar formato de 4 dígitos (o fallback a 2412)
  if (!/^\d{4}$/.test(cleanCode) && !/^\d{5}$/.test(cleanCode)) {
    console.warn(`Código NACA inválido '${cleanCode}', utilizando '2412' por defecto`);
    cleanCode = '2412';
  }

  let m = 0;
  let p = 0;
  let t = 0.12;

  if (cleanCode.length === 4) {
    m = parseInt(cleanCode[0], 10) / 100; // Máximo camber (m/100)
    p = parseInt(cleanCode[1], 10) / 10;  // Posición del máximo camber (p/10)
    t = parseInt(cleanCode.slice(2), 10) / 100; // Espesor máximo (t/100)
  } else if (cleanCode.length === 5) {
    // Para NACA de 5 dígitos (ej. 23012)
    const cl_design = (parseInt(cleanCode[0], 10) * 3) / 20;
    p = parseInt(cleanCode.slice(1, 3), 10) / 200;
    t = parseInt(cleanCode.slice(3), 10) / 100;
    m = cl_design * 0.05; // aproximación lineal de camber
  }

  const x: number[] = [];
  for (let i = 0; i < numPuntos; i++) {
    x.push(i / (numPuntos - 1));
  }

  // Línea de curvatura media (camber)
  function yc(xx: number): number {
    if (p <= 0) return 0;
    if (xx < p) {
      return (m / (p * p)) * (2 * p * xx - xx * xx);
    } else {
      return (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * xx - xx * xx);
    }
  }

  // Derivada de la línea de curvatura
  function dyc_dx(xx: number): number {
    if (p <= 0) return 0;
    if (xx < p) {
      return ((2 * m) / (p * p)) * (p - xx);
    } else {
      return ((2 * m) / ((1 - p) * (1 - p))) * (p - xx);
    }
  }

  // Distribución de espesor (NACA 4-digit thickness distribution equation)
  function yt(xx: number): number {
    const a0 = 0.2969;
    const a1 = -0.1260;
    const a2 = -0.3516;
    const a3 = 0.2843;
    const a4 = -0.1015;
    return (t / 0.2) * (a0 * Math.sqrt(xx) + a1 * xx + a2 * xx * xx + a3 * Math.pow(xx, 3) + a4 * Math.pow(xx, 4));
  }

  const x_u: number[] = [];
  const y_u: number[] = [];
  const x_l: number[] = [];
  const y_l: number[] = [];

  for (let i = 0; i < numPuntos; i++) {
    const xx = x[i];
    const yt_val = yt(xx);
    const theta = Math.atan(dyc_dx(xx));
    const sin_t = Math.sin(theta);
    const cos_t = Math.cos(theta);

    // Borde Superior
    x_u.push(xx - yt_val * sin_t);
    y_u.push(yc(xx) + yt_val * cos_t);

    // Borde Inferior
    x_l.push(xx + yt_val * sin_t);
    y_l.push(yc(xx) - yt_val * cos_t);
  }

  const teThickness = Math.abs(y_u[numPuntos - 1] - y_l[numPuntos - 1]);
  if (teThickness < 0.001) {
    console.warn(`NACA ${codigo}: trailing edge thickness (${(teThickness * 100).toFixed(2)}% chord) below minimum 0.1% — may cause structural failure`);
  }

  return { x_u, y_u, x_l, y_l, m, p, t };
}

export function generateNaca4Points(codigo: string, numPuntos = 80) {
  const naca = generarNACA(codigo, numPuntos);
  const upper = naca.x_u.map((x, i) => ({ x, y: naca.y_u[i] }));
  const lower = naca.x_l.map((x, i) => ({ x, y: naca.y_l[i] }));
  return { upper, lower };
}
