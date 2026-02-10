# Setup Keepalive - Langkah Anda

## 📸 Panduan Visual

![Panduan Task Scheduler](C:/Users/HP/.gemini/antigravity/brain/5df47b17-2c3e-4a2a-ba0b-cf227cdcafaf/task_scheduler_guide_1770713522713.png)

---

## ✅ Yang Sudah Dilakukan

- [x] Script keepalive sudah dibuat
- [x] Test script berhasil (database terhubung)
- [x] Dependencies terinstall

## 🎯 Langkah Aktivasi - Windows Task Scheduler

### Langkah 1: Buat Windows Task

1. Tekan `Windows + R`
2. Ketik: `taskschd.msc`
3. Tekan Enter

### Langkah 2: Create Basic Task

1. Di Task Scheduler, klik **"Create Basic Task"** (panel kanan)
2. Isi form:
   - **Name:** `Supabase Keepalive HORAS-IM`
   - **Description:** `Menjaga Supabase project HORAS-IM tetap aktif`
3. Klik **Next**

### Langkah 3: Set Trigger (Jadwal)

1. Pilih: **"Daily"**
2. Klik **Next**
3. Set:
   - **Start:** Hari ini
   - **Start time:** Jam 10:00 (atau jam berapa saja yang nyaman)
   - **Recur every:** `5` days
4. Klik **Next**

### Langkah 4: Set Action (Program)

1. Pilih: **"Start a program"**
2. Klik **Next**
3. Isi dengan HATI-HATI:

   **Program/script:**
   ```
   node
   ```

   **Add arguments (optional):**
   ```
   "D:\HORAS-IM\scripts\keepalive-standalone.js"
   ```

   **Start in (optional):**
   ```
   D:\HORAS-IM
   ```

4. Klik **Next**

### Langkah 5: Finish & Configure

1. Centang: **"Open the Properties dialog for this task when I click Finish"**
2. Klik **Finish**

3. Di Properties Dialog:
   
   **Tab General:**
   - Centang: "Run whether user is logged on or not"
   - Centang: "Run with highest privileges"
   
   **Tab Conditions:**
   - UNCHECK: "Start the task only if the computer is on AC power"
   
   **Tab Settings:**
   - Centang: "Run task as soon as possible after a scheduled start is missed"

4. Klik **OK**
5. Masukkan password Windows jika diminta

### Langkah 6: Test Manual

1. Di Task Scheduler Library, cari task: **Supabase Keepalive HORAS-IM**
2. Klik kanan → **Run**
3. Tunggu beberapa detik
4. Lihat kolom **"Last Run Result"** → harus `(0x0)` atau `Success`

## 🎉 Selesai!

Task akan jalan otomatis setiap 5 hari.

## ⚠️ Catatan Penting

- PC harus nyala saat jadwal jalan
- Cek "Last Run Time" di Task Scheduler secara berkala
- Jika ada error, double-click task untuk lihat detail

## 🔄 Alternatif: GitHub Actions (Nanti)

Kapan-kapan jika ingin upgrade ke sistem yang tidak perlu PC nyala:
1. Setup Git repository
2. Push ke GitHub
3. Ikuti panduan di `CARA_AKTIVASI_KEEPALIVE.md`
