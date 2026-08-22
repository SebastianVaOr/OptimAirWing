/**
 * Maintenance and Life Cycle Cost Analysis
 *
 * A design that saves 1 kg in structure but adds 5 hours of maintenance
 * per 100 flight hours is a BAD design.
 *
 * This module estimates:
 *   - Maintenance tasks and intervals
 *   - Annual maintenance cost
 *   - Accessibility score (how easy to inspect/repair)
 *   - Life cycle cost (20-30 year horizon)
 *   - Ground time per year
 *
 * References:
 *   - MIL-HDBK-470A: Designing and Improving Maintainability
 *   - EASA CS-23 / FAR Part 23: Continuing Airworthiness
 *   - Blanchard, B.S. (2012). System Engineering Management
 */

export interface MaintenanceTask {
  id: string;
  description: string;
  category: 'inspection' | 'servicing' | 'repair' | 'overhaul';

  interval_flight_hours: number;
  labor_hours: number;
  skill_level: 'A' | 'B' | 'C';

  accessRequirement: {
    panelsToRemove: string[];
    specialTools: string[];
    workspace: 'ground' | 'ladder' | 'lift';
  };

  partsCost_eur: number;
  groundTime_hours: number;
}

export interface MaintainabilityAnalysis {
  tasks: MaintenanceTask[];

  // Annual metrics (at given flight hours/year)
  annualCost_eur: number;
  annualGroundTime_hours: number;
  annualLaborHours: number;

  // Accessibility
  accessibilityScore_1_10: number;

  // Life cycle
  lifeCycleCost_20yr: {
    inspections_eur: number;
    repairs_eur: number;
    overhauls_eur: number;
    total_eur: number;
  };

  // Design recommendations
  recommendations: string[];
}

const LABOR_RATE_EUR_H = 75;
const FLIGHT_HOURS_PER_YEAR = 500;

function generateMaintenanceTasks(params: {
  isComposite: boolean;
  sparCount: number;
  hasControlSurfaces: boolean;
  hasFuelTanks: boolean;
}): MaintenanceTask[] {
  const tasks: MaintenanceTask[] = [];

  // Visual inspection
  tasks.push({
    id: 'MT-001',
    description: 'Visual inspection of external surfaces',
    category: 'inspection',
    interval_flight_hours: 50,
    labor_hours: 1.5,
    skill_level: 'A',
    accessRequirement: { panelsToRemove: [], specialTools: [], workspace: 'ground' },
    partsCost_eur: 0,
    groundTime_hours: 1.5,
  });

  // Structural inspection
  tasks.push({
    id: 'MT-002',
    description: 'Detailed structural inspection (spar, ribs, skin)',
    category: 'inspection',
    interval_flight_hours: 200,
    labor_hours: 4,
    skill_level: 'B',
    accessRequirement: {
      panelsToRemove: ['wing_root_access_L', 'wing_root_access_R'],
      specialTools: ['borescope'],
      workspace: 'ladder',
    },
    partsCost_eur: 50,
    groundTime_hours: 4,
  });

  // Bolt torque check
  tasks.push({
    id: 'MT-003',
    description: 'Check wing attachment bolt torque',
    category: 'inspection',
    interval_flight_hours: 500,
    labor_hours: 2,
    skill_level: 'B',
    accessRequirement: {
      panelsToRemove: ['wing_root_cover'],
      specialTools: ['torque_wrench_50Nm'],
      workspace: 'ladder',
    },
    partsCost_eur: 20,
    groundTime_hours: 2,
  });

  if (params.hasFuelTanks) {
    tasks.push({
      id: 'MT-004',
      description: 'Fuel tank inspection for contamination and leaks',
      category: 'inspection',
      interval_flight_hours: 200,
      labor_hours: 2.5,
      skill_level: 'A',
      accessRequirement: {
        panelsToRemove: ['fuel_cap_L', 'fuel_cap_R'],
        specialTools: ['fuel_test_kit'],
        workspace: 'ground',
      },
      partsCost_eur: 15,
      groundTime_hours: 2.5,
    });
  }

  if (params.isComposite) {
    tasks.push({
      id: 'MT-005',
      description: 'Thermographic inspection for delamination',
      category: 'inspection',
      interval_flight_hours: 1000,
      labor_hours: 3,
      skill_level: 'C',
      accessRequirement: {
        panelsToRemove: [],
        specialTools: ['thermal_camera'],
        workspace: 'ground',
      },
      partsCost_eur: 0,
      groundTime_hours: 3,
    });
  }

  if (params.hasControlSurfaces) {
    tasks.push({
      id: 'MT-006',
      description: 'Control surface hinge and actuator inspection',
      category: 'inspection',
      interval_flight_hours: 100,
      labor_hours: 2,
      skill_level: 'A',
      accessRequirement: {
        panelsToRemove: [],
        specialTools: ['play_gauge'],
        workspace: 'ground',
      },
      partsCost_eur: 10,
      groundTime_hours: 2,
    });
  }

  // Major overhaul
  tasks.push({
    id: 'MT-010',
    description: 'Major overhaul — complete structural and systems inspection',
    category: 'overhaul',
    interval_flight_hours: 2000,
    labor_hours: 40,
    skill_level: 'C',
    accessRequirement: {
      panelsToRemove: ['all_access_panels'],
      specialTools: ['full_toolkit'],
      workspace: 'lift',
    },
    partsCost_eur: 500,
    groundTime_hours: 80,
  });

  return tasks;
}

