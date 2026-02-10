# Solusi Lengkap Upload Error

## Masalah
Error "Bucket not found" saat upload gambar di **Laporan Kegiatan** (Policy Brief Editor) bagian Lampiran/Dokumentasi.

## Akar Masalah
Aplikasi membutuhkan **4 bucket** di Supabase:
1. ✅ `logos` - Logo kop surat (sudah dibuat)
2. ✅ `report-images` - Gambar di editor Laporan Bulanan (sudah dibuat)
3. ✅ `report-files` - File lampiran Laporan Bulanan (sudah dibuat)
4. ❌ `policy-brief-files` - **File di Laporan Kegiatan (BELUM DIBUAT) ← ini yang error**

##Solusi PASTI BERHASIL

### Langkah 1: Jalankan SQL Ini
Buka Supabase SQL Editor dan jalankan file:
**`supabase_policy_brief_storage.sql`**

File ini membuat:
- Bucket `policy-brief-files`
- Table `policy_brief_attachments`  
- Policies yang mengizinkan public access

### Langkah 2: Verifikasi di Supabase
1. **Storage** → Pastikan ada 4 buckets:
   - `logos`
   - `report-images`
   - `report-files`
   - `policy-brief-files` ← **BARU**

2. **Table Editor** → Pastikan ada 3 tables:
   - `report_attachments`
   - `policy_brief_attachments` ← **BARU**
   - `policy_briefs`

### Langkah 3: Test Upload
1. **Refresh halaman** aplikasi HORAS-IM (CTRL+F5)
2. Buka **Laporan Kegiatan** 
3. Scroll ke bagian **D. Lampiran** → **9. Lampiran / Dokumentasi**
4. Klik area upload (kotak dengan ikon foto)
5. Pilih file JPG/PNG

**Expected Result:**
- ✅ Notifikasi hijau "File berhasil diupload"
- ✅ File muncul di daftar lampiran
- ✅ File tersimpan di Supabase storage bucket `policy-brief-files`

## Troubleshooting
Jika masih error setelah langkah di atas:
1. Pastikan SQL berhasil (cek "Success. No rows returned")
2. Hard refresh browser (CTRL+SHIFT+R)
3. Cek browser console untuk error lain (F12 → Console tab)
