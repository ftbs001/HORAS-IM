# Panduan Supabase Keepalive

Proyek Supabase free tier akan otomatis di-pause setelah **7 hari tidak ada aktivitas**. Sistem keepalive ini akan menjaga proyek tetap aktif dengan melakukan query ringan ke database secara periodik.

## 📋 Sistem yang Tersedia

### 1. **GitHub Actions (Otomatis) - RECOMMENDED ✨**

GitHub Actions akan otomatis menjalankan keepalive setiap 5 hari.

#### Setup:

1. **Tambahkan Secrets di GitHub Repository:**
   - Buka repository di GitHub
   - Pergi ke `Settings` → `Secrets and variables` → `Actions`
   - Klik `New repository secret`
   - Tambahkan 2 secrets:
     - `VITE_SUPABASE_URL`: URL Supabase project Anda
     - `VITE_SUPABASE_ANON_KEY`: Anon key dari Supabase

2. **Push file workflow ke GitHub:**
   ```bash
   git add .github/workflows/supabase-keepalive.yml
   git commit -m "Add Supabase keepalive workflow"
   git push
   ```

3. **Verifikasi:**
   - Buka tab `Actions` di repository GitHub Anda
   - Workflow `Supabase Keepalive` akan muncul
   - Anda bisa klik `Run workflow` untuk test manual

4. **Monitoring:**
   - Workflow akan berjalan otomatis setiap 5 hari
   - Cek tab `Actions` untuk melihat history
   - Anda akan menerima email jika ada failure

---

### 2. **Script Standalone (Manual/Cron Service)**

Jika tidak menggunakan GitHub, gunakan script standalone dengan cron service eksternal.

#### Opsi A: Windows Task Scheduler

1. **Install dependencies:**
   ```bash
   npm install dotenv
   ```

2. **Buka Task Scheduler:**
   - Tekan `Win + R`, ketik `taskschd.msc`

3. **Buat Task Baru:**
   - Klik `Create Basic Task`
   - Name: `Supabase Keepalive`
   - Trigger: `Weekly` → pilih setiap 5 hari
   - Action: `Start a program`
   - Program: `node`
   - Arguments: `"D:\HORAS-IM\scripts\keepalive-standalone.js"`
   - Start in: `D:\HORAS-IM`

4. **Test manual:**
   ```bash
   node scripts/keepalive-standalone.js
   ```

#### Opsi B: Cron-Job.org (Gratis, Web-based)

1. **Daftar di [cron-job.org](https://cron-job.org)**

2. **Buat Cronjob Baru:**
   - Title: `HORAS-IM Supabase Keepalive`
   - Address: Buat endpoint di aplikasi Anda (lihat #3)
   - Schedule: `Every 5 days`

3. **Buat API endpoint di aplikasi:**

   **Tambahkan file `src/api/keepalive.js`:**
   ```javascript
   import express from 'express'
   import { keepaliveWithRetry } from '../utils/keepalive.js'

   const router = express.Router()

   router.get('/keepalive', async (req, res) => {
     // Validasi sederhana
     const apiKey = req.headers['x-api-key']
     if (apiKey !== process.env.KEEPALIVE_API_KEY) {
       return res.status(401).json({ error: 'Unauthorized' })
     }

     const result = await keepaliveWithRetry()
     res.json(result)
   })

   export default router
   ```

   **Setup API_KEY di `.env`:**
   ```
   KEEPALIVE_API_KEY=your-secret-key-here
   ```

4. **Deploy aplikasi Anda dan gunakan URL endpoint**

#### Opsi C: EasyCron (Gratis, 80 tasks/month)

Sama seperti cron-job.org, tapi dengan UI berbeda:

1. Daftar di [easycron.com](https://easycron.com)
2. Buat cron job yang hit endpoint keepalive Anda
3. Set interval: `Every 5 days`

---

## 🧪 Testing

### Test keepalive function:

```bash
# Test standalone script
node scripts/keepalive-standalone.js
```

### Test dari aplikasi:

```javascript
import { keepaliveWithRetry } from './src/utils/keepalive.js'

// Test manual
keepaliveWithRetry().then(result => {
  console.log('Result:', result)
})
```

---

## 📊 Monitoring

### Cek status proyek Supabase:

1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project `HORAS-IM`
3. Cek status di tab `Settings` → `General`
4. Jika status "Paused", klik `Restore` (gratis)

### GitHub Actions Monitoring:

- Buka tab `Actions` di repository
- Lihat history runs
- Email notification otomatis jika failure

---

## ⚠️ Troubleshooting

### "All keepalive queries failed"

**Solusi:**
- Pastikan file `.env` berisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
- Cek koneksi internet
- Verifikasi Supabase project tidak di-pause
- Cek apakah ada table di database (minimal 1 table)

### GitHub Actions tidak jalan

**Solusi:**
- Pastikan secrets sudah di-set di GitHub
- Cek file `.github/workflows/supabase-keepalive.yml` sudah di-push
- Cek tab Actions terbuka/enabled di repository settings

### Proyek masih di-pause

**Solusi:**
- Verifikasi keepalive berjalan setiap 5 hari (cek logs)
- Pastikan tidak ada error di logs
- Pertimbangkan mengurangi interval menjadi 3-4 hari

---

## 🎯 Rekomendasi

**Metode terbaik:** GitHub Actions (otomatis, gratis, reliable)

**Alternative terbaik:** cron-job.org atau EasyCron (jika tidak pakai GitHub)

**Interval optimal:** Setiap 5 hari (Supabase pause setelah 7 hari)

---

## 📝 Catatan Penting

- ✅ Keepalive hanya melakukan query `SELECT count LIMIT 1` - sangat ringan
- ✅ Tidak akan mengubah data apapun
- ✅ Gratis 100% (tidak ada biaya tambahan)
- ✅ Proyek akan tetap aktif selama keepalive berjalan
- ⚠️  Backup data secara berkala tetap direkomendasikan

---

## 💡 Tips

1. Set reminder untuk cek status keepalive setiap bulan
2. Monitor email notification dari GitHub Actions
3. Simpan backup database secara berkala
4. Pertimbangkan upgrade ke Supabase Pro jika aplikasi production

---

**Dibuat untuk HORAS-IM** | Sistem Informasi Manajemen Imigrasi
