-- ============================================================
-- HORAS-IM: Image-Safe Export — Database Schema Update
-- ============================================================
-- Jalankan di Supabase SQL Editor
-- Menambahkan kolom content_json ke tabel laporan_bulanan
-- agar gambar dapat disimpan permanen sebagai base64 JSONB
-- ============================================================

-- 1. Tambah kolom ke laporan_bulanan
ALTER TABLE laporan_bulanan
    ADD COLUMN IF NOT EXISTS content_json      JSONB    DEFAULT '{"version":"2.0","blocks":[]}',
    ADD COLUMN IF NOT EXISTS image_count       INTEGER  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS images_validated  BOOLEAN  DEFAULT FALSE;

-- 2. GIN index untuk query cepat pada content_json
CREATE INDEX IF NOT EXISTS idx_laporan_content_json
    ON laporan_bulanan USING GIN (content_json);

-- 3. Fungsi helper untuk menghitung image_count otomatis dari content_json
CREATE OR REPLACE FUNCTION update_image_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.image_count := (
        SELECT COUNT(*)
        FROM jsonb_array_elements(COALESCE(NEW.content_json->'blocks', '[]'::jsonb)) AS block
        WHERE block->>'type' = 'image'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger: update image_count setiap kali content_json berubah
DROP TRIGGER IF EXISTS trg_laporan_image_count ON laporan_bulanan;
CREATE TRIGGER trg_laporan_image_count
    BEFORE INSERT OR UPDATE OF content_json ON laporan_bulanan
    FOR EACH ROW EXECUTE FUNCTION update_image_count();

-- 5. Tabel log error gambar (admin panel)
DROP TABLE IF EXISTS image_error_logs;

CREATE TABLE image_error_logs (
    id            BIGSERIAL PRIMARY KEY,
    laporan_id    BIGINT REFERENCES laporan_bulanan(id) ON DELETE CASCADE,
    seksi_id      INTEGER,
    image_id      TEXT NOT NULL,
    error_type    TEXT NOT NULL,  -- 'missing_base64', 'invalid_format', 'too_large', 'corrupt'
    error_message TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS untuk image_error_logs
ALTER TABLE image_error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_only_image_logs" ON image_error_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    );

-- 6. Update existing rows yang content_json-nya null ke default
UPDATE laporan_bulanan
SET content_json = '{"version":"2.0","blocks":[]}'::jsonb
WHERE content_json IS NULL;

-- SELESAI
-- Kolom content_json siap digunakan oleh imageUploadService.js
