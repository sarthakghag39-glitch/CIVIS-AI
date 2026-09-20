// CIVIS AI - Civic Issue Prioritization Engine
// Pure deterministic administrative prioritization module based on complaint attributes

(function(exports) {

  function normalizeCategory(cat) {
    const trimmed = (cat || '').trim();
    if (!trimmed) return 'Other';
    if (trimmed === 'Road Damage' || trimmed === 'Roads & Potholes' || trimmed.toLowerCase().includes('pothole') || trimmed.toLowerCase().includes('road')) return 'Road Damage';
    if (trimmed === 'Garbage' || trimmed === 'Sanitation / Waste' || trimmed === 'Sanitation' || trimmed.toLowerCase().includes('trash') || trimmed.toLowerCase().includes('waste')) return 'Garbage';
    if (trimmed === 'Streetlights' || trimmed === 'Street Lighting' || trimmed.toLowerCase().includes('light')) return 'Streetlights';
    if (trimmed === 'Water Leakage' || trimmed === 'Water Supply / Leaks' || trimmed === 'Water Supply' || trimmed.toLowerCase().includes('water') || trimmed.toLowerCase().includes('leak')) return 'Water Leakage';
    return 'Other';
  }

  function calculatePriorityScore(issue, incidentMap = null, nowOverride = null) {
    if (!issue || typeof issue !== 'object') {
      return {
        score: 0,
        tier: 'P4 Routine',
        severityScore: 25,
        categoryScore: 40,
        incidentScore: 0,
        agingScore: 0,
        locationConfidence: 0,
        locationQualityLabel: 'Unknown'
      };
    }

    // A. SEVERITY SCORE (35% Weight)
    let critBase = 25;
    const rawCrit = String(issue.criticality || '').trim();
    if (rawCrit === 'Critical') critBase = 100;
    else if (rawCrit === 'High') critBase = 75;
    else if (rawCrit === 'Moderate' || rawCrit === 'Medium') critBase = 50;
    else if (rawCrit === 'Normal' || rawCrit === 'Low') critBase = 25;

    let severityScore = critBase;
    const aiSevScore = Number(issue.ai_severity_score);
    if (typeof issue.ai_severity_score !== 'undefined' && issue.ai_severity_score !== null && !isNaN(aiSevScore) && aiSevScore >= 1 && aiSevScore <= 100) {
      severityScore = Math.max(aiSevScore, critBase);
    }

    // B. CATEGORY SCORE (25% Weight)
    const normCategory = normalizeCategory(issue.category);
    let categoryScore = 40;
    if (normCategory === 'Water Leakage') categoryScore = 95;
    else if (normCategory === 'Road Damage') categoryScore = 90;
    else if (normCategory === 'Streetlights') categoryScore = 70;
    else if (normCategory === 'Garbage') categoryScore = 60;
    else categoryScore = 40;

    // C. INCIDENT DENSITY SCORE (15% Weight)
    let incidentScore = 0;
    const incId = issue.incident_id;
    if (incId !== null && incId !== undefined && incId !== '') {
      let count = 1;
      if (incidentMap) {
        if (typeof incidentMap.get === 'function') {
          count = incidentMap.get(incId) || incidentMap.get(String(incId)) || 1;
        } else if (typeof incidentMap === 'object') {
          count = incidentMap[incId] || incidentMap[String(incId)] || 1;
        }
      }
      if (count === 2) incidentScore = 50;
      else if (count >= 3) incidentScore = 100;
      else incidentScore = 0;
    }

    // D. AGING SCORE (15% Weight)
    let agingScore = 0;
    const isResolved = String(issue.status || '').trim() === 'Resolved';
    if (!isResolved) {
      const createdStr = issue.created_at || issue.date;
      if (createdStr) {
        const createdDate = new Date(createdStr);
        const now = nowOverride ? new Date(nowOverride) : new Date();
        if (!isNaN(createdDate.getTime()) && createdDate <= now) {
          const diffMs = now.getTime() - createdDate.getTime();
          const unresolvedDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
          agingScore = Math.min(100, Math.floor(unresolvedDays * 10));
        }
      }
    }

    // E. LOCATION QUALITY / CONFIDENCE (Informational Signal, 0% Weight)
    let locationConfidence = 0;
    let locationQualityLabel = 'Unknown';
    const locSource = String(issue.location_source || '').trim().toLowerCase();
    const accuracy = issue.location_accuracy_meters;

    if (locSource === 'gps') {
      if (typeof accuracy === 'number' && !isNaN(accuracy) && accuracy <= 30) {
        locationConfidence = 100;
        locationQualityLabel = 'High confidence';
      } else {
        locationConfidence = 60;
        locationQualityLabel = 'Approximate';
      }
    } else if (locSource === 'manual_pin') {
      locationConfidence = 100;
      locationQualityLabel = 'Manual pin';
    } else if (locSource === 'fallback') {
      locationConfidence = 20;
      locationQualityLabel = 'Low confidence';
    } else {
      locationConfidence = 0;
      locationQualityLabel = 'Unknown';
    }

    // F. COMPOSITE SCORE CALCULATION & TIER ASSIGNMENT
    const weightedSum = (severityScore * 0.35) + (categoryScore * 0.25) + (incidentScore * 0.15) + (agingScore * 0.15);
    const score = Math.min(100, Math.max(0, Math.round(weightedSum)));

    let tier = 'P4 Routine';
    if (score >= 75) tier = 'P1 Critical';
    else if (score >= 55) tier = 'P2 High';
    else if (score >= 35) tier = 'P3 Moderate';
    else tier = 'P4 Routine';

    return {
      score,
      tier,
      severityScore,
      categoryScore,
      incidentScore,
      agingScore,
      locationConfidence,
      locationQualityLabel
    };
  }

  function getSLAStatus(issue, priorityData = null, nowOverride = null) {
    if (!issue || typeof issue !== 'object') {
      return { isSLABreached: false, isSLAWarning: false, openDays: 0, targetDays: 15, overdueDays: 0 };
    }
    const isResolved = String(issue.status || '').trim() === 'Resolved';
    if (isResolved) {
      return { isSLABreached: false, isSLAWarning: false, openDays: 0, targetDays: 15, overdueDays: 0 };
    }

    const pData = priorityData || calculatePriorityScore(issue, null, nowOverride);
    let targetDays = 15;
    if (pData.tier === 'P1 Critical') targetDays = 2;
    else if (pData.tier === 'P2 High') targetDays = 5;
    else if (pData.tier === 'P3 Moderate') targetDays = 10;
    else targetDays = 15;

    const createdStr = issue.created_at || issue.date;
    let openDays = 0;
    if (createdStr) {
      const createdDate = new Date(createdStr);
      const now = nowOverride ? new Date(nowOverride) : new Date();
      if (!isNaN(createdDate.getTime()) && createdDate <= now) {
        const diffMs = now.getTime() - createdDate.getTime();
        openDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
      }
    }

    const roundedOpenDays = Math.round(openDays * 10) / 10;
    const isSLABreached = openDays > targetDays;
    const isSLAWarning = !isSLABreached && openDays >= (targetDays * 0.75);
    const overdueDays = isSLABreached ? Math.round((openDays - targetDays) * 10) / 10 : 0;

    return {
      isSLABreached,
      isSLAWarning,
      openDays: roundedOpenDays,
      targetDays,
      overdueDays
    };
  }

  exports.normalizeCategory = normalizeCategory;
  exports.calculatePriorityScore = calculatePriorityScore;
  exports.getSLAStatus = getSLAStatus;

})(typeof exports !== 'undefined' ? exports : (window.CivisPrioritizationEngine = {}));
