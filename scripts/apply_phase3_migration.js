const SUPABASE_URL = 'https://dppdyknjrryoljzzdulj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';

function getDepartmentForCategory(category) {
  const cat = (category || '').trim();
  if (cat === 'Road Damage' || cat === 'Roads & Potholes') return 'Road Maintenance & PWD';
  if (cat === 'Garbage' || cat === 'Sanitation / Waste' || cat === 'Sanitation') return 'Solid Waste & Sanitation';
  if (cat === 'Streetlights' || cat === 'Street Lighting') return 'Electrical & Street Lighting';
  if (cat === 'Water Leakage' || cat === 'Water Supply / Leaks' || cat === 'Water Supply') return 'Water Supply & Drainage';
  return 'General Municipal Administration';
}

function deriveCriticality(aiSeverity, aiSeverityScore, existingCriticality) {
  if (aiSeverity === 'Critical') return 'Critical';
  if (typeof aiSeverityScore === 'number' && !isNaN(aiSeverityScore)) {
    if (aiSeverityScore >= 75) return 'Critical';
    if (aiSeverityScore >= 50) return 'High';
    if (aiSeverityScore >= 25) return 'Moderate';
    if (aiSeverityScore >= 1) return 'Normal';
  }
  return existingCriticality || 'Normal';
}

async function runBackfill() {
  console.log("Applying Phase 3 Backfill to Supabase public.issues...");

  // 1. Fetch all issues
  const res = await fetch(`${SUPABASE_URL}/rest/v1/issues?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
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
    const effectiveCategory = issue.ai_category || issue.category;
    const targetDept = issue.assigned_department || getDepartmentForCategory(effectiveCategory);
    const targetAutoRouted = typeof issue.auto_routed === 'boolean' ? issue.auto_routed : true;
    const targetRoutedAt = issue.routed_at || new Date().toISOString();

    let targetCriticality = issue.criticality;
    if (issue.ai_analyzed && (issue.ai_severity_score !== null || issue.ai_severity === 'Critical')) {
      targetCriticality = deriveCriticality(issue.ai_severity, issue.ai_severity_score, issue.criticality);
    }

    // Update issue row
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/issues?id=eq.${issue.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        assigned_department: targetDept,
        auto_routed: targetAutoRouted,
        routed_at: targetRoutedAt,
        criticality: targetCriticality
      })
    });

    if (updateRes.ok) {
      updatedCount++;
    } else {
      console.warn(`Failed to update issue ID ${issue.id}:`, await updateRes.text());
    }
  }

  console.log(`Phase 3 Backfill completed! Updated ${updatedCount} issues.`);
}

runBackfill();
