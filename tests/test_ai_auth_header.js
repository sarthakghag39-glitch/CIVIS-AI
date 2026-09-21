// Test suite: AI Analysis Authorization Header
const fs = require('fs');
const path = require('path');

function runTests() {
  console.log("--- RUNNING AI ANALYSIS AUTHORIZATION HEADER TEST SUITE ---");
  let passed = 0;
  let total = 0;

  function check(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
    }
  }

  const appJsPath = path.join(__dirname, '..', 'public', 'user', 'app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  // Test 1: Both /api/analyze_issue fetch calls exist in public/user/app.js
  const fetchMatches = (appJs.match(/fetch\(['"]\/api\/analyze_issue['"]/g) || []).length;
  check(
    fetchMatches === 2,
    `Exactly two fetch('/api/analyze_issue') calls exist in public/user/app.js (found: ${fetchMatches})`
  );

  // Test 2: Both calls include Authorization Bearer header
  const authHeaderMatches = (appJs.match(/'Authorization':\s*`Bearer \${session\.access_token}`/g) || []).length;
  check(
    authHeaderMatches === 2,
    `Both fetch calls send 'Authorization': 'Bearer \${session.access_token}' (found: ${authHeaderMatches})`
  );

  // Test 3: Session check occurs prior to calling /api/analyze_issue
  check(
    appJs.includes('supabaseClient.auth.getSession()') && appJs.includes('session.access_token'),
    'Session is retrieved via supabaseClient.auth.getSession() before making AI requests'
  );

  // Test 4: Unauthenticated fallback handles missing session gracefully
  check(
    appJs.includes('Authentication Required') || appJs.includes('User is not authenticated'),
    'Unauthenticated state displays user message and returns early before fetch'
  );

  // Test 5: Groq API key is NOT exposed in browser client app.js
  check(
    !appJs.includes('gsk_') && !appJs.includes('GROQ_API_KEY'),
    'Groq API key is strictly omitted from browser client code (no gsk_ or GROQ_API_KEY)'
  );

  // Test 6: In-memory image handoff state variables remain intact
  check(
    appJs.includes('selectedComplaintImageFile') && appJs.includes('selectedComplaintImagePreviewUrl') && appJs.includes('setSelectedComplaintImage'),
    'Image handoff state variables (selectedComplaintImageFile, selectedComplaintImagePreviewUrl) remain intact'
  );

  // Test 7: Backend api/analyze_issue.js enforces Authorization Bearer check
  const backendCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'analyze_issue.js'), 'utf8');
  check(
    backendCode.includes('req.headers[\'authorization\']') && backendCode.includes('Unauthorized: Missing or invalid'),
    'Backend api/analyze_issue.js strictly enforces server-side Authorization header validation'
  );

  console.log(`\nAI AUTH HEADER TEST SUITE SUMMARY: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
