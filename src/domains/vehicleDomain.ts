/**
 * Domain Physics & Calculations for Multi-Vehicle Analysis (F1 Motorsport, Hydrofoils Nautical, Aircraft)
 */

export type VehicleCategory = 'aircraft' | 'f1_motorsport' | 'hydrofoil_nautical';

export interface F1Params {
  speedKmh: number; // Velocidad de pista (100 - 350 km/h)
  groundHeightMm: number; // Altura al suelo (10 - 200 mm)
  gurneyFlapMm: number; // Gurney Flap (0 - 15 mm)
  numElements: number; // N° de planos (1, 2 o 3)
}

export interface HydrofoilParams {
  speedKnots: number; // Velocidad en nudos (5 - 50 kts)
  immersionDepthM: number; // Profundidad de inmersión (0.2 - 2.0 m)
  waterDensityKgM3: number; // Densidad del agua (1025 kg/m3 para agua de mar)
  waterTempC: number; // Temperatura del agua
}

export interface VehiclePhysicsResult {
  category: VehicleCategory;
  primaryForceName: string; // "Sustentación" | "Carga Aerodinámica (Downforce)" | "Sustentación Marina (Foil Lift)"
  primaryForceN: number;
  primaryForceKgf: number;
  dragForceN: number;
  dragForceKgf: number;
  efficiencyRatio: number; // L/D o Downforce/Drag
  efficiencyLabel: string;
  speedUnitLabel: string;
  currentSpeedValue: number;
  
  // Especificidades F1
  f1Details?: {
    downforceAt250KmhN: number;
    downforceAt250KmhKgf: number;
    groundEffectBoostPct: number;
    gurneyBoostCL: number;
    frontRearBalancePct: number;
  };

  // Especificidades Hydrofoil
  hydrofoilDetails?: {
    cavitationNumber: number;
    cavitationRisk: 'safe' | 'warning' | 'critical';
    cavitationRiskLabel: string;
    hullTakeoffSpeedKnots: number;
    supportedHullWeightKg: number;
  };
}

