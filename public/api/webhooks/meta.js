// Serverless Webhook for Instagram & Facebook Graph API Ingestion
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dppdyknjrryoljzzdulj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  // 1. Webhook Verification (Meta Handshake)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === (process.env.META_VERIFY_TOKEN || 'civis_verify_token')) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // 2. Event Ingestion (Post Webhook Pushes)
  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'instagram' || body.object === 'page') {
      try {
        const entries = body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            if (change.field === 'mentions' || change.field === 'feed') {
              const value = change.value;
              const rawContent = value.text || value.message || '';
              const platform = body.object === 'instagram' ? 'Instagram' : 'Facebook';
              
              // Resolve classification based on contents
              let issueType = "Pothole";
              let category = "Road Infrastructure";
              if (rawContent.toLowerCase().includes("garbage") || rawContent.toLowerCase().includes("waste")) {
                issueType = "Garbage";
                category = "Waste Management";
              } else if (rawContent.toLowerCase().includes("light") || rawContent.toLowerCase().includes("dark")) {
                issueType = "Streetlight";
                category = "Electrical Infrastructure";
              } else if (rawContent.toLowerCase().includes("water") || rawContent.toLowerCase().includes("pipe")) {
                issueType = "Water Leakage";
                category = "Utility Issues";
              }

              // Extract mock location if found in content
              let location = "Aundh, Pune";
              let latitude = 18.5596;
              let longitude = 73.8054;
              if (rawContent.toLowerCase().includes("kothrud")) {
                location = "Kothrud Bus Stop, Pune";
                latitude = 18.5074;
                longitude = 73.8077;
              } else if (rawContent.toLowerCase().includes("baner")) {
                location = "Baner Road, Pune";
                latitude = 18.5590;
                longitude = 73.7925;
              } else if (rawContent.toLowerCase().includes("fc")) {
                location = "FC Road, Pune";
                latitude = 18.5244;
                longitude = 73.8413;
              }

              const payload = {
                id: `SOC-${value.media_id || value.item_id || Math.floor(100000 + Math.random() * 900000)}`,
                platform: platform,
                username: `@${value.username || 'pune_resident'}`,
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${value.username || 'resident'}`,
                timestamp: "Just now",
                content: rawContent,
                issue_type: issueType,
                category: category,
                location: location,
                latitude: latitude,
                longitude: longitude,
                severity: "High",
                ai_confidence: 94,
                sentiment: "Negative",
                supporting_signals: 1,
                cluster_id: `CIV-CLUSTER-${Math.floor(100 + Math.random() * 900)}`,
                status: "New",
                department: category,
                recommended_action: "Inspect and route report to on-field engineer",
                engagement: 1
              };

              await supabase.from('social_signals').insert([payload]);
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
};
