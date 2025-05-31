-- Admin Schema Update for Lost & Found Portal
-- Run this in your Supabase SQL Editor to support admin functionality

-- Update the profiles table to ensure proper admin support
-- Add is_admin computed column if it doesn't exist
DO $$ 
BEGIN
    -- Check if is_admin column exists, if not add it as a computed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
        -- Add computed column for is_admin
        ALTER TABLE public.profiles 
        ADD COLUMN is_admin BOOLEAN GENERATED ALWAYS AS (user_type = 'ADMIN') STORED;
    END IF;
END $$;

-- Update existing admin users if any
-- This is optional - you can manually set specific users as admin
-- UPDATE public.profiles SET user_type = 'ADMIN' WHERE email = 'admin@umt.edu';

-- Create admin-specific policies if they don't exist
-- Allow admins to view all profiles
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'ADMIN')
    );

-- Allow admins to update any profile
DROP POLICY IF EXISTS "admins_can_update_any_profile" ON public.profiles;
CREATE POLICY "admins_can_update_any_profile" ON public.profiles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'ADMIN')
    );

-- Update items table policies to allow admin moderation
-- Allow admins to view all items
DROP POLICY IF EXISTS "admins_can_view_all_items" ON public.items;
CREATE POLICY "admins_can_view_all_items" ON public.items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'ADMIN')
    );

-- Allow admins to update any item (for moderation)
DROP POLICY IF EXISTS "admins_can_moderate_items" ON public.items;
CREATE POLICY "admins_can_moderate_items" ON public.items
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'ADMIN')
    );

-- Allow admins to delete items
DROP POLICY IF EXISTS "admins_can_delete_items" ON public.items;
CREATE POLICY "admins_can_delete_items" ON public.items
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'ADMIN')
    );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND user_type = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO service_role;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema'; 