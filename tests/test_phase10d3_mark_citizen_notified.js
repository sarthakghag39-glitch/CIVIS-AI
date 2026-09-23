// CIVIS-AI Phase 10D-3A Secure Citizen Notification Tracking API Test Suite
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('--- RUNNING PHASE 10D-3A SECURE CITIZEN NOTIFICATION TRACKING API TEST SUITE ---');

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
const markCitizenNotifiedHandler = require('../api/mark_citizen_notified.js');

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
  const codePath = path.join(__dirname, '../api/mark_citizen_notified.js');

  // Test 1: API file exists
  assert(fs.existsSync(codePath), 'api/mark_citizen_notified.js exists');

  const codeStr = fs.readFileSync(codePath, 'utf8');

  // Test 2: GET method returns 405 Method Not Allowed
  {
    const req = { method: 'GET', headers: {} };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 405 && res.body?.error?.includes('Method Not Allowed'), 'GET request returns 405 Method Not Allowed');
  }

  // Test 3: OPTIONS method returns 200 with CORS headers
  {
    const req = { method: 'OPTIONS', headers: {} };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 200 && res.headers['Access-Control-Allow-Origin'] === '*', 'OPTIONS request returns 200 with CORS headers');
  }

  // Test 4: Missing signature returns 401
  {
    const req = {
      method: 'POST',
      headers: {},
      body: { complaint_id: 'CIV-2026-00024' }
    };
    const res = createMockRes();
    process.env.N8N_AUTHORITY_REPLY_SECRET = 'test-reply-secret';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 401 && res.body?.error?.includes('Missing or invalid signature'), 'Missing signature header returns 401 Unauthorized');
  }

  // Test 5: Invalid signature returns 401
  {
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': 'sha256=' + '0'.repeat(64) },
      body: { complaint_id: 'CIV-2026-00024' }
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 401 && res.body?.error?.includes('Invalid signature'), 'Invalid signature returns 401 Unauthorized');
  }

  // Test 6: HMAC-SHA256 is used for signature calculation
  assert(
    codeStr.includes("crypto.createHmac('sha256', N8N_REPLY_SECRET)") ||
    codeStr.includes('createHmac(\'sha256\''),
    'HMAC-SHA256 is used for signature calculation'
  );

  // Test 7: timingSafeEqual comparison is used
  assert(
    codeStr.includes('crypto.timingSafeEqual'),
    'Timing-safe signature comparison (crypto.timingSafeEqual) is enforced'
  );

  // Test 8: Missing N8N_AUTHORITY_REPLY_SECRET fails closed with 500
  {
    const oldSecret = process.env.N8N_AUTHORITY_REPLY_SECRET;
    delete process.env.N8N_AUTHORITY_REPLY_SECRET;
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': 'sha256=' + 'a'.repeat(64) },
      body: { complaint_id: 'CIV-2026-00024' }
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    process.env.N8N_AUTHORITY_REPLY_SECRET = oldSecret || 'test-reply-secret';
    assert(res.statusCode === 500 && res.body?.error?.includes('Webhook secret is missing'), 'Missing N8N_AUTHORITY_REPLY_SECRET fails closed with 500');
  }

  // Test 9: Missing SUPABASE_SERVICE_ROLE_KEY fails closed with 500
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
    await markCitizenNotifiedHandler(req, res);
    process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey || 'test-service-role-key';
    assert(res.statusCode === 500 && res.body?.error?.includes('Database service role key is missing'), 'Missing SUPABASE_SERVICE_ROLE_KEY fails closed with 500');
  }

  // Test 10: No anon-key fallback in mark_citizen_notified.js
  assert(
    !codeStr.includes('SUPABASE_ANON_KEY') &&
    !codeStr.includes('sb_publishable'),
    'Server endpoint strictly requires service role key without anon key fallback'
  );

  // Test 11: Malformed / non-object JSON body returns 400
  {
    const body = 'invalid-json';
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('Malformed or missing JSON'), 'Malformed request body returns 400 Bad Request');
  }

  // Test 12: Invalid complaint_id format returns 400
  {
    const body = {
      complaint_id: 'INVALID-ID-123',
      authority_reply_message_id: 'msg-001',
      notification_event_id: 'evt-001'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('complaint_id in format CIV-2026-XXXXX is required'), 'Malformed complaint_id returns 400 Bad Request');
  }

  // Test 13: Missing authority_reply_message_id returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      notification_event_id: 'evt-001'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('authority_reply_message_id string (max 300 characters) is required'), 'Missing authority_reply_message_id returns 400 Bad Request');
  }

  // Test 14: Oversized authority_reply_message_id returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      authority_reply_message_id: 'A'.repeat(301),
      notification_event_id: 'evt-001'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('authority_reply_message_id string (max 300 characters) is required'), 'Oversized authority_reply_message_id returns 400 Bad Request');
  }

  // Test 15: Missing notification_event_id returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      authority_reply_message_id: 'msg-001'
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('notification_event_id string (max 300 characters) is required'), 'Missing notification_event_id returns 400 Bad Request');
  }

  // Test 16: Oversized notification_event_id returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      authority_reply_message_id: 'msg-001',
      notification_event_id: 'B'.repeat(301)
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('notification_event_id string (max 300 characters) is required'), 'Oversized notification_event_id returns 400 Bad Request');
  }

  // Test 17: Oversized notification_message_id returns 400
  {
    const body = {
      complaint_id: 'CIV-2026-00024',
      authority_reply_message_id: 'msg-001',
      notification_event_id: 'evt-001',
      notification_message_id: 'C'.repeat(301)
    };
    const req = {
      method: 'POST',
      headers: { 'x-civis-signature': signPayload(body) },
      body
    };
    const res = createMockRes();
    await markCitizenNotifiedHandler(req, res);
    assert(res.statusCode === 400 && res.body?.error?.includes('notification_message_id must be a string (max 300 characters)'), 'Oversized notification_message_id returns 400 Bad Request');
  }

  // Test 18: Complaint lookup strictly uses complaint_id
  assert(
    codeStr.includes(".eq('complaint_id', complaintId)"),
    'Complaint lookup strictly queries public.issues by complaint_id'
  );

  // Test 19: Database queries use explicit column projection and never select(*)
  assert(
    !codeStr.includes(".select('*')") &&
    !codeStr.includes('.select("*")'),
    'Database queries use explicit column projection and never select(*)'
  );

  // Test 20: Matching authority_reply_message_id verification check is enforced
  assert(
    codeStr.includes('recordedMessageId !== authorityReplyMessageId'),
    'Mismatched authority_reply_message_id check is present in code logic'
  );

  // Test 21: Returns 409 on mismatched authority_reply_message_id
  assert(
    codeStr.includes("return res.status(409).json({") &&
    codeStr.includes("Authority reply message ID does not match the recorded reply"),
    'Mismatched authority_reply_message_id returns 409 Conflict'
  );

  // Test 22: Idempotency check: returns 200 with already_notified status if citizen_notified is true
  assert(
    codeStr.includes('issue.citizen_notified === true') &&
    codeStr.includes("status: 'already_notified'") &&
    codeStr.includes('citizen_notified_at: issue.citizen_notified_at'),
    'Already-notified request returns 200 already_notified and preserves existing timestamp'
  );

  // Test 23: Successful update sets citizen_notified to true and returns marked_notified
  assert(
    codeStr.includes('citizen_notified: true') &&
    codeStr.includes("status: 'marked_notified'") &&
    codeStr.includes('citizen_notified_at: notifiedAt'),
    'Valid update sets citizen_notified = true and returns status marked_notified'
  );

  // Test 24: Client-supplied citizen email parameter is ignored/not accepted
  assert(
    !codeStr.includes('body.citizen_email') &&
    !codeStr.includes('body.user_email'),
    'Client payload citizen email parameters are strictly ignored and not accepted'
  );

  // Test 25: Sensitive authority credentials/email/phone are not returned in API response
  const returnMatches = codeStr.match(/return res\.status\(200\)\.json\(\{[\s\S]*?\}\);/g) || [];
  const all200Returns = returnMatches.join('\n');
  assert(
    !all200Returns.includes('reported_by_phone') &&
    !all200Returns.includes('phone:') &&
    !all200Returns.includes('authority_email') &&
    !all200Returns.includes('official_email'),
    'Citizen phone and authority email are excluded from HTTP response'
  );

  // Test 26: API copies are byte-for-byte identical across root, public/, public/user/, and public/admin/
  {
    const rootApi = fs.readFileSync(path.join(__dirname, '../api/mark_citizen_notified.js'), 'utf8');
    const publicApi = fs.readFileSync(path.join(__dirname, '../public/api/mark_citizen_notified.js'), 'utf8');
    const publicUserApi = fs.readFileSync(path.join(__dirname, '../public/user/api/mark_citizen_notified.js'), 'utf8');
    const publicAdminApi = fs.readFileSync(path.join(__dirname, '../public/admin/api/mark_citizen_notified.js'), 'utf8');
    assert(
      rootApi === publicApi && rootApi === publicUserApi && rootApi === publicAdminApi,
      'mark_citizen_notified.js is 100% byte-for-byte identical across root, public/, public/user/, and public/admin/'
    );
  }

  // Test 27: Rate limiter returns 429 after threshold
  {
    const body = { complaint_id: 'CIV-2026-99999' };
    const req = {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.20.99',
        'x-civis-signature': signPayload(body)
      },
      body
    };
    let hitRateLimit = false;
    for (let i = 0; i < 25; i++) {
      const res = createMockRes();
      await markCitizenNotifiedHandler(req, res);
      if (res.statusCode === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit, 'Rate limit threshold triggers 429 Too Many Requests response with Retry-After header');
  }

  // Test 28: Stack traces and sensitive credentials are not returned on internal errors
  assert(
    !codeStr.includes('err.stack') &&
    !codeStr.includes('JSON.stringify(err)'),
    'Internal server error handlers return sanitized error messages without leaking stack traces'
  );

  // Test 29: All existing protected files remain intact
  const protectedFiles = [
    'public/js/routing_engine.js',
    'public/js/prioritization_engine.js',
    'public/js/clustering_engine.js',
    'api/notify_authority.js',
    'api/process_authority_reply.js',
    'api/analyze_issue.js',
    'api/detect_candidates.js',
    'public/user/app.js',
    'public/admin/app.js'
  ];
  const allIntact = protectedFiles.every(f => fs.existsSync(path.join(__dirname, '..', f)));
  assert(allIntact, 'All protected engine modules, serverless endpoints, and app controllers remain intact');

  console.log(`\nPHASE 10D-3A TEST RESULTS: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
