const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dppdyknjrryoljzzdulj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';

async function applyPhase4Migration() {
  console.log("--- APPLYING PHASE 4 MIGRATION & LOCATION SOURCE BACKFILL ---");
  console.log(`Endpoint: ${SUPABASE_URL}`);
  
  // 1. Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'supabase_phase4_incident_clustering.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`Loaded migration SQL file (${sql.length} bytes).`);

  // 2. Fetch existing issues to update location_source = 'unknown' where missing
  const res = await fetch(`${SUPABASE_URL}/rest/v1/issues?select=id,location_source`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    console.error("Failed to fetch issues:", await res.text());
    return;
  }

  const issues = await res.json();
  console.log(`Fetched ${issues.length} issues.`);

  let updatedCount = 0;
  for (const issue of issues) {
    if (!issue.location_source) {
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/issues?id=eq.${issue.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ location_source: 'unknown' })
      });
      if (updateRes.ok) {
        const data = await updateRes.json();
        if (Array.isArray(data) && data.length > 0) {
          updatedCount++;
        }
      }
    }
  }

  console.log(`Phase 4 Backfill complete! Updated ${updatedCount} existing issues with location_source = 'unknown'.`);
  console.log("SQL Migration file is ready in supabase/migrations/supabase_phase4_incident_clustering.sql");
}

applyPhase4Migration();
