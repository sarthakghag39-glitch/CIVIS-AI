-- ================================================================
-- CIVIS AI - PHASE 3: AUTOMATED SEVERITY + DEPARTMENT ROUTING MIGRATION
-- Add department routing columns, index, and backfill existing issues
-- ================================================================

-- 1. Add Department Routing Columns to public.issues
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS assigned_department TEXT,
  ADD COLUMN IF NOT EXISTS auto_routed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS routed_at TIMESTAMPTZ;

-- 2. Create index for fast department filtering
CREATE INDEX IF NOT EXISTS idx_issues_assigned_department
  ON public.issues(assigned_department);

-- 3. Backfill assigned_department for legacy complaints where assigned_department IS NULL
UPDATE public.issues
SET 
  assigned_department = CASE
    WHEN COALESCE(ai_category, category) IN ('Road Damage', 'Roads & Potholes') THEN 'Road Maintenance & PWD'
    WHEN COALESCE(ai_category, category) IN ('Garbage', 'Sanitation / Waste', 'Sanitation') THEN 'Solid Waste & Sanitation'
    WHEN COALESCE(ai_category, category) IN ('Streetlights', 'Street Lighting') THEN 'Electrical & Street Lighting'
    WHEN COALESCE(ai_category, category) IN ('Water Leakage', 'Water Supply / Leaks', 'Water Supply') THEN 'Water Supply & Drainage'
    ELSE 'General Municipal Administration'
  END,
  auto_routed = true,
  routed_at = COALESCE(routed_at, NOW())
WHERE assigned_department IS NULL;

-- 4. Derive criticality for existing complaints ONLY where valid AI analysis exists
UPDATE public.issues
SET criticality = CASE
    WHEN ai_severity = 'Critical' OR ai_severity_score >= 75 THEN 'Critical'
    WHEN ai_severity_score >= 50 THEN 'High'
    WHEN ai_severity_score >= 25 THEN 'Moderate'
    WHEN ai_severity_score >= 1 THEN 'Normal'
    ELSE criticality
  END
WHERE ai_analyzed = true AND ai_severity_score IS NOT NULL;
