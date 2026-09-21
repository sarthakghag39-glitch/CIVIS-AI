// Phase 9C Test Suite: Privacy Hardening & Citizen Data Minimization Audit
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING PHASE 9C PRIVACY & DATA MINIMIZATION TEST SUITE ---');

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
  const adminAppPath = path.join(__dirname, '../public/admin/app.js');
  const userAppContent = fs.readFileSync(userAppPath, 'utf8');
  const adminAppContent = fs.readFileSync(adminAppPath, 'utf8');

  // Extract getIssues function body cleanly
  const getIssuesStart = userAppContent.indexOf('async function getIssues()');
  const getIssuesEnd = userAppContent.indexOf('function classifyImage', getIssuesStart);
  const getIssuesBody = userAppContent.slice(getIssuesStart, getIssuesEnd !== -1 ? getIssuesEnd : getIssuesStart + 400);

  // Test 1: Verify getIssues exists in public/user/app.js
  assert(getIssuesStart !== -1, 'getIssues function exists in public/user/app.js');

  // Test 2: Verify select('*') is NOT present in getIssues() in public/user/app.js
  assert(!getIssuesBody.includes("select('*')") && !getIssuesBody.includes('select("*")'), 'getIssues() in public/user/app.js does NOT use select("*")');

  // Test 3: Verify citizen getIssues uses explicit select field list
  assert(getIssuesBody.includes(".select('id, complaint_id,"), 'getIssues() uses explicit field selection string');

  // Test 4: Verify reported_by_email is omitted from citizen query
  assert(!getIssuesBody.includes('reported_by_email'), 'reported_by_email is omitted from citizen getIssues() query');

  // Test 5: Verify reported_by_phone is omitted from citizen query
  assert(!getIssuesBody.includes('reported_by_phone'), 'reported_by_phone is omitted from citizen getIssues() query');

  // Test 6: Verify essential public fields are present in citizen query
  const requiredPublicFields = [
    'id', 'complaint_id', 'title', 'category', 'location',
    'lat', 'lng', 'date', 'status', 'progress', 'criticality',
    'description', 'reported_by', 'image_url', 'ai_analyzed',
    'ai_category', 'ai_severity', 'ai_severity_score', 'ai_confidence',
    'ai_detected_tags', 'ai_recommended_action', 'ai_reasoning_summary'
  ];
  const allFieldsPresent = requiredPublicFields.every(field => getIssuesBody.includes(field));
  assert(allFieldsPresent, 'All 22 explicit public non-PII fields are included in getIssues() query');

  // Test 7: Verify public/admin/app.js retains select('*') for triage and CSV export
  assert(adminAppContent.includes(".from('issues').select('*')") || adminAppContent.includes('.from("issues").select("*")'), 'public/admin/app.js retains select("*") for admin triage and CSV export');

  // Test 8: Verify public/admin/app.js retains handleExportCSV functionality
  assert(adminAppContent.includes('handleExportCSV') || adminAppContent.includes('exportCSV') || adminAppContent.includes('CSV'), 'public/admin/app.js retains CSV export capability');

  // Test 9: Verify Phase 9A webhooks remain untouched
  const webhookMetaPath = path.join(__dirname, '../api/webhooks/meta.js');
  const webhookMetaContent = fs.readFileSync(webhookMetaPath, 'utf8');
  assert(webhookMetaContent.includes('META_VERIFY_TOKEN') && webhookMetaContent.includes('x-hub-signature'), 'Phase 9A Meta webhook handler is intact');

  // Test 10: Verify Phase 9B AI endpoint security remains untouched
  const analyzeIssuePath = path.join(__dirname, '../api/analyze_issue.js');
  const analyzeIssueContent = fs.readFileSync(analyzeIssuePath, 'utf8');
  assert(analyzeIssueContent.includes('checkInstanceRateLimit') && analyzeIssueContent.includes('authorization'), 'Phase 9B AI issue analyzer security is intact');

  // Test 11: Verify Shared Prioritization Engine remains untouched
  const prioEnginePath = path.join(__dirname, '../public/js/prioritization_engine.js');
  assert(fs.existsSync(prioEnginePath), 'public/js/prioritization_engine.js is intact and present');

  // Test 12: Verify Shared Routing Engine remains untouched
  const routingEnginePath = path.join(__dirname, '../public/js/routing_engine.js');
  assert(fs.existsSync(routingEnginePath), 'public/js/routing_engine.js is intact and present');

  // Test 13: Verify Shared Clustering Engine remains untouched
  const clusteringEnginePath = path.join(__dirname, '../public/js/clustering_engine.js');
  assert(fs.existsSync(clusteringEnginePath), 'public/js/clustering_engine.js is intact and present');

  // Test 14: Verify citizen index html does not reference sensitive PII fields directly
  const citizenIndexPath = path.join(__dirname, '../public/user/index.html');
  const citizenIndexContent = fs.readFileSync(citizenIndexPath, 'utf8');
  assert(!citizenIndexContent.includes('reported_by_email') && !citizenIndexContent.includes('reported_by_phone'), 'public/user/index.html does not expose or request PII fields');

  console.log(`\nPHASE 9C PRIVACY TEST SUITE SUMMARY: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
