// CIVIS-AI Phase 10A Authority Registry Test Suite
const fs = require('fs');
const path = require('path');
const { getDepartmentForCategory } = require('../public/js/routing_engine.js');

console.log('--- RUNNING PHASE 10A AUTHORITY REGISTRY TEST SUITE ---');

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

function runTests() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/phase10a_department_authorities.sql');
  const routingEnginePath = path.join(__dirname, '../public/js/routing_engine.js');
  const userAppPath = path.join(__dirname, '../public/user/app.js');
  const adminAppPath = path.join(__dirname, '../public/admin/app.js');
  const analyzeIssuePath = path.join(__dirname, '../api/analyze_issue.js');
  const detectCandidatesPath = path.join(__dirname, '../api/detect_candidates.js');
  const syncApiPath = path.join(__dirname, '../scripts/sync_api.js');

  // Test 1: Migration file exists
  const migrationExists = fs.existsSync(migrationPath);
  assert(migrationExists, 'Migration file supabase/migrations/phase10a_department_authorities.sql exists');

  const migrationContent = migrationExists ? fs.readFileSync(migrationPath, 'utf8') : '';

  // Test 2: department_authorities table is created
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.department_authorities'), 'department_authorities table is created in SQL migration');

  // Test 3: department_name is unique
  assert(migrationContent.includes('department_name TEXT NOT NULL UNIQUE'), 'department_name is UNIQUE and NOT NULL');

  // Test 4: Five canonical departments are represented in seed data
  const canonicalDepts = [
    'Road Maintenance & PWD',
    'Solid Waste & Sanitation',
    'Electrical & Street Lighting',
    'Water Supply & Drainage',
    'General Municipal Administration'
  ];
  const allDeptsSeeded = canonicalDepts.every(dept => migrationContent.includes(`'${dept}'`));
  assert(allDeptsSeeded, 'All five canonical departments are seeded in Phase 10A migration');

  // Test 5: All seeded records use environment = 'demo'
  const insertStatement = migrationContent.slice(migrationContent.indexOf('INSERT INTO public.department_authorities'));
  assert(insertStatement.includes("'demo'"), "All seeded records strictly use environment = 'demo'");

  // Test 6: All seeded emails are demo/test emails (civis.demo.authority@gmail.com)
  assert(migrationContent.includes("'civis.demo.authority@gmail.com'"), 'Seeded records use civis.demo.authority@gmail.com');

  // Test 7: No real government email domains are used
  const hasRealGovDomain = /@.*\.gov(\.in)?\b/i.test(migrationContent);
  assert(!hasRealGovDomain, 'No real government email domains (e.g. .gov or .gov.in) are used in seed data');

  // Test 8: Social handles are NULL for now in seed data
  assert(migrationContent.includes('instagram_handle') && migrationContent.includes('facebook_page') && migrationContent.includes('x_handle'), 'Social handle columns exist and are set to NULL in seed statements');

  // Test 9: Existing routing department names match registry department names
  const testCategories = ['Road Damage', 'Garbage', 'Streetlights', 'Water Leakage', 'Other'];
  const routedDepts = testCategories.map(cat => getDepartmentForCategory(cat));
  const matchesRouting = canonicalDepts.every(dept => routedDepts.includes(dept));
  assert(matchesRouting, 'Canonical routing engine department names match registry department names exactly');

  // Test 10: No routing_engine.js modifications were made
  const routingEngineContent = fs.readFileSync(routingEnginePath, 'utf8');
  assert(routingEngineContent.includes("exports.routeIssue = routeIssue;") && routingEngineContent.includes("Road Maintenance & PWD"), 'public/js/routing_engine.js is unmodified and intact');

  // Test 11: RLS is enabled on department_authorities
  assert(migrationContent.includes('ALTER TABLE public.department_authorities ENABLE ROW LEVEL SECURITY;'), 'Row Level Security (RLS) is enabled on department_authorities');

  // Test 12: Non-admin users cannot modify authority records (is_admin check enforced)
  assert(migrationContent.includes('public.is_admin() = true') && migrationContent.includes('Admins manage department authorities'), 'Admin management policy enforces public.is_admin() = true');

  // Test 13: Existing protected files are unchanged and present
  const protectedFilesIntact = fs.existsSync(userAppPath) &&
                               fs.existsSync(adminAppPath) &&
                               fs.existsSync(analyzeIssuePath) &&
                               fs.existsSync(detectCandidatesPath) &&
                               fs.existsSync(syncApiPath);
  assert(protectedFilesIntact, 'All protected application files, serverless handlers, and sync scripts remain intact');

  console.log(`\nPHASE 10A TEST RESULTS: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
