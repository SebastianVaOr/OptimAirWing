import { DesignRequirements, LegacyWingPayload, ParetoDesignItem } from '../../core/types';
import { calcularEmpirico } from './empirical';
import { computeEstimatedWeight, computeEstimatedCost } from './penalties';
import { getSectorLimits } from './sectorGuardrails';

export function generateParetoFront(
  requirements: DesignRequirements,
  currentBestParams: LegacyWingPayload
): ParetoDesignItem[] {
  const sector = requirements.sector || 'uav';
  const limits = getSectorLimits(sector);

  // Config A: Mínimo Peso (Compacta, ultraligera)
  const b_min = Math.max(limits.b.min, currentBestParams.b * 0.75);
  const Cr_min = Math.max(limits.Cr.min, currentBestParams.Cr * 0.8);
  const Ct_min = Math.max(limits.Ct.min, currentBestParams.Ct * 0.75);

  const paramsA: LegacyWingPayload = {
    ...currentBestParams,
    b: Number(b_min.toFixed(2)),
    Cr: Number(Cr_min.toFixed(2)),
    Ct: Number(Ct_min.toFixed(2)),
    sweep_deg: 0,
    twist_deg: 0
  };

  // Config B: Compromiso Balanceado (Equilibrada)
  const paramsB: LegacyWingPayload = { ...currentBestParams };

  // Config C: Máximo L/D (Alta Eficiencia Aerodinámica)
  const b_max = Math.min(limits.b.max, currentBestParams.b * 1.35);
  const Cr_max = Math.min(limits.Cr.max, currentBestParams.Cr * 1.15);
  const Ct_max = Math.min(limits.Ct.max, currentBestParams.Ct * 1.1);

  const paramsC: LegacyWingPayload = {
    ...currentBestParams,
    b: Number(b_max.toFixed(2)),
    Cr: Number(Cr_max.toFixed(2)),
    Ct: Number(Ct_max.toFixed(2)),
    sweep_deg: Math.min(10, currentBestParams.sweep_deg + 2),
    twist_deg: -2
  };

  const candidateConfigs = [
    { id: 'A', name: 'Mínimo Peso', rec: 'Misiones urbanas, agilidad y máxima maniobrabilidad en corta distancia.', p: paramsA },
    { id: 'B', name: 'Compromiso Balanceado', rec: 'Configuración óptima para carga, vigilancia y misiones polivalentes.', p: paramsB },
    { id: 'C', name: 'Máximo L/D (Alta Eficiencia)', rec: 'Inspección de gran alcance, mayor autonomía y ahorro de batería/combustible.', p: paramsC }
  ];

  return candidateConfigs.map(c => {
    const aero = calcularEmpirico(c.p);
    const weight_kg = computeEstimatedWeight(c.p, aero, requirements);
    const costObj = computeEstimatedCost(weight_kg, c.p, requirements);
    const cost_eur = costObj.totalCost;
    const fs = requirements.safety_factor || 2.5;

    return {
      id: c.id,
      name: c.name,
      recommendation: c.rec,
      params: c.p,
      aero: {
        CL: Number(aero.CL.toFixed(3)),
        CD: Number(aero.CD.toFixed(4)),
        LD: Number(aero.LD.toFixed(2)),
        S: Number(aero.S.toFixed(2)),
        AR: Number(aero.AR.toFixed(2))
      },
      weight_kg,
      cost_eur,
      fs
    };
  });
}
