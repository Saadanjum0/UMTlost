-- Quick fix: Temporarily disable RLS for testing
-- WARNING: This removes security - only for testing!

-- Disable RLS on profiles table temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Or create a simple policy that allows everything for service role
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "temp_allow_all" ON public.profiles;
-- CREATE POLICY "temp_allow_all" ON public.profiles FOR ALL USING (true); 