export function analyzeMaintainability(params: {
  isComposite: boolean;
  sparCount: number;
  hasControlSurfaces: boolean;
  hasFuelTanks: boolean;
  totalWingMass_kg: number;
}): MaintainabilityAnalysis {
  const tasks = generateMaintenanceTasks(params);

  // Annual cost calculation
  let annualCost = 0;
  let annualGroundTime = 0;
  let annualLabor = 0;

  for (const task of tasks) {
    const occurrencesPerYear = FLIGHT_HOURS_PER_YEAR / task.interval_flight_hours;
    annualCost += (task.labor_hours * LABOR_RATE_EUR_H + task.partsCost_eur) * occurrencesPerYear;
    annualGroundTime += task.groundTime_hours * occurrencesPerYear;
    annualLabor += task.labor_hours * occurrencesPerYear;
  }

  // Accessibility score
  const avgPanels = tasks.reduce((s, t) => s + t.accessRequirement.panelsToRemove.length, 0) / tasks.length;
  const avgTools = tasks.reduce((s, t) => s + t.accessRequirement.specialTools.length, 0) / tasks.length;
  const liftTasks = tasks.filter(t => t.accessRequirement.workspace === 'lift').length;
  const accessibilityScore = Math.max(1, Math.min(10,
    10 - avgPanels * 0.5 - avgTools * 0.3 - liftTasks * 1.5
  ));

  // Life cycle cost (20 years)
  const lcc20 = {
    inspections_eur: tasks.filter(t => t.category === 'inspection').reduce((s, t) => {
      return s + (t.labor_hours * LABOR_RATE_EUR_H + t.partsCost_eur) * (20 * FLIGHT_HOURS_PER_YEAR / t.interval_flight_hours);
    }, 0),
    repairs_eur: params.totalWingMass_kg * 200,  // Estimate
    overhauls_eur: tasks.filter(t => t.category === 'overhaul').reduce((s, t) => {
      return s + (t.labor_hours * LABOR_RATE_EUR_H + t.partsCost_eur) * (20 * FLIGHT_HOURS_PER_YEAR / t.interval_flight_hours);
    }, 0),
    total_eur: 0,
  };
  lcc20.total_eur = lcc20.inspections_eur + lcc20.repairs_eur + lcc20.overhauls_eur;

  // Recommendations
  const recommendations: string[] = [];
  if (accessibilityScore < 5) {
    recommendations.push('💡 Add more access panels to improve maintainability');
  }
  if (tasks.some(t => t.accessRequirement.workspace === 'lift' && t.interval_flight_hours < 1000)) {
    recommendations.push('⚠️ Lift-required tasks with frequent intervals — redesign access');
  }
  if (lcc20.total_eur > params.totalWingMass_kg * 10000) {
    recommendations.push('⚠️ Life cycle cost exceeds 10,000× wing mass — consider redesign for maintainability');
  }

  return {
    tasks,
    annualCost_eur: annualCost,
    annualGroundTime_hours: annualGroundTime,
    annualLaborHours: annualLabor,
    accessibilityScore_1_10: accessibilityScore,
    lifeCycleCost_20yr: lcc20,
    recommendations,
  };
}
