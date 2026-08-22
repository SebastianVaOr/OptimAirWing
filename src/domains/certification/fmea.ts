/**
 * FMEA (Failure Mode and Effects Analysis) Module
 * 
 * Implements automated risk assessment for critical wing components
 * following FAR-23 certification guidelines and industry best practices.
 * 
 * RPN = Severity × Occurrence × Detection
 * - RPN > 100: Critical risk, immediate action required
 * - RPN 50-100: High risk, mitigation recommended
 * - RPN < 50: Acceptable risk level
 */

import { LegacyWingPayload, DesignRequirements } from '../../core/types';
import { QuantitativeStructuralResult } from '../wing/stability';

export interface FMEAItem {
  id: string;
  component: string;
  failureMode: string;
  effect: string;
  severity: number;  // 1-10 (10 = catastrophic)
  occurrence: number;  // 1-10 (10 = very frequent)
  detection: number;  // 1-10 (10 = cannot detect)
  rpn: number;  // Severity × Occurrence × Detection
  mitigation: string;
  farReference?: string;
}

export interface FMEAAnalysis {
  items: FMEAItem[];
  criticalCount: number;  // RPN > 100
  highCount: number;  // RPN 50-100
  maxRPN: number;
  avgRPN: number;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  certificationStatus: 'pass' | 'conditional' | 'fail';
  recommendations: string[];
}

