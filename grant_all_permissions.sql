-- Grant all permissions for Lost & Found Portal
-- Run this in your Supabase SQL Editor

-- First, disable RLS temporarily to set up policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_requests DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view active lost items" ON public.lost_items;
DROP POLICY IF EXISTS "Users can create lost items" ON public.lost_items;
DROP POLICY IF EXISTS "Users can update own lost items" ON public.lost_items;
DROP POLICY IF EXISTS "Service role can manage lost items" ON public.lost_items;

DROP POLICY IF EXISTS "Anyone can view available found items" ON public.found_items;
DROP POLICY IF EXISTS "Users can create found items" ON public.found_items;
DROP POLICY IF EXISTS "Users can update own found items" ON public.found_items;
DROP POLICY IF EXISTS "Service role can manage found items" ON public.found_items;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY "Allow all operations on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Lost items table policies
CREATE POLICY "Allow all operations on lost_items" ON public.lost_items FOR ALL USING (true) WITH CHECK (true);

-- Found items table policies
CREATE POLICY "Allow all operations on found_items" ON public.found_items FOR ALL USING (true) WITH CHECK (true);

-- Categories table policies
CREATE POLICY "Allow all operations on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Locations table policies
CREATE POLICY "Allow all operations on locations" ON public.locations FOR ALL USING (true) WITH CHECK (true);

-- Claim requests table policies (if exists)
CREATE POLICY "Allow all operations on claim_requests" ON public.claim_requests FOR ALL USING (true) WITH CHECK (true);

-- Grant usage on sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant all privileges on tables
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.lost_items TO authenticated;
GRANT ALL ON public.found_items TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.locations TO authenticated;
GRANT ALL ON public.claim_requests TO authenticated;

GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.lost_items TO anon;
GRANT ALL ON public.found_items TO anon;
GRANT ALL ON public.categories TO anon;
GRANT ALL ON public.locations TO anon;
GRANT ALL ON public.claim_requests TO anon;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.lost_items TO service_role;
GRANT ALL ON public.found_items TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.locations TO service_role;
GRANT ALL ON public.claim_requests TO service_role;

-- Create function to check if user is authenticated
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if current role is service role
CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('role') = 'service_role';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 