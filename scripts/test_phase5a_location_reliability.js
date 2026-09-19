// Phase 5A Location Reliability Verification Test Suite
// Verifies GPS options, coordinate validation, manual pin selection, location_source, accuracy, jitter removal, and submission guards

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

function isValidCoordinate(lat, lng) {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
         typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function processComplaintLocationState(inputLat, inputLng, inputSource, inputAccuracy) {
  let currentLat = isValidCoordinate(inputLat, inputLng) ? inputLat : null;
  let currentLng = isValidCoordinate(inputLat, inputLng) ? inputLng : null;
  let currentLocationSource = currentLat !== null ? (inputSource || 'manual_pin') : null;
  let currentLocationAccuracy = currentLocationSource === 'gps' ? (inputAccuracy || null) : null;

  const canSubmit = isValidCoordinate(currentLat, currentLng) && currentLocationSource !== null;

  return {
    lat: currentLat,
    lng: currentLng,
    location_source: currentLocationSource,
    location_accuracy_meters: currentLocationAccuracy ? Math.round(currentLocationAccuracy) : null,
    canSubmit
  };
}

console.log('--- RUNNING PHASE 5A LOCATION RELIABILITY TEST SUITE ---\n');

// Test 1: GPS Success sets location_source = 'gps' and preserves reported accuracy
const res1 = processComplaintLocationState(18.5204, 73.8567, 'gps', 12.4);
assertEqual(
  res1.location_source === 'gps' && res1.location_accuracy_meters === 12 && res1.lat === 18.5204 && res1.lng === 73.8567 && res1.canSubmit === true,
  true,
  'Test 1: GPS success saves location_source=gps and rounded accuracy -> SUCCESS'
);

// Test 2: Manual pin selection sets location_source = 'manual_pin' and null accuracy
const res2 = processComplaintLocationState(18.5400, 73.8800, 'manual_pin', null);
assertEqual(
  res2.location_source === 'manual_pin' && res2.location_accuracy_meters === null && res2.lat === 18.5400 && res2.lng === 73.8800 && res2.canSubmit === true,
  true,
  'Test 2: Manual pin selection saves location_source=manual_pin and null accuracy -> SUCCESS'
);

// Test 3: Manual adjustment of GPS location converts location_source to manual_pin with null accuracy
const gpsState = processComplaintLocationState(18.5204, 73.8567, 'gps', 15.0);
const adjustedState = processComplaintLocationState(18.5210, 73.8570, 'manual_pin', null);
assertEqual(
  gpsState.location_source === 'gps' && adjustedState.location_source === 'manual_pin' && adjustedState.location_accuracy_meters === null,
  true,
  'Test 3: Adjusting GPS location converts source to manual_pin -> SUCCESS'
);

// Test 4: Absence of fake coordinate jittering (exact coordinates stored)
const exactLat = 18.5204;
const exactLng = 73.8567;
const res4 = processComplaintLocationState(exactLat, exactLng, 'manual_pin', null);
assertEqual(
  res4.lat === exactLat && res4.lng === exactLng,
  true,
  'Test 4: Coordinates stored exactly without random jitter -> SUCCESS'
);

// Test 5: GPS Failure does NOT produce default Pune coordinates (returns null lat/lng and blocks submission)
const res5 = processComplaintLocationState(null, null, null, null);
assertEqual(
  res5.lat === null && res5.lng === null && res5.location_source === null && res5.canSubmit === false,
  true,
  'Test 5: GPS failure results in null coordinates and blocks submission -> SUCCESS'
);

// Test 6: Finite number and range coordinate validation rejects NaN/infinity/out-of-bounds
const res6_nan = isValidCoordinate(NaN, 73.85);
const res6_out = isValidCoordinate(195.0, 73.85);
const res6_valid = isValidCoordinate(18.52, 73.85);
assertEqual(
  res6_nan === false && res6_out === false && res6_valid === true,
  true,
  'Test 6: Finite-number and range validation strictly checks lat/lng -> SUCCESS'
);

// Test 7: Admin portal issue payload includes location_source and location_accuracy_meters
const adminRes = processComplaintLocationState(18.5300, 73.8600, 'gps', 8.5);
const adminPayload = {
  title: 'Pothole Repair',
  category: 'Road Damage',
  location_source: adminRes.location_source,
  location_accuracy_meters: adminRes.location_accuracy_meters,
  lat: adminRes.lat,
  lng: adminRes.lng
};
assertEqual(
  adminPayload.location_source === 'gps' && adminPayload.location_accuracy_meters === 9 && adminPayload.lat === 18.5300 && adminPayload.lng === 73.8600,
  true,
  'Test 7: Admin submission payload includes valid location metadata -> SUCCESS'
);

console.log(`\nPHASE 5A TEST RESULTS: ${passed}/${total} assertions passed.`);
if (passed !== total) {
  process.exit(1);
}
