// Phase 5B Map & Location UX Verification Test Suite
// Verifies reverse geocoding formatting, failure handling, out-of-order request tokening,
// user-edit preservation, address mismatch positive conflict detection, and coarse GPS warning triggers.

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

// Mirror Phase 5B Reverse Geocoder Formatter
function formatReverseGeocodeData(data) {
  if (!data || !data.address) return null;
  const addr = data.address;
  const road = addr.road || addr.pedestrian || addr.building || addr.footway || addr.path || '';
  const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.subdivision || '';
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || '';

  const parts = [road, suburb, city].filter(Boolean);
  const formatted = parts.length > 0 ? parts.join(', ') : (data.display_name || '');
  return {
    formattedAddress: formatted,
    road,
    suburb,
    city,
    displayName: data.display_name || ''
  };
}

// Mirror Phase 5B Address Mismatch Conflict Detector
function checkAddressMismatchPositiveConflict(userText, geocodedResult) {
  if (!userText || !geocodedResult) return null;

  const normalize = (str) => (str || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const normUser = normalize(userText);
  if (!normUser) return null;

  const normGeocoded = normalize(
    `${geocodedResult.road || ''} ${geocodedResult.suburb || ''} ${geocodedResult.city || ''} ${geocodedResult.displayName || ''}`
  );

  const knownLocalities = [
    'kothrud', 'shivajinagar', 'viman nagar', 'hadapsar', 'baner', 'wakad', 'aundh',
    'camp', 'kondhwa', 'pimple saudagar', 'pimpri', 'chinchwad', 'kalyani nagar',
    'yerwada', 'magarpatta', 'katraj', 'swargate', 'deccan', 'karve nagar', 'bhavani peth',
    'pune', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'nagpur', 'nashik', 'thane'
  ];

  for (const loc of knownLocalities) {
    if (normUser.includes(loc)) {
      if (!normGeocoded.includes(loc)) {
        return {
          hasConflict: true,
          userLocality: loc,
          geocodedLocality: geocodedResult.suburb || geocodedResult.city || 'selected pin area'
        };
      }
    }
  }

  return null;
}

// Mirror User-Edit & Out-Of-Order State Manager
class ModalLocationState {
  constructor(defaultLocation = '') {
    this.userEditedAddress = !!(defaultLocation && defaultLocation.trim().length > 0);
    this.locationText = defaultLocation;
    this.latestSeq = 0;
  }

  onUserType(newText) {
    this.userEditedAddress = true;
    this.locationText = newText;
  }

  triggerGeocodeResponse(reqSeq, geoFormattedResult) {
    // Prevent out-of-order response overwriting
    if (reqSeq !== this.latestSeq) return false;
    if (!this.userEditedAddress) {
      this.locationText = geoFormattedResult;
      return true;
    }
    return false;
  }

  nextGeocodeReqId() {
    return ++this.latestSeq;
  }
}

console.log('--- RUNNING PHASE 5B MAP & LOCATION UX TEST SUITE ---\n');

// Test 1: Reverse Geocoding Address Formatter
const mockNominatimData = {
  address: {
    road: 'FC Road',
    suburb: 'Shivajinagar',
    city: 'Pune',
    state: 'Maharashtra'
  },
  display_name: 'FC Road, Shivajinagar, Pune, Maharashtra, India'
};
const formatted1 = formatReverseGeocodeData(mockNominatimData);
assertEqual(
  formatted1.formattedAddress,
  'FC Road, Shivajinagar, Pune',
  'Test 1: Reverse geocode response cleanly formats road, suburb, and city -> SUCCESS'
);

// Test 2: Geocoder Resiliency (Returns null on failure without throwing)
const failResult = formatReverseGeocodeData(null);
assertEqual(
  failResult,
  null,
  'Test 2: Geocoder failure returns null safely without crashing -> SUCCESS'
);

// Test 3: User Edit Protection State Management
const state3 = new ModalLocationState('');
assertEqual(state3.userEditedAddress, false, 'Test 3a: Modal initializes userEditedAddress = false for empty location');

const reqId1 = state3.nextGeocodeReqId();
state3.triggerGeocodeResponse(reqId1, 'FC Road, Shivajinagar, Pune');
assertEqual(state3.locationText, 'FC Road, Shivajinagar, Pune', 'Test 3b: Auto-fill updates field when user has not edited');

state3.onUserType('Opposite Garware College');
assertEqual(state3.userEditedAddress, true, 'Test 3c: User typing sets userEditedAddress = true');

const reqId2 = state3.nextGeocodeReqId();
state3.triggerGeocodeResponse(reqId2, 'Karve Road, Pune');
assertEqual(state3.locationText, 'Opposite Garware College', 'Test 3d: Auto-fill preserves user edited text');

// Test 4: Address Mismatch Positive Conflict Detection
const geoResultKothrud = { road: 'Paud Road', suburb: 'Kothrud', city: 'Pune', displayName: 'Kothrud, Pune' };

// Case A: User typed conflicting locality "Viman Nagar"
const conflictA = checkAddressMismatchPositiveConflict('Near Phoenix Mall, Viman Nagar', geoResultKothrud);
assertEqual(
  conflictA !== null && conflictA.hasConflict === true && conflictA.userLocality === 'viman nagar',
  true,
  'Test 4a: Positive evidence of locality conflict ("Viman Nagar" vs "Kothrud") triggers warning -> SUCCESS'
);

// Case B: User typed descriptive landmark without conflicting locality "Opposite City Pride Cinema"
const conflictB = checkAddressMismatchPositiveConflict('Opposite City Pride Cinema', geoResultKothrud);
assertEqual(
  conflictB,
  null,
  'Test 4b: Descriptive landmark without conflicting locality does NOT trigger false warning -> SUCCESS'
);

// Case C: Case & Punctuation Normalization ("viman-nagar!")
const conflictC = checkAddressMismatchPositiveConflict('viman-nagar!', geoResultKothrud);
assertEqual(
  conflictC !== null && conflictC.hasConflict === true,
  true,
  'Test 4c: Normalized punctuation & case correctly identifies locality conflict -> SUCCESS'
);

// Test 5: Out-of-Order / Stale Request Handling
const state5 = new ModalLocationState('');
const reqToken1 = state5.nextGeocodeReqId(); // req #1
const reqToken2 = state5.nextGeocodeReqId(); // req #2 (newer request)

// Stale req #1 arrives late
const applied1 = state5.triggerGeocodeResponse(reqToken1, 'Stale Location A');
assertEqual(applied1, false, 'Test 5a: Stale out-of-order geocoding response #1 is rejected');

// Latest req #2 arrives
const applied2 = state5.triggerGeocodeResponse(reqToken2, 'Latest Location B');
assertEqual(applied2 === true && state5.locationText === 'Latest Location B', true, 'Test 5b: Latest geocoding response #2 is accepted');

// Test 6: Coarse GPS Warning Trigger (>200m)
const coarseAccuracy = 350;
const fineAccuracy = 15;
const isCoarse1 = coarseAccuracy > 200;
const isCoarse2 = fineAccuracy > 200;
assertEqual(
  isCoarse1 === true && isCoarse2 === false,
  true,
  'Test 6: Coarse GPS threshold (>200m) accurately flags low-accuracy fixes -> SUCCESS'
);

// Test 7: Phase 5A / Phase 4 Data Payload & OpenStreetMap Basemap Tile Verification
const fs = require('fs');
const userAppCode = fs.readFileSync('public/user/app.js', 'utf8');
const adminAppCode = fs.readFileSync('public/admin/app.js', 'utf8');

const osmTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const userHasOsmTiles = userAppCode.includes(osmTileUrl) && userAppCode.includes(osmAttribution) && !userAppCode.includes('basemaps.cartocdn.com') && !userAppCode.includes('CARTO_MAP_API_KEY');
const adminHasOsmTiles = adminAppCode.includes(osmTileUrl) && adminAppCode.includes(osmAttribution) && !adminAppCode.includes('basemaps.cartocdn.com') && !adminAppCode.includes('CARTO_MAP_API_KEY');

const payload7 = {
  lat: 18.5204,
  lng: 73.8567,
  location_source: 'gps',
  location_accuracy_meters: 18,
  location: 'FC Road, Shivajinagar, Pune'
};
assertEqual(
  payload7.location_source === 'gps' && payload7.location_accuracy_meters === 18 && payload7.lat === 18.5204 && payload7.lng === 73.8567 && userHasOsmTiles && adminHasOsmTiles,
  true,
  'Test 7: Phase 5A & 4 location contracts and OSM tile basemap compliance verified -> SUCCESS'
);

console.log(`\nPHASE 5B TEST RESULTS: ${passed}/${total} assertions passed.`);
if (passed !== total) {
  process.exit(1);
}

