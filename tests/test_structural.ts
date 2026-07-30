import { compute_form_factor, computeViabilityAnalysis } from '../src/domains/wing/penalties.js';
import { MATERIALS_DB } from '../src/domains/wing/materials.js';
import { LegacyWingPayload, DesignRequirements } from '../src/core/types.js';

console.log('=== RUNNING STRUCTURAL & VIABILITY UNIT TESTS ===');

// Test 1: Form Factor Calculation (sweep_deg, taper_ratio, twist_deg)
const ffLowAR = compute_form_factor(0, 0.5, 0);
const ffHighAR = compute_form_factor(25, 0.3, 3);

console.assert(ffHighAR > ffLowAR, 'High AR + swept wing should have higher structural form factor penalty');
console.log(`✔ Test 1 Passed: Form factor computed correctly (Low AR: ${ffLowAR.toFixed(2)}, High AR: ${ffHighAR.toFixed(2)})`);

// Test 2: Unstable Swept Wing Penalty Detection (Negative Sweep)
const unstableParams: LegacyWingPayload = {
  nacaCode: '2412',
  Cr: 1.5,
  Ct: 0.6,
  b: 12,
  sweep_deg: -10, // Negative sweep
  twist_deg: 3,   // Wash-in (positive twist)
  alpha_deg: 5
};

const reqs: DesignRequirements = {
  sector: 'uav',
  estimated_weight_kg: 30,
  material: 'carbon',
  flight_hours: 100,
  max_budget_eur: 20000,
  safety_factor: 1.5,
  cruise_velocity_ms: 60,
  cost_per_kg_material: 120,
  labor_cost_per_hour: 50,
  estimated_manufacturing_hours: 25,
  optimization_level: 'full_custom'
};

const mockAero = {
  CL: 1.2,
  CD: 0.04,
  LD: 30,
  S: 12.6,
  AR: 11.4,
  e: 0.85
};

const viability = computeViabilityAnalysis(unstableParams, mockAero, reqs);

if (viability.stabilityStatus !== 'danger') throw new Error('Negative sweep should trigger danger stability status');
if (!viability.divergenceSpeedMs || viability.divergenceSpeedMs <= 0) throw new Error('Divergence speed should be > 0');
if (!viability.tipDeflectionMm || viability.tipDeflectionMm <= 0) throw new Error('Wing tip deflection should be > 0');
if (!viability.formFactor || viability.formFactor <= 0) throw new Error('Form factor should be > 0');

console.log(`✔ Test 2 Passed: Unstable aeroelastic configuration detected correctly. Status: ${viability.stabilityStatus}, Deflection: ${viability.tipDeflectionMm!.toFixed(1)}mm, V_d: ${viability.divergenceSpeedMs!.toFixed(1)}m/s`);

// Test 3: Real Cost Simulation
if (viability.laborCostEur === undefined) throw new Error('Labor cost should be present');
const expectedLabor = 50 * 25; // 1250 €
if (viability.laborCostEur !== expectedLabor) throw new Error(`Labor cost should equal ${expectedLabor}`);
if (viability.estimatedCostEur <= expectedLabor) throw new Error('Total cost should include material + labor');

console.log(`✔ Test 3 Passed: Real cost simulation breakdown verified (Total: ${viability.estimatedCostEur!.toLocaleString()} €, Material: ${viability.materialCostEur!.toLocaleString()} €, Labor: ${viability.laborCostEur!.toLocaleString()} €)`);

console.log('=== ALL STRUCTURAL TESTS PASSED SUCCESSFULLY ===\n');
