-- Create storage bucket for report images (in editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for report files/attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-files', 'report-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create report_attachments table for storing file metadata
CREATE TABLE IF NOT EXISTS public.report_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_key VARCHAR(255) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    public_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_attachments_section ON public.report_attachments(section_key);

-- Enable RLS on report_attachments table
ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Public Read Report Attachments" 
ON public.report_attachments FOR SELECT 
USING (true);

-- Policy: Allow authenticated users to insert
CREATE POLICY "Authenticated Insert Report Attachments" 
ON public.report_attachments FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update
CREATE POLICY "Authenticated Update Report Attachments" 
ON public.report_attachments FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete
CREATE POLICY "Authenticated Delete Report Attachments" 
ON public.report_attachments FOR DELETE 
USING (auth.role() = 'authenticated');
