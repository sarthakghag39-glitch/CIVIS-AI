-- ================================================================
-- CIVIS AI - PHASE 10D-1: PERSISTENT & RELIABLE COMPLAINT IDs
-- Deterministic complaint_id generation, backfill, and unique indexing
-- ================================================================

-- 1. Ensure complaint_id column exists on public.issues
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS complaint_id TEXT;

-- 2. Backfill existing issues where complaint_id is NULL or empty
-- Preserves any existing non-null complaint_id values.
-- Format: CIV-2026-${id padded to 5 digits}
UPDATE public.issues
SET complaint_id = 'CIV-2026-' || LPAD(id::text, GREATEST(5, LENGTH(id::text)), '0')
WHERE complaint_id IS NULL OR TRIM(complaint_id) = '';

-- 3. Create Unique Index on complaint_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_complaint_id_unique
ON public.issues (complaint_id);

-- 4. Create trigger function to automatically assign deterministic complaint_id on insert
CREATE OR REPLACE FUNCTION public.set_persistent_complaint_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.complaint_id IS NULL OR TRIM(NEW.complaint_id) = '' THEN
    IF NEW.id IS NOT NULL THEN
      NEW.complaint_id :=
        'CIV-2026-' ||
        LPAD(NEW.id::text, GREATEST(5, LENGTH(NEW.id::text)), '0');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Attach BEFORE INSERT trigger to public.issues
DROP TRIGGER IF EXISTS trigger_set_persistent_complaint_id ON public.issues;
CREATE TRIGGER trigger_set_persistent_complaint_id
  BEFORE INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_persistent_complaint_id();
