-- ================================================================
-- CIVIS AI - PHASE 1: SECURE AUTHENTICATION & AUTHORIZATION MIGRATION
-- Execute this SQL in your Supabase SQL Editor
-- ================================================================

-- 1. Ensure profiles table exists and contains the role column
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'citizen',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add role column if table already existed without it
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen';

-- Enforce valid roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_user_role'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT check_user_role CHECK (role IN ('citizen', 'admin'));
  END IF;
END $$;

-- 2. Automatic trigger function to create profile on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'citizen',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Enable Row Level Security (RLS) on profiles & issues
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for public.profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update own name and phone" ON public.profiles;
CREATE POLICY "Users can update own name and phone" ON public.profiles
  FOR SELECT USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. RLS Policies for public.issues
DROP POLICY IF EXISTS "Citizens view own or public issues" ON public.issues;
CREATE POLICY "Citizens view own or public issues" ON public.issues
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users insert own issues" ON public.issues;
CREATE POLICY "Authenticated users insert own issues" ON public.issues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins update all issues" ON public.issues;
CREATE POLICY "Admins update all issues" ON public.issues
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Helper query: To promote an existing user to Admin in Supabase SQL Editor:
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_UUID_HERE';
