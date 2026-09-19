// Phase 3 Automated Severity + Department Routing Unit Tests
const { routeIssue, getDepartmentForCategory, deriveCriticalityFromAi, normalizeCategory } = require('../public/js/routing_engine.js');

let passed = 0;
let total = 0;

function assertEqual(actual, expected, testName) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    console.error(`   Expected:`, expected);
    console.error(`   Actual:  `, actual);
  }
}

console.log('--- RUNNING PHASE 3 ROUTING ENGINE UNIT TESTS ---');

// Test 1: Road Damage + High Score (80)
const res1 = routeIssue({
  category: 'Roads & Potholes',
  criticality: 'Moderate',
  ai_analyzed: true,
  ai_category: 'Road Damage',
  ai_severity: 'High',
  ai_severity_score: 80
});
assertEqual(res1.assigned_department, 'Road Maintenance & PWD', 'Test 1a: Road Damage Dept');
assertEqual(res1.criticality, 'Critical', 'Test 1b: Road Damage Criticality (Score 80 -> Critical)');
assertEqual(res1.auto_routed, true, 'Test 1c: Auto Routed True');

// Test 2: Garbage + Moderate Score (35)
const res2 = routeIssue({
  category: 'Garbage',
  criticality: 'Normal',
  ai_analyzed: true,
  ai_category: 'Garbage',
  ai_severity: 'Moderate',
  ai_severity_score: 35
});
assertEqual(res2.assigned_department, 'Solid Waste & Sanitation', 'Test 2a: Garbage Dept');
assertEqual(res2.criticality, 'Moderate', 'Test 2b: Garbage Criticality (Score 35 -> Moderate)');

// Test 3: Unanalyzed Water Leakage (ai_analyzed = false)
const res3 = routeIssue({
  category: 'Water Leakage',
  criticality: 'High',
  ai_analyzed: false
});
assertEqual(res3.assigned_department, 'Water Supply & Drainage', 'Test 3a: Water Leakage Dept');
assertEqual(res3.criticality, 'High', 'Test 3b: Preserves existing criticality when ai_analyzed = false');

// Test 4: Low score (15) Streetlights
const res4 = routeIssue({
  category: 'Street Lighting',
  criticality: 'High',
  ai_analyzed: true,
  ai_category: 'Streetlights',
  ai_severity: 'Low',
  ai_severity_score: 15
});
assertEqual(res4.assigned_department, 'Electrical & Street Lighting', 'Test 4a: Streetlights Dept');
assertEqual(res4.criticality, 'Normal', 'Test 4b: Low Score 15 -> Normal');

// Test 5: Critical severity string override regardless of score
const res5 = routeIssue({
  category: 'Road Damage',
  criticality: 'Normal',
  ai_analyzed: true,
  ai_category: 'Road Damage',
  ai_severity: 'Critical',
  ai_severity_score: 10
});
assertEqual(res5.assigned_department, 'Road Maintenance & PWD', 'Test 5a: Road Damage Dept');
assertEqual(res5.criticality, 'Critical', 'Test 5b: ai_severity Critical override');

// Test 6: Unknown category
const res6 = routeIssue({
  category: 'Park Bench Broken',
  criticality: 'Normal',
  ai_analyzed: false
});
assertEqual(res6.assigned_department, 'General Municipal Administration', 'Test 6: Unknown category -> General Municipal Administration');

// Test 7: Category Alias Normalization
assertEqual(normalizeCategory('Sanitation / Waste'), 'Garbage', 'Test 7a: Category alias Sanitation / Waste');
assertEqual(normalizeCategory('Water Supply'), 'Water Leakage', 'Test 7b: Category alias Water Supply');

// Summary
console.log(`\nTEST RESULTS: ${passed}/${total} assertions passed.`);
if (passed !== total) {
  process.exit(1);
}
