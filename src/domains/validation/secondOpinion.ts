/**
 * Second Opinion Module - Compare with Reference Designs
 *
 * Allows users to compare their design against reference aircraft
 * (Cessna 172, Pitts Special, etc.) to understand trade-offs.
 */

import { LegacyWingPayload } from '../../core/types';

export interface ReferenceDesign {
  name: string;
  category: string;
  span: number;  // m
  Cr: number;  // m
  Ct: number;  // m
  sweep: number;  // deg
  twist: number;  // deg
  weight: number;  // kg
  payload: number;  // kg
  L_D: number;
  stallSpeed: number;  // m/s
  cruiseSpeed: number;  // m/s
  notes: string;
}

export const REFERENCE_DESIGNS: Record<string, ReferenceDesign> = {
  cessna172: {
    name: 'Cessna 172',
    category: 'Entrenamiento',
    span: 11.0,
    Cr: 1.8,
    Ct: 1.2,
    sweep: 2.1,
    twist: -1.0,
    weight: 1050,
    payload: 260,
    L_D: 9.5,
    stallSpeed: 19.5,
    cruiseSpeed: 60,
    notes: 'Referencia estándar para entrenamiento. Diseño conservador con gran margen de stall.',
  },
  pittsSpecial: {
    name: 'Pitts Special',
    category: 'Acrobático',
    span: 6.4,
    Cr: 1.3,
    Ct: 0.9,
    sweep: -2.0,
    twist: 2.0,
    weight: 520,
    payload: 90,
    L_D: 11.0,
    stallSpeed: 105,
    cruiseSpeed: 60,
    notes: 'Alta carga alar para acrobacia. Menor margen de stall pero mayor maniobrabilidad.',
  },
  socataTB: {
    name: 'Socata TB-300',
    category: 'Entrenamiento',
    span: 9.45,
    Cr: 1.45,
    Ct: 0.9,
    sweep: 0,
    twist: 0,
    weight: 720,
    payload: 200,
    L_D: 11.5,
    stallSpeed: 17.5,
    cruiseSpeed: 70,
    notes: 'Diseño de ala baja para entrenamiento. Mejor L/D que C172.',
  },
  Extra300: {
    name: 'Extra 300',
    category: 'Acrobático',
    span: 6.0,
    Cr: 1.1,
    Ct: 0.7,
    sweep: 0,
    twist: 1.5,
    weight: 475,
    payload: 85,
    L_D: 12.0,
    stallSpeed: 105,
    cruiseSpeed: 70,
    notes: 'Alta relación L/D para acrobático. Design agresivo.',
  },
};

export interface SecondOpinion {
  comparison: {
    parameter: string;
    yourDesign: number;
    reference: number;
    differencePct: number;
    assessment: 'mejor' | 'peor' | 'similar' | 'menor' | 'mayor';
    note: string;
  }[];
  analysis: string;
  warnings: string[];
  recommendations: string[];
}

