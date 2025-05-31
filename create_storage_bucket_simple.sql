-- Create storage bucket for item images (simplified version)
-- Run this in the Supabase SQL Editor

-- First, create the bucket (this should work with standard permissions)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];

-- Note: If you get permission errors for the policies below, 
-- you can set them up through the Supabase Dashboard instead:
-- Go to Storage > Policies in your Supabase dashboard

-- Try to create basic policies (may require admin privileges)
-- If these fail, skip them and use the dashboard method
DO $$
BEGIN
  -- Policy for users to upload their own images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can upload their own images'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload their own images" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = ''item-images'' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    )';
  END IF;

  -- Policy for users to view all images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can view all images'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view all images" ON storage.objects
    FOR SELECT USING (bucket_id = ''item-images'')';
  END IF;

  -- Policy for users to update their own images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can update their own images'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own images" ON storage.objects
    FOR UPDATE USING (
      bucket_id = ''item-images'' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    )';
  END IF;

  -- Policy for users to delete their own images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can delete their own images'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (
      bucket_id = ''item-images'' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    )';
  END IF;

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to create storage policies. Please create them manually in the Supabase Dashboard.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage policies: %. Please create them manually in the Supabase Dashboard.', SQLERRM;
END $$; 