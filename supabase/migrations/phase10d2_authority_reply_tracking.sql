-- ================================================================
-- CIVIS AI - PHASE 10D-2: AUTHORITY REPLY & CITIZEN NOTIFICATION TRACKING
-- Columns and unique partial index for inbound authority email reply processing
-- ================================================================

-- 1. Add authority response and citizen notification tracking fields to public.issues
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS authority_response TEXT NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS authority_responded_at TIMESTAMPTZ NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS authority_reply_message_id TEXT NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS authority_reply_event_id TEXT NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS citizen_notified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS citizen_notified_at TIMESTAMPTZ NULL;

-- 2. Create unique partial index on authority_reply_message_id for database-level idempotency
DROP INDEX IF EXISTS public.idx_issues_authority_reply_message_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_authority_reply_message_id
ON public.issues (authority_reply_message_id)
WHERE authority_reply_message_id IS NOT NULL;
