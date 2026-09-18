-- ================================================================
-- CIVIS AI - PHASE 3A FINAL STEP: ADMIN STORAGE ACCESS MIGRATION
-- Execute this SQL in your Supabase SQL Editor
-- ================================================================

-- 1. Create secure database function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Ensure Row Level Security is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage SELECT Policy: Allow citizens to view their own images and admins to view all complaint images
DROP POLICY IF EXISTS "Owners and admins can view complaint images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view complaint images" ON storage.objects;

CREATE POLICY "Owners and admins can view complaint images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'civis-complaint-images' AND
    (
      (storage.foldername(name))[2] = auth.uid()::text OR
      owner = auth.uid() OR
      public.is_admin() = true
    )
  );

-- 4. Storage INSERT Policy: Allow authenticated users to upload complaint images into their own user folder
DROP POLICY IF EXISTS "Authenticated users can upload complaint images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload complaint images" ON storage.objects;

CREATE POLICY "Authenticated users can upload complaint images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'civis-complaint-images' AND
    (
      (storage.foldername(name))[1] = 'complaints' AND
      (
        (storage.foldername(name))[2] = auth.uid()::text OR
        owner = auth.uid() OR
        public.is_admin() = true
      )
    )
  );

-- 5. Storage DELETE Policy: Allow owners and admins to delete complaint images (for cleanup)
DROP POLICY IF EXISTS "Owners and admins can delete complaint images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete complaint images" ON storage.objects;

CREATE POLICY "Owners and admins can delete complaint images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'civis-complaint-images' AND
    (
      (storage.foldername(name))[2] = auth.uid()::text OR
      owner = auth.uid() OR
      public.is_admin() = true
    )
  );
