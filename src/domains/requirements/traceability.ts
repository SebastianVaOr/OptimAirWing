/**
 * Requirements Traceability Matrix
 *
 * In real aerospace projects, EVERY requirement must trace to a verification.
 * If you can't prove a requirement is met, the design isn't certified.
 *
 * Traceability matrix:
 *   REQ-001 "Range > 200 km" → Verified by Breguet analysis (result: 235 km ✓)
 *   REQ-002 "FS > 1.5 at 95% CI" → Verified by structural analysis (FS_lower: 1.38 ✗)
 *
 * References:
 *   - DO-178C: Software Considerations in Airborne Systems and Equipment Certification
 *   - ARP4754A: Development of Civil Aircraft and Systems
 */

export type RequirementType = 'performance' | 'safety' | 'structural' | 'operational' | 'environmental';
export type VerificationMethod = 'analysis' | 'test' | 'inspection' | 'demonstration';
export type VerificationStatus = 'pass' | 'fail' | 'partial' | 'not_verified';

export interface Requirement {
  id: string;
  type: RequirementType;
  statement: string;
  quantitativeThreshold?: number;
  unit?: string;
  verificationMethod: VerificationMethod;
  allocatedTo: string;
}

export interface VerificationResult {
  requirementId: string;
  status: VerificationStatus;
  evidence: {
    type: string;
    reference: string;
    value: number;
    unit: string;
    threshold: number;
    margin: number;
  };
  notes: string;
}

export interface TraceabilityMatrix {
  requirements: Requirement[];
  results: VerificationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    partial: number;
    notVerified: number;
    compliancePct: number;
  };
  orphanRequirements: string[];
}

/**
 * Default UAV design requirements
 */
export const DEFAULT_UAV_REQUIREMENTS: Requirement[] = [
  {
    id: 'REQ-PERF-001',
    type: 'performance',
    statement: 'Maximum L/D ratio ≥ 12',
    quantitativeThreshold: 12,
    unit: '-',
    verificationMethod: 'analysis',
    allocatedTo: 'wing_design',
  },
  {
    id: 'REQ-PERF-002',
    type: 'performance',
    statement: 'Range ≥ 200 km at cruise conditions',
    quantitativeThreshold: 200,
    unit: 'km',
    verificationMethod: 'analysis',
    allocatedTo: 'mission_performance',
  },
  {
    id: 'REQ-PERF-003',
    type: 'performance',
    statement: 'Endurance ≥ 2 hours',
    quantitativeThreshold: 2,
    unit: 'h',
    verificationMethod: 'analysis',
    allocatedTo: 'mission_performance',
  },
  {
    id: 'REQ-SAFE-001',
    type: 'safety',
    statement: 'No catastrophic single-point failure',
    verificationMethod: 'analysis',
    allocatedTo: 'structural_design',
  },
  {
    id: 'REQ-SAFE-002',
    type: 'safety',
    statement: 'Safety factor ≥ 1.5 at 95% confidence',
    quantitativeThreshold: 1.5,
    unit: '-',
    verificationMethod: 'analysis',
    allocatedTo: 'structural_design',
  },
  {
    id: 'REQ-STR-001',
    type: 'structural',
    statement: 'Wing mass ≤ 30% of MTOW',
    quantitativeThreshold: 0.3,
    unit: '-',
    verificationMethod: 'analysis',
    allocatedTo: 'weight_estimation',
  },
  {
    id: 'REQ-STR-002',
    type: 'structural',
    statement: 'Flutter speed > 1.2 × V_dive',
    quantitativeThreshold: 1.2,
    unit: '-',
    verificationMethod: 'analysis',
    allocatedTo: 'aeroelasticity',
  },
  {
    id: 'REQ-OPS-001',
    type: 'operational',
    statement: 'Takeoff distance ≤ 50 m',
    quantitativeThreshold: 50,
    unit: 'm',
    verificationMethod: 'test',
    allocatedTo: 'flight_operations',
  },
  {
    id: 'REQ-ENV-001',
    type: 'environmental',
    statement: 'Operate in winds up to 15 m/s',
    quantitativeThreshold: 15,
    unit: 'm/s',
    verificationMethod: 'demonstration',
    allocatedTo: 'flight_operations',
  },
];

/**
 * Verify all requirements against analysis results
 */
export function verifyRequirements(
  requirements: Requirement[],
  results: Record<string, number | boolean | string>
): TraceabilityMatrix {
  const verificationResults: VerificationResult[] = requirements.map(req => {
    const result = results[req.id];

    if (result === undefined) {
      return {
        requirementId: req.id,
        status: 'not_verified' as VerificationStatus,
        evidence: { type: 'none', reference: '', value: 0, unit: '', threshold: 0, margin: 0 },
        notes: 'No verification data available',
      };
    }

    if (typeof result === 'boolean') {
      return {
        requirementId: req.id,
        status: result ? 'pass' : 'fail',
        evidence: {
          type: req.verificationMethod,
          reference: `${req.verificationMethod} analysis`,
          value: result ? 1 : 0,
          unit: '',
          threshold: 1,
          margin: result ? 1 : -1,
        },
        notes: result ? 'Requirement satisfied' : 'Requirement NOT satisfied',
      };
    }

    const value = result as number;
    const threshold = req.quantitativeThreshold ?? 0;
    const margin = value - threshold;

    let status: VerificationStatus;
    if (threshold === 0) {
      status = value > 0 ? 'pass' : 'fail';
    } else if (margin >= 0) {
      status = 'pass';
    } else if (margin >= -threshold * 0.1) {
      status = 'partial';
    } else {
      status = 'fail';
    }

    return {
      requirementId: req.id,
      status,
      evidence: {
        type: req.verificationMethod,
        reference: `${req.verificationMethod} analysis`,
        value,
        unit: req.unit ?? '',
        threshold,
        margin,
      },
      notes: status === 'pass'
        ? `✓ Met (${value.toFixed(2)} ${req.unit ?? ''} vs threshold ${threshold})`
        : status === 'partial'
        ? `⚠ Marginally failed (${value.toFixed(2)} vs ${threshold}, margin ${margin.toFixed(2)})`
        : `✗ Failed (${value.toFixed(2)} vs ${threshold})`,
    };
  });

  const passed = verificationResults.filter(r => r.status === 'pass').length;
  const failed = verificationResults.filter(r => r.status === 'fail').length;
  const partial = verificationResults.filter(r => r.status === 'partial').length;
  const notVerified = verificationResults.filter(r => r.status === 'not_verified').length;

  return {
    requirements,
    results: verificationResults,
    summary: {
      total: requirements.length,
      passed,
      failed,
      partial,
      notVerified,
      compliancePct: (passed / requirements.length) * 100,
    },
    orphanRequirements: [],
  };
}
