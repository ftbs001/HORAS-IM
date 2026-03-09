-- ============================================================
-- FIX: Allow UPDATE on sections table for anon users
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- Aktifkan RLS di tabel sections
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Tambahkan policy untuk mengizinkan UPDATE bagi semua pengguna
-- (Karena aplikasi menggunakan custom auth internal)
DROP POLICY IF EXISTS "allow_update_sections" ON sections;
CREATE POLICY "allow_update_sections"
  ON sections FOR UPDATE
  USING (true);

-- Pastikan policy SELECT juga tersedia jika belum ada
DROP POLICY IF EXISTS "allow_select_sections" ON sections;
CREATE POLICY "allow_select_sections"
  ON sections FOR SELECT
  USING (true);

-- Verifikasi policy yang dibuat
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'sections';
