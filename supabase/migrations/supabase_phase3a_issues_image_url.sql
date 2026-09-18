-- ================================================================
-- CIVIS AI - PHASE 3A: COMPLAINT IMAGE UPLOAD & STORAGE MIGRATION
-- Add image_url column to public.issues table
-- ================================================================

ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS image_url TEXT;
