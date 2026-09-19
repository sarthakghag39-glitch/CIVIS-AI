-- ================================================================
-- CIVIS AI - PHASE 4: RLS SECURITY HARDENING MIGRATION
-- Hardens RLS policies for incidents, incident_candidates, and issues
-- Execute this SQL in your Supabase SQL Editor after running Phase 4 migration
-- ================================================================

-- 1. Ensure public.is_admin() function exists and is SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 2. Hardened RLS Policies for public.incidents
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users on incidents" ON public.incidents;
DROP POLICY IF EXISTS "Enable insert access for all users on incidents" ON public.incidents;
DROP POLICY IF EXISTS "Enable update access for all users on incidents" ON public.incidents;
DROP POLICY IF EXISTS "Anyone can view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Admins can insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Admins can update incidents" ON public.incidents;

-- SELECT: Anyone (citizens & admins) can view incidents
CREATE POLICY "Anyone can view incidents"
  ON public.incidents FOR SELECT
  USING (true);

-- INSERT: Admin-only
CREATE POLICY "Admins can insert incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (public.is_admin() = true);

-- UPDATE: Admin-only (covers incident status change 'Open' -> 'Resolved' and title/department edits)
CREATE POLICY "Admins can update incidents"
  ON public.incidents FOR UPDATE
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 3. Hardened RLS Policies for public.incident_candidates
ALTER TABLE public.incident_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users on incident_candidates" ON public.incident_candidates;
DROP POLICY IF EXISTS "Enable insert access for all users on incident_candidates" ON public.incident_candidates;
DROP POLICY IF EXISTS "Enable update access for all users on incident_candidates" ON public.incident_candidates;
DROP POLICY IF EXISTS "Anyone can view incident_candidates" ON public.incident_candidates;
DROP POLICY IF EXISTS "Authenticated users can insert pending candidates" ON public.incident_candidates;
DROP POLICY IF EXISTS "Admins can update incident_candidates" ON public.incident_candidates;

-- SELECT: Anyone (citizens & admins) can view candidates
CREATE POLICY "Anyone can view incident_candidates"
  ON public.incident_candidates FOR SELECT
  USING (true);

-- INSERT: Admin-only (Trusted server backend uses service_role key to insert candidate rows; direct citizen INSERTs are DENIED)
DROP POLICY IF EXISTS "Admins can insert incident_candidates" ON public.incident_candidates;
CREATE POLICY "Admins can insert incident_candidates"
  ON public.incident_candidates FOR INSERT
  WITH CHECK (public.is_admin() = true);

-- UPDATE: Admin-only! Citizens CANNOT change candidate status to 'confirmed' or 'rejected'
CREATE POLICY "Admins can update incident_candidates"
  ON public.incident_candidates FOR UPDATE
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 4. Database Trigger on public.issues to protect incident_id from non-admin modifications
CREATE OR REPLACE FUNCTION public.protect_issue_incident_id()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT: if incident_id is specified by non-admin, block it
  IF TG_OP = 'INSERT' THEN
    IF NEW.incident_id IS NOT NULL AND NOT (public.is_admin()) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can assign incident_id on issue creation.';
    END IF;
  END IF;

  -- For UPDATE: if incident_id is being modified by non-admin, block it
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.incident_id IS DISTINCT FROM NEW.incident_id) AND NOT (public.is_admin()) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can modify incident_id on issues.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_issue_incident_id ON public.issues;
CREATE TRIGGER trg_protect_issue_incident_id
  BEFORE INSERT OR UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_issue_incident_id();

-- 5. UPDATE Policy for public.issues to ensure citizens can update legitimate complaint fields
DROP POLICY IF EXISTS "Users update own issues" ON public.issues;
CREATE POLICY "Users update own issues" ON public.issues
  FOR UPDATE USING (
    auth.uid() IS NOT NULL OR public.is_admin() = true
  );
