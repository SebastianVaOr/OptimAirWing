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

// Parámetros de la mean-line NACA de 5 dígitos (NACA Report 460/824) para Cli de diseño 0.3.
// r = punto de unión de la mean-line; k1 se escala linealmente por (primer dígito)/2.
const NACA5_STANDARD: Record<number, { r: number; k1: number }> = {
  10: { r: 0.0580, k1: 361.400 },
  20: { r: 0.1260, k1: 51.640 },
  30: { r: 0.2025, k1: 15.957 },
  40: { r: 0.2900, k1: 6.643 },
  50: { r: 0.3910, k1: 3.230 },
};

const NACA5_REFLEX: Record<number, { r: number; k1: number; k21: number }> = {
  21: { r: 0.1300, k1: 51.990, k21: 0.000764 },
  31: { r: 0.2170, k1: 15.793, k21: 0.00677 },
  41: { r: 0.3180, k1: 6.520, k21: 0.0303 },
  51: { r: 0.4410, k1: 3.191, k21: 0.1355 },
};

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
  let isFive = false;
  let fiveR = 0;
  let fiveK1 = 0;
  let fiveK21 = 0;

  if (cleanCode.length === 4) {
    m = parseInt(cleanCode[0], 10) / 100; // Máximo camber (m/100)
    p = parseInt(cleanCode[1], 10) / 10;  // Posición del máximo camber (p/10)
    t = parseInt(cleanCode.slice(2), 10) / 100; // Espesor máximo (t/100)
  } else if (cleanCode.length === 5) {
    // Mean-line real de 5 dígitos (NACA Report 460/824)
    const first = parseInt(cleanCode[0], 10); // 2/3 del Cl de diseño (en décimas)
    const pos = parseInt(cleanCode.slice(1, 3), 10); // 2ª+3ª cifra: posición de máxima comba
    const reflex = cleanCode[2] === '1';
    p = parseInt(cleanCode[1], 10) / 20; // posición de máxima comba (2ª cifra / 20)
    t = parseInt(cleanCode.slice(3), 10) / 100; // Espesor máximo (t/100)
    if (reflex) {
      const e = NACA5_REFLEX[pos] || NACA5_REFLEX[31];
      fiveR = e.r;
      fiveK1 = e.k1 * (first / 2); // escalado lineal de Cli=0.3 a Cli=3*C/20
      fiveK21 = e.k21;
    } else {
      const e = NACA5_STANDARD[pos] || NACA5_STANDARD[30];
      fiveR = e.r;
      fiveK1 = e.k1 * (first / 2);
      fiveK21 = 0;
    }
    isFive = true;
  }

  const x: number[] = [];
  for (let i = 0; i < numPuntos; i++) {
    x.push(i / (numPuntos - 1));
  }

  // Mean-line NACA de 5 dígitos (tipo 1 y reflex, Report 460/824)
  function yc5(xx: number): number {
    if (fiveK21 > 0) {
      const r3 = fiveR * fiveR * fiveR;
      const c1 = fiveK21 * Math.pow(1 - fiveR, 3);
      if (xx < fiveR) {
        return (fiveK1 / 6) * (Math.pow(xx - fiveR, 3) - c1 * xx - r3 * xx + r3);
      }
      return (fiveK1 / 6) * (fiveK21 * Math.pow(xx - fiveR, 3) - c1 * xx - r3 * xx + r3);
    }
    if (xx < fiveR) {
      return (fiveK1 / 6) * (Math.pow(xx, 3) - 3 * fiveR * xx * xx + fiveR * fiveR * (3 - fiveR) * xx);
    }
    return (fiveK1 * Math.pow(fiveR, 3) / 6) * (1 - xx);
  }

  function dyc5(xx: number): number {
    if (fiveK21 > 0) {
      const r3 = fiveR * fiveR * fiveR;
      const c1 = fiveK21 * Math.pow(1 - fiveR, 3);
      if (xx < fiveR) {
        return (fiveK1 / 6) * (3 * Math.pow(xx - fiveR, 2) - c1 - r3);
      }
      return (fiveK1 / 6) * (3 * fiveK21 * Math.pow(xx - fiveR, 2) - c1 - r3);
    }
    if (xx < fiveR) {
      return (fiveK1 / 6) * (3 * xx * xx - 6 * fiveR * xx + fiveR * fiveR * (3 - fiveR));
    }
    return -(fiveK1 * Math.pow(fiveR, 3)) / 6;
  }

  // Línea de curvatura media (camber)
  function yc(xx: number): number {
    if (isFive) return yc5(xx);
    if (p <= 0) return 0;
    if (xx < p) {
      return (m / (p * p)) * (2 * p * xx - xx * xx);
    } else {
      return (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * xx - xx * xx);
    }
  }

  // Derivada de la línea de curvatura
  function dyc_dx(xx: number): number {
    if (isFive) return dyc5(xx);
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

  let maxCamber = 0;

  for (let i = 0; i < numPuntos; i++) {
    const xx = x[i];
    const yc_val = yc(xx);
    if (yc_val > maxCamber) maxCamber = yc_val;
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

  if (isFive) {
    m = maxCamber; // comba máxima real de la mean-line de 5 dígitos
  }

  return { x_u, y_u, x_l, y_l, m, p, t };
}

/**
 * Calcula el ángulo de sustentación nula (α₀) mediante integración numérica
 * de la teoría de lámina delgada sobre la mean-line real del perfil NACA.
 * Fórmula: α₀ = −(1/π)·∫₀^π (dy_c/dx)·(cosθ − 1)·dθ, con x = (1−cosθ)/2
 * (Abbott & von Doenhoff, Theory of Wing Sections)
 * 
 * Para NACA 4 dígitos: la fórmula cerrada es α₀ = −(2m/π)·[(1/p)·ln(p/(1-p)) + ...]
 * Implementamos integración numérica para máxima precisión y soporte de 5 dígitos.
 */
export function computeAlphaZero(codigo: string): number {
  const cleanCode = codigo ? codigo.trim() : '2412';
  
  // Parse NACA code parameters
  let m = 0, p = 0;
  let isFive = false;
  let fiveR = 0, fiveK1 = 0, fiveK21 = 0;
  
  if (/^\d{4}$/.test(cleanCode)) {
    m = parseInt(cleanCode[0], 10) / 100;
    p = parseInt(cleanCode[1], 10) / 10;
  } else if (/^\d{5}$/.test(cleanCode)) {
    const first = parseInt(cleanCode[0], 10);
    const pos = parseInt(cleanCode.slice(1, 3), 10);
    const reflex = cleanCode[2] === '1';
    p = parseInt(cleanCode[1], 10) / 20;
    
    if (reflex) {
      const e = NACA5_REFLEX[pos] || NACA5_REFLEX[31];
      fiveR = e.r;
      fiveK1 = e.k1 * (first / 2);
      fiveK21 = e.k21;
    } else {
      const e = NACA5_STANDARD[pos] || NACA5_STANDARD[30];
      fiveR = e.r;
      fiveK1 = e.k1 * (first / 2);
      fiveK21 = 0;
    }
    isFive = true;
  }
  
  // Perfiles simétricos: α₀ = 0
  if (!isFive && m === 0) return 0;
  if (isFive && fiveK1 === 0) return 0;
  
  // Función derivada de la mean-line
  function dyc_dx(xx: number): number {
    if (isFive) {
      if (fiveK21 > 0) {
        const r3 = fiveR * fiveR * fiveR;
        const c1 = fiveK21 * Math.pow(1 - fiveR, 3);
        if (xx < fiveR) {
          return (fiveK1 / 6) * (3 * Math.pow(xx - fiveR, 2) - c1 - r3);
        }
        return (fiveK1 / 6) * (3 * fiveK21 * Math.pow(xx - fiveR, 2) - c1 - r3);
      }
      if (xx < fiveR) {
        return (fiveK1 / 6) * (3 * xx * xx - 6 * fiveR * xx + fiveR * fiveR * (3 - fiveR));
      }
      return -(fiveK1 * Math.pow(fiveR, 3)) / 6;
    }
    // NACA 4 dígitos
    if (p <= 0) return 0;
    if (xx < p) {
      return ((2 * m) / (p * p)) * (p - xx);
    } else {
      return ((2 * m) / ((1 - p) * (1 - p))) * (p - xx);
    }
  }
  
  // Integración numérica trapecial sobre θ ∈ [0, π]
  const nTheta = 100;
  let integral = 0;
  
  for (let i = 0; i <= nTheta; i++) {
    const theta = (i / nTheta) * Math.PI;
    const x = (1 - Math.cos(theta)) / 2;
    const dydx = dyc_dx(x);
    const weight = (i === 0 || i === nTheta) ? 0.5 : 1.0;
    integral += weight * dydx * (Math.cos(theta) - 1);
  }
  
  const dTheta = Math.PI / nTheta;
  const alpha0_rad = -(1 / Math.PI) * integral * dTheta;
  
  return parseFloat(alpha0_rad.toFixed(6));
}

export function generateNaca4Points(codigo: string, numPuntos = 80) {
  const naca = generarNACA(codigo, numPuntos);
  const upper = naca.x_u.map((x, i) => ({ x, y: naca.y_u[i] }));
  const lower = naca.x_l.map((x, i) => ({ x, y: naca.y_l[i] }));
  return { upper, lower };
}
