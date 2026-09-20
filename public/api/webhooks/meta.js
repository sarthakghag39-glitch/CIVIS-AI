// Serverless Webhook for Instagram & Facebook Graph API Ingestion
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dppdyknjrryoljzzdulj.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Fail-closed: Require SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing');
    return res.status(503).json({
      error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing'
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 2. Webhook Verification (Meta GET Handshake)
  if (req.method === 'GET') {
    const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
    if (!META_VERIFY_TOKEN) {
      console.error('Server configuration error: META_VERIFY_TOKEN is missing');
      return res.status(503).json({ error: 'Server configuration error: META_VERIFY_TOKEN is missing' });
    }

    const mode = req.query ? req.query['hub.mode'] : null;
    const token = req.query ? req.query['hub.verify_token'] : null;
    const challenge = req.query ? req.query['hub.challenge'] : null;

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // 3. Event Ingestion (Meta POST Pushes)
  if (req.method === 'POST') {
    const META_APP_SECRET = process.env.META_APP_SECRET;
    if (!META_APP_SECRET) {
      console.error('Server configuration error: META_APP_SECRET is missing');
      return res.status(503).json({ error: 'Server configuration error: META_APP_SECRET is missing' });
    }

    // HMAC Signature Authentication
    const signatureHeader = req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256'] || req.headers['x-hub-signature'];
    if (!signatureHeader) {
      return res.status(401).json({ error: 'Unauthorized: Missing webhook signature header.' });
    }

    let rawBody = req.rawBody;
    if (!rawBody) {
      if (typeof req.body === 'string') {
        rawBody = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString('utf8');
      } else if (req.body && typeof req.body === 'object') {
        rawBody = JSON.stringify(req.body);
      } else {
        rawBody = '';
      }
    }

    const expectedHash = crypto.createHmac('sha256', META_APP_SECRET).update(rawBody).digest('hex');
    const signatureHash = signatureHeader.replace(/^sha256=/i, '').trim();

    const expectedBuf = Buffer.from(expectedHash, 'utf8');
    const signatureBuf = Buffer.from(signatureHash, 'utf8');

    if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
      return res.status(403).json({ error: 'Forbidden: Invalid webhook signature.' });
    }

    // Payload Validation
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Bad Request: Malformed JSON payload.' }); }
    } else if (Buffer.isBuffer(body)) {
      try { body = JSON.parse(body.toString('utf8')); } catch (e) { return res.status(400).json({ error: 'Bad Request: Malformed JSON payload.' }); }
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Bad Request: Invalid payload structure.' });
    }

    if (body.object === 'instagram' || body.object === 'page') {
      try {
        const entries = Array.isArray(body.entry) ? body.entry : [];
        for (const entry of entries) {
          const changes = Array.isArray(entry.changes) ? entry.changes : [];
          for (const change of changes) {
            if (change && (change.field === 'mentions' || change.field === 'feed')) {
              const value = change.value || {};
              const rawContent = String(value.text || value.message || '').trim();
              if (!rawContent) continue;

              if (rawContent.length > 2000) {
                return res.status(400).json({ error: 'Bad Request: Content exceeds maximum length of 2000 characters.' });
              }

              const platform = body.object === 'instagram' ? 'Instagram' : 'Facebook';
              
              // Extract textual location if mentioned, but DO NOT infer GPS coordinates
              let locationText = "Pune";
              if (rawContent.toLowerCase().includes("kothrud")) locationText = "Kothrud, Pune";
              else if (rawContent.toLowerCase().includes("baner")) locationText = "Baner Road, Pune";
              else if (rawContent.toLowerCase().includes("fc")) locationText = "FC Road, Pune";
              else if (rawContent.toLowerCase().includes("aundh")) locationText = "Aundh, Pune";

              // Extract event ID for idempotency
              const eventId = value.media_id || value.item_id || value.id || entry.id;
              const docId = eventId ? `SOC-META-${eventId}` : `SOC-META-${Date.now()}-${process.hrtime.bigint().toString().slice(-4)}`;

              const payload = {
                id: docId,
                platform: platform,
                username: `@${value.username || 'pune_resident'}`,
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(value.username || 'resident')}`,
                timestamp: "Just now",
                content: rawContent,
                issue_type: "Unclassified",
                category: "Social Signal",
                location: locationText,
                latitude: null, // NO keyword GPS inference
                longitude: null, // NO keyword GPS inference
                severity: null, // NO fabricated severity
                ai_confidence: null, // NO fake AI confidence
                sentiment: null, // NO fake sentiment
                supporting_signals: 1,
                cluster_id: null, // NO random cluster ID
                status: "New",
                department: "General Municipal Administration",
                recommended_action: "Pending Verification",
                engagement: typeof value.engagement === 'number' ? value.engagement : 1
              };

              // Idempotent upsert
              const { error: insertErr } = await supabase.from('social_signals').upsert([payload], { onConflict: 'id', ignoreDuplicates: true });
              if (insertErr) {
                console.error("Supabase webhook upsert error:", insertErr);
              }
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      } catch (err) {
        console.error("Meta Webhook Processing Error:", err);
        return res.status(500).send('INTERNAL_SERVER_ERROR');
      }
    }
    return res.status(400).send('Bad Request');
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).send('Method Not Allowed');
};
