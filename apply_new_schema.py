#!/usr/bin/env python3
"""
Script to apply the new database schema to Supabase
"""

import os
from supabase import create_client
from backend.config import settings

def apply_schema():
    """Apply the new database schema"""
    
    # SQL schema from the user
    schema_sql = """
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- User profiles table (extends Supabase auth.users)
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

-- Categories table
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

-- Locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    building VARCHAR(100) NOT NULL,
    floor VARCHAR(10),
    room VARCHAR(20),
    description TEXT,
    coordinates JSONB, -- {"latitude": 0.0, "longitude": 0.0}
    is_active BOOLEAN DEFAULT TRUE,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lost items table
CREATE TABLE IF NOT EXISTS public.lost_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) NOT NULL,
    location_id UUID REFERENCES public.locations(id) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    date_lost DATE NOT NULL,
    time_lost TIME,
    contact_method VARCHAR(20) DEFAULT 'EMAIL' CHECK (contact_method IN ('EMAIL', 'PHONE', 'BOTH')),
    contact_info VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FOUND', 'EXPIRED', 'ARCHIVED')),
    urgency VARCHAR(20) DEFAULT 'MEDIUM' CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    reward_amount DECIMAL(10,2) DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    search_vector TSVECTOR,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Found items table
CREATE TABLE IF NOT EXISTS public.found_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) NOT NULL,
    location_id UUID REFERENCES public.locations(id) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    date_found DATE NOT NULL,
    time_found TIME,
    current_location TEXT NOT NULL,
    contact_method VARCHAR(20) DEFAULT 'EMAIL' CHECK (contact_method IN ('EMAIL', 'PHONE', 'BOTH')),
    contact_info VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'CLAIMED', 'HANDED_OVER', 'ARCHIVED')),
    condition_notes TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    search_vector TSVECTOR,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can select profiles" ON public.profiles;
CREATE POLICY "Service role can select profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
CREATE POLICY "Service role can update profiles" ON public.profiles FOR UPDATE USING (true);

-- Enable service role to bypass RLS for profiles table
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Lost items policies
DROP POLICY IF EXISTS "Anyone can view active lost items" ON public.lost_items;
CREATE POLICY "Anyone can view active lost items" ON public.lost_items FOR SELECT USING (status = 'ACTIVE');

DROP POLICY IF EXISTS "Users can create lost items" ON public.lost_items;
CREATE POLICY "Users can create lost items" ON public.lost_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lost items" ON public.lost_items;
CREATE POLICY "Users can update own lost items" ON public.lost_items FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage lost items" ON public.lost_items;
CREATE POLICY "Service role can manage lost items" ON public.lost_items FOR ALL USING (true);

-- Found items policies
DROP POLICY IF EXISTS "Anyone can view available found items" ON public.found_items;
CREATE POLICY "Anyone can view available found items" ON public.found_items FOR SELECT USING (status = 'AVAILABLE');

DROP POLICY IF EXISTS "Users can create found items" ON public.found_items;
CREATE POLICY "Users can create found items" ON public.found_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own found items" ON public.found_items;
CREATE POLICY "Users can update own found items" ON public.found_items FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage found items" ON public.found_items;
CREATE POLICY "Service role can manage found items" ON public.found_items FOR ALL USING (true);

-- Create a function to check if current role is service role
CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('role') = 'service_role';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profiles policies to work with both authenticated users and service role
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;
CREATE POLICY "Profiles access policy" ON public.profiles FOR ALL USING (
  auth.is_service_role() OR 
  auth.uid() IS NOT NULL
) WITH CHECK (
  auth.is_service_role() OR 
  auth.uid() = id
);

-- Insert some default categories
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

-- Insert some default locations
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
"""
    
    try:
        # Create Supabase client with service role key
        if not settings.supabase_url or not settings.supabase_service_role_key:
            print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
            return False
            
        supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        
        print("Applying database schema...")
        
        # Execute the schema
        result = supabase.rpc('exec_sql', {'sql': schema_sql}).execute()
        
        print("Schema applied successfully!")
        return True
        
    except Exception as e:
        print(f"Error applying schema: {e}")
        return False

if __name__ == "__main__":
    success = apply_schema()
    if success:
        print("Database schema has been applied successfully!")
    else:
        print("Failed to apply database schema.") 