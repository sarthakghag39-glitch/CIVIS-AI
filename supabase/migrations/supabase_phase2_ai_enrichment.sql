-- ================================================================
-- CIVIS AI - PHASE 2: AI DATABASE ENRICHMENT MIGRATION
-- Add AI metadata columns and constraints to public.issues
-- ================================================================

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS ai_analyzed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_category TEXT,
  ADD COLUMN IF NOT EXISTS ai_severity TEXT,
  ADD COLUMN IF NOT EXISTS ai_severity_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ai_detected_tags TEXT[],
  ADD COLUMN IF NOT EXISTS ai_recommended_action TEXT,
  ADD COLUMN IF NOT EXISTS ai_reasoning_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_is_valid_civic_issue BOOLEAN,
  ADD COLUMN IF NOT EXISTS ai_model_version TEXT,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Add CHECK constraints for data integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ai_severity_score'
  ) THEN
    ALTER TABLE public.issues
      ADD CONSTRAINT check_ai_severity_score
      CHECK (ai_severity_score IS NULL OR (ai_severity_score >= 1 AND ai_severity_score <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ai_confidence'
  ) THEN
    ALTER TABLE public.issues
      ADD CONSTRAINT check_ai_confidence
      CHECK (ai_confidence IS NULL OR (ai_confidence >= 0.0 AND ai_confidence <= 1.0));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ai_severity'
  ) THEN
    ALTER TABLE public.issues
      ADD CONSTRAINT check_ai_severity
      CHECK (ai_severity IS NULL OR ai_severity IN ('Low', 'Moderate', 'High', 'Critical'));
  END IF;
END $$;
