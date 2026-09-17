-- ================================================================
-- CIVIS AI - PHASE 3A: STORAGE BUCKET & RLS POLICIES MIGRATION
-- Execute this SQL in your Supabase SQL Editor
-- ================================================================

-- 1. Create storage bucket for civis-complaint-images (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'civis-complaint-images', 
  'civis-complaint-images', 
  false, 
  5242880, -- 5 MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow uploading complaint images
DROP POLICY IF EXISTS "Anyone can upload complaint images" ON storage.objects;
CREATE POLICY "Anyone can upload complaint images" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'civis-complaint-images');

-- 4. Policy: Allow reading complaint images
DROP POLICY IF EXISTS "Anyone can view complaint images" ON storage.objects;
CREATE POLICY "Anyone can view complaint images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'civis-complaint-images');

-- 5. Policy: Allow deleting complaint images (for orphan cleanup)
DROP POLICY IF EXISTS "Anyone can delete complaint images" ON storage.objects;
CREATE POLICY "Anyone can delete complaint images" ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'civis-complaint-images');
