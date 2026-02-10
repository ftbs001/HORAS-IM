-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create logos metadata table
CREATE TABLE IF NOT EXISTS public.logos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_url TEXT,
    width_cm DECIMAL(5,2) DEFAULT 2.2,
    height_cm DECIMAL(5,2) DEFAULT 2.2,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_logos_is_active ON public.logos(is_active);
CREATE INDEX IF NOT EXISTS idx_logos_is_default ON public.logos(is_default);

-- Enable RLS on logos table
ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to logos metadata
CREATE POLICY "Public Read Logos Metadata" 
ON public.logos FOR SELECT 
USING (true);

-- Policy: Allow authenticated users to insert logos
CREATE POLICY "Authenticated Insert Logos" 
ON public.logos FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update logos
CREATE POLICY "Authenticated Update Logos Metadata" 
ON public.logos FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete logos
CREATE POLICY "Authenticated Delete Logos Metadata" 
ON public.logos FOR DELETE 
USING (auth.role() = 'authenticated');
