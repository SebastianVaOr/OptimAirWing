import { LegacyWingPayload } from '../../core/types';
import { generarNACA } from './naca';

export interface CFDValidationResult {
  solver: string;
  cfd: {
    CL: number;
    CD: number;
    Cm: number;
  };
  baseline: {
    CL: number;
    CD: number;
  };
  deltaCLPct: number;
  deltaCDPct: number;
  validated: boolean;
  statusLabel: 'Validado' | 'Revisar';
}

/**
 * Cross-check empírico de línea sustentadora (segundo orden) contra el modelo base.
 * No es CFD externo: es una verificación sincrónica de coherencia del modelo.
 */
export function submitAndPollCFD(
  params: LegacyWingPayload,
  baselineAero: { CL: number; CD: number; Cm?: number }
): CFDValidationResult {
  const Cr = params.Cr || 1.2;
  const Ct = params.Ct || 0.8;
  const b = params.b || 5.0;
  const alpha = params.alpha_deg || 4.0;

  const S = ((Cr + Ct) / 2) * b;
  const AR = (b * b) / Math.max(0.01, S);
  const OswaldE = 0.86;

  // Modelo de referencia con camber: CL = a*(alpha - alpha0)
  const naca = generarNACA(params.nacaCode, 20);
  const alpha0Ref = -(naca.m / 0.2) * 0.349; // mismo estimador de ángulo de sustentación nula que empirical.ts
  const alphaRad = (alpha * Math.PI) / 180;

  const a_ref = (2 * Math.PI) / (1 + (2 * Math.PI) / (Math.PI * OswaldE * AR));
  const CL_ref = a_ref * (alphaRad - alpha0Ref);
  const CD0 = 0.0145;
  const CD_i = (CL_ref * CL_ref) / (Math.PI * OswaldE * AR);
  const CD_ref = CD0 + CD_i;
  const Cm_ref = -0.048 - 0.018 * (alpha / 10.0);

  const deltaCLPct = parseFloat(
    ((Math.abs(CL_ref - baselineAero.CL) / Math.max(0.001, Math.abs(baselineAero.CL))) * 100).toFixed(2)
  );
  const deltaCDPct = parseFloat(
    ((Math.abs(CD_ref - baselineAero.CD) / Math.max(0.001, baselineAero.CD)) * 100).toFixed(2)
  );

  // Bandas de tolerancia realistas para un cross-check empírico (12-18%)
  const validated = deltaCLPct < 15.0 && deltaCDPct < 18.0;

  return {
    solver: 'empirical_lifting_line_crosscheck',
    cfd: {
      CL: parseFloat(CL_ref.toFixed(4)),
      CD: parseFloat(Math.max(0.005, CD_ref).toFixed(4)),
      Cm: parseFloat(Cm_ref.toFixed(4)),
    },
    baseline: {
      CL: baselineAero.CL,
      CD: baselineAero.CD,
    },
    deltaCLPct,
    deltaCDPct,
    validated,
    statusLabel: validated ? 'Validado' : 'Revisar',
  };
}