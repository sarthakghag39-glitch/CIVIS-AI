// CIVIS AI - Civic Issue Automated Severity & Department Routing Engine
// Pure deterministic routing module based on stored complaint data and AI signals

(function(exports) {

  // Canonical Department Mapping
  const DEPARTMENT_MAP = {
    'Road Damage': 'Road Maintenance & PWD',
    'Garbage': 'Solid Waste & Sanitation',
    'Streetlights': 'Electrical & Street Lighting',
    'Water Leakage': 'Water Supply & Drainage',
    'Other': 'General Municipal Administration'
  };

  // Category Aliases Normalization
  function normalizeCategory(cat) {
    const trimmed = (cat || '').trim();
    if (!trimmed) return 'Other';
    if (trimmed === 'Road Damage' || trimmed === 'Roads & Potholes') return 'Road Damage';
    if (trimmed === 'Garbage' || trimmed === 'Sanitation / Waste' || trimmed === 'Sanitation') return 'Garbage';
    if (trimmed === 'Streetlights' || trimmed === 'Street Lighting') return 'Streetlights';
    if (trimmed === 'Water Leakage' || trimmed === 'Water Supply / Leaks' || trimmed === 'Water Supply') return 'Water Leakage';
    return 'Other';
  }

  function getDepartmentForCategory(cat) {
    const canonical = normalizeCategory(cat);
    return DEPARTMENT_MAP[canonical] || 'General Municipal Administration';
  }

  function deriveCriticalityFromAi(aiSeverity, aiSeverityScore, existingCriticality) {
    if (aiSeverity === 'Critical') return 'Critical';
    if (typeof aiSeverityScore === 'number' && !isNaN(aiSeverityScore) && aiSeverityScore !== null) {
      if (aiSeverityScore >= 75) return 'Critical';
      if (aiSeverityScore >= 50) return 'High';
      if (aiSeverityScore >= 25) return 'Moderate';
      if (aiSeverityScore >= 1) return 'Normal';
    }
    return existingCriticality || 'Normal';
  }

  function routeIssue(issue) {
    if (!issue) {
      return {
        assigned_department: 'General Municipal Administration',
        criticality: 'Normal',
        auto_routed: true,
        routed_at: new Date().toISOString()
      };
    }

    // Determine category to use: ai_category (if valid) > category > Other
    const effectiveCategory = (issue.ai_analyzed && issue.ai_category) ? issue.ai_category : issue.category;
    const department = getDepartmentForCategory(effectiveCategory);

    // Determine criticality: derive from AI if ai_analyzed && severity score exists, else preserve existing
    let criticality = issue.criticality || 'Normal';
    if (issue.ai_analyzed && (issue.ai_severity_score !== null || issue.ai_severity === 'Critical')) {
      criticality = deriveCriticalityFromAi(issue.ai_severity, issue.ai_severity_score, issue.criticality);
    }

    return {
      assigned_department: department,
      criticality: criticality,
      auto_routed: true,
      routed_at: new Date().toISOString()
    };
  }

  exports.normalizeCategory = normalizeCategory;
  exports.getDepartmentForCategory = getDepartmentForCategory;
  exports.deriveCriticalityFromAi = deriveCriticalityFromAi;
  exports.routeIssue = routeIssue;

})(typeof exports !== 'undefined' ? exports : (window.CivisRoutingEngine = {}));
