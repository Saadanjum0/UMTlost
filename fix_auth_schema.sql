-- Fix authentication and RLS policies for profiles table

-- First, ensure the profiles table exists with the correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    student_id VARCHAR(20) UNIQUE,
    employee_id VARCHAR(20) UNIQUE,
    phone_number VARCHAR(15),
    user_type VARCHAR(20) DEFAULT 'STUDENT' CHECK (user_type IN ('STUDENT', 'FACULTY', 'STAFF', 'ADMIN')),
    account_status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION')),
    profile_image_url TEXT,
    bio TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    preferences JSONB DEFAULT '{"emailNotifications": true, "smsNotifications": false, "language": "en", "theme": "light"}'::jsonb,
    stats JSONB DEFAULT '{"itemsPosted": 0, "itemsFound": 0, "successfulClaims": 0, "rating": 0, "totalRatings": 0}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;

-- Create comprehensive policies that work with auth.uid()
-- Allow authenticated users to view all profiles
CREATE POLICY "authenticated_users_can_view_profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow service role to do everything (for backend operations)
CREATE POLICY "service_role_can_manage_profiles" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own profile
CREATE POLICY "users_can_insert_own_profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to authenticated and service roles
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Create or replace function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, user_type, account_status, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'STUDENT',
    'ACTIVE',
    FALSE
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If profile creation fails, don't block user creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default categories if they don't exist
INSERT INTO public.categories (name, description, icon, color) VALUES
('Electronics', 'Phones, laptops, tablets, chargers', 'smartphone', '#3B82F6'),
('Bags', 'Backpacks, purses, wallets', 'briefcase', '#10B981'),
('Jewelry', 'Rings, necklaces, watches', 'watch', '#F59E0B'),
('Clothing', 'Jackets, shoes, accessories', 'shirt', '#EF4444'),
('Personal', 'Keys, ID cards, documents', 'key', '#8B5CF6'),
('Books', 'Textbooks, notebooks, stationery', 'book', '#06B6D4'),
('Sports', 'Equipment, gear, accessories', 'activity', '#84CC16'),
('Other', 'Miscellaneous items', 'help-circle', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Insert default locations if they don't exist
INSERT INTO public.locations (name, building, floor, description) VALUES
('Main Library', 'Library Building', '1', 'Ground floor of the main library'),
('Student Center', 'Student Center', '2', 'Second floor common area'),
('Engineering Building', 'Engineering', '3', 'Third floor labs and classrooms'),
('Business School', 'Business Building', '1', 'First floor lobby'),
('Cafeteria', 'Student Center', '1', 'Main dining area'),
('Gym', 'Sports Complex', '1', 'Main gymnasium'),
('Parking Lot A', 'Parking', NULL, 'Main campus parking area'),
('Dormitory Common Room', 'Residence Hall', '1', 'First floor common area')
ON CONFLICT (name) DO NOTHING; 