/**
 * infokimSchema.js
 * Schema untuk:
 *   Section 5 – Informasi dan Komunikasi (12 fixed rows)
 *   Section 6 – Pengaduan Masyarakat (dynamic rows, 14 columns)
 */

// ── Section 5: Informasi dan Komunikasi ──────────────────────────────────────
// Stored under seksi_id=3 (tikim), template_data.infokim
export const INFOKIM_ROWS = [
    { id: 'ik_01', no: '01.', label: 'Mutasi Alamat Keluar' },
    { id: 'ik_02', no: '02.', label: 'Mutasi Alamat Masuk' },
    { id: 'ik_03', no: '03.', label: 'Mutasi Alamat Lokal (dalam Kanim)' },
    { id: 'ik_04', no: '04.', label: 'EPO KITAP' },
    { id: 'ik_05', no: '05.', label: 'EPO DAHSUSKIM' },
    { id: 'ik_06', no: '06.', label: 'EPO KITAS' },
    { id: 'ik_07', no: '07.', label: 'ERP/MERP tidak kembali' },
    { id: 'ik_08', no: '08.', label: 'Lapor lahir (WNA)' },
    { id: 'ik_09', no: '09.', label: 'Fasilitas Keimigrasian (Kewarganegaraan terbatas/Affidavit)' },
    { id: 'ik_10', no: '10.', label: 'Pindah Alamat' },
    { id: 'ik_11', no: '11.', label: 'Lapor Meninggal Dunia (WNA)' },
    { id: 'ik_12', no: '12.', label: 'Pencabutan Dokim Menjadi WNI' },
];

export const getDefaultInfokimData = () => {
    const d = {};
    INFOKIM_ROWS.forEach(r => { d[r.id] = { jumlah: 0 }; });
    return d;
};

// ── Section 6: Pengaduan Masyarakat ──────────────────────────────────────────
// Stored under seksi_id=1 (inteldakim), template_data.pengaduan
// Each row is an object with these keys:
export const PENGADUAN_COLS = [
    { key: 'tgl',        label: 'Tanggal Pengaduan / Konsultasi', type: 'date',     w: '90px' },
    { key: 'sarana',     label: 'Sarana Pengaduan / Konsultasi',  type: 'text',     w: '90px' },
    { key: 'penerima',   label: 'Nama Penerima Pengaduan / Konsultasi', type: 'text', w: '90px' },
    { key: 'nama',       label: 'Nama',                           type: 'text',     w: '80px' },
    { key: 'alamat',     label: 'Alamat',                         type: 'textarea', w: '90px' },
    { key: 'telp',       label: 'Nomor Telepon / HP',             type: 'text',     w: '70px' },
    { key: 'email',      label: 'E-mail / Fax',                   type: 'email',    w: '80px' },
    { key: 'lokasi',     label: 'Lokasi Kejadian',                type: 'text',     w: '80px' },
    { key: 'pihak',      label: 'Pihak yang Dilaporkan',          type: 'text',     w: '80px' },
    { key: 'waktu',      label: 'Perkiraan Waktu Kejadian',       type: 'text',     w: '80px' },
    { key: 'uraian',     label: 'Uraian Masalah',                 type: 'textarea', w: '100px' },
    { key: 'status',     label: 'Kasus Baru / Lama',              type: 'text',     w: '70px' },
    { key: 'tindak',     label: 'Tindak Lanjut',                  type: 'textarea', w: '100px' },
];

export const makePengaduanRow = () => {
    const row = { id: `pg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    PENGADUAN_COLS.forEach(c => { row[c.key] = ''; });
    return row;
};

export const getDefaultPengaduanData = () => []; // starts empty
