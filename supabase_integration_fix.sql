-- ============================================================
-- HORAS-IM: Integration Fix SQL v2 (FIXED)
-- Jalankan SELURUH file ini di Supabase SQL Editor
-- ============================================================


-- ============================================================
-- STEP 1: Tambah kolom judul_laporan ke laporan_bulanan
-- ============================================================
ALTER TABLE laporan_bulanan
  ADD COLUMN IF NOT EXISTS judul_laporan TEXT;


-- ============================================================
-- STEP 2: Pastikan kolom content_json ada
-- ============================================================
ALTER TABLE laporan_bulanan
  ADD COLUMN IF NOT EXISTS content_json JSONB
    DEFAULT '{"version":"2.0","blocks":[]}'::jsonb;


-- ============================================================
-- STEP 3: Index tambahan untuk performa query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_laporan_bulan
  ON laporan_bulanan(bulan);

CREATE INDEX IF NOT EXISTS idx_laporan_tahun
  ON laporan_bulanan(tahun);

CREATE INDEX IF NOT EXISTS idx_laporan_updated_at
  ON laporan_bulanan(updated_at DESC);


-- ============================================================
-- STEP 4: Fungsi trigger untuk log setiap DELETE laporan_bulanan
-- ============================================================
CREATE OR REPLACE FUNCTION fn_log_laporan_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO activity_logs (
    user_name,
    action,
    entity_type,
    entity_id,
    detail,
    created_at
  ) VALUES (
    'system-trigger',
    'delete',
    'laporan_bulanan',
    OLD.id,
    'Laporan seksi_id=' || OLD.seksi_id::text
      || ' bulan=' || OLD.bulan::text
      || ' tahun=' || OLD.tahun::text
      || ' file=' || COALESCE(OLD.file_name, '-'),
    NOW()
  );
  RETURN OLD;
END;
$$;


-- ============================================================
-- STEP 5: Pasang trigger (drop dulu jika sudah ada)
-- ============================================================
DROP TRIGGER IF EXISTS trg_laporan_delete ON laporan_bulanan;

CREATE TRIGGER trg_laporan_delete
  AFTER DELETE ON laporan_bulanan
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_laporan_delete();


-- ============================================================
-- STEP 6: Pastikan RLS aktif dan ada policy yang benar
-- ============================================================
ALTER TABLE laporan_bulanan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_laporan_v2" ON laporan_bulanan;

CREATE POLICY "allow_all_laporan_v2"
  ON laporan_bulanan
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- STEP 7: Pastikan kolom urutan_penggabungan ada di sections
-- ============================================================
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS urutan_penggabungan INT DEFAULT 99;

UPDATE sections
  SET urutan_penggabungan = 1
  WHERE name ILIKE '%inteldakim%'
    AND (urutan_penggabungan IS NULL OR urutan_penggabungan = 99);

UPDATE sections
  SET urutan_penggabungan = 2
  WHERE name ILIKE '%lalintalkim%'
    AND (urutan_penggabungan IS NULL OR urutan_penggabungan = 99);

UPDATE sections
  SET urutan_penggabungan = 3
  WHERE name ILIKE '%tikim%'
    AND (urutan_penggabungan IS NULL OR urutan_penggabungan = 99);

UPDATE sections
  SET urutan_penggabungan = 4
  WHERE name ILIKE '%tata usaha%'
    AND (urutan_penggabungan IS NULL OR urutan_penggabungan = 99);


-- ============================================================
-- STEP 8: VIEW laporan_bulanan_full (JOIN dengan sections)
-- ============================================================
CREATE OR REPLACE VIEW laporan_bulanan_full AS
SELECT
  lb.id,
  lb.seksi_id,
  lb.bulan,
  lb.tahun,
  lb.judul_laporan,
  lb.file_name,
  lb.file_path,
  lb.file_url,
  lb.file_size,
  lb.file_type,
  lb.status,
  lb.catatan_revisi,
  lb.submitted_at,
  lb.submitted_by,
  lb.reviewed_by,
  lb.approved_at,
  lb.final_locked,
  lb.content_json,
  lb.created_at,
  lb.updated_at,
  s.name               AS seksi_name,
  s.alias              AS seksi_alias,
  s.urutan_penggabungan
FROM laporan_bulanan lb
JOIN sections s ON lb.seksi_id = s.id
ORDER BY
  lb.tahun DESC,
  lb.bulan DESC,
  s.urutan_penggabungan ASC;


-- ============================================================
-- STEP 9: VERIFIKASI — jalankan query ini untuk cek hasil
-- ============================================================

-- Cek kolom baru di laporan_bulanan:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'laporan_bulanan'
  AND column_name IN ('judul_laporan', 'content_json')
ORDER BY ordinal_position;

-- Cek trigger terpasang:
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'laporan_bulanan';

-- Cek view berhasil dibuat:
SELECT COUNT(*) AS total_laporan FROM laporan_bulanan_full;
