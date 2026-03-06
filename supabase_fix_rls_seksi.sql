-- ============================================================
-- FIX: RLS Policy + Sinkronisasi seksi_id untuk laporan_bulanan
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── LANGKAH 1: Cek apakah RLS aktif ─────────────────────────
-- Jalankan ini dulu untuk diagnosa:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('laporan_bulanan', 'sections', 'app_users', 'activity_logs');

-- ── LANGKAH 2: Cek policies yang ada ─────────────────────────
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename IN ('laporan_bulanan', 'sections')
ORDER BY tablename, policyname;

-- ── LANGKAH 3: Cek data sections yang ada ────────────────────
SELECT id, name, alias, urutan_penggabungan FROM sections ORDER BY id;

-- ── LANGKAH 4: Cek apakah ada laporan yang seksi_id-nya tidak ada di sections ──
SELECT lb.id, lb.seksi_id, lb.judul_laporan, lb.status, lb.bulan, lb.tahun
FROM laporan_bulanan lb
LEFT JOIN sections s ON lb.seksi_id = s.id
WHERE s.id IS NULL;

-- ── LANGKAH 5: Lihat semua laporan yang ada ──────────────────
SELECT id, seksi_id, bulan, tahun, status, judul_laporan, file_name, submitted_at
FROM laporan_bulanan
ORDER BY tahun DESC, bulan DESC;

-- ============================================================
-- FIX RLS: Izinkan akses ke laporan_bulanan, sections, activity_logs
-- untuk semua request (karena aplikasi pakai custom auth, bukan Supabase Auth)
-- ============================================================

-- Nonaktifkan RLS untuk tabel yang digunakan app (PILIH SALAH SATU opsi di bawah)

-- OPSI A: Nonaktifkan RLS sepenuhnya (lebih simpel, cocok untuk app internal)
ALTER TABLE laporan_bulanan DISABLE ROW LEVEL SECURITY;
ALTER TABLE sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- OPSI B (Alternatif — jika ingin tetap pakai RLS):
-- Tambahkan policy yang mengizinkan semua akses via anon key
-- (Ini HANYA untuk app internal, JANGAN pakai di app publik)
/*
-- Hapus policies lama dulu jika ada
DROP POLICY IF EXISTS "Allow all laporan_bulanan" ON laporan_bulanan;
DROP POLICY IF EXISTS "Allow all sections" ON sections;
DROP POLICY IF EXISTS "Allow all activity_logs" ON activity_logs;

-- Buat policy baru yang mengizinkan semua operasi
CREATE POLICY "Allow all laporan_bulanan" ON laporan_bulanan
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all sections" ON sections
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all activity_logs" ON activity_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Aktifkan RLS (harus aktif untuk policy berlaku)
ALTER TABLE laporan_bulanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
*/

-- ============================================================
-- FIX SECTIONS: Pastikan semua seksi ada dengan ID yang benar
-- ============================================================

-- Cek dulu apakah seksi Tikim ada:
SELECT id, name, alias FROM sections WHERE name ILIKE '%tikim%' OR alias ILIKE '%tikim%';

-- Jika tabel sections kosong atau seksi_id tidak sesuai,
-- insert data sections yang sesuai dengan akun fallback di AuthContext:
-- (Hardcoded accounts: seksiId 1=Inteldakim, 2=Lalintalkim, 3=Tikim, 4=TU)

INSERT INTO sections (id, name, alias, urutan_penggabungan)
VALUES
    (1, 'Seksi Inteldakim',    'inteldakim', 1),
    (2, 'Seksi Lalintalkim',   'lalintalkim', 2),
    (3, 'Seksi Tikim',         'tikim',       3),
    (4, 'Subbag Tata Usaha',   'tu',          4)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    alias = EXCLUDED.alias,
    urutan_penggabungan = EXCLUDED.urutan_penggabungan;

-- ============================================================
-- VERIFIKASI SETELAH FIX
-- ============================================================

-- Konfirmasi sections sudah benar:
SELECT id, name, alias, urutan_penggabungan FROM sections ORDER BY urutan_penggabungan;

-- Konfirmasi laporan bisa dibaca:
SELECT COUNT(*) as total_laporan FROM laporan_bulanan;

-- Cek laporan dengan seksi_id yang sekarang cocok:
SELECT lb.seksi_id, s.name as seksi_name, lb.status, lb.bulan, lb.tahun
FROM laporan_bulanan lb
LEFT JOIN sections s ON lb.seksi_id = s.id
ORDER BY lb.tahun DESC, lb.bulan DESC;
