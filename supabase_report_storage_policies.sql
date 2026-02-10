-- Storage policies for report buckets
-- Run this AFTER the first SQL file (supabase_report_storage.sql)

-- ========== POLICIES FOR report-images BUCKET ==========

-- Policy: Allow public read access to report images
CREATE POLICY "Public Access to Report Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'report-images');

-- Policy: Allow authenticated users to upload report images
CREATE POLICY "Authenticated Upload Report Images" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'report-images' 
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update report images
CREATE POLICY "Authenticated Update Report Images" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'report-images' 
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete report images
CREATE POLICY "Authenticated Delete Report Images" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'report-images' 
    AND auth.role() = 'authenticated'
);

-- ========== POLICIES FOR report-files BUCKET ==========

-- Policy: Allow public read access to report files
CREATE POLICY "Public Access to Report Files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'report-files');

-- Policy: Allow authenticated users to upload report files
CREATE POLICY "Authenticated Upload Report Files" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'report-files' 
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update report files
CREATE POLICY "Authenticated Update Report Files" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'report-files' 
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete report files
CREATE POLICY "Authenticated Delete Report Files" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'report-files' 
    AND auth.role() = 'authenticated'
);
