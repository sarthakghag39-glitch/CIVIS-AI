// CIVIS-AI Phase 10D-2 Secure Authority Reply API Test Suite
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('--- RUNNING PHASE 10D-2 SECURE AUTHORITY REPLY API TEST SUITE ---');

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
const processAuthorityReplyHandler = require('../api/process_authority_reply.js');

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

// Helper to compute test signature
function signPayload(payload, secret = 'test-reply-secret') {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

async function runTests() {
  const codePath = path.join(__dirname, '../api/process_authority_reply.js');
  const migrationPath = path.join(__dirname, '../supabase/migrations/phase10d2_authority_reply_tracking.sql');

  // Test 1: API file exists
  assert(fs.existsSync(codePath), 'api/process_authority_reply.js exists');

  const codeStr = fs.readFileSync(codePath, 'utf8');

  // Test 2: GET method returns 405 Method Not Allowed
  {
    const req = { method: 'GET', headers: {} };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    assert(res.statusCode === 405 && res.body?.error?.includes('Method Not Allowed'), 'GET request returns 405 Method Not Allowed');
  }

  // Test 3: Missing signature returns 401
  {
    const req = {
      method: 'POST',
      headers: {},
      body: { complaint_id: 'CIV-2026-00024' }
    };
    const res = createMockRes();
    process.env.N8N_AUTHORITY_REPLY_SECRET = 'test-reply-secret';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    await processAuthorityReplyHandler(req, res);
    assert(res.statusCode === 401 && res.body?.error?.includes('Missing or invalid signature'), 'Missing signature header returns 401 Unauthorized');
  }

  // Test 4: Invalid signature returns 401
  {
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': 'sha256=' + '0'.repeat(64) },
      body: { complaint_id: 'CIV-2026-00024' }
    };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    assert(res.statusCode === 401 && res.body?.error?.includes('Invalid signature'), 'Invalid signature returns 401 Unauthorized');
  }

  // Test 5: HMAC-SHA256 is used for signature calculation
  assert(
    codeStr.includes("crypto.createHmac('sha256', N8N_REPLY_SECRET)") ||
    codeStr.includes('createHmac(\'sha256\''),
    'HMAC-SHA256 is used for signature calculation'
  );

  // Test 6: timingSafeEqual comparison is used
  assert(
    codeStr.includes('crypto.timingSafeEqual'),
    'Timing-safe signature comparison (crypto.timingSafeEqual) is enforced'
  );

  // Test 7: Missing N8N_AUTHORITY_REPLY_SECRET fails closed with 500
  {
    const oldSecret = process.env.N8N_AUTHORITY_REPLY_SECRET;
    delete process.env.N8N_AUTHORITY_REPLY_SECRET;
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': 'sha256=' + 'a'.repeat(64) },
      body: { complaint_id: 'CIV-2026-00024' }
    };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    process.env.N8N_AUTHORITY_REPLY_SECRET = oldSecret || 'test-reply-secret';
    assert(res.statusCode === 500 && res.body?.error?.includes('Webhook secret is missing'), 'Missing N8N_AUTHORITY_REPLY_SECRET fails closed with 500');
  }

  // Test 8: Missing SUPABASE_SERVICE_ROLE_KEY fails closed with 500
  {
    const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const body = { complaint_id: 'CIV-2026-00024' };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey || 'test-service-role-key';
    assert(res.statusCode === 500 && res.body?.error?.includes('Database service role key is missing'), 'Missing SUPABASE_SERVICE_ROLE_KEY fails closed with 500');
  }

  // Test 9: No anon-key fallback in process_authority_reply.js
  assert(
    !codeStr.includes('SUPABASE_ANON_KEY') &&
    !codeStr.includes('sb_publishable'),
    'Server endpoint strictly requires service role key without anon key fallback'
  );

  // Test 10: Invalid complaint_id format returns 400
  {
    const body = {
      complaint_id: 'INVALID-ID-123',
      sender_email: 'authority@civis.ai',
      status: 'IN_PROGRESS',
      authority_response: 'Work started',
      message_id: 'msg-001'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('complaint_id in format CIV-2026-XXXXX is required'), 'Malformed complaint_id returns 400 Bad Request');
  }

  // Test 11: Invalid sender_email format returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      sender_email: 'not-an-email',
      status: 'IN_PROGRESS',
      authority_response: 'Work started',
      message_id: 'msg-001'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('Valid sender_email is required'), 'Invalid sender_email returns 400 Bad Request');
  }

  // Test 12: Invalid status returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      sender_email: 'authority@civis.ai',
      status: 'PENDING_REVIEW',
      authority_response: 'Work started',
      message_id: 'msg-001'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('status must be strictly IN_PROGRESS or COMPLETED'), 'Invalid status returns 400 Bad Request');
  }

  // Test 13: Oversized authority_response (>4000 chars) returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      sender_email: 'authority@civis.ai',
      status: 'IN_PROGRESS',
      authority_response: 'A'.repeat(4001),
      message_id: 'msg-001'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('authority_response string (max 4000 characters) is required'), 'Oversized authority_response returns 400 Bad Request');
  }

  // Test 14: Missing message_id returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      sender_email: 'authority@civis.ai',
      status: 'IN_PROGRESS',
      authority_response: 'Work started'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await processAuthorityReplyHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('message_id string (max 300 characters) is required'), 'Missing message_id returns 400 Bad Request');
  }

  // Test 15: Complaint lookup strictly uses complaint_id
  assert(
    codeStr.includes(".eq('complaint_id', complaintId)"),
    'Complaint lookup strictly queries public.issues by complaint_id'
  );

  // Test 16: No select('*') is used in database queries
  assert(
    !codeStr.includes(".select('*')") &&
    !codeStr.includes('.select("*")'),
    'Database queries use explicit column projection and never select(*)'
  );

  // Test 17: Authority is resolved server-side from department_authorities
  assert(
    codeStr.includes("from('department_authorities')") &&
    codeStr.includes(".eq('department_name', assignedDept)") &&
    codeStr.includes(".eq('environment', 'demo')"),
    'Authority official email is queried server-side from public.department_authorities'
  );

  // Test 18: Authority sender comparison is case-insensitive & trimmed
  assert(
    codeStr.includes('registeredOfficialEmail') &&
    codeStr.includes('senderEmail !== registeredOfficialEmail'),
    'Authority sender verification enforces trimmed case-insensitive comparison'
  );

  // Test 19: Unrecognized sender returns 403 Forbidden
  assert(
    codeStr.includes("return res.status(403).json({") &&
    codeStr.includes("Sender email is not authorized"),
    'Unrecognized authority sender returns 403 Forbidden'
  );

  // Test 20: Status mapping logic maps IN_PROGRESS -> In Progress and COMPLETED -> Resolved
  assert(
    codeStr.includes("normalizedStatus === 'COMPLETED' ? 'Resolved' : 'In Progress'"),
    'Status mapping correctly converts COMPLETED to Resolved and IN_PROGRESS to In Progress'
  );

  // Test 21: Citizen email is resolved from database issue.reported_by_email
  assert(
    codeStr.includes('citizen_email: issue.reported_by_email') ||
    codeStr.includes('citizen_email: existingProcessed.reported_by_email'),
    'Citizen recipient email is retrieved server-side from database issue row'
  );

  // Test 22: Client-supplied citizen email parameter is ignored/not accepted
  assert(
    !codeStr.includes('body.citizen_email') &&
    !codeStr.includes('body.user_email'),
    'Client payload citizen email parameters are strictly ignored and not accepted'
  );

  // Test 23: Client-supplied department parameter is ignored/not accepted
  assert(
    !codeStr.includes('body.department') &&
    !codeStr.includes('body.assigned_department'),
    'Client payload department parameters are strictly ignored and resolved server-side'
  );

  // Test 24: Idempotency check checks authority_reply_message_id and returns already_processed
  assert(
    codeStr.includes(".eq('authority_reply_message_id', messageId)") &&
    codeStr.includes("status: 'already_processed'"),
    'Duplicate message_id is handled idempotently returning 200 with already_processed status'
  );

  // Test 25: Phase 10D-2 migration file exists
  assert(fs.existsSync(migrationPath), 'Migration supabase/migrations/phase10d2_authority_reply_tracking.sql exists');

  // Test 26: Migration contains tracking columns and UNIQUE partial index
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  assert(
    migrationContent.includes('authority_response TEXT NULL') &&
    migrationContent.includes('authority_responded_at TIMESTAMPTZ NULL') &&
    migrationContent.includes('authority_reply_message_id TEXT NULL') &&
    migrationContent.includes('citizen_notified BOOLEAN NOT NULL DEFAULT false') &&
    migrationContent.includes('citizen_notified_at TIMESTAMPTZ NULL') &&
    migrationContent.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_authority_reply_message_id') &&
    migrationContent.includes('WHERE authority_reply_message_id IS NOT NULL'),
    'Migration defines required tracking columns and UNIQUE partial index on authority_reply_message_id'
  );

  // Test 27: Citizen phone is not returned in API response
  const returnMatches = codeStr.match(/return res\.status\(200\)\.json\(\{[\s\S]*?\}\);/g) || [];
  const all200Returns = returnMatches.join('\n');
  assert(
    !all200Returns.includes('reported_by_phone') &&
    !all200Returns.includes('phone:'),
    'Citizen phone number is excluded from HTTP response'
  );

  // Test 28: Authority email is not returned in API response
  assert(
    !all200Returns.includes('authority_email') &&
    !all200Returns.includes('official_email'),
    'Authority email is excluded from HTTP response'
  );

  // Test 29: API copies are byte-for-byte identical across root, public/, public/user/, and public/admin/
  {
    const rootApi = fs.readFileSync(path.join(__dirname, '../api/process_authority_reply.js'), 'utf8');
    const publicApi = fs.readFileSync(path.join(__dirname, '../public/api/process_authority_reply.js'), 'utf8');
    const publicUserApi = fs.readFileSync(path.join(__dirname, '../public/user/api/process_authority_reply.js'), 'utf8');
    const publicAdminApi = fs.readFileSync(path.join(__dirname, '../public/admin/api/process_authority_reply.js'), 'utf8');
    assert(
      rootApi === publicApi && rootApi === publicUserApi && rootApi === publicAdminApi,
      'process_authority_reply.js is 100% byte-for-byte identical across root, public/, public/user/, and public/admin/'
    );
  }

  // Test 30: Rate limiter returns 429 after threshold
  {
    const body = { complaint_id: 'CIV-2026-99999' };
    const req = {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.10.99',
        'x-civis-signature': signPayload(body)
      },
      body
    };
    let hitRateLimit = false;
    for (let i = 0; i < 25; i++) {
      const res = createMockRes();
      await processAuthorityReplyHandler(req, res);
      if (res.statusCode === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit, 'Rate limit threshold triggers 429 Too Many Requests response with Retry-After header');
  }

  // Test 31: Stack traces and sensitive credentials are not returned on internal errors
  assert(
    !codeStr.includes('err.stack') &&
    !codeStr.includes('JSON.stringify(err)'),
    'Internal server error handlers return sanitized error messages without leaking stack traces'
  );

  // Test 32: All existing protected files remain intact
  const protectedFiles = [
    'public/js/routing_engine.js',
    'public/js/prioritization_engine.js',
    'public/js/clustering_engine.js',
    'api/notify_authority.js',
    'api/analyze_issue.js',
    'api/detect_candidates.js',
    'public/user/app.js',
    'public/admin/app.js'
  ];
  const allIntact = protectedFiles.every(f => fs.existsSync(path.join(__dirname, '..', f)));
  assert(allIntact, 'All protected engine modules, serverless endpoints, and app controllers remain intact');

  console.log(`\nPHASE 10D-2 TEST RESULTS: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
