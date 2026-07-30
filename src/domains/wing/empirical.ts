/**
 * Motor Aerodinámico Empírico
 * Basado en la Teoría de Línea Sustentadora de Prandtl y corrección de Helmbold.
 * Extraído exactamente del motor legado 'calcularAerodinamica'.
 */

import { generarNACA } from './naca';
import { LegacyWingPayload, LegacyWingInput } from '../../core/types';

// FIX (8): Re-exportación unificada de los tipos de entrada desde types.ts
export type { LegacyWingPayload, LegacyWingInput };

export interface AerodynamicResult {
  CL: number;
  CD: number;
  LD: number;
  Cm: number;
  S: number;
  AR: number;
  e: number;
  CD0: number;
  CDi: number;
  alpha0: number;
  a: number;
}

export function calcularEmpirico(params: LegacyWingInput): AerodynamicResult {
  const { Cr, Ct, b, sweep_deg, twist_deg, alpha_deg, nacaCode, isMultiElement, numElements = 2, flapGapMm = 12, flapOverlapMm = 8, flapAngleDeg = 25 } = params;
  
  const alpha = (alpha_deg * Math.PI) / 180;
  const sweep = (sweep_deg * Math.PI) / 180;

  // Área alar (trapezoidal) y Alargamiento
  const S = ((Cr + Ct) / 2) * b;
  const AR = S > 0 ? (b * b) / S : 1;

  // Obtener geometría 2D del perfil NACA
  const naca = generarNACA(nacaCode, 100);
  const m = naca.m;
  const t = naca.t;

  // Pendiente de sustentación 2D ideal (2*pi rad^-1)
  const a0 = 2 * Math.PI;

  // Factor de corrección de forma en planta
  const tau = 0.05;
  
  // Pendiente 3D para ala finita con corrección por flecha
  const cosSweep = Math.cos(sweep);
  const a = a0 / (1 + (a0 / (Math.PI * AR * cosSweep)) * (1 + tau));

  // Ángulo de sustentación nula (alpha0) estimado por el camber
  const alpha0 = -(m / 0.2) * 0.349;

  // Coeficiente de sustentación preliminar
  let CL_raw = a * (alpha - alpha0);

  // EFECTO MULTI-ELEMENTO F1 (Slot Energization & Flap Lift Boosting)
  let multiElementClBonus = 0;
  let multiElementCdPenalty = 0;
  if (isMultiElement || numElements > 1) {
    // Rendimiento óptimo del slot ocurre cuando gap ~ 12mm y overlap ~ 8mm
    const gapRatio = Math.max(0.2, Math.min(2.0, (flapGapMm || 12) / 12));
    const gapEfficiency = Math.exp(-Math.pow(gapRatio - 1.0, 2) * 2.5); // Eficiencia de succión de ranura
    
    const overlapRatio = Math.max(0.2, Math.min(2.0, (flapOverlapMm || 8) / 8));
    const overlapEfficiency = Math.exp(-Math.pow(overlapRatio - 1.0, 2) * 2.0);

    const flapRad = ((flapAngleDeg || 25) * Math.PI) / 180;
    const elemFactor = numElements >= 3 ? 1.45 : 1.0;
    
    // Incremento masivo de CL por flap ranurado multi-elemento
    multiElementClBonus = 1.15 * Math.sin(flapRad) * gapEfficiency * overlapEfficiency * elemFactor;
    multiElementCdPenalty = 0.028 * Math.pow(Math.sin(flapRad), 2) * elemFactor;
  }
  
  CL_raw += multiElementClBonus;
  
  // Clamped a límites físicos realistas (Hasta 3.8 con perfiles multi-elemento de F1)
  const maxClLimit = (isMultiElement || numElements > 1) ? 3.8 : 1.8;
  const CL = Math.max(-1.5, Math.min(maxClLimit, CL_raw));

  // Factor de eficiencia de Oswald (e) con corrección por afinamiento y flecha (Raymer/Shevell)
  const taper = Cr > 0 ? Ct / Cr : 1.0;
  const e_base = 1.78 * (1 - 0.045 * Math.pow(AR, 0.68)) - 0.64;
  const idealTaper = 0.45 - 0.1 * Math.sin(sweep);
  const taperFactor = 1 - 0.05 * Math.abs(taper - idealTaper);
  const sweepFactor = Math.pow(Math.cos(sweep), 0.5);
  let e = e_base * taperFactor * sweepFactor;
  e = Math.min(0.98, Math.max(0.45, e));

  // Resistencia inducida: CDi = CL^2 / (pi * e * AR)
  const CDi = (CL * CL) / (Math.PI * e * AR);

  // Tip correction for low aspect ratio (AR < 4), Prandtl-Hoerner
  let CDiCorrected = CDi;
  if (AR < 4) {
    const tipCorr = 1 - 1.2 * Math.pow(1.2 / Math.max(1.5, AR), 0.7);
    CDiCorrected /= Math.max(0.5, tipCorr);
  }

  // Resistencia parásita (CD0) en función del espesor t/c, Reynolds y elementos extra
  const CD0_base = 0.005;
  const CD0 = CD0_base + 0.0005 * (t / 0.12) + multiElementCdPenalty;
  const CD = Math.max(0.001, CD0 + CDiCorrected);

  // Eficiencia Aerodinámica (L/D)
  const LD = CD > 0 ? CL / CD : 0;

  // Coeficiente de momento de cabeceo Cm (alrededor del 25% de la cuerda)
  const Cm0 = -0.1 * (m / 0.02) - (multiElementClBonus * 0.22);
  const Cm = Cm0 * Math.cos(alpha);

  return {
    CL: Number(CL.toFixed(4)),
    CD: Number(CD.toFixed(4)),
    LD: Number(LD.toFixed(4)),
    Cm: Number(Cm.toFixed(4)),
    S: Number(S.toFixed(2)),
    AR: Number(AR.toFixed(2)),
    e: Number(e.toFixed(4)),
    CD0: Number(CD0.toFixed(5)),
    CDi: Number(CDiCorrected.toFixed(5)),
    alpha0: Number(alpha0.toFixed(4)),
    a: Number(a.toFixed(4))
  };
}

export const calcularAerodinamica = calcularEmpirico;
