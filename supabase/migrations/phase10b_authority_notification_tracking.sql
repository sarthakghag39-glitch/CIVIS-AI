-- ================================================================
-- CIVIS AI - PHASE 10B: AUTHORITY NOTIFICATION TRACKING MIGRATION
-- Add notification tracking status columns to public.issues
-- ================================================================

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS authority_notified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS authority_notified_at TIMESTAMPTZ NULL;
