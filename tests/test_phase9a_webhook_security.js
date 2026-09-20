// CIVIS-AI Phase 9A Social Pulse Integrity & Webhook Security Test Suite

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log("--- RUNNING PHASE 9A WEBHOOK SECURITY & INTEGRITY TEST SUITE ---");

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

// Helper mock res object
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    bodySent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    json(data) {
      this.bodySent = data;
      return this;
    },
    send(data) {
      this.bodySent = data;
      return this;
    }
  };
  return res;
}

const metaWebhook = require('../api/webhooks/meta.js');
const xWebhook = require('../api/webhooks/x.js');

// Test 1: missing Supabase key in meta.js -> 503
test('Test 1: missing Supabase key in meta.js -> 503', async () => {
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const req = { method: 'GET', query: {} };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 503);
  assert.ok(res.bodySent && res.bodySent.error.includes('SUPABASE_SERVICE_ROLE_KEY'));

  if (oldKey) process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
});

// Test 2: missing Meta verify token -> 503
test('Test 2: missing Meta verify token -> 503', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const oldToken = process.env.META_VERIFY_TOKEN;
  delete process.env.META_VERIFY_TOKEN;

  const req = { method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'any' } };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 503);
  assert.ok(res.bodySent && res.bodySent.error.includes('META_VERIFY_TOKEN'));

  if (oldToken) process.env.META_VERIFY_TOKEN = oldToken;
});

// Test 3: valid Meta GET verification -> 200
test('Test 3: valid Meta GET verification -> 200', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  process.env.META_VERIFY_TOKEN = 'valid_meta_token_123';

  const req = { method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'valid_meta_token_123', 'hub.challenge': 'challenge_code_99' } };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.bodySent, 'challenge_code_99');
});

// Test 4: missing Meta signature header -> 401
test('Test 4: missing Meta signature header -> 401', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  process.env.META_APP_SECRET = 'meta_secret_key_777';

  const req = { method: 'POST', headers: {}, body: { object: 'instagram' } };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 401);
  assert.ok(res.bodySent && res.bodySent.error.includes('Missing webhook signature'));
});

// Test 5: invalid Meta signature -> 403
test('Test 5: invalid Meta signature -> 403', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  process.env.META_APP_SECRET = 'meta_secret_key_777';

  const req = {
    method: 'POST',
    headers: { 'x-hub-signature-256': 'sha256=invalid_signature_hash_string_here_1234567890' },
    body: JSON.stringify({ object: 'instagram' }),
    rawBody: JSON.stringify({ object: 'instagram' })
  };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 403);
  assert.ok(res.bodySent && res.bodySent.error.includes('Invalid webhook signature'));
});

// Test 6: valid Meta signature -> accepted
test('Test 6: valid Meta signature -> accepted', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const secret = 'meta_secret_key_777';
  process.env.META_APP_SECRET = secret;

  const payload = { object: 'instagram', entry: [] };
  const rawBody = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const req = {
    method: 'POST',
    headers: { 'x-hub-signature-256': `sha256=${sig}` },
    body: payload,
    rawBody: rawBody
  };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.bodySent, 'EVENT_RECEIVED');
});

// Test 7: missing Supabase key in x.js -> 503
test('Test 7: missing Supabase key in x.js -> 503', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const req = { method: 'GET', query: {} };
  const res = createMockRes();
  await xWebhook(req, res);

  assert.strictEqual(res.statusCode, 503);
  assert.ok(res.bodySent && res.bodySent.error.includes('SUPABASE_SERVICE_ROLE_KEY'));
});

// Test 8: valid X CRC GET request -> 200 with HMAC SHA-256 hash
test('Test 8: valid X CRC GET request -> 200 with HMAC SHA-256 hash', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const xSecret = 'x_consumer_secret_444';
  process.env.X_CONSUMER_SECRET = xSecret;

  const crcToken = 'test_crc_token_888';
  const expectedHash = crypto.createHmac('sha256', xSecret).update(crcToken).digest('base64');

  const req = { method: 'GET', query: { crc_token: crcToken } };
  const res = createMockRes();
  await xWebhook(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.bodySent.response_token, `sha256=${expectedHash}`);
});

// Test 9: missing X POST signature -> 401
test('Test 9: missing X POST signature -> 401', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  process.env.X_CONSUMER_SECRET = 'x_consumer_secret_444';

  const req = { method: 'POST', headers: {}, body: { tweet_create_events: [] } };
  const res = createMockRes();
  await xWebhook(req, res);

  assert.strictEqual(res.statusCode, 401);
  assert.ok(res.bodySent && res.bodySent.error.includes('Missing webhook signature'));
});

