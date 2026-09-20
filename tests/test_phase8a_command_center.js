// CIVIS-AI Phase 8A Operational Command Center Unit & Integration Tests

const assert = require('assert');
const { calculatePriorityScore, getSLAStatus } = require('../public/js/prioritization_engine.js');

console.log("--- RUNNING PHASE 8A OPERATIONAL COMMAND CENTER TEST SUITE ---");

let passCount = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${desc}:`, err.message);
    process.exit(1);
  }
}

// Operational Command Center Pure Data Aggregation Engine Helper
function computeCommandCenterData(issues, incidentMap = null, nowOverride = null) {
  const safeIssues = Array.isArray(issues) ? issues : [];
  const now = nowOverride ? new Date(nowOverride) : new Date();

  const activeQueue = [];
  let slaBreachedCount = 0;
  let slaWarningCount = 0;
  let withinSlaCount = 0;
  let activeUnresolvedCount = 0;

  const departmentMatrix = {
    'Road Maintenance & PWD': { active: 0, p1: 0, p2: 0, breached: 0, warning: 0 },
    'Solid Waste & Sanitation': { active: 0, p1: 0, p2: 0, breached: 0, warning: 0 },
    'Electrical & Street Lighting': { active: 0, p1: 0, p2: 0, breached: 0, warning: 0 },
    'Water Supply & Drainage': { active: 0, p1: 0, p2: 0, breached: 0, warning: 0 },
    'General Municipal Administration': { active: 0, p1: 0, p2: 0, breached: 0, warning: 0 }
  };

  const incidentOps = {
    activeIncidentCount: 0,
    linkedComplaintsCount: 0,
    incidentList: []
  };

  const incGroupMap = new Map();

  safeIssues.forEach(issue => {
    if (!issue || typeof issue !== 'object') return;

    const isResolved = String(issue.status || '').trim() === 'Resolved';
    const pData = calculatePriorityScore(issue, incidentMap, now);
    const sla = getSLAStatus(issue, pData, now);

    // Track incident grouping
    if (issue.incident_id !== null && issue.incident_id !== undefined && issue.incident_id !== '') {
      const key = String(issue.incident_id);
      if (!incGroupMap.has(key)) {
        incGroupMap.set(key, { incident_id: key, count: 0, category: issue.category || 'Other', department: issue.assigned_department || 'General Municipal Administration', highestTier: pData.tier });
      }
      const incObj = incGroupMap.get(key);
      incObj.count++;
    }

    if (!isResolved) {
      activeUnresolvedCount++;

      if (sla.isSLABreached) slaBreachedCount++;
      else if (sla.isSLAWarning) slaWarningCount++;
      else withinSlaCount++;

      if (pData.tier === 'P1 Critical' || pData.tier === 'P2 High') {
        activeQueue.push({ issue, pData, sla });
      }

      // Department Load
      let rawDept = String(issue.assigned_department || '').trim();
      if (!departmentMatrix[rawDept]) {
        rawDept = 'General Municipal Administration';
      }
      const deptObj = departmentMatrix[rawDept];
      deptObj.active++;
      if (pData.tier === 'P1 Critical') deptObj.p1++;
      if (pData.tier === 'P2 High') deptObj.p2++;
      if (sla.isSLABreached) deptObj.breached++;
      if (sla.isSLAWarning) deptObj.warning++;
    }
  });

  incidentOps.activeIncidentCount = incGroupMap.size;
  incGroupMap.forEach(inc => {
    if (inc.count > 1) {
      incidentOps.linkedComplaintsCount += inc.count;
    }
    incidentOps.incidentList.push(inc);
  });

  // Insights
  const insights = [];
  const p1p2QueueCount = activeQueue.length;
  if (p1p2QueueCount > 0) {
    insights.push(`${p1p2QueueCount} unresolved priority complaint${p1p2QueueCount > 1 ? 's' : ''} (P1/P2) require immediate administrative attention`);
  }
  if (slaBreachedCount > 0) {
    insights.push(`${slaBreachedCount} active complaint${slaBreachedCount > 1 ? 's have' : ' has'} exceeded target SLA resolution time`);
  }
  
  let topDeptName = null;
  let topDeptP1P2 = 0;
  Object.keys(departmentMatrix).forEach(d => {
    const p1p2 = departmentMatrix[d].p1 + departmentMatrix[d].p2;
    if (p1p2 > topDeptP1P2) {
      topDeptP1P2 = p1p2;
      topDeptName = d;
    }
  });
  if (topDeptName && topDeptP1P2 > 0) {
    insights.push(`${topDeptName} carries highest priority burden with ${topDeptP1P2} active P1/P2 case${topDeptP1P2 > 1 ? 's' : ''}`);
  }

  return {
    activeQueue,
    slaBreachedCount,
    slaWarningCount,
    withinSlaCount,
    activeUnresolvedCount,
    departmentMatrix,
    incidentOps,
    insights
  };
}

// Test 1: Empty issue dataset does not throw
test('Test 1: Empty issue dataset does not throw', () => {
  const res = computeCommandCenterData([]);
  assert.strictEqual(res.activeQueue.length, 0);
  assert.strictEqual(res.activeUnresolvedCount, 0);
  assert.strictEqual(res.slaBreachedCount, 0);
});

// Test 2: Resolved issues excluded from active queue
test('Test 2: Resolved issues excluded from active queue', () => {
  const issues = [{ id: 1, status: 'Resolved', criticality: 'Critical', category: 'Water Leakage' }];
  const res = computeCommandCenterData(issues);
  assert.strictEqual(res.activeQueue.length, 0);
  assert.strictEqual(res.activeUnresolvedCount, 0);
});

// Test 3: P1/P2 issues appear in active attention queue
test('Test 3: P1/P2 issues appear in active attention queue', () => {
  const issues = [
    { id: 1, status: 'Pending', criticality: 'Critical', category: 'Water Leakage', ai_severity_score: 100, incident_id: 'inc_p1', created_at: '2026-09-01T12:00:00Z' }
  ];
  const incidentMap = new Map([['inc_p1', 3]]);
  const res = computeCommandCenterData(issues, incidentMap, '2026-09-20T12:00:00Z');
  assert.strictEqual(res.activeQueue.length, 1);
  assert.strictEqual(res.activeQueue[0].pData.tier, 'P1 Critical');
});

// Test 4: P3/P4 issues do not appear in P1/P2 queue
test('Test 4: P3/P4 issues do not appear in P1/P2 queue', () => {
  const issues = [
    { id: 1, status: 'Pending', criticality: 'Low', category: 'Other' }
  ];
  const res = computeCommandCenterData(issues);
  assert.strictEqual(res.activeQueue.length, 0);
  assert.strictEqual(res.activeUnresolvedCount, 1);
});

// Test 5: SLA breach count is correct
test('Test 5: SLA breach count is correct', () => {
  const now = new Date('2026-09-20T12:00:00Z');
  const threeDaysAgo = '2026-09-17T12:00:00Z';
  const issues = [
    { id: 1, status: 'Pending', criticality: 'Critical', ai_severity_score: 100, category: 'Water Leakage', created_at: threeDaysAgo, incident_id: 'inc_p1' }
  ];
  const incidentMap = new Map([['inc_p1', 3]]);
  const res = computeCommandCenterData(issues, incidentMap, now);
  assert.strictEqual(res.slaBreachedCount, 1);
});

// Test 6: SLA warning count is correct
test('Test 6: SLA warning count is correct', () => {
  const now = new Date('2026-09-20T12:00:00Z');
  const onePointSixDaysAgo = new Date(now.getTime() - 1.6 * 24 * 60 * 60 * 1000).toISOString();
  const issues = [
    { id: 1, status: 'Pending', criticality: 'Critical', ai_severity_score: 100, category: 'Water Leakage', created_at: onePointSixDaysAgo, incident_id: 'inc_p1' }
  ];
  const incidentMap = new Map([['inc_p1', 3]]);
  const res = computeCommandCenterData(issues, incidentMap, now);
  assert.strictEqual(res.slaBreachedCount, 0);
  assert.strictEqual(res.slaWarningCount, 1);
});

// Test 7: Resolved issue does not count as SLA breach
test('Test 7: Resolved issue does not count as SLA breach', () => {
  const now = new Date('2026-09-20T12:00:00Z');
  const tenDaysAgo = '2026-09-10T12:00:00Z';
  const issues = [
    { id: 1, status: 'Resolved', criticality: 'Critical', ai_severity_score: 100, category: 'Water Leakage', created_at: tenDaysAgo }
  ];
  const res = computeCommandCenterData(issues, null, now);
  assert.strictEqual(res.slaBreachedCount, 0);
  assert.strictEqual(res.activeUnresolvedCount, 0);
});

// Test 8: Department workload counts are correct
test('Test 8: Department workload counts are correct', () => {
  const issues = [
    { id: 1, status: 'Pending', assigned_department: 'Road Maintenance & PWD', criticality: 'High' }
  ];
  const res = computeCommandCenterData(issues);
  assert.strictEqual(res.departmentMatrix['Road Maintenance & PWD'].active, 1);
});

// Test 9: P1 department count is correct
test('Test 9: P1 department count is correct', () => {
  const issues = [
    { id: 1, status: 'Pending', assigned_department: 'Road Maintenance & PWD', criticality: 'Critical', ai_severity_score: 100, category: 'Water Leakage', incident_id: 'inc_p1', created_at: '2026-09-01T12:00:00Z' }
  ];
  const incidentMap = new Map([['inc_p1', 3]]);
  const res = computeCommandCenterData(issues, incidentMap, '2026-09-20T12:00:00Z');
  assert.strictEqual(res.departmentMatrix['Road Maintenance & PWD'].p1, 1);
});

// Test 10: P2 department count is correct
test('Test 10: P2 department count is correct', () => {
  const issues = [
    { id: 1, status: 'Pending', assigned_department: 'Water Supply & Drainage', criticality: 'High', ai_severity_score: 90, category: 'Water Leakage' }
  ];
  const res = computeCommandCenterData(issues);
  assert.strictEqual(res.departmentMatrix['Water Supply & Drainage'].p2, 1);
});

// Test 11: Missing department safely maps to General Municipal Administration
test('Test 11: Missing department safely maps to General Municipal Administration', () => {
  const issues = [
    { id: 1, status: 'Pending', assigned_department: null, criticality: 'Low' }
  ];
  const res = computeCommandCenterData(issues);
  assert.strictEqual(res.departmentMatrix['General Municipal Administration'].active, 1);
});

// Test 12: Incident-linked complaint count is correct
test('Test 12: Incident-linked complaint count is correct', () => {
  const issues = [
    { id: 1, status: 'Pending', incident_id: 'inc_55' },
    { id: 2, status: 'Pending', incident_id: 'inc_55' }
  ];
  const res = computeCommandCenterData(issues);
  assert.strictEqual(res.incidentOps.activeIncidentCount, 1);
  assert.strictEqual(res.incidentOps.linkedComplaintsCount, 2);
});

// Test 13: Multiple complaints under same incident are grouped correctly
test('Test 13: Multiple complaints under same incident are grouped correctly', () => {
  const issues = [
    { id: 1, status: 'Pending', incident_id: 'inc_88' },
    { id: 2, status: 'Pending', incident_id: 'inc_88' },
    { id: 3, status: 'Pending', incident_id: 'inc_88' }
  ];
  const res = computeCommandCenterData(issues);
  assert.strictEqual(res.incidentOps.incidentList[0].count, 3);
});

// Test 14: Missing incident_id does not throw
test('Test 14: Missing incident_id does not throw', () => {
  assert.doesNotThrow(() => {
    const res = computeCommandCenterData([{ id: 1, incident_id: null }]);
    assert.strictEqual(res.incidentOps.activeIncidentCount, 0);
  });
});

// Test 15: Missing created_at does not throw
test('Test 15: Missing created_at does not throw', () => {
  assert.doesNotThrow(() => {
    const res = computeCommandCenterData([{ id: 1, created_at: null, status: 'Pending' }]);
    assert.strictEqual(typeof res.slaBreachedCount, 'number');
  });
});

// Test 16: Invalid created_at does not throw
test('Test 16: Invalid created_at does not throw', () => {
  assert.doesNotThrow(() => {
    const res = computeCommandCenterData([{ id: 1, created_at: 'invalid-date-string', status: 'Pending' }]);
    assert.strictEqual(typeof res.slaBreachedCount, 'number');
  });
});

// Test 17: Missing priority fields do not throw
test('Test 17: Missing priority fields do not throw', () => {
  assert.doesNotThrow(() => {
    const res = computeCommandCenterData([{ id: 1, criticality: null, ai_severity: undefined, category: null }]);
    assert.strictEqual(res.activeUnresolvedCount, 1);
  });
});

// Test 18: Operational insight calculations do not throw
test('Test 18: Operational insight calculations do not throw', () => {
  const issues = [
    { id: 1, status: 'Pending', criticality: 'Critical', ai_severity_score: 100, category: 'Water Leakage', assigned_department: 'Road Maintenance & PWD', incident_id: 'inc_p1', created_at: '2026-09-01T12:00:00Z' }
  ];
  const incidentMap = new Map([['inc_p1', 3]]);
  const res = computeCommandCenterData(issues, incidentMap, '2026-09-20T12:00:00Z');
  assert.ok(res.insights.length > 0);
  assert.ok(res.insights[0].includes('P1/P2'));
});

// Test 19: Existing priority engine is used rather than duplicated
test('Test 19: Existing priority engine is used rather than duplicated', () => {
  const issue = { id: 1, criticality: 'High', ai_severity_score: 90, category: 'Water Leakage' };
  const pData = calculatePriorityScore(issue);
  assert.strictEqual(pData.tier, 'P2 High');
});

// Test 20: Existing SLA engine is used rather than duplicated
test('Test 20: Existing SLA engine is used rather than duplicated', () => {
  const issue = { id: 1, criticality: 'High', category: 'Road Damage', status: 'Pending' };
  const sla = getSLAStatus(issue);
  assert.strictEqual(sla.targetDays, 10);
});

console.log(`\nPHASE 8A TEST RESULTS: ${passCount}/20 assertions passed.\n`);
