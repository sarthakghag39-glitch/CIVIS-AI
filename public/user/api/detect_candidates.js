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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';
const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

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

    // 1. Fetch inserted issue record securely from database
    const { data: insertedIssue, error: fetchErr } = await supabaseServer
      .from('issues')
      .select('*')
      .eq('id', issue_id)
      .single();

    if (fetchErr || !insertedIssue) {
      return res.status(440).json({ error: 'Issue record not found.' });
    }

    // 2. Retrieve recent candidate comparison issues
    const { data: existingIssues, error: matchErr } = await supabaseServer
      .from('issues')
      .select('*')
      .neq('id', insertedIssue.id)
      .order('id', { ascending: false })
      .limit(50);

    if (matchErr || !existingIssues || existingIssues.length === 0) {
      return res.status(200).json({ success: true, candidate_count: 0, candidates: [] });
    }

    // 3. Deterministic candidate evaluation using unchanged clustering_engine.js
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

        if (!upsertErr) {
          generatedCandidates.push(candidateObj);
        }
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