// Test 10: invalid X POST signature -> 403
test('Test 10: invalid X POST signature -> 403', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  process.env.X_CONSUMER_SECRET = 'x_consumer_secret_444';

  const req = {
    method: 'POST',
    headers: { 'x-twitter-webhooks-signature': 'sha256=invalid_x_signature' },
    body: JSON.stringify({ tweet_create_events: [] }),
    rawBody: JSON.stringify({ tweet_create_events: [] })
  };
  const res = createMockRes();
  await xWebhook(req, res);

  assert.strictEqual(res.statusCode, 403);
  assert.ok(res.bodySent && res.bodySent.error.includes('Invalid webhook signature'));
});

// Test 11: valid X POST signature -> 200
test('Test 11: valid X POST signature -> 200', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const xSecret = 'x_consumer_secret_444';
  process.env.X_CONSUMER_SECRET = xSecret;

  const payload = { tweet_create_events: [] };
  const rawBody = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', xSecret).update(rawBody).digest('base64');

  const req = {
    method: 'POST',
    headers: { 'x-twitter-webhooks-signature': `sha256=${sig}` },
    body: payload,
    rawBody: rawBody
  };
  const res = createMockRes();
  await xWebhook(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.bodySent, 'SUCCESS');
});

// Test 12: malformed Meta payload -> 400
test('Test 12: malformed Meta payload -> 400', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const secret = 'meta_secret_key_777';
  process.env.META_APP_SECRET = secret;

  const rawBody = "not-a-valid-json-string-format";
  const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const req = {
    method: 'POST',
    headers: { 'x-hub-signature-256': `sha256=${sig}` },
    body: rawBody,
    rawBody: rawBody
  };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.bodySent && res.bodySent.error.includes('Bad Request'));
});

// Test 13: malformed X payload -> 400
test('Test 13: malformed X payload -> 400', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const secret = 'x_consumer_secret_444';
  process.env.X_CONSUMER_SECRET = secret;

  const rawBody = "invalid-json-body";
  const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

  const req = {
    method: 'POST',
    headers: { 'x-twitter-webhooks-signature': `sha256=${sig}` },
    body: rawBody,
    rawBody: rawBody
  };
  const res = createMockRes();
  await xWebhook(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.bodySent && res.bodySent.error.includes('Bad Request'));
});

// Test 14: Meta content length limit (2000 chars)
test('Test 14: Meta content length limit', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const secret = 'meta_secret_key_777';
  process.env.META_APP_SECRET = secret;

  const longText = 'A'.repeat(2500);
  const payload = { object: 'instagram', entry: [{ changes: [{ field: 'feed', value: { text: longText } }] }] };
  const rawBody = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const req = {
    method: 'POST',
    headers: { 'x-hub-signature-256': `sha256=${sig}` },
    body: payload,
    rawBody: rawBody
  };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.bodySent && res.bodySent.error.includes('maximum length'));
});

// Test 15: X text length limit (1000 chars)
test('Test 15: X text length limit', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const secret = 'x_consumer_secret_444';
  process.env.X_CONSUMER_SECRET = secret;

  const longText = 'B'.repeat(1200);
  const payload = { tweet_create_events: [{ id_str: '111', text: longText, user: { screen_name: 'test' } }] };
  const rawBody = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

  const req = {
    method: 'POST',
    headers: { 'x-twitter-webhooks-signature': `sha256=${sig}` },
    body: payload,
    rawBody: rawBody
  };
  const res = createMockRes();
  await xWebhook(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.bodySent && res.bodySent.error.includes('maximum length'));
});

// Test 16: Duplicate event handled idempotently -> 200
test('Test 16: Duplicate event handled idempotently -> 200', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
  const secret = 'meta_secret_key_777';
  process.env.META_APP_SECRET = secret;

  const payload = { object: 'instagram', entry: [{ changes: [{ field: 'feed', value: { media_id: '12345', text: 'Sample post' } }] }] };
  const rawBody = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const req = {
    method: 'POST',
    headers: { 'x-hub-signature-256': `sha256=${sig}` },
    body: payload,
    rawBody: rawBody
  };
  const res = createMockRes();
  await metaWebhook(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.bodySent, 'EVENT_RECEIVED');
});

// Test 17: Fake AI confidence removed from Meta & X webhooks
test('Test 17: Fake AI confidence removed from Meta & X webhooks', () => {
  const metaCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'meta.js'), 'utf8');
  const xCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'x.js'), 'utf8');

  assert.strictEqual(metaCode.includes('ai_confidence: 94'), false, 'ai_confidence 94 must not exist in meta.js');
  assert.strictEqual(xCode.includes('ai_confidence: 92'), false, 'ai_confidence 92 must not exist in x.js');
});

