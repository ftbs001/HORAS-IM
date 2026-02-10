# 🎯 Ikuti Langkah Ini di Task Scheduler

> Task Scheduler sudah terbuka. Ikuti panduan ini step-by-step!

---

## 📝 LANGKAH 1: Buat Task Baru

**Di jendela Task Scheduler yang terbuka:**

1. ✅ Lihat panel **kanan** (Actions)
2. ✅ Klik **"Create Basic Task..."**

---

## 📝 LANGKAH 2: Create a Basic Task Wizard

### Halaman 1: Name & Description

**Isi seperti ini:**

- **Name:** 
  ```
  Supabase Keepalive HORAS-IM
  ```

- **Description:** 
  ```
  Menjaga Supabase project HORAS-IM tetap aktif setiap 5 hari
  ```

✅ Klik **[Next >]**

---

## 📝 LANGKAH 3: Task Trigger (Kapan Jalan)

### Halaman 2: Trigger

**Pilih:**
- ☑️ **Daily**

✅ Klik **[Next >]**

---

## 📝 LANGKAH 4: Daily Settings

### Halaman 3: Daily

**Isi:**

- **Start:** Biarkan tanggal hari ini
- **Start time:** Pilih jam **10:00:00** (atau jam berapa saja yang nyaman)
- **Recur every:** Ubah dari `1` menjadi **`5`** days

> 💡 **PENTING:** Pastikan angkanya `5` (lima hari), bukan `1`!

✅ Klik **[Next >]**

---

## 📝 LANGKAH 5: Action (Yang Akan Dijalankan)

### Halaman 4: Action

**Pilih:**
- ☑️ **Start a program**

✅ Klik **[Next >]**

---

## 📝 LANGKAH 6: Start a Program

### Halaman 5: Start a Program

**Isi dengan HATI-HATI (copy-paste):**

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

> ⚠️ **PENTING:** 
> - Pastikan path-nya sesuai lokasi folder HORAS-IM Anda
> - Gunakan tanda petik `"` di bagian arguments

✅ Klik **[Next >]**

---

## 📝 LANGKAH 7: Summary

### Halaman 6: Summary

1. **PENTING!** Centang kotak ini:
   - ☑️ **"Open the Properties dialog for this task when I click Finish"**

2. ✅ Klik **[Finish]**

---

## 📝 LANGKAH 8: Properties Dialog (Pengaturan Tambahan)

**Jendela Properties akan terbuka otomatis.**

### Tab "General"

1. ☑️ Centang: **"Run whether user is logged on or not"**
2. ☑️ Centang: **"Run with highest privileges"**

### Tab "Conditions"

1. Klik tab **"Conditions"**
2. ☐ **UNCHECK** (hilangkan centang): 
   - **"Start the task only if the computer is on AC power"**
   - **"Stop if the computer switches to battery power"**

> 💡 Ini agar task tetap jalan meskipun laptop pakai battery

### Tab "Settings"

1. Klik tab **"Settings"**
2. ☑️ Centang: **"Run task as soon as possible after a scheduled start is missed"**

### Simpan

✅ Klik **[OK]**

> ⚠️ Windows mungkin minta **password** Anda. Masukkan password Windows Anda.

---

## 📝 LANGKAH 9: TEST! (Sangat Penting)

**Di Task Scheduler Library:**

1. Cari task yang baru dibuat: **"Supabase Keepalive HORAS-IM"**
2. Klik **sekali** pada task tersebut (untuk select)
3. Di panel **kanan** (Actions), klik **"Run"**
4. Tunggu **5-10 detik**
5. Lihat kolom **"Last Run Result"** 
   - Harus muncul: **`(0x0)`** atau **`The operation completed successfully.`**

---

## ✅ SELESAI! 🎉

**Jika "Last Run Result" menunjukkan `(0x0)`, berarti SUKSES!**

### Yang Terjadi Sekarang:

✅ Task akan jalan **otomatis setiap 5 hari**  
✅ Database Supabase tetap aktif  
✅ Project tidak akan di-pause lagi  

---

## 📊 Monitoring

**Cara cek apakah task jalan:**

1. Buka Task Scheduler lagi
2. Cari task: **Supabase Keepalive HORAS-IM**
3. Lihat:
   - **Last Run Time:** Kapan terakhir jalan
   - **Last Run Result:** Harus `(0x0)` = sukses
   - **Next Run Time:** Kapan akan jalan berikutnya

---

## ⚠️ Jika Ada Masalah

### Problem: "The system cannot find the file specified" (0x80070002)

**Solusi:**
- Cek path di bagian "Start in" sudah benar: `D:\HORAS-IM`
- Cek file script ada di: `D:\HORAS-IM\scripts\keepalive-standalone.js`

### Problem: "Access is denied" (0x80070005)

**Solusi:**
- Edit task → Properties → General
- Centang: **"Run with highest privileges"**

### Problem: Task tidak muncul di Task Scheduler Library

**Solusi:**
- Pastikan Anda sudah klik **Finish** di wizard
- Coba refresh Task Scheduler (F5)

---

**Butuh bantuan?** Hubungi saya jika ada error! 🚀
