-- FIX: Storage policies allowing ANON access for report buckets
-- Run this to fix "bucket not found" / upload denied errors

-- First, drop existing restrictive policies if they exist
DO $$
BEGIN
    -- Drop existing policies for report-images if exist
    DROP POLICY IF EXISTS "Public Access to Report Images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload Report Images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Update Report Images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Delete Report Images" ON storage.objects;
    
    -- Drop existing policies for report-files if exist
    DROP POLICY IF EXISTS "Public Access to Report Files" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload Report Files" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Update Report Files" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Delete Report Files" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors if policies don't exist
END $$;

-- ========== PERMISSIVE POLICIES FOR report-images BUCKET ==========

-- Allow EVERYONE to read report images
CREATE POLICY "Allow Public Read Report Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'report-images');

-- Allow EVERYONE to upload report images (for development/testing)
CREATE POLICY "Allow Public Upload Report Images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'report-images');

-- Allow EVERYONE to update report images
CREATE POLICY "Allow Public Update Report Images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'report-images');

-- Allow EVERYONE to delete report images
CREATE POLICY "Allow Public Delete Report Images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'report-images');

-- ========== PERMISSIVE POLICIES FOR report-files BUCKET ==========

-- Allow EVERYONE to read report files
CREATE POLICY "Allow Public Read Report Files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'report-files');

-- Allow EVERYONE to upload report files
CREATE POLICY "Allow Public Upload Report Files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'report-files');

-- Allow EVERYONE to update report files
CREATE POLICY "Allow Public Update Report Files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'report-files');

-- Allow EVERYONE to delete report files
CREATE POLICY "Allow Public Delete Report Files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'report-files');
