-- ============================================================
-- supabase_docx_fidelity.sql
-- DOCX Fidelity Engine — Database Migration
--
-- Run in Supabase SQL Editor (Project > SQL Editor > New query)
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

-- 1. Add DOCX parse result column (HTML string from mammoth.js)
ALTER TABLE laporan_bulanan
  ADD COLUMN IF NOT EXISTS docx_html TEXT DEFAULT NULL;

-- 2. Add DOCX metadata column (JSON: fonts, margins, validation)
ALTER TABLE laporan_bulanan
  ADD COLUMN IF NOT EXISTS docx_meta JSONB DEFAULT NULL;

-- 3. Add layout preserve toggle column (default ON)
ALTER TABLE laporan_bulanan
  ADD COLUMN IF NOT EXISTS preserve_layout BOOLEAN DEFAULT TRUE;

-- 4. GIN index for fast metadata queries (e.g. filter by font warnings)
CREATE INDEX IF NOT EXISTS idx_laporan_docx_meta
  ON laporan_bulanan USING gin(docx_meta)
  WHERE docx_meta IS NOT NULL;

-- 5. Column documentation
COMMENT ON COLUMN laporan_bulanan.docx_html IS
  'HTML hasil parse mammoth.js dari file .docx — digunakan untuk preview WYSIWYG dan tab Edit';

COMMENT ON COLUMN laporan_bulanan.docx_meta IS
  'Metadata DOCX: { fonts[], unsupportedFonts[], hasImages, hasTables, paragraphCount, tableCount, imageCount, warnings[], sizeMb, parsedAt }';

COMMENT ON COLUMN laporan_bulanan.preserve_layout IS
  'Toggle "Preserve Original Layout" — jika TRUE, CSS style lock aktif di preview dan editor';

-- 6. Verify migration success
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'laporan_bulanan'
  AND column_name IN ('docx_html', 'docx_meta', 'preserve_layout')
ORDER BY column_name;
