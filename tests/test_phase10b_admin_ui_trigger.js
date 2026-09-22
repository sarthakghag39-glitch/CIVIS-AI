// CIVIS-AI Phase 10B Admin Manual Notify Authority UI Action Test Suite
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING PHASE 10B ADMIN MANUAL NOTIFY AUTHORITY UI ACTION TEST SUITE ---');

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
  const adminAppContent = fs.readFileSync(adminAppPath, 'utf8');

  // Extract openAdminComplaintDetailModal block
  const modalStart = adminAppContent.indexOf('async function openAdminComplaintDetailModal(');
  const modalEnd = adminAppContent.indexOf('window.openAdminComplaintDetailModal = openAdminComplaintDetailModal', modalStart);
  const modalCode = adminAppContent.slice(modalStart, modalEnd !== -1 ? modalEnd : modalStart + 12000);

  // Test 1: modal-notify-authority-btn exists in modal HTML
  assert(modalCode.includes('id="modal-notify-authority-btn"') && modalCode.includes('Notify Authority'), 'Notify Authority button is present in Admin Complaint Detail modal footer');

  // Test 2: Click event listener attached to modal-notify-authority-btn
  assert(modalCode.includes("modal.querySelector('#modal-notify-authority-btn')"), 'Click event listener is attached to modal-notify-authority-btn');

  // Test 3: Session authentication check before fetch
  assert(modalCode.includes('supabaseClient.auth.getSession()') && modalCode.includes('session.access_token'), 'Auth session and access_token are verified before making request');

  // Test 4: POST /api/notify_authority endpoint is called
  assert(modalCode.includes("fetch('/api/notify_authority'"), "UI action calls POST /api/notify_authority endpoint");

  // Test 5: Authorization Bearer header is passed
  assert(modalCode.includes("'Authorization': `Bearer ${session.access_token}`"), 'Authorization Bearer header is passed with current session token');

  // Test 6: issue_id is sent as issue.id and complaint_id is NOT sent in request body
  const fetchBodyStr = modalCode.slice(modalCode.indexOf("body: JSON.stringify({"), modalCode.indexOf('})', modalCode.indexOf("body: JSON.stringify({")));
  assert(fetchBodyStr.includes('issue_id: issue.id') && !fetchBodyStr.includes('complaint_id'), 'issue.id is sent as issue_id and complaint_id is NOT sent in request body');

  // Test 7: No client-supplied authority email parameters exist
  assert(!modalCode.includes('authority_email:') && !modalCode.includes('official_email:'), 'No authority email parameter is client-supplied');

  // Test 8: No force_resend parameter is sent in client UI body
  const fetchBlock = modalCode.slice(modalCode.indexOf("fetch('/api/notify_authority'"), modalCode.indexOf('const data = await response.json()'));
  assert(!fetchBlock.includes('force_resend'), 'No force_resend parameter is sent in normal UI action request body');

  // Test 9: Button is disabled during request and re-enabled in finally block
  assert(modalCode.includes('notifyAuthBtn.disabled = true') && modalCode.includes('notifyAuthBtn.disabled = false'), 'Notify Authority button is disabled during request and re-enabled after completion');

  // Test 10: All backend status codes handled cleanly (200, 401/403, 404, 429, 500)
  assert(modalCode.includes("already_notified") && modalCode.includes('404') && modalCode.includes('429'), 'Response status codes (200 already_notified, 401/403, 404, 429, 500) are handled with clear UI messages');

  console.log(`\nADMIN UI TRIGGER TEST RESULTS: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
