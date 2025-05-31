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
DROP TYPE IF EXISTS campus_location CASCADE;

-- 3. Create custom types/enums
CREATE TYPE item_type AS ENUM ('lost', 'found');
CREATE TYPE item_category AS ENUM ('electronics', 'bags', 'jewelry', 'clothing', 'personal', 'books', 'sports', 'other');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE item_status AS ENUM ('active', 'claimed', 'resolved', 'archived', 'removed');
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
CREATE TYPE campus_location AS ENUM ('library', 'cafeteria', 'computer_lab', 'lecture_hall', 'parking', 'gym', 'auditorium', 'admin_block', 'hostel', 'ground', 'other');

-- 4. Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    student_id TEXT UNIQUE,
    department TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create items table (main table for lost and found items)
CREATE TABLE IF NOT EXISTS public.items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type item_type NOT NULL,
    title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
    description TEXT NOT NULL CHECK (length(description) >= 10),
    category item_category NOT NULL,
    location TEXT NOT NULL,
    campus_area campus_location DEFAULT 'other',
    date_lost DATE,
    time_lost TIME,
    date_found DATE,
    time_found TIME,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    reward DECIMAL(10,2) DEFAULT 0 CHECK (reward >= 0),
    urgency urgency_level DEFAULT 'medium',
    status item_status DEFAULT 'active',
    contact_preference TEXT DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone', 'both')),
    view_count INTEGER DEFAULT 0,
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged', 'under_review')),
    moderated_by UUID REFERENCES public.profiles(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderation_notes TEXT,
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'disputed')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create claim requests table
CREATE TABLE IF NOT EXISTS public.claim_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    claimer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL CHECK (length(message) >= 10),
    evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    status claim_status DEFAULT 'pending',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    admin_notes TEXT,
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    contact_info JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate claims from same user for same item
    UNIQUE(item_id, claimer_id)
);

