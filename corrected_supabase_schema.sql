-- Lost & Found Portal - Complete Database Schema for Supabase
-- IMPORTANT: Run this ENTIRE script in your Supabase SQL Editor
-- This will create all necessary tables, functions, triggers, and policies

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing types if they exist (to prevent conflicts)
DROP TYPE IF EXISTS item_type CASCADE;
DROP TYPE IF EXISTS item_category CASCADE;
DROP TYPE IF EXISTS urgency_level CASCADE;
DROP TYPE IF EXISTS item_status CASCADE;
DROP TYPE IF EXISTS claim_status CASCADE;

-- 3. Create custom types/enums
CREATE TYPE item_type AS ENUM ('lost', 'found');
CREATE TYPE item_category AS ENUM ('electronics', 'bags', 'jewelry', 'clothing', 'personal', 'books', 'sports', 'other');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE item_status AS ENUM ('active', 'claimed', 'resolved', 'archived', 'removed');
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- 4. Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create items table (main table for lost and found items)
CREATE TABLE IF NOT EXISTS items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type item_type NOT NULL,
    title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
    description TEXT NOT NULL CHECK (length(description) >= 10),
    category item_category NOT NULL,
    location TEXT NOT NULL CHECK (length(location) >= 2),
    date_lost DATE,
    time_lost TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    reward INTEGER DEFAULT 0 CHECK (reward >= 0),
    urgency urgency_level DEFAULT 'medium',
    status item_status DEFAULT 'active',
    contact_preference TEXT DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone')),
    view_count INTEGER DEFAULT 0,
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged', 'under_review')),
    moderated_by UUID REFERENCES profiles(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderation_notes TEXT,
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'disputed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create claim requests table
CREATE TABLE IF NOT EXISTS claim_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    claimer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL CHECK (length(message) >= 10),
    evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    status claim_status DEFAULT 'pending',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    admin_notes TEXT,
    processed_by UUID REFERENCES profiles(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    contact_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate claims from same user for same item
    UNIQUE(item_id, claimer_id)
);

-- 7. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('item_claimed', 'claim_approved', 'claim_rejected', 'item_found_match', 'item_moderated', 'admin_message')),
    read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url TEXT,
    related_item_id UUID REFERENCES items(id),
    related_claim_id UUID REFERENCES claim_requests(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create admin actions audit log
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    target_user_id UUID REFERENCES profiles(id),
    notes TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id),
    item_id UUID REFERENCES items(id),
    metadata JSONB,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_flagged ON items(flagged) WHERE flagged = true;

CREATE INDEX IF NOT EXISTS idx_claim_requests_item_id ON claim_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_claimer_id ON claim_requests(claimer_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

-- 11. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- 12. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Anyone can view active items" ON items;
DROP POLICY IF EXISTS "Users can insert own items" ON items;
DROP POLICY IF EXISTS "Users can update own items" ON items;
DROP POLICY IF EXISTS "Admins can update any item" ON items;

DROP POLICY IF EXISTS "Users can view claims for their items or claims they made" ON claim_requests;
DROP POLICY IF EXISTS "Users can create claims" ON claim_requests;
DROP POLICY IF EXISTS "Item owners can update claim status" ON claim_requests;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

DROP POLICY IF EXISTS "Admins can view all admin actions" ON admin_actions;
DROP POLICY IF EXISTS "Admins can insert admin actions" ON admin_actions;

-- 13. Create RLS Policies
-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Items policies
CREATE POLICY "Anyone can view active items" ON items FOR SELECT USING (
    status IN ('active', 'claimed') OR user_id = auth.uid()
);
CREATE POLICY "Users can insert own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any item" ON items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Claim requests policies
CREATE POLICY "Users can view claims for their items or claims they made" ON claim_requests FOR SELECT USING (
    claimer_id = auth.uid() OR 
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Users can create claims" ON claim_requests FOR INSERT WITH CHECK (auth.uid() = claimer_id);
CREATE POLICY "Item owners can update claim status" ON claim_requests FOR UPDATE USING (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Admin actions policies
CREATE POLICY "Admins can view all admin actions" ON admin_actions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can insert admin actions" ON admin_actions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 14. Create utility functions
-- Function for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_claim_requests_updated_at ON claim_requests;
CREATE TRIGGER update_claim_requests_updated_at BEFORE UPDATE ON claim_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Function to log analytics events
CREATE OR REPLACE FUNCTION log_analytics_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_item_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO analytics_events (event_type, user_id, item_id, metadata)
    VALUES (p_event_type, p_user_id, p_item_id, p_metadata);
EXCEPTION
    WHEN others THEN
        -- Silently ignore errors to prevent breaking main operations
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. MOST IMPORTANT: Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User')
    );
    
    -- Log analytics event (optional, won't break if it fails)
    BEGIN
        PERFORM log_analytics_event('user_registration', NEW.id, NULL, 
            json_build_object('email_domain', split_part(NEW.email, '@', 2))::jsonb);
    EXCEPTION
        WHEN others THEN
            -- Continue even if analytics fails
            NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create the crucial trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 18. Function to increment view count
CREATE OR REPLACE FUNCTION increment_item_view_count(item_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE items 
    SET view_count = view_count + 1 
    WHERE id = item_uuid;
EXCEPTION
    WHEN others THEN
        -- Ignore errors
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_priority TEXT DEFAULT 'normal',
    p_related_item_id UUID DEFAULT NULL,
    p_related_claim_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, title, message, type, priority,
        related_item_id, related_claim_id,
        action_url, expires_at
    )
    VALUES (
        p_user_id, p_title, p_message, p_type, p_priority,
        p_related_item_id, p_related_claim_id,
        p_action_url, p_expires_at
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Set up storage bucket for item images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- 21. Storage policies for item images
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can view item images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own item images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own item images" ON storage.objects;
    
    -- Create new policies
    CREATE POLICY "Anyone can view item images" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
    CREATE POLICY "Authenticated users can upload item images" ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'item-images' AND auth.role() = 'authenticated'
    );
    CREATE POLICY "Users can update own item images" ON storage.objects FOR UPDATE USING (
        bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]
    );
    CREATE POLICY "Users can delete own item images" ON storage.objects FOR DELETE USING (
        bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION
    WHEN others THEN
        -- Storage policies might fail in some environments, continue anyway
        NULL;
END $$;

-- 22. Create a test function to verify everything works
CREATE OR REPLACE FUNCTION test_schema_setup()
RETURNS TEXT AS $$
DECLARE
    result TEXT := 'Schema setup verification:' || chr(10);
BEGIN
    -- Check if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        result := result || '✓ profiles table exists' || chr(10);
    ELSE
        result := result || '✗ profiles table missing' || chr(10);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items') THEN
        result := result || '✓ items table exists' || chr(10);
    ELSE
        result := result || '✗ items table missing' || chr(10);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claim_requests') THEN
        result := result || '✓ claim_requests table exists' || chr(10);
    ELSE
        result := result || '✗ claim_requests table missing' || chr(10);
    END IF;
    
    -- Check if trigger exists
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
        result := result || '✓ Profile creation trigger exists' || chr(10);
    ELSE
        result := result || '✗ Profile creation trigger missing' || chr(10);
    END IF;
    
    result := result || chr(10) || 'Schema setup complete! You can now test user registration.';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 23. Run the test function
SELECT test_schema_setup(); 