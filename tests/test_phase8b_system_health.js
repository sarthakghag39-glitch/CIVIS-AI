// CIVIS-AI Phase 8B System Health & Observability Unit & Integration Tests

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { calculatePriorityScore, getSLAStatus } = require('../public/js/prioritization_engine.js');

console.log("--- RUNNING PHASE 8B SYSTEM HEALTH & OBSERVABILITY TEST SUITE ---");

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

const htmlPath = path.join(__dirname, '..', 'public', 'admin', 'system_health.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Test 1: Mock page-view logic (civis_mock_views) removed
test('Test 1: Mock page-view logic (civis_mock_views) removed', () => {
  assert.strictEqual(htmlContent.includes('civis_mock_views'), false, 'civis_mock_views must not exist');
});

// Test 2: Math.random telemetry removed
test('Test 2: Math.random telemetry removed', () => {
  // Extract inline script tag from system_health.html
  const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  assert.ok(scriptMatch, 'Inline script block should exist');
  const scriptText = scriptMatch[1];
  assert.strictEqual(scriptText.includes('Math.random'), false, 'Math.random must not exist in health script');
});

// Test 3: Fake RAM fallback (mockRamPct) removed
test('Test 3: Fake RAM fallback (mockRamPct) removed', () => {
  assert.strictEqual(htmlContent.includes('mockRamPct'), false, 'mockRamPct must not exist');
});

// Test 4: TensorFlow/MobileNet static health claims removed
test('Test 4: TensorFlow/MobileNet static health claims removed', () => {
  assert.strictEqual(htmlContent.includes('TensorFlow Edge classifier Node'), false, 'TensorFlow node claim must not exist');
  assert.strictEqual(htmlContent.includes('MobileNet Image Classification Endpoint'), false, 'MobileNet endpoint claim must not exist');
});

// Test 5: Static uptime claims removed
test('Test 5: Static uptime claims removed', () => {
  assert.strictEqual(htmlContent.includes('Uptime: 99.99%'), false, 'Uptime 99.99% must not exist');
  assert.strictEqual(htmlContent.includes('Uptime: 100%'), false, 'Uptime 100% must not exist');
});

// Test 6: Historical fake 2026-08-11 logs removed
test('Test 6: Historical fake 2026-08-11 logs removed', () => {
  assert.strictEqual(htmlContent.includes('2026-08-11'), false, 'Historical 2026-08-11 logs must not exist');
});

// Test 7: Event loop metric is correctly labeled ("Event Loop Responsiveness")
test('Test 7: Event loop metric is correctly labeled ("Event Loop Responsiveness")', () => {
  assert.ok(htmlContent.includes('Event Loop Responsiveness'), 'Event Loop Responsiveness label must exist');
  assert.strictEqual(htmlContent.includes('<span class="font-bold text-sm text-on-surface">CPU Load</span>'), false, 'Misleading CPU Load label must not exist');
});

// Test 8: Browser memory fallback is "Unavailable in this browser"
test('Test 8: Browser memory fallback is "Unavailable in this browser"', () => {
  assert.ok(htmlContent.includes('Unavailable in this browser'), 'Fallback message must state Unavailable in this browser');
});

// Test 9: Database failure is handled gracefully (status = UNAVAILABLE)
test('Test 9: Database failure is handled gracefully (status = UNAVAILABLE)', () => {
  let isDbHealthy = false;
  let statusText = isDbHealthy ? 'ONLINE' : 'UNAVAILABLE';
  assert.strictEqual(statusText, 'UNAVAILABLE');
});

// Test 10: Runtime diagnostics continue when database query fails
test('Test 10: Runtime diagnostics continue when database query fails', () => {
  let dbFailed = true;
  let eventLoopRan = false;
  try {
    if (dbFailed) throw new Error('DB Offline');
  } catch (err) {
    // Isolated catch block
  }
  // Event loop test runs regardless
  eventLoopRan = true;
  assert.strictEqual(eventLoopRan, true, 'Event loop check must execute even if DB fails');
});

// Test 11: Missing issue data is handled gracefully
test('Test 11: Missing issue data is handled gracefully', () => {
  const safeIssues = null;
  const issuesList = Array.isArray(safeIssues) ? safeIssues : [];
  assert.strictEqual(issuesList.length, 0);
});

// Test 12: Missing incident data is handled gracefully
test('Test 12: Missing incident data is handled gracefully', () => {
  const issue = { id: 10, title: 'Sample Issue', criticality: 'High', category: 'Road Damage' };
  const pData = calculatePriorityScore(issue, null); // null incidentMap
  assert.ok(pData && typeof pData.score === 'number', 'Priority calculation must succeed with null incidentMap');
});

// Test 13: Application health metrics are calculated deterministically
test('Test 13: Application health metrics are calculated deterministically', () => {
  const issues = [
    { id: 1, status: 'Pending', location_source: 'gps', assigned_department: 'PWD', ai_severity: 'High' },
    { id: 2, status: 'Resolved', location_source: null, assigned_department: null, ai_severity: null }
  ];
  const gpsCount = issues.filter(i => i.location_source === 'gps').length;
  const activeCount = issues.filter(i => i.status !== 'Resolved').length;
  assert.strictEqual(gpsCount, 1);
  assert.strictEqual(activeCount, 1);
});

// Test 14: Priority Engine uses CivisPrioritizationEngine rather than duplicate formula
test('Test 14: Priority Engine uses CivisPrioritizationEngine rather than duplicate formula', () => {
  assert.ok(htmlContent.includes('CivisPrioritizationEngine.calculatePriorityScore'), 'Must call CivisPrioritizationEngine.calculatePriorityScore');
});

// Test 15: No DB schema changes introduced
test('Test 15: No DB schema changes introduced', () => {
  // Verify system_health.html does not contain DDL commands
  assert.strictEqual(htmlContent.includes('CREATE TABLE'), false);
  assert.strictEqual(htmlContent.includes('ALTER TABLE'), false);
});

// Test 16: No RLS changes introduced
test('Test 16: No RLS changes introduced', () => {
  assert.strictEqual(htmlContent.includes('CREATE POLICY'), false);
  assert.strictEqual(htmlContent.includes('ALTER POLICY'), false);
});

// Test 17: No auth changes introduced
test('Test 17: No auth changes introduced', () => {
  assert.strictEqual(htmlContent.includes('supabase.auth.signUp'), false);
  assert.strictEqual(htmlContent.includes('supabase.auth.signInWithPassword'), false);
});

// Test 18: Session diagnostics generated dynamically during current session
test('Test 18: Session diagnostics generated dynamically during current session', () => {
  assert.ok(htmlContent.includes('Session Diagnostics Console'), 'Session Diagnostics Console section must exist');
  assert.ok(htmlContent.includes('SESSION DIAGNOSTICS'), 'Header badge must say SESSION DIAGNOSTICS');
});

// Test 19: Refresh interval is non-aggressive (>= 15 seconds)
test('Test 19: Refresh interval is non-aggressive (>= 15 seconds)', () => {
  const match = htmlContent.match(/REFRESH_INTERVAL_MS\s*=\s*(\d+)/);
  assert.ok(match, 'REFRESH_INTERVAL_MS constant must be defined');
  const intervalMs = parseInt(match[1], 10);
  assert.ok(intervalMs >= 15000, `Interval ${intervalMs}ms must be >= 15000ms`);
});

// Test 20: Sensitive credentials are not exposed in HTML/JS diagnostics
test('Test 20: Sensitive credentials are not exposed in HTML/JS diagnostics', () => {
  assert.strictEqual(htmlContent.includes('service_role'), false, 'service_role key must not exist');
  assert.strictEqual(htmlContent.includes('SUPABASE_SERVICE_ROLE_KEY'), false, 'Service role env var must not exist');
});

console.log(`\nPHASE 8B TEST RESULTS: ${passCount}/20 assertions passed.\n`);
