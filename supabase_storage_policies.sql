-- Storage policies for logos bucket
-- Run this AFTER the first SQL file

-- Policy: Allow public read access to logos
CREATE POLICY "Public Access to Logos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'logos');

-- Policy: Allow authenticated users to upload logos
CREATE POLICY "Authenticated Upload Logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'logos' 
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update logos
CREATE POLICY "Authenticated Update Logos" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'logos' 
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete logos
CREATE POLICY "Authenticated Delete Logos" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'logos' 
    AND auth.role() = 'authenticated'
);
