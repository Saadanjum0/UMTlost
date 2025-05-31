-- Policy to allow unauthorized users to create profiles during signup

-- First, ensure the profiles table exists
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

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "authenticated_users_can_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "service_role_can_manage_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "allow_signup_profile_creation" ON public.profiles;
DROP POLICY IF EXISTS "allow_anonymous_profile_creation" ON public.profiles;

-- Policy 1: Allow service role to do everything (for backend operations)
CREATE POLICY "service_role_full_access" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Policy 2: Allow authenticated users to view all profiles
CREATE POLICY "authenticated_users_can_view" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 3: Allow users to update their own profile
CREATE POLICY "users_can_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id AND auth.role() = 'authenticated');

-- Policy 4: CRITICAL - Allow profile creation during signup
-- This allows the backend (using service role) to create profiles for new users
CREATE POLICY "allow_profile_creation_on_signup" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow service role to insert (for backend signup process)
        auth.role() = 'service_role' OR
        -- Allow if the user ID matches the authenticated user (for direct signup)
        auth.uid() = id
    );

-- Policy 5: Allow reading profiles during authentication process
CREATE POLICY "allow_profile_read_for_auth" ON public.profiles
    FOR SELECT USING (
        -- Service role can read everything
        auth.role() = 'service_role' OR
        -- Authenticated users can read all profiles
        auth.role() = 'authenticated' OR
        -- Allow reading own profile even during auth process
        auth.uid() = id
    );

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO anon; -- Allow anonymous access for signup

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function runs with SECURITY DEFINER, so it has elevated privileges
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    user_type, 
    account_status, 
    email_verified
  )
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

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    item_count INTEGER DEFAULT 0,
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    building VARCHAR(100) NOT NULL,
    floor VARCHAR(10),
    room VARCHAR(20),
    description TEXT,
    coordinates JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default data
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