// CIVIS AI - Phase 7A Civic Issue Prioritization Engine Test Suite
const assert = require('assert');
const { calculatePriorityScore, normalizeCategory } = require('../public/js/prioritization_engine.js');

console.log("--- RUNNING PHASE 7A PRIORITIZATION ENGINE TEST SUITE ---");

// Test 1: Critical severity produces expected severity score (100)
const res1 = calculatePriorityScore({ criticality: 'Critical', category: 'Other' });
assert.strictEqual(res1.severityScore, 100, "Critical severity score should be 100");
console.log("[PASS] Test 1: Critical severity produces expected severity score (100)");

// Test 2: High severity fallback works (75)
const res2 = calculatePriorityScore({ criticality: 'High', category: 'Other' });
assert.strictEqual(res2.severityScore, 75, "High severity score should be 75");
console.log("[PASS] Test 2: High severity fallback works (75)");

// Test 3: AI severity score overrides weaker criticality (ai_severity_score = 90 > Moderate = 50 -> 90)
const res3 = calculatePriorityScore({ criticality: 'Moderate', ai_severity_score: 90, category: 'Other' });
assert.strictEqual(res3.severityScore, 90, "AI severity score (90) should override Moderate criticality (50)");
console.log("[PASS] Test 3: AI severity score overrides weaker criticality");

// Test 4: Missing AI score falls back correctly
const res4 = calculatePriorityScore({ criticality: 'Normal', ai_severity_score: null, category: 'Other' });
assert.strictEqual(res4.severityScore, 25, "Missing AI score should fall back to Normal criticality (25)");
console.log("[PASS] Test 4: Missing AI score falls back correctly");

// Test 5: Category normalization works
assert.strictEqual(normalizeCategory('Roads & Potholes'), 'Road Damage');
assert.strictEqual(normalizeCategory('Sanitation'), 'Garbage');
assert.strictEqual(normalizeCategory('Street Lighting'), 'Streetlights');
assert.strictEqual(normalizeCategory('Water Leakage'), 'Water Leakage');
assert.strictEqual(normalizeCategory('Unmapped Category'), 'Other');
console.log("[PASS] Test 5: Category normalization works");

// Test 6: Water Leakage category score (95)
const res6 = calculatePriorityScore({ category: 'Water Leakage' });
assert.strictEqual(res6.categoryScore, 95, "Water Leakage category score should be 95");
console.log("[PASS] Test 6: Water Leakage category score");

// Test 7: Road Damage category score (90)
const res7 = calculatePriorityScore({ category: 'Roads & Potholes' });
assert.strictEqual(res7.categoryScore, 90, "Road Damage category score should be 90");
console.log("[PASS] Test 7: Road Damage category score");

// Test 8: Incident with no linked reports (1 issue -> 0 pts)
const incidentMap8 = { 'inc_101': 1 };
const res8 = calculatePriorityScore({ incident_id: 'inc_101' }, incidentMap8);
assert.strictEqual(res8.incidentScore, 0, "Incident with 1 issue should produce 0 incident points");
console.log("[PASS] Test 8: Incident with no extra linked reports");

// Test 9: Incident with 2 linked reports (50 pts)
const incidentMap9 = { 'inc_102': 2 };
const res9 = calculatePriorityScore({ incident_id: 'inc_102' }, incidentMap9);
assert.strictEqual(res9.incidentScore, 50, "Incident with 2 issues should produce 50 incident points");
console.log("[PASS] Test 9: Incident with 2 linked reports");

// Test 10: Incident with 3+ linked reports (100 pts)
const incidentMap10 = { 'inc_103': 4 };
const res10 = calculatePriorityScore({ incident_id: 'inc_103' }, incidentMap10);
assert.strictEqual(res10.incidentScore, 100, "Incident with 3+ issues should produce 100 incident points");
console.log("[PASS] Test 10: Incident with 3+ linked reports");

// Test 11: Aging increases by 10 points/day
const now = new Date('2026-09-20T12:00:00Z');
const threeDaysAgo = '2026-09-17T12:00:00Z';
const res11 = calculatePriorityScore({ created_at: threeDaysAgo, status: 'Pending' }, null, now);
assert.strictEqual(res11.agingScore, 30, "3 days unresolved should produce aging score of 30");
console.log("[PASS] Test 11: Aging increases by 10 points/day");

