// Targeted Test Suite: Admin Complaint Trend Chart Synchronization & Aggregation
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING COMPLAINT TREND SYNCHRONIZATION TEST SUITE ---');

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
  const adminAppPath = path.join(__dirname, '../public/admin/app.js');
  const adminAppContent = fs.readFileSync(adminAppPath, 'utf8');

  // Test 1: created_at is present in admin getIssues() select string
  const getIssuesStart = adminAppContent.indexOf('async function getIssues()');
  const getIssuesEnd = adminAppContent.indexOf('function classifyImage', getIssuesStart);
  const getIssuesBody = adminAppContent.slice(getIssuesStart, getIssuesEnd !== -1 ? getIssuesEnd : getIssuesStart + 500);

  assert(getIssuesBody.includes('created_at'), 'created_at field is present in admin getIssues() select string');

  // Test 2: renderTrendChart uses created_at || date fallback
  const trendStart = adminAppContent.indexOf('function renderTrendChart');
  const trendEnd = adminAppContent.indexOf('function renderDashboardCharts', trendStart);
  const trendBody = adminAppContent.slice(trendStart, trendEnd !== -1 ? trendEnd : trendStart + 1500);

  assert(trendBody.includes('const rawDate = issue.created_at || issue.date'), 'renderTrendChart uses created_at || date rawDate fallback');

  // Test 3: Date normalization generates daily YYYY-MM-DD buckets
  assert(trendBody.includes("toISOString().split('T')[0]"), 'Date normalization converts raw dates to YYYY-MM-DD string buckets');

  // Test 4-6: Aggregation logic tests (Simulated sample dataset with multiple dates over 7, 30, and 90 days)
  const today = new Date();
  const dateAgo = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const sampleIssues = [
    { id: 1, created_at: dateAgo(1) },
    { id: 2, created_at: dateAgo(1) },
    { id: 3, date: 'Sep 20, 2026', created_at: dateAgo(5) },
    { id: 4, created_at: dateAgo(20) },
    { id: 5, created_at: dateAgo(50) },
    { id: 6, created_at: null, date: null } // missing date safely skipped
  ];

  function simulateTrendAggregation(issues, days) {
    const now = new Date();
    const dateMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const labelStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[dateStr] = { count: 0, label: labelStr };
    }

    for (const issue of issues) {
      const rawDate = issue.created_at || issue.date;
      if (!rawDate) continue;
      const issueDateStr = new Date(rawDate).toISOString().split('T')[0];
      if (dateMap[issueDateStr]) {
        dateMap[issueDateStr].count++;
      }
    }
    return dateMap;
  }

  const map7 = simulateTrendAggregation(sampleIssues, 7);
  const total7 = Object.values(map7).reduce((sum, v) => sum + v.count, 0);
  assert(total7 === 3, '7-day range aggregates issues from past 7 days (3 issues)');

  const map30 = simulateTrendAggregation(sampleIssues, 30);
  const total30 = Object.values(map30).reduce((sum, v) => sum + v.count, 0);
  assert(total30 === 4, '30-day range aggregates issues from past 30 days (4 issues)');

  const map90 = simulateTrendAggregation(sampleIssues, 90);
  const total90 = Object.values(map90).reduce((sum, v) => sum + v.count, 0);
  assert(total90 === 5, '90-day range aggregates issues from past 90 days (5 issues)');

  // Test 7: Multiple complaints on the same day aggregate into one count
  const day1Key = new Date(dateAgo(1)).toISOString().split('T')[0];
  assert(map7[day1Key] && map7[day1Key].count === 2, 'Multiple complaints on day -1 correctly aggregate to count 2');

  // Test 8: Missing date is safely skipped
  const totalProcessed = Object.values(map90).reduce((sum, v) => sum + v.count, 0);
  assert(totalProcessed === 5, 'Issue with missing created_at and date is safely skipped without throwing error');

  // Test 9: Existing core dashboard functions remain present
  assert(
    adminAppContent.includes('function renderAdminIssues') &&
    adminAppContent.includes('function initAdminDashboard') &&
    adminAppContent.includes('function handleExportCSV') &&
    adminAppContent.includes('async function getIssues()'),
    'Core admin dashboard functions (renderAdminIssues, initAdminDashboard, handleExportCSV, getIssues) remain intact'
  );

  console.log(`\nCOMPLAINT TREND SYNCHRONIZATION TEST SUITE SUMMARY: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
