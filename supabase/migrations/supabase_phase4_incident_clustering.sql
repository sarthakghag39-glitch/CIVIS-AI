-- CIVIS AI - Phase 4: Incident / Duplicate Complaint Clustering Migration

-- 1. Create public.incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code TEXT UNIQUE NOT NULL,
  title TEXT,
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'Normal',
  severity_score INTEGER DEFAULT 0,
  department TEXT NOT NULL,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- 2. Add Phase 4 columns and index to public.issues
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS incident_id UUID NULL REFERENCES public.incidents(id),
  ADD COLUMN IF NOT EXISTS location_source TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS location_accuracy_meters DOUBLE PRECISION NULL;

CREATE INDEX IF NOT EXISTS idx_issues_incident_id ON public.issues(incident_id);

-- 3. Create public.incident_candidates table
CREATE TABLE IF NOT EXISTS public.incident_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id BIGINT NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  matched_issue_id BIGINT NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  distance_meters DOUBLE PRECISION,
  category_match BOOLEAN DEFAULT true,
  tag_similarity DOUBLE PRECISION DEFAULT 0,
  description_similarity DOUBLE PRECISION DEFAULT 0,
  time_difference_hours DOUBLE PRECISION,
  match_score DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID NULL,
  CONSTRAINT unq_candidate_pair UNIQUE (issue_id, matched_issue_id),
  CONSTRAINT chk_issue_id_order CHECK (issue_id < matched_issue_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_candidates_issue_id ON public.incident_candidates(issue_id);
CREATE INDEX IF NOT EXISTS idx_incident_candidates_matched_issue_id ON public.incident_candidates(matched_issue_id);
CREATE INDEX IF NOT EXISTS idx_incident_candidates_status ON public.incident_candidates(status);

-- 4. Enable Row Level Security (Authorization policies established in supabase_phase4_rls_hardening.sql)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_candidates ENABLE ROW LEVEL SECURITY;
