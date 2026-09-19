// CIVIS AI - Civic Issue Incident & Duplicate Complaint Clustering Engine
// Pure deterministic multi-signal clustering engine based on spatial, categorical, temporal, and AI vision signals

(function(exports) {

  // 1. Haversine Distance in meters
  function haversineDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null ||
        isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return Infinity;
    }
    const R = 6371000; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 2. Canonical Category Normalization
  function normalizeCategory(cat) {
    const trimmed = (cat || '').trim();
    if (!trimmed) return 'Other';
    if (trimmed === 'Road Damage' || trimmed === 'Roads & Potholes') return 'Road Damage';
    if (trimmed === 'Garbage' || trimmed === 'Sanitation / Waste' || trimmed === 'Sanitation') return 'Garbage';
    if (trimmed === 'Streetlights' || trimmed === 'Street Lighting') return 'Streetlights';
    if (trimmed === 'Water Leakage' || trimmed === 'Water Supply / Leaks' || trimmed === 'Water Supply') return 'Water Leakage';
    return 'Other';
  }

  // 3. Jaccard Similarity for Arrays (e.g., AI vision tags)
  function jaccardSimilarity(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length === 0 || arr2.length === 0) {
      return 0;
    }
    const setA = new Set(arr1.map(item => String(item).toLowerCase().trim()));
    const setB = new Set(arr2.map(item => String(item).toLowerCase().trim()));
    
    let intersection = 0;
    setA.forEach(val => {
      if (setB.has(val)) intersection++;
    });
    
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }

  // 4. Description Token Similarity
  function descriptionTokenSimilarity(desc1, desc2) {
    if (!desc1 || !desc2) return 0;
    const tokenize = (text) => (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const tokens1 = tokenize(desc1);
    const tokens2 = tokenize(desc2);
    return jaccardSimilarity(tokens1, tokens2);
  }

  // 5. Time Difference in Hours
  function calculateTimeDifferenceHours(dateA, dateB) {
    if (!dateA || !dateB) return 0;
    const tA = new Date(dateA).getTime();
    const tB = new Date(dateB).getTime();
    if (isNaN(tA) || isNaN(tB)) return 0;
    return Math.abs(tA - tB) / (1000 * 60 * 60);
  }

  // 6. Deterministic Match Score Calculation (0-100 Points)
  // Formula:
  // - Distance: 0-40 pts (40 * (1 - distance / 100))
  // - Category Match: 0-25 pts (25 if canonical category matches, else 0)
  // - AI Vision Tags: 0-20 pts (20 * tag_similarity if both have tags; fallback 15 pts if tags unanalyzed)
  // - Description Similarity: 0-10 pts (10 * desc_similarity)
  // - Time Difference: 0-5 pts (5 * (1 - time_diff_hours / 168))
  function calculateMatchScore(distanceMeters, categoryMatch, tagSim, descSim, timeDiffHours, bothHaveTags) {
    if (!categoryMatch) return 0;

    const distanceScore = distanceMeters <= 100 ? (1 - distanceMeters / 100) * 40 : 0;
    const categoryScore = 25;
    const tagScore = bothHaveTags ? tagSim * 20 : 15;
    const descScore = descSim * 10;
    const timeScore = timeDiffHours <= 168 ? (1 - timeDiffHours / 168) * 5 : 0;

    const total = distanceScore + categoryScore + tagScore + descScore + timeScore;
    return Math.min(100, Math.round(total));
  }

  // 7. Full Multi-Signal Evaluation
  function evaluateMatch(issueA, issueB) {
    const emptyResult = (reason) => ({
      matched: false,
      reason: reason,
      distanceMeters: null,
      categoryMatch: false,
      tagSimilarity: 0,
      descriptionSimilarity: 0,
      timeDifferenceHours: null,
      matchScore: 0
    });

    if (!issueA || !issueB || issueA.id === issueB.id) {
      return emptyResult('same_issue_or_invalid');
    }

    // A. Mandatory Canonical Category Match
    const catA = (issueA.ai_analyzed && issueA.ai_category) ? issueA.ai_category : issueA.category;
    const catB = (issueB.ai_analyzed && issueB.ai_category) ? issueB.ai_category : issueB.category;
    const normA = normalizeCategory(catA);
    const normB = normalizeCategory(catB);

    if (normA !== normB) {
      return emptyResult('category_mismatch');
    }

    // B. Check Fallback Coordinates Safety
    const isFallbackA = (issueA.location_source === 'fallback') ||
      (issueA.lat === 18.5204 && issueA.lng === 73.8567) ||
      (Math.abs((issueA.lat || 0) - 18.5204) < 0.01 && Math.abs((issueA.lng || 0) - 73.8567) < 0.01 && issueA.location_source !== 'gps');

    const isFallbackB = (issueB.location_source === 'fallback') ||
      (issueB.lat === 18.5204 && issueB.lng === 73.8567) ||
      (Math.abs((issueB.lat || 0) - 18.5204) < 0.01 && Math.abs((issueB.lng || 0) - 73.8567) < 0.01 && issueB.location_source !== 'gps');

    if (isFallbackA || isFallbackB) {
      return emptyResult('fallback_coordinates_excluded');
    }

    // C. Spatial Distance Check (Max 100 meters)
    const distanceMeters = haversineDistance(issueA.lat, issueA.lng, issueB.lat, issueB.lng);
    if (distanceMeters > 100) {
      return {
        matched: false,
        reason: 'distance_exceeded',
        distanceMeters: Math.round(distanceMeters * 10) / 10,
        categoryMatch: true,
        tagSimilarity: 0,
        descriptionSimilarity: 0,
        timeDifferenceHours: null,
        matchScore: 0
      };
    }

    // D. Temporal Difference Check (Max 7 days / 168 hours)
    const timeDiffHours = calculateTimeDifferenceHours(issueA.created_at || issueA.date, issueB.created_at || issueB.date);
    if (timeDiffHours > 168) {
      return {
        matched: false,
        reason: 'time_exceeded',
        distanceMeters: Math.round(distanceMeters * 10) / 10,
        categoryMatch: true,
        tagSimilarity: 0,
        descriptionSimilarity: 0,
        timeDifferenceHours: Math.round(timeDiffHours * 10) / 10,
        matchScore: 0
      };
    }

    // E. Tag and Description Signals
    const bothHaveTags = Array.isArray(issueA.ai_detected_tags) && issueA.ai_detected_tags.length > 0 &&
                         Array.isArray(issueB.ai_detected_tags) && issueB.ai_detected_tags.length > 0;
    const tagSim = bothHaveTags ? jaccardSimilarity(issueA.ai_detected_tags, issueB.ai_detected_tags) : 0;
    const descSim = descriptionTokenSimilarity(issueA.description, issueB.description);

    // F. Calculate Match Score
    const matchScore = calculateMatchScore(distanceMeters, true, tagSim, descSim, timeDiffHours, bothHaveTags);

    return {
      matched: matchScore >= 50,
      reason: matchScore >= 50 ? 'matched' : 'score_below_threshold',
      distanceMeters: Math.round(distanceMeters * 10) / 10,
      categoryMatch: true,
      tagSimilarity: Math.round(tagSim * 100) / 100,
      descriptionSimilarity: Math.round(descSim * 100) / 100,
      timeDifferenceHours: Math.round(timeDiffHours * 10) / 10,
      matchScore: matchScore
    };
  }

  // Exports
  exports.haversineDistance = haversineDistance;
  exports.normalizeCategory = normalizeCategory;
  exports.jaccardSimilarity = jaccardSimilarity;
  exports.descriptionTokenSimilarity = descriptionTokenSimilarity;
  exports.calculateTimeDifferenceHours = calculateTimeDifferenceHours;
  exports.calculateMatchScore = calculateMatchScore;
  exports.evaluateMatch = evaluateMatch;

})(typeof exports !== 'undefined' ? exports : (window.CivisClusteringEngine = {}));
