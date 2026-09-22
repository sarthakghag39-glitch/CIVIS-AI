-- ================================================================
-- CIVIS AI - PHASE 10A: DEPARTMENT AUTHORITY REGISTRY MIGRATION
-- Create public.department_authorities table for hackathon / demo environment
-- ================================================================

-- 1. Create public.department_authorities table
CREATE TABLE IF NOT EXISTS public.department_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name TEXT NOT NULL UNIQUE,
  authority_name TEXT NOT NULL,
  official_email TEXT NOT NULL,
  contact_phone TEXT NULL,
  jurisdiction_zone TEXT NULL,
  instagram_handle TEXT NULL,
  facebook_page TEXT NULL,
  x_handle TEXT NULL,
  environment TEXT NOT NULL DEFAULT 'demo',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add CHECK constraints for data integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_authority_environment'
  ) THEN
    ALTER TABLE public.department_authorities
      ADD CONSTRAINT check_authority_environment
      CHECK (environment IN ('demo', 'production', 'testing'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_authority_email_not_empty'
  ) THEN
    ALTER TABLE public.department_authorities
      ADD CONSTRAINT check_authority_email_not_empty
      CHECK (length(trim(official_email)) > 0);
  END IF;
END $$;

-- 3. Create index on department_name for fast lookup
CREATE INDEX IF NOT EXISTS idx_department_authorities_dept_name
  ON public.department_authorities(department_name);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.department_authorities ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Authenticated users view active department authorities" ON public.department_authorities;
CREATE POLICY "Authenticated users view active department authorities" ON public.department_authorities
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

DROP POLICY IF EXISTS "Admins manage department authorities" ON public.department_authorities;
CREATE POLICY "Admins manage department authorities" ON public.department_authorities
  FOR ALL USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- Grants
GRANT SELECT ON public.department_authorities TO authenticated;
GRANT ALL ON public.department_authorities TO service_role;

-- 6. Seed initial Demo Authority records matching canonical departments from routing_engine.js
INSERT INTO public.department_authorities (
  department_name,
  authority_name,
  official_email,
  contact_phone,
  jurisdiction_zone,
  instagram_handle,
  facebook_page,
  x_handle,
  environment,
  is_active
) VALUES
  (
    'Road Maintenance & PWD',
    'CIVIS-AI Demo Road Authority',
    'civis.demo.authority@gmail.com',
    NULL,
    'Demo / Hackathon Environment',
    NULL,
    NULL,
    NULL,
    'demo',
    true
  ),
  (
    'Solid Waste & Sanitation',
    'CIVIS-AI Demo Sanitation Authority',
    'civis.demo.authority@gmail.com',
    NULL,
    'Demo / Hackathon Environment',
    NULL,
    NULL,
    NULL,
    'demo',
    true
  ),
  (
    'Electrical & Street Lighting',
    'CIVIS-AI Demo Electrical Authority',
    'civis.demo.authority@gmail.com',
    NULL,
    'Demo / Hackathon Environment',
    NULL,
    NULL,
    NULL,
    'demo',
    true
  ),
  (
    'Water Supply & Drainage',
    'CIVIS-AI Demo Water Authority',
    'civis.demo.authority@gmail.com',
    NULL,
    'Demo / Hackathon Environment',
    NULL,
    NULL,
    NULL,
    'demo',
    true
  ),
  (
    'General Municipal Administration',
    'CIVIS-AI Demo Municipal Authority',
    'civis.demo.authority@gmail.com',
    NULL,
    'Demo / Hackathon Environment',
    NULL,
    NULL,
    NULL,
    'demo',
    true
  )
ON CONFLICT (department_name) DO UPDATE SET
  authority_name = EXCLUDED.authority_name,
  official_email = EXCLUDED.official_email,
  jurisdiction_zone = EXCLUDED.jurisdiction_zone,
  environment = EXCLUDED.environment,
  is_active = EXCLUDED.is_active,
  updated_at = now();
