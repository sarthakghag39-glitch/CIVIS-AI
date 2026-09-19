const path = require('path');
const { routeIssue } = require(path.join(__dirname, '..', 'public', 'js', 'routing_engine.js'));

const args = process.argv.slice(2);
let cliKey = null;
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--key' || args[i] === '--service-key') && args[i + 1]) {
    cliKey = args[i + 1];
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dppdyknjrryoljzzdulj.supabase.co';
const SUPABASE_KEY = cliKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';

async function runBackfill() {
  console.log("Applying Phase 3 Backfill to Supabase public.issues...");
  console.log(`Supabase Endpoint: ${SUPABASE_URL}`);
  console.log(`Using Key: ${SUPABASE_KEY.substring(0, 15)}...`);

  // 1. Fetch all issues
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/issues?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
  } catch (err) {
    console.error("Network error while fetching issues:", err.message);
    return;
  }

  if (!res.ok) {
    console.error(`Failed to fetch issues: Status ${res.status}`, await res.text());
    return;
  }

  const issues = await res.json();
  const totalFetched = issues.length;
  console.log(`Fetched ${totalFetched} issues.`);

  let successfullyUpdatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const issue of issues) {
    const issueLabel = `ID ${issue.id} (${issue.complaint_id || 'N/A'})`;

    // 1. Check if manually reassigned by admin (non-null department AND auto_routed === false)
    if (issue.assigned_department && issue.auto_routed === false) {
      console.log(`[SKIPPED] ${issueLabel}: Preserving manual admin assignment ('${issue.assigned_department}')`);
      skippedCount++;
      continue;
    }

    // 2. Compute deterministic routing using routing_engine.js
    const routed = routeIssue(issue);

    // 3. Check if already up-to-date
    if (
      issue.assigned_department === routed.assigned_department &&
      issue.criticality === routed.criticality &&
      issue.auto_routed === true &&
      issue.routed_at !== null
    ) {
      console.log(`[SKIPPED] ${issueLabel}: Already up to date (Dept: '${routed.assigned_department}', Criticality: '${routed.criticality}')`);
      skippedCount++;
      continue;
    }

    const payload = {
      assigned_department: routed.assigned_department,
      criticality: routed.criticality,
      auto_routed: true,
      routed_at: issue.routed_at || routed.routed_at
    };

    // 4. Perform Supabase PATCH update with return=representation
    try {
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/issues?id=eq.${issue.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (updateRes.ok) {
        const updatedRows = await updateRes.json();
        if (Array.isArray(updatedRows) && updatedRows.length > 0) {
          console.log(`[SUCCESS] ${issueLabel}: Updated -> Dept: '${routed.assigned_department}', Criticality: '${routed.criticality}', AutoRouted: true`);
          successfullyUpdatedCount++;
        } else {
          console.error(`[FAIL] ${issueLabel}: 0 rows returned by Supabase. RLS policy blocked UPDATE or key unauthorized.`);
          failedCount++;
        }
      } else {
        const errText = await updateRes.text();
        console.error(`[FAIL] ${issueLabel}: HTTP ${updateRes.status} - ${errText}`);
        failedCount++;
      }
    } catch (err) {
      console.error(`[FAIL] ${issueLabel}: Exception: ${err.message}`);
      failedCount++;
    }
  }

  console.log("\n==================================================");
  console.log("PHASE 3 BACKFILL SUMMARY");
  console.log("==================================================");
  console.log(`Fetched:              ${totalFetched}`);
  console.log(`Successfully updated: ${successfullyUpdatedCount}`);
  console.log(`Skipped:              ${skippedCount}`);
  console.log(`Failed:               ${failedCount}`);
  console.log("==================================================");
}

runBackfill();