export function computeVehiclePhysics(
  category: VehicleCategory,
  aero: { CL: number; CD: number; S_m2: number; Cr: number },
  f1Params: F1Params = { speedKmh: 250, groundHeightMm: 50, gurneyFlapMm: 5, numElements: 2 },
  hydroParams: HydrofoilParams = { speedKnots: 25, immersionDepthM: 0.8, waterDensityKgM3: 1025, waterTempC: 18 }
): VehiclePhysicsResult {
  const S = Math.max(0.05, aero.S_m2);
  let CL = aero.CL;
  let CD = Math.max(0.005, aero.CD);

  if (category === 'f1_motorsport') {
    // F1 Motorsport Adjustments
    const speedMs = (f1Params.speedKmh * 1000) / 3600;
    const airDensity = 1.225;

    // Gurney Flap Effect (+0.03 CL por mm de gurney)
    const gurneyBoost = (f1Params.gurneyFlapMm / 1000) * 15.0; // Boost a CL
    CL += gurneyBoost;
    CD += gurneyBoost * 0.35; // Incremento de drag por gurney

    // Multi-element flap boost
    if (f1Params.numElements === 2) {
      CL *= 1.35;
      CD *= 1.25;
    } else if (f1Params.numElements === 3) {
      CL *= 1.65;
      CD *= 1.50;
    }

    // Ground Effect Proximity (h/c ratio)
    const hOverC = Math.max(0.05, (f1Params.groundHeightMm / 1000) / Math.max(0.1, aero.Cr));
    let groundEffectBoost = 0;
    if (hOverC < 0.5) {
      groundEffectBoost = Math.min(0.6, (0.5 - hOverC) * 1.2);
      CL *= (1 + groundEffectBoost);
    }

    const dynamicPressure = 0.5 * airDensity * Math.pow(speedMs, 2);
    const downforceN = dynamicPressure * S * Math.abs(CL);
    const dragN = dynamicPressure * S * CD;

    // Downforce a 250 km/h estandarizado para comparativa F1
    const v250ms = (250 * 1000) / 3600;
    const downforce250N = 0.5 * airDensity * Math.pow(v250ms, 2) * S * Math.abs(CL);

    return {
      category,
      primaryForceName: 'Carga Aerodinámica (Downforce)',
      primaryForceN: downforceN,
      primaryForceKgf: downforceN / 9.81,
      dragForceN: dragN,
      dragForceKgf: dragN / 9.81,
      efficiencyRatio: downforceN / Math.max(1, dragN),
      efficiencyLabel: 'Downforce / Drag Ratio',
      speedUnitLabel: 'km/h',
      currentSpeedValue: f1Params.speedKmh,
      f1Details: {
        downforceAt250KmhN: downforce250N,
        downforceAt250KmhKgf: downforce250N / 9.81,
        groundEffectBoostPct: groundEffectBoost * 100,
        gurneyBoostCL: gurneyBoost,
        frontRearBalancePct: 42.5
      }
    };
  }

  if (category === 'hydrofoil_nautical') {
    // Hydrofoil Nautical Adjustments
    const speedMs = hydroParams.speedKnots * 0.514444; // Nudos a m/s
    const rhoWater = hydroParams.waterDensityKgM3;

    const dynamicPressure = 0.5 * rhoWater * Math.pow(speedMs, 2);
    const foilLiftN = dynamicPressure * S * Math.max(0.1, CL);
    const foilDragN = dynamicPressure * S * Math.max(0.01, CD * 0.8);

    // Cavitation Number calculation
    // sigma = (P_atm + rho*g*h - P_vapor) / (0.5 * rho * V^2)
    const pAtm = 101325; // Pa
    const pVapor = 2338; // Pa a 20°C
    const pHydrostatic = rhoWater * 9.81 * hydroParams.immersionDepthM;
    const cavitationNumber = (pAtm + pHydrostatic - pVapor) / Math.max(1, dynamicPressure);

    let cavRisk: 'safe' | 'warning' | 'critical' = 'safe';
    let cavRiskLabel = 'Sin riesgo de cavitación (Flujo estable)';
    if (cavitationNumber < 0.4) {
      cavRisk = 'critical';
      cavRiskLabel = '🔴 RIESGO CRÍTICO: Cavitación severa y colapso de sustentación';
    } else if (cavitationNumber < 0.7) {
      cavRisk = 'warning';
      cavRiskLabel = '⚠️ ALERTA: Inicios de micro-cavitación en extrados';
    }

    // Hull Takeoff Speed (Velocidad de despegue para soportar 800 kgf de casco)
    const targetLiftN = 800 * 9.81;
    const reqVms = Math.sqrt(targetLiftN / (0.5 * rhoWater * S * Math.max(0.1, CL)));
    const takeoffKnots = reqVms / 0.514444;

    return {
      category,
      primaryForceName: 'Sustentación Marina (Foil Lift)',
      primaryForceN: foilLiftN,
      primaryForceKgf: foilLiftN / 9.81,
      dragForceN: foilDragN,
      dragForceKgf: foilDragN / 9.81,
      efficiencyRatio: foilLiftN / Math.max(1, foilDragN),
      efficiencyLabel: 'L/D Hidrodinámico',
      speedUnitLabel: 'Nudos (kts)',
      currentSpeedValue: hydroParams.speedKnots,
      hydrofoilDetails: {
        cavitationNumber,
        cavitationRisk: cavRisk,
        cavitationRiskLabel: cavRiskLabel,
        hullTakeoffSpeedKnots: parseFloat(takeoffKnots.toFixed(1)),
        supportedHullWeightKg: parseFloat((foilLiftN / 9.81).toFixed(1))
      }
    };
  }

  // Default Aircraft
  const speedMs = 50; // 180 km/h
  const rhoAir = 1.225;
  const q = 0.5 * rhoAir * Math.pow(speedMs, 2);
  const liftN = q * S * Math.max(0.05, CL);
  const dragN = q * S * Math.max(0.005, CD);

  return {
    category: 'aircraft',
    primaryForceName: 'Sustentación Aerodinámica (Lift)',
    primaryForceN: liftN,
    primaryForceKgf: liftN / 9.81,
    dragForceN: dragN,
    dragForceKgf: dragN / 9.81,
    efficiencyRatio: liftN / Math.max(1, dragN),
    efficiencyLabel: 'Eficiencia L/D',
    speedUnitLabel: 'm/s',
    currentSpeedValue: speedMs
  };
}
