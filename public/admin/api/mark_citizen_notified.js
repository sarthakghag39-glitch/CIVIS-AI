// Serverless Function: Secure n8n Citizen Notification Tracking Dispatcher
// Endpoint: POST /api/mark_citizen_notified

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Instance-level rate limiter (20 requests per IP per 60 seconds)
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = parseInt(process.env.NOTIFY_RATE_LIMIT_MAX || '20', 10);
const instanceRateLimitMap = new Map();

function checkInstanceRateLimit(clientKey) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (instanceRateLimitMap.get(clientKey) || []).filter(ts => ts > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  timestamps.push(now);
  instanceRateLimitMap.set(clientKey, timestamps);
  return true;
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CIVIS-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Enforce POST Method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // 2. Rate Limiting Guard
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'client';
  const rateLimitKey = `${clientIp}`;
  if (!checkInstanceRateLimit(rateLimitKey)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a minute before submitting another request.'
    });
  }

  // 3. HMAC Secret & Server-side Credentials Verification (Fail Closed)
  const N8N_REPLY_SECRET = process.env.N8N_AUTHORITY_REPLY_SECRET;
  if (!N8N_REPLY_SECRET) {
    console.error('Server configuration error: N8N_AUTHORITY_REPLY_SECRET is missing.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Webhook secret is missing.'
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dppdyknjrryoljzzdulj.supabase.co';
  if (!SUPABASE_URL) {
    console.error('Server configuration error: SUPABASE_URL is missing.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Supabase URL is missing.'
    });
  }

  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Database service role key is missing.'
    });
  }

  // 4. Raw Request Body Extraction
  let rawBody = '';
  let body = req.body;

  if (typeof body === 'string') {
    rawBody = body;
    try { body = JSON.parse(body); } catch (e) { body = null; }
  } else if (Buffer.isBuffer(body)) {
    rawBody = body.toString('utf-8');
    try { body = JSON.parse(rawBody); } catch (e) { body = null; }
  } else if (body && typeof body === 'object') {
    rawBody = JSON.stringify(body);
  } else {
    rawBody = '';
    body = null;
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      error: 'Invalid request: Malformed or missing JSON request body.'
    });
  }

  // 5. Signature Verification (HMAC-SHA256 & Timing-Safe Comparison)
  const sigHeader = req.headers['x-civis-signature'] || req.headers['X-CIVIS-Signature'] || '';
  if (!sigHeader || typeof sigHeader !== 'string' || !sigHeader.startsWith('sha256=')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid signature.'
    });
  }

  const providedSignatureHex = sigHeader.replace(/^sha256=/i, '').trim();
  if (!providedSignatureHex || providedSignatureHex.length !== 64) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid signature.'
    });
  }

  const computedSignatureHex = crypto
    .createHmac('sha256', N8N_REPLY_SECRET)
    .update(rawBody)
    .digest('hex');

  let signatureValid = false;
  try {
    const bufProvided = Buffer.from(providedSignatureHex, 'hex');
    const bufComputed = Buffer.from(computedSignatureHex, 'hex');
    if (bufProvided.length === bufComputed.length && crypto.timingSafeEqual(bufProvided, bufComputed)) {
      signatureValid = true;
    }
  } catch (e) {
    signatureValid = false;
  }

  if (!signatureValid) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid signature.'
    });
  }

  // 6. Request Payload Validation
  const rawComplaintId = body.complaint_id;
  if (!rawComplaintId || typeof rawComplaintId !== 'string' || !/^CIV-2026-\d{5,}$/.test(rawComplaintId.trim())) {
    return res.status(400).json({
      error: 'Invalid request: Valid complaint_id in format CIV-2026-XXXXX is required.'
    });
  }
  const complaintId = rawComplaintId.trim();

  const rawAuthorityReplyMessageId = body.authority_reply_message_id;
  if (!rawAuthorityReplyMessageId || typeof rawAuthorityReplyMessageId !== 'string' || !rawAuthorityReplyMessageId.trim() || rawAuthorityReplyMessageId.trim().length > 300) {
    return res.status(400).json({
      error: 'Invalid request: authority_reply_message_id string (max 300 characters) is required.'
    });
  }
  const authorityReplyMessageId = rawAuthorityReplyMessageId.trim();

  const rawNotificationEventId = body.notification_event_id;
  if (!rawNotificationEventId || typeof rawNotificationEventId !== 'string' || !rawNotificationEventId.trim() || rawNotificationEventId.trim().length > 300) {
    return res.status(400).json({
      error: 'Invalid request: notification_event_id string (max 300 characters) is required.'
    });
  }
  const notificationEventId = rawNotificationEventId.trim();

  let notificationMessageId = null;
  if (body.notification_message_id !== undefined && body.notification_message_id !== null) {
    if (typeof body.notification_message_id !== 'string' || body.notification_message_id.trim().length > 300) {
      return res.status(400).json({
        error: 'Invalid request: notification_message_id must be a string (max 300 characters).'
      });
    }
    notificationMessageId = body.notification_message_id.trim();
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 7. Find Complaint by complaint_id
    const { data: issue, error: issueErr } = await supabase
      .from('issues')
      .select('id, complaint_id, authority_reply_message_id, citizen_notified, citizen_notified_at')
      .eq('complaint_id', complaintId)
      .maybeSingle();

    if (issueErr || !issue) {
      return res.status(404).json({
        error: 'Complaint not found.'
      });
    }

    // 8. Verify matching authority_reply_message_id
    const recordedMessageId = (issue.authority_reply_message_id || '').trim();
    if (!recordedMessageId || recordedMessageId !== authorityReplyMessageId) {
      return res.status(409).json({
        error: 'Authority reply message ID does not match the recorded reply.'
      });
    }

    // 9. Idempotency Check (Already Notified)
    if (issue.citizen_notified === true) {
      return res.status(200).json({
        success: true,
        status: 'already_notified',
        complaint_id: issue.complaint_id,
        issue_id: issue.id,
        citizen_notified: true,
        citizen_notified_at: issue.citizen_notified_at
      });
    }

    // 10. Update citizen_notified status
    const notifiedAt = new Date().toISOString();
    const updatePayload = {
      citizen_notified: true,
      citizen_notified_at: notifiedAt
    };

    const { error: updateErr } = await supabase
      .from('issues')
      .update(updatePayload)
      .eq('id', issue.id);

    if (updateErr) {
      console.error('Failed to update citizen notification status:', updateErr.message || updateErr);
      return res.status(500).json({
        success: false,
        error: 'Failed to update citizen notification status in database.'
      });
    }

    // 11. Return Trusted Response (Privacy Preserved)
    return res.status(200).json({
      success: true,
      status: 'marked_notified',
      complaint_id: issue.complaint_id,
      issue_id: issue.id,
      citizen_notified: true,
      citizen_notified_at: notifiedAt
    });

  } catch (err) {
    console.error('Unhandled error in mark_citizen_notified serverless function:', err.message || err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while updating citizen notification status.'
    });
  }
};
