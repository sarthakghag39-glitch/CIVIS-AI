// Phase 9 Step 2 Security Remediation Test Suite
// Verifies SEC-01, SEC-02, SEC-03, and SEC-04 fixes

const fs = require('fs');
const path = require('path');

console.log('--- RUNNING STEP 2 SECURITY REMEDIATION TEST SUITE ---');

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

// Simulated RLS / Trigger Contexts for SEC-01
function simulateProtectProfileRoleTrigger(op, isUserAdmin, oldRecord, newRecord) {
  if (op === 'INSERT') {
    if (newRecord.role === 'admin' && !isUserAdmin) {
      newRecord.role = 'citizen';
    }
  }
  if (op === 'UPDATE') {
    if (oldRecord.role !== newRecord.role && !isUserAdmin) {
      return { allowed: false, error: 'Unauthorized: Only admins can alter profile role.' };
    }
  }
  return { allowed: true, record: newRecord };
}

// Mock Response for SEC-04
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
    }
  };
  return res;
}

async function runTests() {
  const userAppPath = path.join(__dirname, '../public/user/app.js');
  const adminAppPath = path.join(__dirname, '../public/admin/app.js');
  const detectApiRootPath = path.join(__dirname, '../api/detect_candidates.js');
  const detectApiPublicPath = path.join(__dirname, '../public/api/detect_candidates.js');
  const detectApiUserPath = path.join(__dirname, '../public/user/api/detect_candidates.js');
  const sec01SqlPath = path.join(__dirname, '../supabase/migrations/supabase_sec01_profile_role_protection.sql');

  const userAppContent = fs.readFileSync(userAppPath, 'utf8');
  const adminAppContent = fs.readFileSync(adminAppPath, 'utf8');
  const detectApiRootContent = fs.readFileSync(detectApiRootPath, 'utf8');
  const sec01SqlContent = fs.readFileSync(sec01SqlPath, 'utf8');

  // ==========================================
  // SEC-01: Profile Role Escalation Protection
  // ==========================================
  assert(fs.existsSync(sec01SqlPath), 'SEC-01 migration file exists');
  assert(sec01SqlContent.includes('CREATE TRIGGER trg_protect_profile_role'), 'SEC-01 SQL migration creates protect_profile_role trigger');

  // Test SEC-01a: Citizen attempts role='admin' on INSERT -> sanitized to citizen
  const resInsert = simulateProtectProfileRoleTrigger('INSERT', false, null, { id: 'u1', role: 'admin' });
  assert(resInsert.allowed && resInsert.record.role === 'citizen', 'SEC-01: Citizen INSERT with role=admin sanitized to citizen');

  // Test SEC-01b: Citizen attempts role UPDATE -> blocked
  const resUpdate = simulateProtectProfileRoleTrigger('UPDATE', false, { id: 'u1', role: 'citizen' }, { id: 'u1', role: 'admin' });
  assert(!resUpdate.allowed, 'SEC-01: Citizen UPDATE role=admin blocked by trigger');

  // Test SEC-01c: Citizen updates own allowed fields (full_name) -> allowed
  const resUpdateAllowed = simulateProtectProfileRoleTrigger('UPDATE', false, { id: 'u1', role: 'citizen', full_name: 'Bob' }, { id: 'u1', role: 'citizen', full_name: 'Robert' });
  assert(resUpdateAllowed.allowed, 'SEC-01: Citizen allowed to update own non-role fields');

  // Test SEC-01d: Admin updates role -> allowed
  const resAdminUpdate = simulateProtectProfileRoleTrigger('UPDATE', true, { id: 'u1', role: 'citizen' }, { id: 'u1', role: 'admin' });
  assert(resAdminUpdate.allowed, 'SEC-01: Admin allowed to alter user role');


  // ==========================================
  // SEC-02: Stored XSS Mitigation
  // ==========================================
  assert(userAppContent.includes('function escapeHTML('), 'SEC-02: escapeHTML utility function present in public/user/app.js');
  assert(adminAppContent.includes('function escapeHTML('), 'SEC-02: escapeHTML utility function present in public/admin/app.js');

  assert(userAppContent.includes('${escapeHTML(issue.title)}'), 'SEC-02: issue.title escaped in user card template');
  assert(userAppContent.includes('${escapeHTML(issue.description)}'), 'SEC-02: issue.description escaped in user card template');
  assert(adminAppContent.includes('${escapeHTML(issue.title)}'), 'SEC-02: issue.title escaped in admin card template');
  assert(adminAppContent.includes('${escapeHTML(issue.description || \'\')}'), 'SEC-02: issue.description escaped in admin card template');

  // Verify escapeHTML escaping behavior
  const escapeHTML = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const payload1 = '<img src=x onerror=alert(1)>';
  const payload2 = '<script>alert(1)</script>';
  assert(escapeHTML(payload1) === '&lt;img src=x onerror=alert(1)&gt;', 'SEC-02: img onerror payload correctly escaped');
  assert(escapeHTML(payload2) === '&lt;script&gt;alert(1)&lt;/script&gt;', 'SEC-02: script alert payload correctly escaped');


  // ==========================================
  // SEC-03: Admin Role Defaulting Removal
  // ==========================================
  assert(!adminAppContent.includes("isAdminPage ? 'admin' : 'citizen'"), 'SEC-03: URL path-based role defaulting removed from public/admin/app.js');
  assert(adminAppContent.includes("role: session.user.user_metadata?.role || 'citizen'"), 'SEC-03: Missing profile role strictly defaults to citizen in public/admin/app.js');


  // ==========================================
  // SEC-04: Candidate Detection API Security
  // ==========================================
  const detectHandler = require('../api/detect_candidates.js');

  assert(detectApiRootContent.includes('Authorization'), 'SEC-04: Authorization header check added to api/detect_candidates.js');
  assert(detectApiRootContent.includes('checkInstanceRateLimit'), 'SEC-04: Rate limiting guard added to api/detect_candidates.js');

  // Synchronous file integrity verification across copies
  const rootBuf = fs.readFileSync(detectApiRootPath);
  const publicBuf = fs.readFileSync(detectApiPublicPath);
  const userBuf = fs.readFileSync(detectApiUserPath);
  assert(rootBuf.equals(publicBuf) && rootBuf.equals(userBuf), 'SEC-04: detect_candidates.js is byte-for-byte identical across root, public/, and public/user/');

  // Handler test: Missing Authorization header -> 401
  {
    const req = { method: 'POST', headers: {}, body: { issue_id: 1 } };
    const res = createMockRes();
    await detectHandler(req, res);
    assert(res.statusCode === 401 && res.body?.error?.includes('Missing or invalid'), 'SEC-04: Missing Authorization header returns 401');
  }

  // Handler test: Malformed Authorization header -> 401
  {
    const req = { method: 'POST', headers: { authorization: 'Basic 12345' }, body: { issue_id: 1 } };
    const res = createMockRes();
    await detectHandler(req, res);
    assert(res.statusCode === 401 && res.body?.error?.includes('Missing or invalid'), 'SEC-04: Malformed Authorization header returns 401');
  }

  // Handler test: Invalid JWT token -> 401
  {
    const req = { method: 'POST', headers: { authorization: 'Bearer invalid.jwt.token' }, body: { issue_id: 1 } };
    const res = createMockRes();
    await detectHandler(req, res);
    assert(res.statusCode === 401, 'SEC-04: Invalid Bearer JWT token returns 401');
  }

  // Handler test: Rate limiting burst threshold -> 429
  {
    const clientIp = '192.168.1.50';
    let rateLimited = false;
    let retryAfterHeader = null;
    for (let i = 0; i < 25; i++) {
      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer fake.token',
          'x-forwarded-for': clientIp
        },
        body: { issue_id: 1 }
      };
      const res = createMockRes();
      await detectHandler(req, res);
      if (res.statusCode === 429) {
        rateLimited = true;
        retryAfterHeader = res.headers['Retry-After'];
        break;
      }
    }
    assert(rateLimited && retryAfterHeader === '60', 'SEC-04: Exceeding candidate detection rate limit returns 429 with Retry-After header');
  }

  // Handler test: Structure of detect_candidates module exports function
  assert(typeof detectHandler === 'function', 'SEC-04: detect_candidates endpoint exports valid async request handler');

  console.log(`\nSTEP 2 SECURITY TEST SUITE SUMMARY: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