export function computeFMEA(
  params: LegacyWingPayload,
  structural: QuantitativeStructuralResult,
  requirements: DesignRequirements
): FMEAAnalysis {
  const items: FMEAItem[] = [];

  // === STRUCTURAL FAILURES ===
  
  // 1. Wing spar failure
  const sparSeverity = 10;  // Catastrophic
  const sparOccurrence = structural.flexuralSafetyFactor < 1.5 ? 8 : 
                         structural.flexuralSafetyFactor < 2.0 ? 4 : 2;
  const sparDetection = structural.safetyFactorCI ? 3 : 6;  // Better detection with CI
  items.push({
    id: 'FMEA-001',
    component: 'Main wing spar',
    failureMode: 'Flexural failure under limit load',
    effect: 'Complete wing structural failure, loss of aircraft',
    severity: sparSeverity,
    occurrence: sparOccurrence,
    detection: sparDetection,
    rpn: sparSeverity * sparOccurrence * sparDetection,
    mitigation: sparOccurrence > 4 
      ? 'Increase spar cap area by 15-20%, verify with FEA analysis'
      : 'Conduct ground load testing to validate design',
    farReference: 'FAR 23.305, 23.307',
  });

  // 2. Wing skin buckling
  const buckSeverity = 7;  // Major
  const buckOccurrence = params.sweep_deg > 15 ? 6 : params.sweep_deg > 5 ? 3 : 2;
  const buckDetection = 5;
  items.push({
    id: 'FMEA-002',
    component: 'Wing skin panels',
    failureMode: 'Local buckling under compression',
    effect: 'Loss of aerodynamic smoothness, reduced structural efficiency',
    severity: buckSeverity,
    occurrence: buckOccurrence,
    detection: buckDetection,
    rpn: buckSeverity * buckOccurrence * buckDetection,
    mitigation: 'Add stiffeners at 150mm spacing, conduct buckling analysis',
    farReference: 'FAR 23.305(b)',
  });

  // 3. Wing rib failure
  const ribSeverity = 6;  // Moderate
  const ribOccurrence = 3;
  const ribDetection = 4;
  items.push({
    id: 'FMEA-003',
    component: 'Wing ribs',
    failureMode: 'Shear failure in rib web',
    effect: 'Local deformation, potential fuel tank breach if wet wing',
    severity: ribSeverity,
    occurrence: ribOccurrence,
    detection: ribDetection,
    rpn: ribSeverity * ribOccurrence * ribDetection,
    mitigation: 'Ensure adequate rib web thickness (min 1.5mm for Al 2024-T3)',
    farReference: 'FAR 23.305',
  });

  // === AEROELASTIC FAILURES ===

  // 4. Torsional divergence
  const divSeverity = 10;  // Catastrophic
  const divOccurrence = structural.divergenceMargin && structural.divergenceMargin < 1.5 ? 9 : 
                        structural.divergenceMargin && structural.divergenceMargin < 2.0 ? 5 : 2;
  const divDetection = 7;  // Hard to detect in flight
  items.push({
    id: 'FMEA-004',
    component: 'Wing torsional structure',
    failureMode: 'Torsional divergence at high speed',
    effect: 'Catastrophic wing twist, immediate loss of control',
    severity: divSeverity,
    occurrence: divOccurrence,
    detection: divDetection,
    rpn: divSeverity * divOccurrence * divDetection,
    mitigation: divOccurrence > 5 
      ? 'Critical: Reduce sweep by 5°, increase torsional stiffness by 30%'
      : 'Conduct flutter analysis per FAR 23.629',
    farReference: 'FAR 23.629, AC 23.629-1B',
  });

  // 5. Flutter
  const flutterSeverity = 10;  // Catastrophic
  const flutterOccurrence = structural.flutterRisk === 'alto' ? 8 : 
                            structural.flutterRisk === 'medio' ? 4 : 2;
  const flutterDetection = 8;  // Very hard to detect before occurrence
  items.push({
    id: 'FMEA-005',
    component: 'Wing aeroelastic system',
    failureMode: 'Classical flutter (bending-torsion coupling)',
    effect: 'Catastrophic structural failure within seconds',
    severity: flutterSeverity,
    occurrence: flutterOccurrence,
    detection: flutterDetection,
    rpn: flutterSeverity * flutterOccurrence * flutterDetection,
    mitigation: flutterOccurrence > 4 
      ? 'Critical: Add mass balancing to wing tip, increase bending stiffness'
      : 'Conduct ground vibration test (GVT) and flight flutter testing',
    farReference: 'FAR 23.629',
  });

  // 6. Aileron reversal
  const ailSeverity = 8;  // Hazardous
  const ailOccurrence = structural.aileronReversalRisk === 'alto' ? 7 : 
                        structural.aileronReversalRisk === 'medio' ? 3 : 1;
  const ailDetection = 6;
  items.push({
    id: 'FMEA-006',
    component: 'Aileron control system',
    failureMode: 'Aileron reversal due to wing twist',
    effect: 'Loss of roll control authority, potential loss of control',
    severity: ailSeverity,
    occurrence: ailOccurrence,
    detection: ailDetection,
    rpn: ailSeverity * ailOccurrence * ailDetection,
    mitigation: 'Increase wing torsional rigidity, limit aileron span to outer 40%',
    farReference: 'FAR 23.629',
  });

  // === AERODYNAMIC FAILURES ===

  // 7. Wing stall (inadequate margin)
  const stallMargin = 12 - params.alpha_deg;  // Assuming typical stall at 12°
  const stallSeverity = 9;  // Hazardous
  const stallOccurrence = stallMargin < 5 ? 8 : stallMargin < 8 ? 4 : 2;
  const stallDetection = 4;  // Detectable with stall warning
  items.push({
    id: 'FMEA-007',
    component: 'Wing aerodynamics',
    failureMode: 'Wing stall at critical flight phase',
    effect: 'Sudden loss of lift, spin entry risk',
    severity: stallSeverity,
    occurrence: stallOccurrence,
    detection: stallDetection,
    rpn: stallSeverity * stallOccurrence * stallDetection,
    mitigation: stallOccurrence > 4 
      ? 'Add washout (3° geometric twist), install stall strips'
      : 'Install AOA indicator and stall warning system',
    farReference: 'FAR 23.49, 23.201',
  });

  // 8. High-speed structural limits
  const vDive = structural.divergenceSpeedMs ? structural.divergenceSpeedMs * 0.6 : 100;
  const vCruise = structural.cruiseVelocityMs || 50;
  const speedMargin = vDive / vCruise;
  const speedSeverity = 9;
  const speedOccurrence = speedMargin < 1.5 ? 7 : speedMargin < 2.0 ? 3 : 1;
  const speedDetection = 3;  // Airspeed indicator available
  items.push({
    id: 'FMEA-008',
    component: 'Airframe structural limits',
    failureMode: 'Exceeding VNE (never exceed speed)',
    effect: 'Flutter, divergence, or structural overload',
    severity: speedSeverity,
    occurrence: speedOccurrence,
    detection: speedDetection,
    rpn: speedSeverity * speedOccurrence * speedDetection,
    mitigation: 'Clearly mark VNE on airspeed indicator, add overspeed warning',
    farReference: 'FAR 23.1545, 23.1557',
  });

  // === FATIGUE & ENVIRONMENTAL ===

  // 9. Fatigue crack growth
  const fatSeverity = 7;
  const fatOccurrence = requirements.flight_hours > 2000 ? 6 : requirements.flight_hours > 1000 ? 4 : 2;
  const fatDetection = 5;
  items.push({
    id: 'FMEA-009',
    component: 'Wing attachment fittings',
    failureMode: 'Fatigue crack propagation',
    effect: 'Wing separation if undetected',
    severity: fatSeverity,
    occurrence: fatOccurrence,
    detection: fatDetection,
    rpn: fatSeverity * fatOccurrence * fatDetection,
    mitigation: 'Implement periodic NDT inspection (100h intervals), safe-life design',
    farReference: 'FAR 23.573',
  });

  // 10. Corrosion
  const corrSeverity = 5;
  const corrOccurrence = requirements.material === 'al2024' || requirements.material === 'al7075' ? 5 : 
                         requirements.material === 'carbon' ? 1 : 3;
  const corrDetection = 6;
  items.push({
    id: 'FMEA-010',
    component: 'Wing structure (aluminum)',
    failureMode: 'Galvanic or pitting corrosion',
    effect: 'Gradual strength reduction, potential failure',
    severity: corrSeverity,
    occurrence: corrOccurrence,
    detection: corrDetection,
    rpn: corrSeverity * corrOccurrence * corrDetection,
    mitigation: 'Apply corrosion protection (alodine + primer), avoid dissimilar metals',
    farReference: 'FAR 23.573',
  });

  // === ANALYSIS ===
  
  const rpnValues = items.map(i => i.rpn);
  const maxRPN = Math.max(...rpnValues);
  const avgRPN = rpnValues.reduce((a, b) => a + b, 0) / items.length;
  const criticalCount = items.filter(i => i.rpn > 100).length;
  const highCount = items.filter(i => i.rpn >= 50 && i.rpn <= 100).length;

  let overallRisk: FMEAAnalysis['overallRisk'];
  if (criticalCount > 0) overallRisk = 'critical';
  else if (maxRPN > 100) overallRisk = 'high';
  else if (highCount > 2) overallRisk = 'medium';
  else overallRisk = 'low';

  let certificationStatus: FMEAAnalysis['certificationStatus'];
  if (criticalCount > 3 || maxRPN > 400) certificationStatus = 'fail';
  else if (criticalCount > 1 || highCount > 4) certificationStatus = 'conditional';
  else certificationStatus = 'pass';

  const recommendations: string[] = [];
  if (criticalCount > 0) {
    recommendations.push(`${criticalCount} critical risk items require immediate mitigation before flight testing`);
  }
  if (structural.flexuralSafetyFactor < requirements.safety_factor) {
    recommendations.push('Structural reinforcement required to meet minimum safety factor');
  }
  if (structural.divergenceMargin && structural.divergenceMargin < 1.5) {
    recommendations.push('Aeroelastic analysis mandatory before first flight (FAR 23.629)');
  }
  if (stallMargin < 5) {
    recommendations.push('Aerodynamic stall characteristics require wind tunnel validation');
  }

  // Sort items by RPN descending
  items.sort((a, b) => b.rpn - a.rpn);

  return {
    items,
    criticalCount,
    highCount,
    maxRPN,
    avgRPN,
    overallRisk,
    certificationStatus,
    recommendations,
  };
}

export function getRPNSeverityColor(rpn: number): string {
  if (rpn > 100) return 'text-danger';
  if (rpn >= 50) return 'text-warn';
  return 'text-ok';
}

export function getRPNSeverityLabel(rpn: number): string {
  if (rpn > 100) return 'CRÍTICO';
  if (rpn >= 50) return 'ALTO';
  return 'ACEPTABLE';
}
