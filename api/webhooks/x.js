// Serverless Webhook for X / Twitter Account Activity API (AAAPI)
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dppdyknjrryoljzzdulj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  // 1. Challenge-Response Check (CRC) Validation for X
  if (req.method === 'GET') {
    const crcToken = req.query.crc_token;
    if (crcToken) {
      const hash = crypto
        .createHmac('sha256', process.env.X_CONSUMER_SECRET || 'x_secret')
        .update(crcToken)
        .digest('base64');
        
      return res.status(200).json({
        response_token: `sha256=${hash}`
      });
    }
    return res.status(400).send('Missing crc_token');
  }

  // 2. Tweet Events Processing
  if (req.method === 'POST') {
    const body = req.body;

    if (body.tweet_create_events) {
      try {
        for (const tweet of body.tweet_create_events) {
          // Ignore own tweets to prevent infinite lookup loops
          if (tweet.user.id_str === process.env.X_ACCOUNT_ID) continue;

          const rawContent = tweet.text || '';
          
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

          let location = "Kothrud, Pune";
          let latitude = 18.5074;
          let longitude = 73.8077;
          if (rawContent.toLowerCase().includes("baner")) {
            location = "Baner Road, Pune";
            latitude = 18.5590;
            longitude = 73.7925;
          } else if (rawContent.toLowerCase().includes("fc")) {
            location = "FC Road, Pune";
            latitude = 18.5244;
            longitude = 73.8413;
          } else if (rawContent.toLowerCase().includes("aundh")) {
            location = "Aundh IT Park, Pune";
            latitude = 18.5596;
            longitude = 73.8054;
          }

          const payload = {
            id: `SOC-${tweet.id_str}`,
            platform: 'X',
            username: `@${tweet.user.screen_name}`,
            avatar: tweet.user.profile_image_url_https || `https://api.dicebear.com/7.x/adventurer/svg?seed=${tweet.user.screen_name}`,
            timestamp: "Just now",
            content: rawContent,
            issue_type: issueType,
            category: category,
            location: location,
            latitude: latitude,
            longitude: longitude,
            severity: "High",
            ai_confidence: 92,
            sentiment: "Negative",
            supporting_signals: 1,
            cluster_id: `CIV-CLUSTER-${Math.floor(100 + Math.random() * 900)}`,
            status: "New",
            department: category,
            recommended_action: "Examine tweet detail and deploy verification scout",
            engagement: tweet.favorite_count || 1
          };

          await supabase.from('social_signals').insert([payload]);
        }
        return res.status(200).send('SUCCESS');
      } catch (err) {
        console.error("X Webhook Ingestion Error:", err);
        return res.status(500).send('ERROR');
      }
    }
    return res.status(200).send('IGNORED');
  }
};
