-- Create the items table that matches the backend code expectations
-- This replaces the separate lost_items and found_items tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Categories table (if not exists)
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

-- Locations table (if not exists)
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

-- Single items table for both lost and found items
CREATE TABLE IF NOT EXISTS public.items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- electronics, bags, jewelry, etc.
    location VARCHAR(100) NOT NULL, -- location name as string
    images TEXT[] DEFAULT '{}', -- array of image URLs
    reward INTEGER DEFAULT 0, -- reward amount
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
    type VARCHAR(10) NOT NULL CHECK (type IN ('lost', 'found')),
    date_lost DATE, -- when item was lost/found
    time_lost VARCHAR(10), -- time as string (HH:MM format)
    contact_preference VARCHAR(20) DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'resolved', 'archived')),
    view_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    moderation_status VARCHAR(20) DEFAULT 'pending',
    moderated_at TIMESTAMPTZ,
    moderated_by UUID REFERENCES public.profiles(id),
    moderation_notes TEXT,
    search_vector TSVECTOR,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim requests table
CREATE TABLE IF NOT EXISTS public.claim_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    claimer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

-- Items policies
DROP POLICY IF EXISTS "Anyone can view active items" ON public.items;
CREATE POLICY "Anyone can view active items" ON public.items FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users can create items" ON public.items;
CREATE POLICY "Users can create items" ON public.items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own items" ON public.items;
CREATE POLICY "Users can update own items" ON public.items FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage items" ON public.items;
CREATE POLICY "Service role can manage items" ON public.items FOR ALL USING (auth.role() = 'service_role');

-- Claim requests policies
DROP POLICY IF EXISTS "Users can view claims for their items" ON public.claim_requests;
CREATE POLICY "Users can view claims for their items" ON public.claim_requests FOR SELECT USING (
    auth.uid() = claimer_id OR 
    auth.uid() IN (SELECT user_id FROM public.items WHERE id = item_id)
);

DROP POLICY IF EXISTS "Users can create claim requests" ON public.claim_requests;
CREATE POLICY "Users can create claim requests" ON public.claim_requests FOR INSERT WITH CHECK (auth.uid() = claimer_id);

DROP POLICY IF EXISTS "Service role can manage claims" ON public.claim_requests;
CREATE POLICY "Service role can manage claims" ON public.claim_requests FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
GRANT ALL ON public.claim_requests TO authenticated;
GRANT ALL ON public.claim_requests TO service_role;

-- Insert default categories if they don't exist
INSERT INTO public.categories (name, description, icon, color) VALUES
('electronics', 'Phones, laptops, tablets, chargers', 'smartphone', '#3B82F6'),
('bags', 'Backpacks, purses, wallets', 'briefcase', '#10B981'),
('jewelry', 'Rings, necklaces, watches', 'watch', '#F59E0B'),
('clothing', 'Jackets, shoes, accessories', 'shirt', '#EF4444'),
('personal', 'Keys, ID cards, documents', 'key', '#8B5CF6'),
('books', 'Textbooks, notebooks, stationery', 'book', '#06B6D4'),
('sports', 'Equipment, gear, accessories', 'activity', '#84CC16'),
('other', 'Miscellaneous items', 'help-circle', '#6B7280')
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON public.items(type);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at);
CREATE INDEX IF NOT EXISTS idx_claim_requests_item_id ON public.claim_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_claimer_id ON public.claim_requests(claimer_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_claim_requests_updated_at ON public.claim_requests;
CREATE TRIGGER update_claim_requests_updated_at BEFORE UPDATE ON public.claim_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 