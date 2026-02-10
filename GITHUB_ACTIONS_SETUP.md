# 🚀 Setup GitHub Actions - Step by Step

## ✅ Yang Sudah Anda Lakukan
- [x] Repository GitHub sudah dibuat

## 📋 Langkah Selanjutnya

### LANGKAH 1: Setup Git di Folder HORAS-IM
### LANGKAH 2: Hubungkan dengan GitHub
### LANGKAH 3: Setup GitHub Secrets
### LANGKAH 4: Push Workflow File
### LANGKAH 5: Test Workflow

---

## 📝 LANGKAH 1: Setup Git

Jalankan command berikut satu per satu di terminal:

```bash
# 1. Masuk ke folder HORAS-IM
cd D:\HORAS-IM

# 2. Inisialisasi Git (jika belum)
git init

# 3. Tambahkan semua file
git add .

# 4. Commit pertama
git commit -m "Initial commit with keepalive system"
```

**Tunggu command selesai**, lalu lanjut ke Langkah 2.

---

## 📝 LANGKAH 2: Hubungkan dengan GitHub

**PENTING:** Ganti `USERNAME` dan `REPO_NAME` dengan username dan nama repository GitHub Anda!

```bash
# Hubungkan dengan repository GitHub
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Cek koneksi
git remote -v
```

**Contoh:**
Jika username GitHub Anda `johndoe` dan nama repo `HORAS-IM`:
```bash
git remote add origin https://github.com/johndoe/HORAS-IM.git
```

---

## 📝 LANGKAH 3: Push ke GitHub

```bash
# Set branch utama
git branch -M main

# Push ke GitHub
git push -u origin main
```

**Catatan:**
- Anda mungkin diminta login GitHub (masukkan username & password/token)
- Jika pakai 2FA, gunakan Personal Access Token sebagai password

---

## 📝 LANGKAH 4: Setup GitHub Secrets

### 4.1 Ambil Info dari .env

File `.env` Anda berisi:
```
VITE_SUPABASE_URL=https://hbrlbecsbriiicsenlwi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Copy kedua value ini** (simpan di notepad)

### 4.2 Buka GitHub Repository Settings

1. Buka browser → pergi ke repository GitHub Anda
2. Klik tab **"Settings"** (paling kanan atas)
3. Di sidebar kiri, klik **"Secrets and variables"**
4. Klik **"Actions"**
5. Klik tombol hijau **"New repository secret"**

### 4.3 Tambahkan Secret #1

- **Name:** `VITE_SUPABASE_URL`
- **Secret:** `https://hbrlbecsbriiicsenlwi.supabase.co`
- Klik **"Add secret"**

### 4.4 Tambahkan Secret #2

- Klik **"New repository secret"** lagi
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Secret:** Paste anon key lengkap dari `.env` (yang sangat panjang)
- Klik **"Add secret"**

✅ **Anda sekarang punya 2 secrets**

---

## 📝 LANGKAH 5: Verifikasi Workflow File Sudah Ada

File workflow sudah dibuat di: `.github/workflows/supabase-keepalive.yml`

**Pastikan file ini ada** sebelum push.

---

## 📝 LANGKAH 6: Push Workflow ke GitHub

```bash
# Tambahkan file workflow
git add .github/workflows/supabase-keepalive.yml

# Commit
git commit -m "Add Supabase keepalive automation"

# Push
git push
```

---

## 📝 LANGKAH 7: Aktifkan & Test Workflow

### 7.1 Buka Tab Actions

1. Buka repository di GitHub
2. Klik tab **"Actions"** (di atas, sebelah Pull requests)

### 7.2 Test Manual

1. Klik workflow **"Supabase Keepalive"** (di sidebar kiri)
2. Klik tombol **"Run workflow"** (di kanan, dropdown hijau)
3. Pilih branch **"main"**
4. Klik **"Run workflow"** (tombol hijau)

### 7.3 Lihat Hasilnya

1. Refresh halaman (F5)
2. Anda akan lihat workflow sedang berjalan (lingkaran kuning ⭕)
3. Tunggu sampai selesai (centang hijau ✅ atau X merah ❌)
4. Klik pada run untuk lihat detail
5. Klik **"keepalive"** untuk lihat log
6. Klik **"Run keepalive heartbeat"** untuk expand
7. Anda harus lihat: **"Keepalive successful"**

---

## ✅ SELESAI! 🎉

Jika ada centang hijau ✅, berarti:

✅ Workflow berhasil  
✅ Keepalive terhubung ke Supabase  
✅ Akan jalan otomatis setiap 5 hari  
✅ Project tidak akan di-pause lagi  

---

## 📊 Monitoring

- Buka tab **Actions** di GitHub untuk lihat history
- Anda akan dapat email jika workflow gagal
- Next run akan otomatis 5 hari lagi

---

## ⚠️ Troubleshooting

### Error: "remote origin already exists"

```bash
# Hapus remote lama
git remote remove origin

# Tambahkan lagi dengan URL yang benar
git remote add origin https://github.com/USERNAME/REPO_NAME.git
```

### Error: "failed to push some refs"

```bash
# Pull dulu
git pull origin main --allow-unrelated-histories

# Lalu push lagi
git push -u origin main
```

### Workflow tidak muncul di Actions

- Pastikan file `.github/workflows/supabase-keepalive.yml` sudah di-push
- Refresh halaman Actions
- Pastikan Actions enabled di Settings → Actions → General

---

**Siap untuk mulai? Mulai dari Langkah 1!** 🚀