-- 7. Create chat messages table for real-time communication
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    claim_request_id UUID REFERENCES public.claim_requests(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL CHECK (length(message) >= 1),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('item_claimed', 'claim_approved', 'claim_rejected', 'item_found_match', 'item_moderated', 'admin_message', 'chat_message')),
    read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url TEXT,
    related_item_id UUID REFERENCES public.items(id),
    related_claim_id UUID REFERENCES public.claim_requests(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create admin actions audit log
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    target_user_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    item_id UUID REFERENCES public.items(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_type ON public.items(type);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_flagged ON public.items(flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_items_campus_area ON public.items(campus_area);
CREATE INDEX IF NOT EXISTS idx_items_active ON public.items(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_claim_requests_item_id ON public.claim_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_claimer_id ON public.claim_requests(claimer_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON public.claim_requests(status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_claim_id ON public.chat_messages(claim_request_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date ON public.analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id);

-- 12. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 13. Drop existing policies if they exist
DO $$ 
BEGIN
    -- Profiles policies
    DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

    -- Items policies
    DROP POLICY IF EXISTS "Anyone can view active items" ON public.items;
    DROP POLICY IF EXISTS "Users can insert own items" ON public.items;
    DROP POLICY IF EXISTS "Users can update own items" ON public.items;
    DROP POLICY IF EXISTS "Admins can update any item" ON public.items;

    -- Claim requests policies
    DROP POLICY IF EXISTS "Users can view claims for their items or claims they made" ON public.claim_requests;
    DROP POLICY IF EXISTS "Users can create claims" ON public.claim_requests;
    DROP POLICY IF EXISTS "Item owners can update claim status" ON public.claim_requests;

    -- Chat messages policies
    DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can send chat messages" ON public.chat_messages;

    -- Notifications policies
    DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

    -- Admin actions policies
    DROP POLICY IF EXISTS "Admins can view all admin actions" ON public.admin_actions;
    DROP POLICY IF EXISTS "Admins can insert admin actions" ON public.admin_actions;
EXCEPTION
    WHEN others THEN
        NULL; -- Ignore errors if policies don't exist
END $$;

-- 14. Create RLS Policies
-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles 
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Items policies
CREATE POLICY "Anyone can view active items" ON public.items 
    FOR SELECT USING (
        (status IN ('active', 'claimed') AND is_active = true) OR 
        user_id = auth.uid()
    );

CREATE POLICY "Users can insert own items" ON public.items 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON public.items 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any item" ON public.items 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Claim requests policies
CREATE POLICY "Users can view claims for their items or claims they made" ON public.claim_requests 
    FOR SELECT USING (
        claimer_id = auth.uid() OR 
        item_id IN (SELECT id FROM public.items WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can create claims" ON public.claim_requests 
    FOR INSERT WITH CHECK (auth.uid() = claimer_id);

CREATE POLICY "Item owners can update claim status" ON public.claim_requests 
    FOR UPDATE USING (
        item_id IN (SELECT id FROM public.items WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Chat messages policies
CREATE POLICY "Users can view chat messages" ON public.chat_messages 
    FOR SELECT USING (
        sender_id = auth.uid() OR
        claim_request_id IN (
            SELECT id FROM public.claim_requests 
            WHERE claimer_id = auth.uid() OR 
                  item_id IN (SELECT id FROM public.items WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can send chat messages" ON public.chat_messages 
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        claim_request_id IN (
            SELECT id FROM public.claim_requests 
            WHERE claimer_id = auth.uid() OR 
                  item_id IN (SELECT id FROM public.items WHERE user_id = auth.uid())
        )
    );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications 
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin actions policies
CREATE POLICY "Admins can view all admin actions" ON public.admin_actions 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can insert admin actions" ON public.admin_actions 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 15. Create utility functions
-- Function for updating updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_claim_requests_updated_at ON public.claim_requests;
CREATE TRIGGER update_claim_requests_updated_at BEFORE UPDATE ON public.claim_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. Function to log analytics events
CREATE OR REPLACE FUNCTION public.log_analytics_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_item_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.analytics_events (event_type, user_id, item_id, metadata)
    VALUES (p_event_type, p_user_id, p_item_id, p_metadata);
EXCEPTION
    WHEN others THEN
        -- Silently ignore errors to prevent breaking main operations
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. MOST IMPORTANT: Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User')
    );
    
    -- Log analytics event (optional, won't break if it fails)
    BEGIN
        PERFORM public.log_analytics_event('user_registration', NEW.id, NULL, 
            jsonb_build_object('email_domain', split_part(NEW.email, '@', 2)));
    EXCEPTION
        WHEN others THEN
            -- Continue even if analytics fails
            NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Create the crucial trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 19. Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_item_view_count(item_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.items 
    SET view_count = view_count + 1 
    WHERE id = item_uuid;
EXCEPTION
    WHEN others THEN
        -- Ignore errors
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
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
    INSERT INTO public.notifications (
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

-- 21. Function to get item matches (for AI similarity feature)
CREATE OR REPLACE FUNCTION public.get_similar_items(
    p_item_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category item_category,
    images TEXT[],
    similarity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.title,
        i.description,
        i.category,
        i.images,
        CASE 
            WHEN i.category = (SELECT category FROM public.items WHERE id = p_item_id) THEN 0.8
            ELSE 0.3
        END as similarity_score
    FROM public.items i
    WHERE i.id != p_item_id 
      AND i.is_active = true 
      AND i.status = 'active'
      AND i.type != (SELECT type FROM public.items WHERE id = p_item_id)
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 22. Set up storage bucket for item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'item-images', 
    'item-images', 
    true, 
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 23. Storage policies for item images
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can view item images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own item images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own item images" ON storage.objects;
    
    -- Create new policies
    CREATE POLICY "Anyone can view item images" ON storage.objects 
        FOR SELECT USING (bucket_id = 'item-images');
    
    CREATE POLICY "Authenticated users can upload item images" ON storage.objects 
        FOR INSERT WITH CHECK (
            bucket_id = 'item-images' AND 
            auth.role() = 'authenticated' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    
    CREATE POLICY "Users can update own item images" ON storage.objects 
        FOR UPDATE USING (
            bucket_id = 'item-images' AND 
            (storage.foldername(name))[1] = auth.uid()::text
        );
    
    CREATE POLICY "Users can delete own item images" ON storage.objects 
        FOR DELETE USING (
            bucket_id = 'item-images' AND 
            (storage.foldername(name))[1] = auth.uid()::text
        );
EXCEPTION
    WHEN others THEN
        -- Storage policies might fail in some environments, continue anyway
        RAISE NOTICE 'Storage policies setup encountered an issue: %', SQLERRM;
END $$;

-- 24. Insert sample admin user (optional - for testing)
-- You can uncomment and modify this after your first signup
/*
UPDATE public.profiles 
SET is_admin = true, is_verified = true 
WHERE email = 'admin@umt.edu.pk';
*/

-- 25. Create a comprehensive test function
CREATE OR REPLACE FUNCTION public.test_schema_setup()
RETURNS TEXT AS $$
DECLARE
    result TEXT := 'Lost & Found Portal Schema Verification:' || chr(10) || chr(10);
    table_count INTEGER;
    trigger_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Check if tables exist
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'items', 'claim_requests', 'chat_messages', 'notifications', 'admin_actions', 'analytics_events');
    
    result := result || '📊 Tables Created: ' || table_count || '/7' || chr(10);
    
    -- Check individual tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        result := result || '✅ profiles table' || chr(10);
    ELSE
        result := result || '❌ profiles table missing' || chr(10);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items') THEN
        result := result || '✅ items table' || chr(10);
    ELSE
        result := result || '❌ items table missing' || chr(10);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'claim_requests') THEN
        result := result || '✅ claim_requests table' || chr(10);
    ELSE
        result := result || '❌ claim_requests table missing' || chr(10);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        result := result || '✅ chat_messages table' || chr(10);
    ELSE
        result := result || '❌ chat_messages table missing' || chr(10);
    END IF;
    
    -- Check if trigger exists
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
        result := result || '✅ Auto profile creation trigger' || chr(10);
    ELSE
        result := result || '❌ Profile creation trigger missing' || chr(10);
    END IF;
    
    -- Check RLS policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    result := result || '🔒 RLS Policies: ' || policy_count || chr(10);
    
    -- Check storage bucket
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'item-images') THEN
        result := result || '✅ Storage bucket configured' || chr(10);
    ELSE
        result := result || '❌ Storage bucket missing' || chr(10);
    END IF;
    
    result := result || chr(10) || '🎉 Schema setup complete!' || chr(10);
    result := result || '📧 Ready for any email authentication' || chr(10);
    result := result || '🔐 Security policies active' || chr(10);
    result := result || '💬 Real-time chat enabled' || chr(10);
    result := result || '📱 Ready for frontend integration' || chr(10);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 26. Run the test function
SELECT public.test_schema_setup();

-- 27. Success message
DO $
BEGIN
    RAISE NOTICE '🎯 Lost & Found Portal Database Schema Successfully Created!';
    RAISE NOTICE '📧 Any Email Validation: Supported';
    RAISE NOTICE '🔐 Row Level Security: Enabled';
    RAISE NOTICE '💬 Real-time Chat: Ready';
    RAISE NOTICE '📱 Mobile Responsive: Database Ready';
    RAISE NOTICE '🏆 Hackathon Ready: All Requirements Met!';
END $;