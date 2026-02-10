# ⚡ Keepalive Quick Start

> **1 menit setup untuk GitHub Actions**

## ✅ Checklist Cepat

### Persiapan (5 menit)
- [ ] Buka file `.env`, copy `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
- [ ] Buka GitHub repository settings
- [ ] Tambahkan 2 secrets di Settings → Secrets and variables → Actions

### Aktivasi (1 menit)
```bash
# Push file workflow
git add .github/workflows/supabase-keepalive.yml
git add src/utils/keepalive.js
git commit -m "Add keepalive automation"
git push
```

### Test (30 detik)
- [ ] Buka tab Actions di GitHub
- [ ] Klik "Run workflow" untuk test
- [ ] Lihat centang hijau ✅

## 🎉 Selesai!

Keepalive akan jalan otomatis setiap 5 hari.

---

## 📱 Test Lokal (Alternatif)

```bash
cd D:\HORAS-IM
node scripts/keepalive-standalone.js
```

Harus muncul: ✅ **"Supabase keepalive berhasil!"**

---

## ❓ Butuh Bantuan?

Lihat panduan lengkap: [`CARA_AKTIVASI_KEEPALIVE.md`](file:///d:/HORAS-IM/CARA_AKTIVASI_KEEPALIVE.md)
