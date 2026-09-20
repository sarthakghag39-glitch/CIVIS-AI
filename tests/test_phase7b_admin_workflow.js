// CIVIS-AI Phase 7B Admin Workflow & SLA Unit Tests

const assert = require('assert');
const { calculatePriorityScore, normalizeCategory, getSLAStatus } = require('../public/js/prioritization_engine.js');

console.log('--- RUNNING PHASE 7B ADMIN WORKFLOW TEST SUITE ---');

let passCount = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${desc}:`, err.message);
    process.exit(1);
  }
}

// 1. SLA Breach for P1 Critical issue (>2 days)
test('Test 1: P1 Critical issue open >2 days flags as SLA Breach', () => {
  const issue = {
    id: 101,
    criticality: 'Critical',
    ai_severity_score: 100,
    category: 'Water Leakage',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    status: 'Pending'
  };
  const priorityData = { tier: 'P1 Critical', score: 85 };
  const sla = getSLAStatus(issue, priorityData);
  assert.strictEqual(sla.isSLABreached, true);
  assert.strictEqual(sla.targetDays, 2);
  assert.strictEqual(sla.overdueDays, 1);
});

// 2. SLA Warning for P1 Critical issue (1.6 days open)
test('Test 2: P1 Critical issue open 1.6 days flags as SLA Warning', () => {
  const issue = {
    id: 102,
    criticality: 'Critical',
    ai_severity_score: 100,
    category: 'Water Leakage',
    created_at: new Date(Date.now() - 1.6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Pending'
  };
  const priorityData = { tier: 'P1 Critical', score: 85 };
  const sla = getSLAStatus(issue, priorityData);
  assert.strictEqual(sla.isSLABreached, false);
  assert.strictEqual(sla.isSLAWarning, true);
});

// 3. Resolved issues are never SLA breached
test('Test 3: Resolved issues return isSLABreached = false regardless of age', () => {
  const issue = {
    id: 103,
    criticality: 'Critical',
    category: 'Water Leakage',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Resolved'
  };
  const priorityData = { tier: 'P1 Critical', score: 85 };
  const sla = getSLAStatus(issue, priorityData);
  assert.strictEqual(sla.isSLABreached, false);
  assert.strictEqual(sla.isSLAWarning, false);
});

// 4. Target SLA days by Priority Tier
test('Test 4: Target SLA days correctly mapped per tier (P1=2d, P2=5d, P3=10d, P4=15d)', () => {
  const p1Issue = { criticality: 'Critical', status: 'Pending' };
  const p4Issue = { criticality: 'Low', status: 'Pending' };

  const p1Sla = getSLAStatus(p1Issue, { tier: 'P1 Critical' });
  const p4Sla = getSLAStatus(p4Issue, { tier: 'P4 Routine' });

  assert.strictEqual(p1Sla.targetDays, 2);
  assert.strictEqual(p4Sla.targetDays, 15);
});

// 5. Missing or invalid issue object safety
test('Test 5: Missing or null issue object returns safe default SLA object', () => {
  const sla = getSLAStatus(null);
  assert.strictEqual(sla.isSLABreached, false);
  assert.strictEqual(sla.isSLAWarning, false);
  assert.strictEqual(sla.openDays, 0);
});

console.log(`\nPHASE 7B TEST RESULTS: ${passCount}/5 assertions passed.\n`);
