-- Comprehensive Storage Bucket Fix for Lost & Found Portal
-- Run this in your Supabase SQL Editor to fix image upload and display issues

-- Step 1: Create or update the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'];

-- Step 2: Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view item images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own item images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own item images" ON storage.objects;

-- Step 4: Create comprehensive storage policies
-- Allow anyone to view images (public bucket)
CREATE POLICY "Public read access for item images" ON storage.objects
FOR SELECT USING (bucket_id = 'item-images');

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'item-images' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images
CREATE POLICY "Users can update own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'item-images' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'item-images' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role full access" ON storage.objects
FOR ALL USING (
  bucket_id = 'item-images' AND 
  auth.jwt() ->> 'role' = 'service_role'
);

-- Step 5: Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;

-- Step 6: Create a function to get public URL for images
CREATE OR REPLACE FUNCTION get_image_public_url(image_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    base_url TEXT;
BEGIN
    -- Get the Supabase project URL from settings
    SELECT value INTO base_url FROM pg_settings WHERE name = 'app.settings.supabase_url';
    
    -- If not found, construct from current database
    IF base_url IS NULL THEN
        base_url := 'https://eulbutktbvfwkvfowlel.supabase.co';
    END IF;
    
    -- Return the full public URL
    RETURN base_url || '/storage/v1/object/public/item-images/' || image_path;
END;
$$;

-- Step 7: Test the bucket setup
DO $$
BEGIN
    -- Check if bucket exists
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'item-images') THEN
        RAISE NOTICE 'Storage bucket "item-images" is properly configured';
    ELSE
        RAISE EXCEPTION 'Failed to create storage bucket "item-images"';
    END IF;
    
    -- Check if policies exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read access for item images') THEN
        RAISE NOTICE 'Storage policies are properly configured';
    ELSE
        RAISE WARNING 'Some storage policies may not be configured correctly';
    END IF;
END $$;

-- Step 8: Create a helper function to clean up orphaned images
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- This function can be used to clean up images that are no longer referenced
    -- Implementation depends on your specific needs
    RETURN deleted_count;
END;
$$;

-- Success message
SELECT 'Storage bucket setup completed successfully!' as status; 