// Test 18: Fake sentiment removed from Meta & X webhooks
test('Test 18: Fake sentiment removed from Meta & X webhooks', () => {
  const metaCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'meta.js'), 'utf8');
  const xCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'x.js'), 'utf8');

  assert.strictEqual(metaCode.includes('sentiment: "Negative"'), false, 'Fake sentiment Negative must not exist in meta.js');
  assert.strictEqual(xCode.includes('sentiment: "Negative"'), false, 'Fake sentiment Negative must not exist in x.js');
});

// Test 19: Fake severity removed from Meta & X webhooks
test('Test 19: Fake severity removed from Meta & X webhooks', () => {
  const metaCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'meta.js'), 'utf8');
  const xCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'x.js'), 'utf8');

  assert.strictEqual(metaCode.includes('severity: "High"'), false, 'Fake severity High must not exist in meta.js');
  assert.strictEqual(xCode.includes('severity: "High"'), false, 'Fake severity High must not exist in x.js');
});

// Test 20: Random cluster ID generation removed
test('Test 20: Random cluster ID generation removed', () => {
  const metaCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'meta.js'), 'utf8');
  const xCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'x.js'), 'utf8');

  assert.strictEqual(metaCode.includes('Math.random()'), false, 'Math.random must not exist in meta.js');
  assert.strictEqual(xCode.includes('Math.random()'), false, 'Math.random must not exist in x.js');
});

// Test 21: Keyword GPS coordinate inference removed
test('Test 21: Keyword GPS coordinate inference removed', () => {
  const metaCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'meta.js'), 'utf8');
  const xCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'x.js'), 'utf8');

  assert.strictEqual(metaCode.includes('latitude: 18.5074'), false, 'Inferred lat 18.5074 must not exist in meta.js');
  assert.strictEqual(xCode.includes('latitude: 18.5074'), false, 'Inferred lat 18.5074 must not exist in x.js');
  assert.ok(metaCode.includes('latitude: null'), 'latitude should default to null in meta.js');
  assert.ok(xCode.includes('latitude: null'), 'latitude should default to null in x.js');
});

// Test 22: DB failure -> LIVE FEED UNAVAILABLE in social_pulse.html
test('Test 22: DB failure -> LIVE FEED UNAVAILABLE in social_pulse.html', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'social_pulse.html'), 'utf8');
  assert.ok(htmlContent.includes('LIVE FEED UNAVAILABLE'), 'LIVE FEED UNAVAILABLE banner must exist');
  assert.strictEqual(htmlContent.includes('mockSignals = [...localMockSignals]'), false, 'Silent localMockSignals fallback must not exist');
});

// Test 23: Empty DB -> empty live state in social_pulse.html
test('Test 23: Empty DB -> empty live state in social_pulse.html', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'social_pulse.html'), 'utf8');
  assert.ok(htmlContent.includes('No social signals recorded in database'), 'Empty state message must exist');
});

// Test 24: Simulated signals clearly labeled DEMO / SIMULATED
test('Test 24: Simulated signals clearly labeled DEMO / SIMULATED', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'social_pulse.html'), 'utf8');
  assert.ok(htmlContent.includes('DEMO / SIMULATED'), 'DEMO / SIMULATED badge must exist');
  assert.ok(htmlContent.includes('LIVE / VERIFIED'), 'LIVE / VERIFIED badge must exist');
});

// Test 25: API synchronization verified across directories
test('Test 25: API synchronization verified across directories', () => {
  const a = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'meta.js'), 'utf8');
  const b = fs.readFileSync(path.join(__dirname, '..', 'public', 'api', 'webhooks', 'meta.js'), 'utf8');
  const c = fs.readFileSync(path.join(__dirname, '..', 'public', 'user', 'api', 'webhooks', 'meta.js'), 'utf8');

  const x1 = fs.readFileSync(path.join(__dirname, '..', 'api', 'webhooks', 'x.js'), 'utf8');
  const x2 = fs.readFileSync(path.join(__dirname, '..', 'public', 'api', 'webhooks', 'x.js'), 'utf8');
  const x3 = fs.readFileSync(path.join(__dirname, '..', 'public', 'user', 'api', 'webhooks', 'x.js'), 'utf8');

  assert.strictEqual(a, b);
  assert.strictEqual(a, c);
  assert.strictEqual(x1, x2);
  assert.strictEqual(x1, x3);
});

// Test 26: Simulated signal conversion requires explicit notice
test('Test 26: Simulated signal conversion requires explicit notice', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'social_pulse.html'), 'utf8');
  assert.ok(htmlContent.includes('converting a DEMO / SIMULATED signal'), 'Explicit demo signal conversion notice must exist');
});

console.log(`\nPHASE 9A TEST RESULTS: ${passCount}/26 assertions passed.\n`);
