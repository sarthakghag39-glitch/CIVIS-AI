// Serverless Webhook for X / Twitter Account Activity API (AAAPI)
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

  // 2. Challenge-Response Check (CRC) Validation for X (GET Request)
  if (req.method === 'GET') {
    const X_CONSUMER_SECRET = process.env.X_CONSUMER_SECRET;
    if (!X_CONSUMER_SECRET) {
      console.error('Server configuration error: X_CONSUMER_SECRET is missing');
      return res.status(503).json({ error: 'Server configuration error: X_CONSUMER_SECRET is missing' });
    }

    const crcToken = req.query ? req.query.crc_token : null;
    if (crcToken) {
      const hash = crypto
        .createHmac('sha256', X_CONSUMER_SECRET)
        .update(crcToken)
        .digest('base64');
        
      return res.status(200).json({
        response_token: `sha256=${hash}`
      });
    }
    return res.status(400).send('Missing crc_token');
  }

  // 3. Tweet Events Processing (POST Request)
  if (req.method === 'POST') {
    const X_CONSUMER_SECRET = process.env.X_CONSUMER_SECRET;
    if (!X_CONSUMER_SECRET) {
      console.error('Server configuration error: X_CONSUMER_SECRET is missing');
      return res.status(503).json({ error: 'Server configuration error: X_CONSUMER_SECRET is missing' });
    }

    // HMAC Signature Authentication
    const signatureHeader = req.headers['x-twitter-webhooks-signature'] || req.headers['X-Twitter-Webhooks-Signature'];
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

    const expectedHash = crypto.createHmac('sha256', X_CONSUMER_SECRET).update(rawBody).digest('base64');
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

    if (body.tweet_create_events) {
      if (!Array.isArray(body.tweet_create_events)) {
        return res.status(400).json({ error: 'Bad Request: tweet_create_events must be an array.' });
      }

      try {
        for (const tweet of body.tweet_create_events) {
          if (!tweet || typeof tweet !== 'object') continue;
          if (process.env.X_ACCOUNT_ID && tweet.user && tweet.user.id_str === process.env.X_ACCOUNT_ID) continue;

          const rawContent = String(tweet.text || '').trim();
          if (!rawContent) continue;

          if (rawContent.length > 1000) {
            return res.status(400).json({ error: 'Bad Request: Tweet text exceeds maximum length of 1000 characters.' });
          }

          let locationText = "Pune";
          if (rawContent.toLowerCase().includes("kothrud")) locationText = "Kothrud, Pune";
          else if (rawContent.toLowerCase().includes("baner")) locationText = "Baner Road, Pune";
          else if (rawContent.toLowerCase().includes("fc")) locationText = "FC Road, Pune";
          else if (rawContent.toLowerCase().includes("aundh")) locationText = "Aundh IT Park, Pune";

          const screenName = tweet.user && tweet.user.screen_name ? tweet.user.screen_name : 'resident';
          const avatarUrl = (tweet.user && tweet.user.profile_image_url_https) ? tweet.user.profile_image_url_https : `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(screenName)}`;

          const docId = `SOC-X-${tweet.id_str || Date.now()}`;

          const payload = {
            id: docId,
            platform: 'X',
            username: `@${screenName}`,
            avatar: avatarUrl,
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
            engagement: typeof tweet.favorite_count === 'number' ? tweet.favorite_count : 1
          };

          // Idempotent upsert
          const { error: insertErr } = await supabase.from('social_signals').upsert([payload], { onConflict: 'id', ignoreDuplicates: true });
          if (insertErr) {
            console.error("Supabase X webhook upsert error:", insertErr);
          }
        }
        return res.status(200).send('SUCCESS');
      } catch (err) {
        console.error("X Webhook Ingestion Error:", err);
        return res.status(500).send('ERROR');
      }
    }
    return res.status(200).send('IGNORED');
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).send('Method Not Allowed');
};
