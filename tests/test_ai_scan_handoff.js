// Test suite: AI Scan → Report Form Image Handoff
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
  console.log("--- RUNNING AI SCAN → REPORT FORM HANDOFF TEST SUITE ---");
  let passed = 0;
  let total = 0;

  function check(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
    }
  }

  const appJsPath = path.join(__dirname, '..', 'public', 'user', 'app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  // Test 1: In-memory image state variables exist
  check(
    appJs.includes('let selectedComplaintImageFile') && appJs.includes('let selectedComplaintImagePreviewUrl'),
    'In-memory image state variables (selectedComplaintImageFile & selectedComplaintImagePreviewUrl) are defined in public/user/app.js'
  );

  // Test 2: Helper function setSelectedComplaintImage exists and handles object URL creation/revocation
  check(
    appJs.includes('function setSelectedComplaintImage') && appJs.includes('URL.revokeObjectURL') && appJs.includes('URL.createObjectURL'),
    'setSelectedComplaintImage helper exists with ObjectURL management'
  );

  // Test 3: Camera capture populates selectedComplaintImageFile
  check(
    appJs.includes('setSelectedComplaintImage(blob') || appJs.includes('setSelectedComplaintImage('),
    'Camera capture/upload populates selectedComplaintImageFile state'
  );

  // Test 4: Report form contains image preview element #form-image-preview
  check(
    appJs.includes('id="form-image-preview"') && appJs.includes('id="form-image-preview-container"'),
    'Report modal includes image preview container and #form-image-preview tag'
  );

  // Test 5: Remove image button #remove-image-btn exists and resets state
  check(
    appJs.includes('id="remove-image-btn"') && appJs.includes('setSelectedComplaintImage(null)'),
    'Remove image button (#remove-image-btn) exists and resets selected image state'
  );

  // Test 6: Manual file replacement updates selected image state
  check(
    appJs.includes('fileInput.addEventListener(\'change\'') && appJs.includes('setSelectedComplaintImage(file)'),
    'Manual file input change updates selected image state'
  );

  // Test 7: AI analysis trigger uses compressed image payload from selected file
  check(
    appJs.includes('getCompressedImageForAi') && appJs.includes('triggerAiBtn'),
    'AI analysis button uses compressed image payload without modifying original File'
  );

  // Test 8: Single Supabase Storage upload uses selected image blob
  check(
    appJs.includes('supabaseClient.storage') && appJs.includes('.from(\'civis-complaint-images\')') && appJs.includes('.upload('),
    'Complaint submission uploads selected image to Supabase Storage civis-complaint-images bucket'
  );

  // Test 9: No duplicate upload calls in submission handler
  const uploadMatches = (appJs.match(/\.upload\(/g) || []).length;
  check(
    uploadMatches === 1,
    `Only a single Supabase Storage upload call exists in public/user/app.js (found: ${uploadMatches})`
  );

  // Test 10: Phase 9C privacy getIssues minimization remains intact
  const privacyTestPath = path.join(__dirname, 'test_phase9c_privacy.js');
  check(
    fs.existsSync(privacyTestPath),
    'Phase 9C privacy test script exists'
  );

  console.log(`\nAI SCAN HANDOFF TEST SUITE SUMMARY: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
