// Serverless Function: Trusted Backend Candidate Detection Engine
// Endpoint: POST /api/detect_candidates

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

let evaluateMatch;
const possiblePaths = [
  path.join(__dirname, '..', 'public', 'js', 'clustering_engine.js'),
  path.join(__dirname, '..', 'js', 'clustering_engine.js'),
  path.join(__dirname, '..', '..', 'js', 'clustering_engine.js'),
  path.join(__dirname, '..', '..', 'public', 'js', 'clustering_engine.js'),
  path.join(__dirname, 'js', 'clustering_engine.js')
];

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    evaluateMatch = require(p).evaluateMatch;
    break;
  }
}
if (!evaluateMatch) {
  evaluateMatch = require(path.join(__dirname, '..', 'public', 'js', 'clustering_engine.js')).evaluateMatch;
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dppdyknjrryoljzzdulj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';

// Instance-level burst rate limiter
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = parseInt(process.env.CANDIDATE_RATE_LIMIT_MAX || '20', 10);
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // 1. Authentication Guard (Server-side Token Verification)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid authentication token.'
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid authentication token.'
    });
  }

  // Validate JWT token with Supabase Auth
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired authentication token.'
    });
  }

  // 2. Rate Limiting Guard
  const clientIdentifier = user.id || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
  if (!checkInstanceRateLimit(clientIdentifier)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests: Rate limit exceeded. Please wait 60 seconds before retrying.'
    });
  }

  // 3. Verify SUPABASE_SERVICE_ROLE_KEY configuration (Do NOT fall back to public/anon key)
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing'
    });
  }

  const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    } else if (Buffer.isBuffer(body)) {
      try { body = JSON.parse(body.toString('utf-8')); } catch (e) { body = {}; }
    }

    const issue_id = parseInt(body.issue_id, 10);
    if (!issue_id || isNaN(issue_id)) {
      return res.status(400).json({ error: 'Invalid or missing issue_id.' });
    }

    // 4. Fetch inserted issue record securely from database
    const { data: insertedIssue, error: fetchErr } = await supabaseServer
      .from('issues')
      .select('*')
      .eq('id', issue_id)
      .single();

    if (fetchErr || !insertedIssue) {
      return res.status(440).json({ error: 'Issue record not found.' });
    }

    // 3. Retrieve recent candidate comparison issues
    const { data: existingIssues, error: matchErr } = await supabaseServer
      .from('issues')
      .select('*')
      .neq('id', insertedIssue.id)
      .order('id', { ascending: false })
      .limit(50);

    if (matchErr || !existingIssues || existingIssues.length === 0) {
      return res.status(200).json({ success: true, candidate_count: 0, candidates: [] });
    }

    // 4. Deterministic candidate evaluation using unchanged clustering_engine.js
    const generatedCandidates = [];

    for (const existingIssue of existingIssues) {
      const match = evaluateMatch(insertedIssue, existingIssue);
      if (match && match.matched) {
        const issue_id_clean = Math.min(insertedIssue.id, existingIssue.id);
        const matched_issue_id_clean = Math.max(insertedIssue.id, existingIssue.id);

        const candidateObj = {
          issue_id: issue_id_clean,
          matched_issue_id: matched_issue_id_clean,
          distance_meters: match.distanceMeters,
          category_match: match.categoryMatch,
          tag_similarity: match.tagSimilarity,
          description_similarity: match.descriptionSimilarity,
          time_difference_hours: match.timeDifferenceHours,
          match_score: match.matchScore,
          status: 'pending'
        };

        const { data: upsertData, error: upsertErr } = await supabaseServer
          .from('incident_candidates')
          .upsert([candidateObj], {
            onConflict: 'issue_id,matched_issue_id',
            ignoreDuplicates: true
          })
          .select();

        if (upsertErr) {
          console.error('Supabase incident_candidates upsert error:', {
            message: upsertErr.message,
            code: upsertErr.code,
            details: upsertErr.details,
            hint: upsertErr.hint
          });
          return res.status(500).json({
            success: false,
            error: 'Failed to save incident candidate',
            code: upsertErr.code || 'UNKNOWN_ERROR'
          });
        }

        generatedCandidates.push(candidateObj);
      }
    }

    return res.status(200).json({
      success: true,
      candidate_count: generatedCandidates.length,
      candidates: generatedCandidates
    });

  } catch (err) {
    console.error('Candidate detection backend error:', err);
    return res.status(500).json({ error: `Internal server error: ${err.message}` });
  }
};
