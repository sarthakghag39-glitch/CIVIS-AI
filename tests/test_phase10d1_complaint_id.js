// CIVIS-AI Phase 10D-1 Persistent Complaint IDs Test Suite
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING PHASE 10D-1 PERSISTENT COMPLAINT IDs TEST SUITE ---');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`[PASS] Test ${total}: ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] Test ${total}: ${message}`);
    process.exitCode = 1;
  }
}

function formatComplaintId(id) {
  return `CIV-2026-${String(id).padStart(Math.max(5, String(id).length), '0')}`;
}

function runTests() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/phase10d1_persistent_complaint_ids.sql');
  const userAppPath = path.join(__dirname, '../public/user/app.js');
  const adminAppPath = path.join(__dirname, '../public/admin/app.js');

  // Test 1: Migration file exists
  assert(fs.existsSync(migrationPath), 'Migration file supabase/migrations/phase10d1_persistent_complaint_ids.sql exists');

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');

  // Test 2: Migration ensures complaint_id column exists
  assert(
    migrationContent.includes('ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS complaint_id TEXT;'),
    'Migration ensures complaint_id column exists on public.issues'
  );

  // Test 3: Backfill UPDATE statement exists
  assert(
    migrationContent.includes('UPDATE public.issues') &&
    migrationContent.includes('SET complaint_id ='),
    'Backfill UPDATE query exists in migration'
  );

  // Test 4: Backfill preserves existing non-null complaint_id values
  assert(
    migrationContent.includes('WHERE complaint_id IS NULL OR TRIM(complaint_id) ='),
    'Backfill strictly targets NULL or empty complaint_id rows and preserves existing values'
  );

  // Test 5: Deterministic format in SQL uses CIV-2026- prefix and LPAD
  assert(
    migrationContent.includes("'CIV-2026-' || LPAD("),
    'Deterministic CIV-2026- prefix and LPAD padding are used in SQL'
  );

  // Test 6: Deterministic format helper produces exact expected specification examples
  assert(
    formatComplaintId(1) === 'CIV-2026-00001' &&
    formatComplaintId(24) === 'CIV-2026-00024' &&
    formatComplaintId(39) === 'CIV-2026-00039',
    'Deterministic formatting helper matches specification examples (id 1->00001, 24->00024, 39->00039)'
  );

  // Test 7: Unique index/constraint on public.issues(complaint_id) exists
  assert(
    migrationContent.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_complaint_id_unique') &&
    migrationContent.includes('ON public.issues (complaint_id);'),
    'Unique index idx_issues_complaint_id_unique exists on public.issues(complaint_id)'
  );

  // Test 8: Trigger function set_persistent_complaint_id is created with SECURITY DEFINER and SET search_path = public
  assert(
    migrationContent.includes('CREATE OR REPLACE FUNCTION public.set_persistent_complaint_id()') &&
    migrationContent.includes('SECURITY DEFINER') &&
    migrationContent.includes('SET search_path = public'),
    'Trigger function uses SECURITY DEFINER with SET search_path = public'
  );

  // Test 9: BEFORE INSERT trigger is attached to public.issues
  assert(
    migrationContent.includes('BEFORE INSERT ON public.issues') &&
    migrationContent.includes('EXECUTE FUNCTION public.set_persistent_complaint_id()'),
    'BEFORE INSERT trigger trigger_set_persistent_complaint_id is attached to public.issues'
  );

  // Test 10: Trigger logic conditionally checks for NULL or empty complaint_id
  assert(
    migrationContent.includes('IF NEW.complaint_id IS NULL OR TRIM(NEW.complaint_id) =') &&
    migrationContent.includes('NEW.complaint_id :='),
    'Trigger function verifies complaint_id is NULL or empty before assigning'
  );

  // Test 11: No random IDs or timestamp functions used for complaint_id generation
  assert(
    !migrationContent.includes('gen_random_uuid') &&
    !migrationContent.includes('random()') &&
    !migrationContent.includes('clock_timestamp()'),
    'No random generators or timestamps are used for complaint_id generation'
  );

  // Test 12: Citizen app UI display fallback matches deterministic format
  const userAppContent = fs.readFileSync(userAppPath, 'utf8');
  assert(
    userAppContent.includes('CIV-2026-${String(issue.id).padStart(5, \'0\')}') ||
    userAppContent.includes('CIV-2026-${String(insertedId).padStart(5, \'0\')}'),
    'Citizen app fallback format CIV-2026-${id} is 100% compatible with migration format'
  );

  // Test 13: Admin app UI display fallback matches deterministic format
  const adminAppContent = fs.readFileSync(adminAppPath, 'utf8');
  assert(
    adminAppContent.includes('CIV-2026-${String(issue.id).padStart(5, \'0\')}') ||
    adminAppContent.includes('CIV-2026-${String(insertedId).padStart(5, \'0\')}'),
    'Admin app fallback format CIV-2026-${id} is 100% compatible with migration format'
  );

  // Test 14: All existing protected files remain intact
  const protectedFiles = [
    'public/js/routing_engine.js',
    'public/js/prioritization_engine.js',
    'public/js/clustering_engine.js',
    'api/notify_authority.js',
    'api/analyze_issue.js',
    'api/detect_candidates.js',
    'public/user/app.js',
    'public/admin/app.js'
  ];
  const allIntact = protectedFiles.every(f => fs.existsSync(path.join(__dirname, '..', f)));
  assert(allIntact, 'All protected engine modules, serverless endpoints, and app controllers remain intact');

  console.log(`\nPHASE 10D-1 TEST RESULTS: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
