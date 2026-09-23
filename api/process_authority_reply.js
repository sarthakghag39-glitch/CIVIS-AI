// Serverless Function: Secure n8n Inbound Authority Email Reply Processor
// Endpoint: POST /api/process_authority_reply

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Instance-level rate limiter (20 requests per IP per 60 seconds)
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = parseInt(process.env.REPLY_RATE_LIMIT_MAX || '20', 10);
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
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  } else if (Buffer.isBuffer(body)) {
    rawBody = body.toString('utf-8');
    try { body = JSON.parse(rawBody); } catch (e) { body = {}; }
  } else if (body && typeof body === 'object') {
    rawBody = JSON.stringify(body);
  } else {
    rawBody = '';
    body = {};
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

  const rawSenderEmail = body.sender_email;
  if (!rawSenderEmail || typeof rawSenderEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawSenderEmail.trim())) {
    return res.status(400).json({
      error: 'Invalid request: Valid sender_email is required.'
    });
  }
  const senderEmail = rawSenderEmail.trim().toLowerCase();

  const rawStatus = body.status;
  if (!rawStatus || typeof rawStatus !== 'string') {
    return res.status(400).json({
      error: 'Invalid request: status is required and must be IN_PROGRESS or COMPLETED.'
    });
  }
  const normalizedStatus = rawStatus.trim().toUpperCase();
  if (normalizedStatus !== 'IN_PROGRESS' && normalizedStatus !== 'COMPLETED') {
    return res.status(400).json({
      error: 'Invalid request: status must be strictly IN_PROGRESS or COMPLETED.'
    });
  }

  const rawAuthorityResponse = body.authority_response;
  if (rawAuthorityResponse === undefined || rawAuthorityResponse === null || typeof rawAuthorityResponse !== 'string' || !rawAuthorityResponse.trim() || rawAuthorityResponse.trim().length > 4000) {
    return res.status(400).json({
      error: 'Invalid request: authority_response string (max 4000 characters) is required.'
    });
  }
  const authorityResponse = rawAuthorityResponse.trim();

  const rawMessageId = body.message_id;
  if (!rawMessageId || typeof rawMessageId !== 'string' || !rawMessageId.trim() || rawMessageId.trim().length > 300) {
    return res.status(400).json({
      error: 'Invalid request: message_id string (max 300 characters) is required.'
    });
  }
  const messageId = rawMessageId.trim();
  const eventId = typeof body.event_id === 'string' ? body.event_id.trim() : null;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 7. Idempotency Check (Message ID)
    const { data: existingProcessed } = await supabase
      .from('issues')
      .select('id, complaint_id, status, reported_by, reported_by_email, authority_response')
      .eq('authority_reply_message_id', messageId)
      .maybeSingle();

    if (existingProcessed) {
      return res.status(200).json({
        success: true,
        status: 'already_processed',
        complaint_id: existingProcessed.complaint_id,
        issue_id: existingProcessed.id,
        citizen_email: existingProcessed.reported_by_email || null,
        citizen_name: existingProcessed.reported_by || 'Anonymous Resident',
        authority_response: existingProcessed.authority_response || authorityResponse,
        message: 'Authority reply message has already been processed.'
      });
    }

    // 8. Find Complaint by complaint_id
    const { data: issue, error: issueErr } = await supabase
      .from('issues')
      .select('id, complaint_id, title, category, status, assigned_department, reported_by, reported_by_email, reported_by_phone, authority_notified')
      .eq('complaint_id', complaintId)
      .maybeSingle();

    if (issueErr || !issue) {
      return res.status(404).json({
        error: 'Complaint not found.'
      });
    }

    // 9. Verify Authority Assignment & Authorization
    const assignedDept = (issue.assigned_department || '').trim();
    if (!assignedDept) {
      return res.status(409).json({
        success: false,
        error: 'Complaint has no assigned department.'
      });
    }

    const { data: authority, error: authLookupErr } = await supabase
      .from('department_authorities')
      .select('department_name, authority_name, official_email')
      .eq('department_name', assignedDept)
      .eq('environment', 'demo')
      .eq('is_active', true)
      .maybeSingle();

    if (authLookupErr || !authority || !authority.official_email) {
      return res.status(409).json({
        success: false,
        error: `No active authority registered for department: ${assignedDept}`
      });
    }

    const registeredOfficialEmail = authority.official_email.trim().toLowerCase();
    if (senderEmail !== registeredOfficialEmail) {
      return res.status(403).json({
        error: 'Forbidden: Sender email is not authorized for this department.'
      });
    }

    // 10. Status Mapping
    const mappedStatus = normalizedStatus === 'COMPLETED' ? 'Resolved' : 'In Progress';

    // 11. Update Complaint Record in Database
    const updatePayload = {
      status: mappedStatus,
      authority_response: authorityResponse,
      authority_responded_at: new Date().toISOString(),
      authority_reply_message_id: messageId,
      authority_reply_event_id: eventId
    };

    const { error: updateErr } = await supabase
      .from('issues')
      .update(updatePayload)
      .eq('id', issue.id);

    if (updateErr) {
      console.error('Failed to update issue with authority reply:', updateErr.message || updateErr);
      return res.status(500).json({
        success: false,
        error: 'Failed to update complaint status in database.'
      });
    }

    // 12. Return Trusted Response for n8n Workflow (Privacy Preserved)
    return res.status(200).json({
      success: true,
      status: 'updated',
      complaint_id: issue.complaint_id,
      issue_id: issue.id,
      new_status: mappedStatus,
      citizen_email: issue.reported_by_email || null,
      citizen_name: issue.reported_by || 'Anonymous Resident',
      authority_response: authorityResponse
    });

  } catch (err) {
    console.error('Unhandled error in process_authority_reply serverless function:', err.message || err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing authority reply.'
    });
  }
};
