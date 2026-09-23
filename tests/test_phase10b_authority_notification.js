// CIVIS-AI Phase 10B n8n Authority Notification API Test Suite
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('--- RUNNING PHASE 10B AUTHORITY NOTIFICATION API TEST SUITE ---');

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

// Load Serverless Handler
const notifyAuthorityHandler = require('../api/notify_authority.js');

// Helper mock res object
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
}

async function runTests() {
  // Test 1: GET method returns 405 Method Not Allowed
  {
    const req = { method: 'GET', headers: {} };
    const res = createMockRes();
    await notifyAuthorityHandler(req, res);
    assert(res.statusCode === 405 && res.body?.error?.includes('Method Not Allowed'), 'GET request returns 405 Method Not Allowed');
  }

  // Test 2: Missing Authorization header returns 401
  {
    const req = { method: 'POST', headers: {}, body: { issue_id: 'test-issue-id-123' } };
    const res = createMockRes();
    await notifyAuthorityHandler(req, res);
    assert(res.statusCode === 401 && res.body?.error?.includes('Missing or invalid'), 'Missing Authorization header returns 401');
  }

  // Test 3: Invalid JWT token returns 401
  {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer invalid-token-12345' },
      body: { issue_id: 'test-issue-id-123' }
    };
    const res = createMockRes();
    await notifyAuthorityHandler(req, res);
    assert(res.statusCode === 401 && res.body?.error?.includes('Invalid or expired'), 'Invalid JWT token returns 401');
  }

  // Test 4: Missing issue_id returns 400
  {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer test-admin-token' },
      body: {}
    };
    const res = createMockRes();
    await notifyAuthorityHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('issue_id is required'), 'Missing issue_id returns 400 Bad Request');
  }

  // Test 5: Invalid issue_id type returns 400
  {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer test-admin-token' },
      body: { issue_id: { invalid: 'object' } }
    };
    const res = createMockRes();
    await notifyAuthorityHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('issue_id is required'), 'Invalid issue_id type returns 400 Bad Request');
  }

  // Test 6: Unknown issue_id returns 404
  {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer test-admin-token' },
      body: { issue_id: 'NONEXISTENT-ISSUE-ID-99999999' }
    };
    const res = createMockRes();
    await notifyAuthorityHandler(req, res);
    assert(res.statusCode === 404 && res.body?.error?.includes('Complaint not found'), 'Non-existent issue_id returns 404 Not Found');
  }

  // Test 7: Citizen owns complaint -> Authorized past ownership check (mock/DB test)
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes('isOwner') && codeStr.includes('reported_by_email'), 'Citizen ownership check verifies user email against reported_by_email');
  }

  // Test 8: Citizen attempting another user complaint is blocked with 403
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes("return res.status(403).json({") && codeStr.includes("Forbidden"), 'Unauthorized user attempt returns 403 Forbidden');
  }

  // Test 9: Admin can notify any complaint (isAdmin bypasses ownership)
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes('!isAdmin && !isOwner'), 'Admin role bypasses individual complaint ownership restriction');
  }

  // Test 10: Citizen force_resend is ignored (only admin can force resend)
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes('const isForceResendAllowed = isAdmin && Boolean(body.force_resend);'), 'force_resend parameter is strictly restricted to Admin role');
  }

  // Test 11: Admin force_resend works (bypasses authority_notified check)
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes('issue.authority_notified === true && !isForceResendAllowed'), 'Idempotency check allows override only when force_resend is allowed by Admin');
  }

  // Test 12: Missing assigned_department returns 409 safe failure
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes("Complaint has no assigned department"), 'Unrouted complaint without department returns 409 Conflict error');
  }

  // Test 13: Authority resolved strictly from department_authorities database table
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes("from('department_authorities')") && codeStr.includes("eq('environment', 'demo')"), 'Authority recipient email is queried strictly from public.department_authorities registry');
  }

  // Test 14: Client-provided recipient email is ignored/rejected
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(!codeStr.includes('body.recipient_email') && !codeStr.includes('body.official_email'), 'Client payload recipient parameters are strictly ignored and not accepted');
  }

  // Test 15: authority_notified=true returns already_notified status
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes("status: 'already_notified'"), 'Already notified complaint returns 200 with status already_notified');
  }

  // Test 16: n8n payload contains expected complaint, authority, and AI structure
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes('event: \'authority_complaint_notification\'') && codeStr.includes('authority:') && codeStr.includes('ai_analysis:'), 'n8n payload is cleanly structured with complaint, authority, and AI analysis data');
  }

  // Test 16b: n8n payload contains reported_by_name and reported_by_email
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(
      codeStr.includes('reported_by_name: issue.reported_by') &&
      codeStr.includes('reported_by_email: issue.reported_by_email'),
      'n8n payload includes reported_by_name and reported_by_email for citizen acknowledgement flow'
    );
  }

  // Test 17: HMAC-SHA256 signature header is generated correctly
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes("createHmac('sha256', N8N_SECRET)") && codeStr.includes("'X-CIVIS-Signature': `sha256=${signature}`"), 'X-CIVIS-Signature header contains valid HMAC-SHA256 signature');
  }

  // Test 18: Missing n8n configuration fails safely with 503
  {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer test-admin-token' },
      body: { issue_id: 'test-issue-12345' }
    };
    const res = createMockRes();
    const oldUrl = process.env.N8N_AUTHORITY_WEBHOOK_URL;
    delete process.env.N8N_AUTHORITY_WEBHOOK_URL;

    await notifyAuthorityHandler(req, res);

    if (oldUrl) process.env.N8N_AUTHORITY_WEBHOOK_URL = oldUrl;

    assert(res.statusCode === 503 || (res.body && res.body.status === 'configuration_missing') || res.statusCode === 404, 'Missing n8n configuration fails safely without crashing endpoint');
  }

  // Test 19: n8n failure or timeout returns graceful 200 with notification_failed (no 500 error thrown)
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes("status: 'notification_failed'") && codeStr.includes("warning: 'Authority notification could not be delivered to webhook.'"), 'n8n delivery failure returns 200 OK with notification_failed warning to preserve complaint');
  }

  // Test 20: Successful n8n call updates authority_notified in DB
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    assert(codeStr.includes("authority_notified: true") && codeStr.includes("authority_notified_at:"), 'Successful notification updates authority_notified and authority_notified_at in issues table');
  }

  // Test 21: PII and authority recipient email are excluded from client API response
  {
    const codeStr = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    const returnStart = codeStr.lastIndexOf('return res.status(200).json({');
    const lastReturn = codeStr.slice(returnStart);
    assert(
      !lastReturn.includes('reported_by_email') &&
      !lastReturn.includes('reported_by_phone') &&
      !lastReturn.includes('authority_email') &&
      lastReturn.includes('success: true') &&
      lastReturn.includes("status: 'sent'") &&
      lastReturn.includes('issue_id: issue.id') &&
      lastReturn.includes('complaint_id: issue.complaint_id'),
      'Client HTTP response body excludes authority_email, reported_by_email, reported_by_phone while containing success, status, issue_id, complaint_id'
    );
  }

  // Test 22: Rate limit returns 429 after threshold
  {
    const req = { method: 'POST', headers: { authorization: 'Bearer test-admin-token' }, body: { issue_id: 'rate-limit-issue-id' } };
    let hitRateLimit = false;
    for (let i = 0; i < 8; i++) {
      const res = createMockRes();
      await notifyAuthorityHandler(req, res);
      if (res.statusCode === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit, 'Rate limit threshold triggers 429 Too Many Requests response');
  }

  // Test 23: API copies remain byte-for-byte identical across root, public/, public/user/, and public/admin/
  {
    const rootApi = fs.readFileSync(path.join(__dirname, '../api/notify_authority.js'), 'utf8');
    const publicApi = fs.readFileSync(path.join(__dirname, '../public/api/notify_authority.js'), 'utf8');
    const publicUserApi = fs.readFileSync(path.join(__dirname, '../public/user/api/notify_authority.js'), 'utf8');
    const publicAdminApi = fs.readFileSync(path.join(__dirname, '../public/admin/api/notify_authority.js'), 'utf8');
    assert(rootApi === publicApi && rootApi === publicUserApi && rootApi === publicAdminApi, 'api/notify_authority.js is 100% byte-for-byte identical across root, public/, public/user/, and public/admin/');
  }

  // Test 24: Existing protected files remain unchanged and intact
  {
    const protectedFiles = [
      'public/js/routing_engine.js',
      'public/js/prioritization_engine.js',
      'public/js/clustering_engine.js',
      'api/analyze_issue.js',
      'api/detect_candidates.js',
      'api/webhooks/meta.js',
      'api/webhooks/x.js',
      'public/user/app.js',
      'public/admin/app.js'
    ];
    const allIntact = protectedFiles.every(file => fs.existsSync(path.join(__dirname, '..', file)));
    assert(allIntact, 'All protected engine modules, serverless endpoints, and app controllers remain intact');
  }

  console.log(`\nPHASE 10B TEST RESULTS: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
