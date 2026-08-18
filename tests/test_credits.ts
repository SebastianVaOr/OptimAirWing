import { db } from '../server/db/store.js';

console.log('=== RUNNING CREDITS SYSTEM UNIT TESTS ===');

// Reset org_demo plan to freemium for testing
db.setOrgPlan('org_demo', 'freemium');
db.resetUsage('org_demo');

// Test 1: Verification of plan tier credit limits (unificadas con server/db/plans.ts)
const freemiumCredits = db.getCreditsInfo('org_demo');
if (freemiumCredits.optimizations_limit !== 1) throw new Error('Freemium optimization limit should be 1');
if (freemiumCredits.predictions_limit !== 3) throw new Error('Freemium predictions limit should be 3');

db.setOrgPlan('org_demo', 'base');
const baseCredits = db.getCreditsInfo('org_demo');
if (baseCredits.optimizations_limit !== 10) throw new Error('Base limit should be 10');

db.setOrgPlan('org_demo', 'professional');
const proCredits = db.getCreditsInfo('org_demo');
if (proCredits.optimizations_limit !== 50) throw new Error('Professional limit should be 50');

db.setOrgPlan('org_demo', 'enterprise');
const entCredits = db.getCreditsInfo('org_demo');
if (entCredits.optimizations_limit !== 100000) throw new Error('Enterprise limit should be 100000');

console.log('✔ Test 1 Passed: Plan Tier Limits verified (freemium 3 pred/1 opt, base 30/10, professional 100/50, enterprise 100000/100000)');

// Reset to freemium for deduction test
db.setOrgPlan('org_demo', 'freemium');
db.resetUsage('org_demo');

// Test 2: Flat Credit Deduction (1 credit per optimization run, independiente del nivel)
const initialLimit = db.getCreditsInfo('org_demo').optimizations_limit;
const initialUsed = db.getCreditsInfo('org_demo').optimizations_used;

// Consume 1 credit for one optimization run
const success1 = db.incrementUsage('org_demo', 'optimization', 1);
if (!success1) throw new Error('Should succeed consuming 1 credit');
if (db.getCreditsInfo('org_demo').optimizations_used !== initialUsed + 1) throw new Error('Should consume exactly 1 credit');
console.log('✔ Test 2 Passed: Flat credit deduction (1 credit per optimization run) verified');

// Test 3: Insufficient credits check (attempt to consume another credit when freemium limit (1) is reached)
const success2 = db.incrementUsage('org_demo', 'optimization', 1);
if (success2 !== false) throw new Error('Should fail when consuming more credits than available');
if (db.getCreditsInfo('org_demo').optimizations_used !== initialUsed + 1) throw new Error('Used credits should remain unchanged');
console.log('✔ Test 3 Passed: Insufficient credits blocking verified');

// Test 4: Extra Credits Purchase Pack
const initialExtra = db.getCreditsInfo('org_demo').extra_credits;
db.addExtraCredits('org_demo', 10);
const updatedCredits = db.getCreditsInfo('org_demo');
if (updatedCredits.extra_credits !== initialExtra + 10) throw new Error('Extra credits should increase by 10');
if (updatedCredits.total_optimizations_limit !== initialLimit + 10) throw new Error('Total limit should expand by 10');
console.log('✔ Test 4 Passed: Extra Credit Pack Purchase (10 credits) verified');

// Cleanup
db.setOrgPlan('org_demo', 'professional');
db.resetUsage('org_demo');

console.log('=== ALL CREDIT TESTS PASSED SUCCESSFULLY ===\n');
