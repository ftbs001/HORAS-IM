-- ============================================================
-- HORAS-IM: SQL Fix - Hapus Data Seksi Duplikat
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ---- STEP 1: Lihat kondisi saat ini ----
-- Jalankan query ini dulu untuk melihat duplikat:
-- SELECT name, COUNT(*) as jumlah FROM sections GROUP BY name ORDER BY name;

-- ---- STEP 2: Hapus duplikat, pertahankan ID terkecil per nama ----
DELETE FROM sections
WHERE id NOT IN (
    SELECT MIN(id)
    FROM sections
    GROUP BY name
);

-- ---- STEP 3: Verifikasi hasil ----
SELECT id, name, alias, urutan_penggabungan
FROM sections
ORDER BY id;

-- ---- STEP 4: Pastikan urutan benar ----
UPDATE sections SET urutan_penggabungan = 1 WHERE name ILIKE '%inteldakim%';
UPDATE sections SET urutan_penggabungan = 2 WHERE name ILIKE '%lalintalkim%';
UPDATE sections SET urutan_penggabungan = 3 WHERE name ILIKE '%tikim%';
UPDATE sections SET urutan_penggabungan = 4 WHERE (name ILIKE '%tata usaha%' OR name ILIKE '%fasilitatif%');

-- ---- STEP 5: Perbaiki referensi app_users yang punya seksi_id tidak valid ----
-- (Bila ada user yg seksi_id-nya mengarah ke baris duplikat yg sudah dihapus, 
--  sinkronkan ke ID yang tersisa)
UPDATE app_users u
SET seksi_id = (
    SELECT MIN(s.id) FROM sections s WHERE s.name = (
        SELECT s2.name FROM sections s2 WHERE s2.id = u.seksi_id LIMIT 1
    )
)
WHERE seksi_id NOT IN (SELECT id FROM sections);

-- ---- STEP 6: Hasil akhir ----
SELECT COUNT(*) as total_seksi FROM sections;
-- Harus menampilkan 4
