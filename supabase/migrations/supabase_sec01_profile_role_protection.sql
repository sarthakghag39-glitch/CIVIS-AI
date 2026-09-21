-- ================================================================
-- CIVIS AI - SEC-01: PROFILE ROLE PRIVILEGE ESCALATION PROTECTION
-- Prevents non-admin users from setting or updating role = 'admin' on public.profiles
-- ================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT: Non-admins cannot insert a profile with role = 'admin'
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' AND NOT (public.is_admin()) THEN
      NEW.role := 'citizen';
    END IF;
  END IF;

  -- For UPDATE: Non-admins cannot modify profile role
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.role IS DISTINCT FROM NEW.role) AND NOT (public.is_admin()) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can alter profile role.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
