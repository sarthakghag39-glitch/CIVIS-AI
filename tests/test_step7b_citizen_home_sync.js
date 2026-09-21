// STEP 7B Test Suite: Citizen Home Data Synchronization & Privacy Audit
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING STEP 7B CITIZEN HOME DATA SYNCHRONIZATION TEST SUITE ---');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`[PASS] Test ${total}: ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] Test ${total}: ${message}`);
    process.exitCode = 1;
  }
}

function runTests() {
  const userAppPath = path.join(__dirname, '../public/user/app.js');
  const userIndexPath = path.join(__dirname, '../public/user/index.html');
  
  const userAppContent = fs.readFileSync(userAppPath, 'utf8');
  const userIndexContent = fs.readFileSync(userIndexPath, 'utf8');

  const getIssuesStart = userAppContent.indexOf('async function getIssues()');
  const getIssuesEnd = userAppContent.indexOf('function classifyImage', getIssuesStart);
  const getIssuesBody = userAppContent.slice(getIssuesStart, getIssuesEnd !== -1 ? getIssuesEnd : getIssuesStart + 400);

  // Test 1: Verify created_at is included in getIssues() explicit query
  assert(getIssuesBody.includes('created_at'), 'created_at is included in the citizen explicit getIssues() query');

  // Test 2: Verify reported_by_email remains excluded from getIssues()
  assert(!getIssuesBody.includes('reported_by_email'), 'reported_by_email remains excluded from getIssues() query');

  // Test 3: Verify reported_by_phone remains excluded from getIssues()
  assert(!getIssuesBody.includes('reported_by_phone'), 'reported_by_phone remains excluded from getIssues() query');

  // Test 4: Verify Critical issue takes priority over High AI issue in Live System Alert
  const updateHomeStart = userAppContent.indexOf('function updateHomeDashboardStats');
  const updateHomeEnd = userAppContent.indexOf('window.formatTimeAgo', updateHomeStart);
  const updateHomeBody = userAppContent.slice(updateHomeStart, updateHomeEnd !== -1 ? updateHomeEnd : updateHomeStart + 2500);

  assert(
    updateHomeBody.includes('criticalAlerts.length > 0') && 
    updateHomeBody.indexOf('criticalAlerts.length > 0') < updateHomeBody.indexOf('highAiAlerts.length > 0'),
    'Criticality === "Critical" is evaluated first before highAiAlerts (>= 80)'
  );

  // Test 5: Verify sorting newest first for Critical issues (b.id - a.id)
  assert(updateHomeBody.includes('criticalAlerts.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))'), 'Newest Critical issue is selected among multiple Critical issues');

  // Test 6: Verify High AI (>= 80) is selected only when no Critical exists
  assert(updateHomeBody.includes('else if (highAiAlerts.length > 0)'), 'High/AI>=80 is evaluated only in else-if branch when no Critical alert exists');

  // Test 7: Verify empty statefallback texts exist ("No Critical Alerts", "All civic systems operating normally")
  assert(updateHomeBody.includes('dict.no_critical_alerts') && updateHomeBody.includes('dict.all_systems_normal'), 'Empty state titles "No Critical Alerts" and "All civic systems operating normally" are assigned when no qualifying alert exists');

  // Test 8: Verify no arbitrary active issue is labeled Critical (unresolved issues without Critical or AI>=80 do NOT get set as selectedAlert)
  assert(!updateHomeBody.includes('issues.find(i => i.status !== \'Resolved\')') && !updateHomeBody.includes('issues.find(i => i.status !== "Resolved")'), 'Arbitrary low/moderate unresolved issues are NOT selected as Critical Alerts');

  // Test 9: Verify Home authentication uses currentAuthenticatedUser
  assert(updateHomeBody.includes('activeUser = user || currentAuthenticatedUser'), 'Home authentication logic relies on currentAuthenticatedUser');

  // Test 10: Verify AI Bearer auth header remains intact in app.js
  assert(userAppContent.includes("'Authorization': `Bearer"), 'AI Bearer authorization header remains intact');

  // Test 11: Verify AI scan handoff keys remain intact in app.js
  assert(userAppContent.includes('civis_captured_img') && userAppContent.includes('civis_sim_category'), 'AI scan handoff keys (civis_captured_img, civis_sim_category) remain intact');

  // Test 12: Verify Nearby Alerts section heading is updated to Active Civic Alerts and doesn't claim uncalculated proximity
  assert(userIndexContent.includes('Active Civic Alerts') && !userIndexContent.includes('Nearby Alerts'), 'Section heading in index.html is "Active Civic Alerts" without claiming uncalculated proximity');

  console.log(`\nSTEP 7B TEST SUITE SUMMARY: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
