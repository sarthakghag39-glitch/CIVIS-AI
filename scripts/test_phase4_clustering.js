// Phase 4 Incident & Duplicate Complaint Clustering Test Suite
const path = require('path');
const {
  haversineDistance,
  normalizeCategory,
  jaccardSimilarity,
  descriptionTokenSimilarity,
  calculateTimeDifferenceHours,
  calculateMatchScore,
  evaluateMatch
} = require(path.join(__dirname, '..', 'public', 'js', 'clustering_engine.js'));

let passed = 0;
let total = 0;

function assertEqual(actual, expected, testName) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    console.error(`   Expected:`, expected);
    console.error(`   Actual:  `, actual);
  }
}

function assertTruthy(actual, testName) {
  total++;
  if (Boolean(actual)) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    console.error(`   Expected truthy value, got:`, actual);
  }
}

console.log('--- RUNNING PHASE 4 CLUSTERING ENGINE TEST SUITE ---\n');

// Test 1: Same Pothole (within 100m, same category, within 7 days, GPS location)
const issue1A = {
  id: 101,
  category: 'Road Damage',
  lat: 18.5074,
  lng: 73.8077,
  location_source: 'gps',
  created_at: '2026-09-19T10:00:00Z',
  description: 'Deep pothole on main road causing traffic slowing'
};
const issue1B = {
  id: 102,
  category: 'Roads & Potholes',
  lat: 18.5077, // ~35 meters away
  lng: 73.8079,
  location_source: 'gps',
  created_at: '2026-09-19T14:00:00Z',
  description: 'Massive pothole on main street near market'
};

const res1 = evaluateMatch(issue1A, issue1B);
assertEqual(res1.matched, true, 'Test 1a: Same pothole within 35m & 4h -> Matched');
assertTruthy(res1.distanceMeters <= 50, 'Test 1b: Haversine distance correctly <= 50m');
assertTruthy(res1.matchScore >= 70, 'Test 1c: High match score for close pothole');

// Test 2: Different Categories (Road Damage + Garbage at same coordinates)
const issue2A = {
  id: 201,
  category: 'Road Damage',
  lat: 18.5074,
  lng: 73.8077,
  location_source: 'gps',
  created_at: '2026-09-19T10:00:00Z'
};
const issue2B = {
  id: 202,
  category: 'Garbage',
  lat: 18.5074,
  lng: 73.8077,
  location_source: 'gps',
  created_at: '2026-09-19T10:00:00Z'
};

const res2 = evaluateMatch(issue2A, issue2B);
assertEqual(res2.matched, false, 'Test 2a: Different categories -> Not matched');
assertEqual(res2.reason, 'category_mismatch', 'Test 2b: Reason is category_mismatch');

// Test 3: Too Far (> 100m, e.g. 500m apart)
const issue3A = {
  id: 301,
  category: 'Road Damage',
  lat: 18.5074,
  lng: 73.8077,
  location_source: 'gps',
  created_at: '2026-09-19T10:00:00Z'
};
const issue3B = {
  id: 302,
  category: 'Road Damage',
  lat: 18.5120, // ~510 meters away
  lng: 73.8077,
  location_source: 'gps',
  created_at: '2026-09-19T10:00:00Z'
};

const res3 = evaluateMatch(issue3A, issue3B);
assertEqual(res3.matched, false, 'Test 3a: 500m distance -> Not matched');
assertEqual(res3.reason, 'distance_exceeded', 'Test 3b: Reason is distance_exceeded');

// Test 4: Too Old (> 7 days, e.g. 11 days apart)
const issue4A = {
  id: 401,
  category: 'Water Leakage',
  lat: 18.5074,
  lng: 73.8077,
  location_source: 'gps',
  created_at: '2026-09-01T10:00:00Z'
};
const issue4B = {
  id: 402,
  category: 'Water Supply',
  lat: 18.5075,
  lng: 73.8077,
  location_source: 'gps',
  created_at: '2026-09-12T10:00:00Z' // 11 days later
};

const res4 = evaluateMatch(issue4A, issue4B);
assertEqual(res4.matched, false, 'Test 4a: 11 days apart -> Not matched');
assertEqual(res4.reason, 'time_exceeded', 'Test 4b: Reason is time_exceeded');

// Test 5: Fallback Coordinates Safety
const issue5A = {
  id: 501,
  category: 'Road Damage',
  lat: 18.5204,
  lng: 73.8567,
  location_source: 'fallback',
  created_at: '2026-09-19T10:00:00Z'
};
const issue5B = {
  id: 502,
  category: 'Road Damage',
  lat: 18.5204,
  lng: 73.8567,
  location_source: 'fallback',
  created_at: '2026-09-19T10:00:00Z'
};

const res5 = evaluateMatch(issue5A, issue5B);
assertEqual(res5.matched, false, 'Test 5a: Fallback location sources -> Excluded from spatial matching');
assertEqual(res5.reason, 'fallback_coordinates_excluded', 'Test 5b: Reason is fallback_coordinates_excluded');

// Test 6: Complaints without AI Analysis (ai_analyzed = false)
const issue6A = {
  id: 601,
  category: 'Streetlights',
  lat: 18.5074,
  lng: 73.8077,
  location_source: 'gps',
  ai_analyzed: false,
  created_at: '2026-09-19T10:00:00Z'
};
const issue6B = {
  id: 602,
  category: 'Street Lighting',
  lat: 18.5075, // ~11m
  lng: 73.8077,
  location_source: 'gps',
  ai_analyzed: false,
  created_at: '2026-09-19T12:00:00Z'
};

const res6 = evaluateMatch(issue6A, issue6B);
assertEqual(res6.matched, true, 'Test 6a: Non-AI complaints matched via spatial + category + time');
assertTruthy(res6.matchScore >= 70, 'Test 6b: Non-AI complaints get valid fallback match score');

// Test 7: AI Vision Tags Jaccard Similarity Calculation
const tagsA = ['pothole', 'asphalt', 'standing_water'];
const tagsB = ['pothole', 'asphalt_damage', 'standing_water'];
const tagSim = jaccardSimilarity(tagsA, tagsB);
assertEqual(tagSim, 0.5, 'Test 7: Jaccard tag similarity correctly calculates 2/4 = 0.5');

console.log(`\nTEST RESULTS: ${passed}/${total} assertions passed.`);
if (passed !== total) {
  process.exit(1);
}
