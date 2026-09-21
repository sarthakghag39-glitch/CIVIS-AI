// Step 4 Test Suite: Admin Privacy Hardening & Data Minimization Verification
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING STEP 4 ADMIN PRIVACY HARDENING TEST SUITE ---');

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
  const adminAppPath = path.join(__dirname, '../public/admin/app.js');
  const userAppPath = path.join(__dirname, '../public/user/app.js');
  const systemHealthPath = path.join(__dirname, '../public/admin/system_health.html');

  const adminAppContent = fs.readFileSync(adminAppPath, 'utf8');
  const userAppContent = fs.readFileSync(userAppPath, 'utf8');
  const systemHealthContent = fs.readFileSync(systemHealthPath, 'utf8');

  // Test 1: Verify raw profile PII mapping is removed from System Health script
  assert(!systemHealthContent.includes("profiles.map(p =>"), 'SEC-STEP4: Raw profile PII mapping removed from system_health.html script');
  assert(!systemHealthContent.includes("avatar = `https://api.dicebear.com"), 'SEC-STEP4: Dicebear avatar PII fetching removed from system_health.html script');

  // Test 2: Verify System Health retains aggregate profiles metric card
  assert(systemHealthContent.includes("id=\"stat-login-members\""), 'SEC-STEP4: stat-login-members aggregate counter element exists');
  assert(systemHealthContent.includes("elMembers.innerText = isDbHealthy ? profilesCount.toLocaleString() : 'Unavailable'"), 'SEC-STEP4: Aggregate profile count metric persists in system_health.html');

  // Test 3: Verify getIssues in public/admin/app.js does NOT use select('*')
  const getIssuesStart = adminAppContent.indexOf('async function getIssues()');
  const getIssuesEnd = adminAppContent.indexOf('cachedIssues = data;', getIssuesStart);
  const getIssuesBody = adminAppContent.slice(getIssuesStart, getIssuesEnd !== -1 ? getIssuesEnd : getIssuesStart + 400);

  assert(!getIssuesBody.includes("select('*')") && !getIssuesBody.includes('select("*")'), 'SEC-STEP4: getIssues() in public/admin/app.js does NOT use select("*")');

  // Test 4: Verify explicit admin field selection in public/admin/app.js getIssues()
  assert(getIssuesBody.includes(".select('id, complaint_id,"), 'SEC-STEP4: getIssues() in public/admin/app.js uses explicit field selection string');

  // Test 5: Verify required triage contact fields remain in admin getIssues() query
  assert(getIssuesBody.includes('reported_by_email'), 'SEC-STEP4: reported_by_email retained in admin getIssues() query for triage');
  assert(getIssuesBody.includes('reported_by_phone'), 'SEC-STEP4: reported_by_phone retained in admin getIssues() query for triage');

  // Test 6: Verify required triage spatial and AI fields remain in admin getIssues() query
  assert(getIssuesBody.includes('location_accuracy_meters') && getIssuesBody.includes('ai_reasoning_summary') && getIssuesBody.includes('incident_id'), 'SEC-STEP4: Spatial, AI, and incident triage fields retained in admin query');

  // Test 7: Verify handleExportCSV retains all 15 required CSV export headers
  assert(adminAppContent.includes("const headers = ['Complaint ID', 'Database ID', 'Title', 'Category', 'Assigned Department', 'Priority', 'Location', 'Date', 'Status', 'Progress', 'Reported By', 'Email', 'Phone', 'Latitude', 'Longitude'];"), 'SEC-STEP4: handleExportCSV() retains all 15 required export columns');

  // Test 8: Verify Phase 9C citizen data minimization remains 100% intact in public/user/app.js
  const userGetIssuesStart = userAppContent.indexOf('async function getIssues()');
  const userGetIssuesEnd = userAppContent.indexOf('cachedIssues = data;', userGetIssuesStart);
  const userGetIssuesBody = userAppContent.slice(userGetIssuesStart, userGetIssuesEnd !== -1 ? userGetIssuesEnd : userGetIssuesStart + 400);

  assert(!userGetIssuesBody.includes("select('*')"), 'SEC-STEP4: Citizen getIssues() in public/user/app.js retains select("*") omission');
  assert(!userGetIssuesBody.includes('reported_by_email') && !userGetIssuesBody.includes('reported_by_phone'), 'SEC-STEP4: Citizen query retains PII omission (email and phone excluded)');

  // Test 9: Verify admin issue detail modal retains contact info rendering
  assert(adminAppContent.includes("${escapeHTML(issue.reported_by_email || 'N/A')} • ${escapeHTML(issue.reported_by_phone || 'N/A')}"), 'SEC-STEP4: Admin issue detail modal retains escaped contact info display');

  console.log(`\nSTEP 4 ADMIN PRIVACY TEST SUITE SUMMARY: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
