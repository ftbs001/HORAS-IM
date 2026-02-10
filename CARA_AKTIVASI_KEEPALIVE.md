# 🚀 Cara Aktivasi Keepalive - Step by Step

> **Tujuan:** Mencegah Supabase auto-pause setelah 7 hari tidak ada aktivitas

---

## 🎯 Bagaimana Cara Kerjanya?

![Keepalive Workflow](C:/Users/HP/.gemini/antigravity/brain/5df47b17-2c3e-4a2a-ba0b-cf227cdcafaf/keepalive_workflow_1770713273782.png)

Sistem keepalive bekerja dengan cara:
1. **Scheduler** menjalankan script setiap 5 hari
2. **Script** melakukan query ringan ke database Supabase
3. **Supabase** mendeteksi ada aktivitas
4. **Project** tetap ACTIVE (tidak di-pause)
5. **Aplikasi** Anda jalan terus tanpa gangguan!

---

## 📌 Pilih Metode Anda

![Perbandingan Metode](C:/Users/HP/.gemini/antigravity/brain/5df47b17-2c3e-4a2a-ba0b-cf227cdcafaf/method_comparison_1770713301039.png)

Ada 3 cara, pilih salah satu yang paling mudah untuk Anda:

> 💡 **Ingin langsung mulai?** Lihat [Quick Start Guide](file:///d:/HORAS-IM/KEEPALIVE_QUICKSTART.md) untuk langkah super cepat!

### ⭐ **Metode 1: GitHub Actions** (PALING MUDAH & RECOMMENDED)
✅ Otomatis jalannya  
✅ Gratis selamanya  
✅ Tidak perlu PC nyala  
✅ Ada notifikasi email kalau gagal  

### 🔧 **Metode 2: Windows Task Scheduler**
✅ Jalan di komputer Anda  
⚠️ PC harus nyala saat jadwal jalan  

### 🌐 **Metode 3: Web Cron Service**
✅ Jalan di cloud  
✅ Tidak perlu PC nyala  
⚠️ Perlu setup endpoint API  

---

# 🎯 METODE 1: GitHub Actions (RECOMMENDED)

## Langkah 1: Siapkan Repository GitHub

### 1.1 Cek apakah sudah ada repository GitHub

```bash
# Buka terminal di folder HORAS-IM
cd D:\HORAS-IM

# Cek status git
git status
```

**Jika belum ada git:**
```bash
# Inisialisasi git
git init

# Tambahkan semua file
git add .

# Commit pertama
git commit -m "Initial commit"
```

### 1.2 Buat repository di GitHub

1. Buka [github.com](https://github.com)
2. Klik tombol **"+"** di pojok kanan atas → **"New repository"**
3. Isi:
   - **Repository name:** `HORAS-IM`
   - **Description:** "Sistem Informasi Manajemen Imigrasi"
   - **Private/Public:** Pilih sesuai kebutuhan
4. Klik **"Create repository"**

### 1.3 Push ke GitHub

```bash
# Hubungkan dengan repository GitHub (ganti USERNAME dengan username GitHub Anda)
git remote add origin https://github.com/USERNAME/HORAS-IM.git

# Push ke GitHub
git branch -M main
git push -u origin main
```

---

## Langkah 2: Tambahkan Secrets di GitHub

Secrets adalah tempat menyimpan password/key yang aman di GitHub.

### 2.1 Buka file .env

1. Buka file `.env` di folder `D:\HORAS-IM`
2. Cari baris ini:
   ```
   VITE_SUPABASE_URL=https://hbrlbecsbriiicsenlwi.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc....(panjang sekali)
   ```
3. **COPY** kedua value tersebut (simpan di notepad sementara)

### 2.2 Tambahkan di GitHub Secrets

1. Buka repository Anda di GitHub (`https://github.com/USERNAME/HORAS-IM`)
2. Klik tab **"Settings"** (paling kanan atas)
3. Di sidebar kiri, klik **"Secrets and variables"** → **"Actions"**
4. Klik tombol **"New repository secret"**

#### Secret #1: VITE_SUPABASE_URL

- **Name:** `VITE_SUPABASE_URL`
- **Secret:** `https://hbrlbecsbriiicsenlwi.supabase.co`
- Klik **"Add secret"**

#### Secret #2: VITE_SUPABASE_ANON_KEY

- Klik **"New repository secret"** lagi
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Secret:** Paste anon key dari `.env` (yang panjang sekali)
- Klik **"Add secret"**

✅ **Selesai!** Anda seharusnya punya 2 secrets sekarang.

---

## Langkah 3: Push File Workflow ke GitHub

File workflow sudah dibuat otomatis di `.github/workflows/supabase-keepalive.yml`

```bash
# Tambahkan file workflow
git add .github/workflows/supabase-keepalive.yml
git add src/utils/keepalive.js

# Commit
git commit -m "Add Supabase keepalive automation"

# Push ke GitHub
git push
```

---

## Langkah 4: Aktifkan & Test Workflow

### 4.1 Buka Tab Actions

1. Buka repository di GitHub
2. Klik tab **"Actions"** (di atas)
3. Anda akan lihat workflow **"Supabase Keepalive"**

### 4.2 Test Manual (Opsional tapi recommended)

1. Klik workflow **"Supabase Keepalive"**
2. Klik tombol **"Run workflow"** (di kanan)
3. Klik **"Run workflow"** hijau
4. Tunggu beberapa detik, refresh halaman
5. Anda akan lihat workflow sedang berjalan (lingkaran kuning) atau selesai (centang hijau)

### 4.3 Lihat Hasilnya

1. Klik pada run yang baru saja jalan
2. Klik **"keepalive"** untuk lihat detail
3. Klik **"Run keepalive heartbeat"** untuk lihat log
4. Anda harus lihat: ✅ **"Supabase keepalive berhasil!"**

---

## Langkah 5: Selesai! 🎉

✅ **Workflow akan berjalan otomatis setiap 5 hari**  
✅ **Supabase project tidak akan di-pause lagi**  
✅ **Anda dapat email jika ada masalah**

### Monitoring

Cek status keepalive:
- Buka tab **"Actions"** di GitHub repository
- Lihat history runs
- Jika ada ❌ merah, klik untuk lihat error

---

---

# 🔧 METODE 2: Windows Task Scheduler

Gunakan metode ini jika Anda tidak ingin menggunakan GitHub.

## Langkah 1: Test Script Dulu

```bash
# Buka terminal di folder HORAS-IM
cd D:\HORAS-IM

# Jalankan script
node scripts/keepalive-standalone.js
```

**Harus muncul:**
```
✅ Supabase keepalive berhasil!
   Database tetap aktif dan project tidak akan di-pause.
```

Jika berhasil, lanjut ke langkah 2!

---

## Langkah 2: Buka Task Scheduler

### 2.1 Buka Task Scheduler

1. Tekan tombol **Windows + R**
2. Ketik: `taskschd.msc`
3. Tekan **Enter**

### 2.2 Buat Task Baru

1. Di Task Scheduler, klik **"Create Basic Task"** (di kanan)

---

## Langkah 3: Setup Task - General

### 3.1 Halaman "Create Basic Task"

- **Name:** `Supabase Keepalive HORAS-IM`
- **Description:** `Menjaga Supabase project HORAS-IM tetap aktif`
- Klik **"Next"**

---

## Langkah 4: Setup Task - Trigger (Jadwal)

### 4.1 Halaman "Trigger"

- Pilih: **"Daily"**
- Klik **"Next"**

### 4.2 Halaman "Daily"

- **Start:** Pilih tanggal hari ini
- **Start time:** Pilih jam yang nyaman (misalnya 10:00 AM)
- **Recur every:** Ketik `5` days
- Klik **"Next"**

---

## Langkah 5: Setup Task - Action (Program)

### 5.1 Halaman "Action"

- Pilih: **"Start a program"**
- Klik **"Next"**

### 5.2 Halaman "Start a Program"

Isi dengan hati-hati:

**Program/script:**
```
node
```

**Add arguments:**
```
"D:\HORAS-IM\scripts\keepalive-standalone.js"
```

**Start in:**
```
D:\HORAS-IM
```

> ⚠️ **PENTING:** Sesuaikan path jika folder HORAS-IM Anda di lokasi lain!

Klik **"Next"**

---

## Langkah 6: Finish & Test

### 6.1 Halaman "Summary"

- Review semua setting
- Centang: **"Open the Properties dialog for this task when I click Finish"**
- Klik **"Finish"**

### 6.2 Properties Dialog

1. Di tab **"General":**
   - Centang: **"Run whether user is logged on or not"**
   - Centang: **"Run with highest privileges"**

2. Di tab **"Conditions":**
   - **UNCHECK**: "Start the task only if the computer is on AC power"
   - (Biar tetap jalan meski pakai battery)

3. Di tab **"Settings":**
   - Centang: **"Run task as soon as possible after a scheduled start is missed"**

4. Klik **"OK"**

### 6.3 Test Manual

1. Di Task Scheduler Library, cari task **"Supabase Keepalive HORAS-IM"**
2. Klik kanan → **"Run"**
3. Lihat kolom **"Last Run Result"**
   - Harus muncul: `(0x0)` atau `Success`

---

## Langkah 7: Selesai! 🎉

✅ **Task akan jalan otomatis setiap 5 hari**  
✅ **Database tetap aktif**  
⚠️ **PC harus nyala saat jadwal jalan**

### Monitoring

- Buka Task Scheduler
- Lihat **"Last Run Time"** dan **"Last Run Result"**
- Jika ada error, double-click task untuk lihat detail

---

---

# 🌐 METODE 3: Web Cron Service (cron-job.org)

Metode ini butuh setup lebih lanjut. Jika Anda pilih metode ini:

1. Baca panduan lengkap di file [`SUPABASE_KEEPALIVE_GUIDE.md`](file:///d:/HORAS-IM/SUPABASE_KEEPALIVE_GUIDE.md)
2. Scroll ke bagian **"Opsi B: Cron-Job.org"**
3. Ikuti instruksi untuk membuat API endpoint

---

---

# 📊 Cara Cek Apakah Keepalive Berhasil

## 1. Cek di Supabase Dashboard

1. Buka [app.supabase.com](https://app.supabase.com)
2. Login dengan akun Anda
3. Pilih project **HORAS-IM**
4. Klik **Settings** → **General**
5. Lihat status project:
   - ✅ **ACTIVE** = Bagus, project jalan
   - ❌ **PAUSED** = Keepalive tidak jalan, atau project baru di-pause

## 2. Cek Log Keepalive

### Jika pakai GitHub Actions:
- Buka tab **Actions** di repository
- Lihat run terakhir
- Harus ada centang hijau ✅

### Jika pakai Task Scheduler:
- Buka Task Scheduler
- Klik task **"Supabase Keepalive HORAS-IM"**
- Lihat **"Last Run Result"**: harus `(0x0)`

---

# ❓ Troubleshooting

## Problem: "Could not find table"

**Solusi:** Ini normal! Script akan coba beberapa table sampai ketemu yang ada.

Selama ada ✅ **"Supabase keepalive berhasil!"** di akhir, berarti sukses.

---

## Problem: GitHub Actions tidak jalan

**Cek:**
1. Apakah Secrets sudah di-set? (Settings → Secrets and variables → Actions)
2. Apakah file workflow sudah di-push ke GitHub?
3. Apakah Actions enabled? (Settings → Actions → General → Allow all actions)

---

## Problem: Task Scheduler "Access Denied"

**Solusi:**
1. Klik kanan task → Properties
2. Tab General → Centang **"Run with highest privileges"**
3. Klik OK
4. Masukkan password Windows Anda jika diminta

---

## Problem: "npm.ps1 cannot be loaded"

**Solusi:**
```bash
# Buka PowerShell as Administrator
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

# 🎉 Selesai!

Sekarang Supabase project Anda **tidak akan di-pause lagi**!

**Rekomendasi:**
- ⭐ Gunakan **GitHub Actions** (paling mudah)
- 📅 Set reminder di kalender untuk cek status setiap bulan
- 💾 Tetap backup database secara berkala

---

**Ada pertanyaan?**
- Lihat panduan lengkap: [`SUPABASE_KEEPALIVE_GUIDE.md`](file:///d:/HORAS-IM/SUPABASE_KEEPALIVE_GUIDE.md)
- Test manual: `node scripts/keepalive-standalone.js`

**HORAS-IM** | Sistem Informasi Manajemen Imigrasi