export function computeSecondOpinion(
  yourDesign: LegacyWingPayload,
  referenceName: string
): SecondOpinion {
  const ref = REFERENCE_DESIGNS[referenceName];
  const S_your = (yourDesign.b / 2) * (yourDesign.Cr + yourDesign.Ct);
  const S_ref = (ref.span / 2) * (ref.Cr + ref.Ct);
  const AR_your = (yourDesign.b ** 2) / S_your;
  const AR_ref = (ref.span ** 2) / S_ref;
  const taper_your = yourDesign.Ct / yourDesign.Cr;
  const taper_ref = ref.Ct / ref.Cr;

  const comparisons: SecondOpinion['comparison'] = [
    {
      parameter: 'Envergadura',
      yourDesign: yourDesign.b,
      reference: ref.span,
      differencePct: ((yourDesign.b - ref.span) / ref.span) * 100,
      assessment: Math.abs(yourDesign.b - ref.span) / ref.span < 0.1 ? 'similar' : yourDesign.b < ref.span ? 'menor' : 'mayor',
      note: yourDesign.b < ref.span ? 'Ala más compacta, menor inercia de vuelo' : 'Ala más larga, mejor eficiencia',
    },
    {
      parameter: 'Área alar',
      yourDesign: S_your,
      reference: S_ref,
      differencePct: ((S_your - S_ref) / S_ref) * 100,
      assessment: Math.abs(S_your - S_ref) / S_ref < 0.1 ? 'similar' : S_your < S_ref ? 'menor' : 'mayor',
      note: S_your < S_ref ? 'Carga alar más alta, stall más rápido' : 'Carga alar más baja, mejor estabilidad',
    },
    {
      parameter: 'AR',
      yourDesign: AR_your,
      reference: AR_ref,
      differencePct: ((AR_your - AR_ref) / AR_ref) * 100,
      assessment: Math.abs(AR_your - AR_ref) / AR_ref < 0.15 ? 'similar' : AR_your < AR_ref ? 'menor' : 'mayor',
      note: AR_your < AR_ref ? 'Menor eficiencia aérea pero más rígido' : 'Mejor L/D pero más sensible a cargas',
    },
    {
      parameter: 'Taper ratio',
      yourDesign: taper_your,
      reference: taper_ref,
      differencePct: ((taper_your - taper_ref) / taper_ref) * 100,
      assessment: Math.abs(taper_your - taper_ref) / taper_ref < 0.15 ? 'similar' : taper_your < taper_ref ? 'menor' : 'mayor',
      note: taper_your < taper_ref ? 'Más difícil de fabricar pero mejor distribución de carga' : 'Más fácil de fabricar',
    },
    {
      parameter: 'Peso total',
      yourDesign: (S_your * 1.2 * 2.2) + 2,
      reference: ref.weight + ref.payload,
      differencePct: 0,
      assessment: 'similar',
      note: 'Estimado basado en geometría',
    },
  ];

  // Generate analysis
  let analysis = `Tu diseño comparado con ${ref.name} (${ref.category}): `;
  if (AR_your > AR_ref * 1.2) {
    analysis += `Tienes un AR ${((AR_your - AR_ref) / AR_ref * 100).toFixed(0)}% mayor, lo que mejora significativamente el L/D pero requiere estructura más rígida. `;
  } else if (AR_your < AR_ref * 0.8) {
    analysis += `Tu AR es ${((AR_ref - AR_your) / AR_ref * 100).toFixed(0)}% menor, lo que da mayor robustez pero peor eficiencia. `;
  } else {
    analysis += `Tu AR es comparable, lo que indica un enfoque similar en el balance aero-estructural. `;
  }

  if (yourDesign.sweep_deg < ref.sweep - 3) {
    analysis += `Tu flecha negativa o baja flecha positiva te da mejor autoridad a baja velocidad pero menor velocidad de divergencia. `;
  } else if (yourDesign.sweep_deg > ref.sweep + 3) {
    analysis += `Tu flecha positiva te da mejor estabilidad de directional pero pierde autoridad a altos α. `;
  }

  // Generate warnings
  const warnings: string[] = [];
  if (AR_your > 15 && yourDesign.b < ref.span * 0.7) {
    warnings.push('AR muy alto con envergadura pequeña puede indicar estructura delicada');
  }
  if (yourDesign.sweep_deg < -5 && yourDesign.twist_deg < 0) {
    warnings.push('Flecha negativa + twist negativo puede causar mal comportamiento en stall');
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (AR_your > AR_ref * 1.2) {
    recommendations.push(`Considera usar winglets para reducir inducido sin aumentar envergadura`);
  }
  if (yourDesign.sweep_deg > ref.sweep + 5) {
    recommendations.push(`Reduce flecha para mejorar autoridad a altos ángulos de ataque`);
  }

  return {
    comparison: comparisons,
    analysis,
    warnings,
    recommendations,
  };
}

export function getReferenceDesign(name: string): ReferenceDesign | undefined {
  return REFERENCE_DESIGNS[name];
}