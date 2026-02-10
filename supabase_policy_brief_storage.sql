-- Create storage bucket for policy brief files/attachments
-- This is for the "Laporan Kegiatan" (Policy Brief Editor) upload feature

INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-brief-files', 'policy-brief-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy_brief_attachments table for storing file metadata
CREATE TABLE IF NOT EXISTS public.policy_brief_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id VARCHAR(255) NOT NULL,
    section_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    public_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_policy_brief_attachments_report ON public.policy_brief_attachments(report_id);
CREATE INDEX IF NOT EXISTS idx_policy_brief_attachments_section ON public.policy_brief_attachments(section_id);

-- Enable RLS on policy_brief_attachments table
ALTER TABLE public.policy_brief_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Public Read Policy Brief Attachments" 
ON public.policy_brief_attachments FOR SELECT 
USING (true);

-- Policy: Allow everyone to insert (for development/testing)
CREATE POLICY "Public Insert Policy Brief Attachments" 
ON public.policy_brief_attachments FOR INSERT 
WITH CHECK (true);

-- Policy: Allow everyone to update
CREATE POLICY "Public Update Policy Brief Attachments" 
ON public.policy_brief_attachments FOR UPDATE 
USING (true);

-- Policy: Allow everyone to delete
CREATE POLICY "Public Delete Policy Brief Attachments" 
ON public.policy_brief_attachments FOR DELETE 
USING (true);

-- ========== STORAGE POLICIES FOR policy-brief-files BUCKET ==========

-- Allow EVERYONE to read policy brief files
CREATE POLICY "Allow Public Read Policy Brief Files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'policy-brief-files');

-- Allow EVERYONE to upload policy brief files
CREATE POLICY "Allow Public Upload Policy Brief Files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'policy-brief-files');

-- Allow EVERYONE to update policy brief files
CREATE POLICY "Allow Public Update Policy Brief Files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'policy-brief-files');

-- Allow EVERYONE to delete policy brief files
CREATE POLICY "Allow Public Delete Policy Brief Files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'policy-brief-files');