// Test 12: Aging caps at 100
const twentyDaysAgo = '2026-08-31T12:00:00Z';
const res12 = calculatePriorityScore({ created_at: twentyDaysAgo, status: 'Pending' }, null, now);
assert.strictEqual(res12.agingScore, 100, "Aging score should cap at 100");
console.log("[PASS] Test 12: Aging caps at 100");

// Test 13: Resolved issue excluded from active priority aging
const res13 = calculatePriorityScore({ created_at: threeDaysAgo, status: 'Resolved' }, null, now);
assert.strictEqual(res13.agingScore, 0, "Resolved issue should have aging score of 0");
console.log("[PASS] Test 13: Resolved issue excluded from active priority aging");

// Test 14: GPS <=30m produces High confidence
const res14 = calculatePriorityScore({ location_source: 'gps', location_accuracy_meters: 15 });
assert.strictEqual(res14.locationConfidence, 100);
assert.strictEqual(res14.locationQualityLabel, 'High confidence');
console.log("[PASS] Test 14: GPS <=30m produces High confidence");

// Test 15: GPS >30m produces Approximate
const res15 = calculatePriorityScore({ location_source: 'gps', location_accuracy_meters: 75 });
assert.strictEqual(res15.locationConfidence, 60);
assert.strictEqual(res15.locationQualityLabel, 'Approximate');
console.log("[PASS] Test 15: GPS >30m produces Approximate");

// Test 16: Manual pin produces Manual pin
const res16 = calculatePriorityScore({ location_source: 'manual_pin' });
assert.strictEqual(res16.locationConfidence, 100);
assert.strictEqual(res16.locationQualityLabel, 'Manual pin');
console.log("[PASS] Test 16: Manual pin produces Manual pin");

// Test 17: Fallback produces Low confidence
const res17 = calculatePriorityScore({ location_source: 'fallback' });
assert.strictEqual(res17.locationConfidence, 20);
assert.strictEqual(res17.locationQualityLabel, 'Low confidence');
console.log("[PASS] Test 17: Fallback produces Low confidence");

// Test 18: Missing location produces Unknown
const res18 = calculatePriorityScore({ location_source: null });
assert.strictEqual(res18.locationConfidence, 0);
assert.strictEqual(res18.locationQualityLabel, 'Unknown');
console.log("[PASS] Test 18: Missing location produces Unknown");

// Test 19: Score clamps to 0-100
const maxIssue = { criticality: 'Critical', ai_severity_score: 100, category: 'Water Leakage', incident_id: 'inc_max', status: 'Pending', created_at: '2026-08-01' };
const maxIncMap = { 'inc_max': 5 };
const res19 = calculatePriorityScore(maxIssue, maxIncMap, now);
assert.ok(res19.score >= 0 && res19.score <= 100, "Score should clamp to range 0-100");
assert.strictEqual(res19.score, 89, "Calculated score for max issue should be 89");
console.log("[PASS] Test 19: Score clamps to 0-100");

// Test 20: P1/P2/P3/P4 tier boundaries
const p1Issue = { criticality: 'Critical', ai_severity_score: 100, category: 'Water Leakage', incident_id: 'inc_p1', created_at: '2026-09-15T12:00:00Z', status: 'Pending' };
const p2Issue = { criticality: 'High', category: 'Road Damage', incident_id: 'inc_p2', status: 'Pending' };
const p3Issue = { criticality: 'Moderate', category: 'Road Damage', status: 'Pending' };
const p4Issue = { criticality: 'Normal', category: 'Other', status: 'Pending' };

assert.strictEqual(calculatePriorityScore(p1Issue, { 'inc_p1': 3 }, now).tier, 'P1 Critical');
assert.strictEqual(calculatePriorityScore(p2Issue, { 'inc_p2': 2 }, now).tier, 'P2 High');
assert.strictEqual(calculatePriorityScore(p3Issue, null, now).tier, 'P3 Moderate');
assert.strictEqual(calculatePriorityScore(p4Issue, null, now).tier, 'P4 Routine');
console.log("[PASS] Test 20: P1/P2/P3/P4 tier boundaries");

// Test 21: Missing fields do not throw exceptions
assert.doesNotThrow(() => {
  const badRes = calculatePriorityScore({ id: 999, title: null, category: undefined, created_at: 'invalid-date', location_source: {} });
  assert.strictEqual(typeof badRes.score, 'number');
  assert.strictEqual(typeof badRes.tier, 'string');
});
console.log("[PASS] Test 21: Missing fields do not throw exceptions");

console.log("\nPHASE 7A TEST RESULTS: 21/21 assertions passed.");
