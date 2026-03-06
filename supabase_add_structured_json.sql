-- Migration: Tambah kolom structured_json untuk sistem parsing terstruktur (pages[] JSON)
-- Jalankan di Supabase SQL Editor

ALTER TABLE laporan_bulanan
ADD COLUMN IF NOT EXISTS structured_json JSONB DEFAULT NULL;

-- Tambah index untuk kolom baru (optional tapi direkomendasikan untuk performa)
CREATE INDEX IF NOT EXISTS idx_laporan_bulanan_structured_json
ON laporan_bulanan USING GIN (structured_json)
WHERE structured_json IS NOT NULL;

-- Comments untuk dokumentasi
COMMENT ON COLUMN laporan_bulanan.structured_json IS
'Structured pages[] JSON format v3.0. Single source of truth untuk preview, edit, dan export.
Format: { version: "3.0", pages: [{ pageNumber, orientation, margin, header, footer, content: [...] }] }';

-- Verifikasi kolom berhasil ditambahkan
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'laporan_bulanan'
  AND column_name IN ('structured_json', 'docx_html', 'docx_meta', 'content_json');
