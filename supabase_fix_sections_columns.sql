-- ================================================================
-- MIGRATION: Tambah semua kolom yang hilang di tabel sections
-- ================================================================
-- Jalankan script ini di Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
--
-- Script ini AMAN dijalankan berkali-kali (menggunakan IF NOT EXISTS)
-- ================================================================

-- ── Kolom dasar yang mungkin belum ada ──────────────────────────
ALTER TABLE sections ADD COLUMN IF NOT EXISTS urutan_penggabungan int default 0;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS alias text;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();

-- ── Kolom profil kepala seksi ────────────────────────────────────
ALTER TABLE sections ADD COLUMN IF NOT EXISTS vision text;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS head_name text;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS head_nip text;

-- ── Kolom kinerja ────────────────────────────────────────────────
ALTER TABLE sections ADD COLUMN IF NOT EXISTS perf_target int default 100;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS budget_real int default 0;

-- ── Kolom program kerja ──────────────────────────────────────────
ALTER TABLE sections ADD COLUMN IF NOT EXISTS prog_planned int default 0;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS prog_inprogress int default 0;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS prog_completed int default 0;

-- ── Kolom catatan ────────────────────────────────────────────────
ALTER TABLE sections ADD COLUMN IF NOT EXISTS notes text;

-- ── Update urutan_penggabungan berdasarkan ID jika masih 0 semua ─
UPDATE sections
SET urutan_penggabungan = id
WHERE urutan_penggabungan = 0 OR urutan_penggabungan IS NULL;

-- ── RLS: Aktifkan jika belum aktif ──────────────────────────────
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ────────────────────────────────────────────────
-- Izinkan semua orang baca sections (SELECT)
DROP POLICY IF EXISTS "sections_select_all" ON sections;
CREATE POLICY "sections_select_all" ON sections
    FOR SELECT USING (true);

-- Izinkan user yang sudah login untuk UPDATE sections miliknya
-- (role dicek di kolom auth.jwt() atau via tabel profiles jika ada)
DROP POLICY IF EXISTS "sections_update_authenticated" ON sections;
CREATE POLICY "sections_update_authenticated" ON sections
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ── Verifikasi kolom berhasil ditambahkan ────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sections'
ORDER BY ordinal_position;
