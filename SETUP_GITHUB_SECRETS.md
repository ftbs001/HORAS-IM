# 🔐 Setup GitHub Secrets - Langkah Terakhir!

> **Ini langkah PENTING agar keepalive bisa jalan!**

## ✅ Yang Sudah Dilakukan
- [x] Code sudah di-push ke GitHub
- [x] Workflow file sudah ada di `.github/workflows/supabase-keepalive.yml`

## 📝 Langkah Berikutnya: Tambahkan Secrets

### Langkah 1: Buka Repository Settings

1. Buka browser
2. Ke repository: **https://github.com/ftbs001/HORAS-IM**
3. Klik tab **"Settings"** (paling kanan atas)

### Langkah 2: Buka Menu Secrets

1. Di sidebar kiri, scroll ke bawah
2. Klik **"Secrets and variables"**
3. Klik **"Actions"**

### Langkah 3: Tambahkan Secret Pertama - SUPABASE_URL

1. Klik tombol hijau **"New repository secret"**
2. Isi form:
   - **Name:** (ketik persis seperti ini)
     ```
     VITE_SUPABASE_URL
     ```
   - **Secret:** (copy dari bawah ini)
     ```
     https://hbrlbecsbriiicsenlwi.supabase.co
     ```
3. Klik **"Add secret"**

### Langkah 4: Tambahkan Secret Kedua - SUPABASE_ANON_KEY

1. Klik **"New repository secret"** lagi
2. Isi form:
   - **Name:** (ketik persis seperti ini)
     ```
     VITE_SUPABASE_ANON_KEY
     ```
   - **Secret:** (copy dari bawah ini)
     ```
     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhicmxiZWNzYnJpaWljc2VubHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMDU5OTksImV4cCI6MjA4Mzc4MTk5OX0.XvcsjAEUYtBv2ahHHvsxEEXA8b76e0xZ-qMQAn_6yz4
     ```
3. Klik **"Add secret"**

### Langkah 5: Verifikasi

Anda seharusnya sekarang punya **2 secrets**:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

---

## 🚀 Langkah Terakhir: Test Workflow!

### Langkah 1: Buka Tab Actions

1. Masih di repository GitHub
2. Klik tab **"Actions"** (di atas, sebelah Pull requests)

### Langkah 2: Jalankan Workflow Manual

1. Di sidebar kiri, klik **"Supabase Keepalive"**
2. Anda akan lihat tombol **"Run workflow"** (kanan atas, dropdown hijau)
3. Klik dropdown **"Run workflow"**
4. Pilih branch: **main**
5. Klik tombol hijau **"Run workflow"**

### Langkah 3: Lihat Hasilnya

1. Refresh halaman (F5) setelah beberapa detik
2. Anda akan lihat workflow baru muncul:
   - Lingkaran kuning (🟡) = Sedang berjalan
   - Centang hijau (✅) = Berhasil!
   - X merah (❌) = Ada error

3. Klik pada workflow run untuk lihat detail
4. Klik job **"keepalive"**
5. Klik step **"Run keepalive heartbeat"**
6. Lihat log - harus ada tulisan: ✅ **"Keepalive successful"**

---

## 🎉 SELESAI!

Jika ada centang hijau ✅, berarti:

✅ Workflow berhasil terkoneksi ke Supabase  
✅ Keepalive akan jalan otomatis setiap 5 hari  
✅ Supabase project tidak akan di-pause lagi  
✅ Aplikasi HORAS-IM aman!  

---

## 📅 Monitoring Ke Depan

- **Cek tab Actions** sesekali untuk lihat history runs
- Anda akan dapat **email notifikasi** jika workflow gagal
- Next run otomatis **5 hari lagi**

---

**Selamat! Keepalive system sudah aktif!** 🚀
