/**
 * umumSchema.js
 * Structure and data for Laporan Urusan Umum
 */

/* ── Empty row factories ──────────────────────────────────────────────────── */
export const EMPTY_KENDARAAN = {
    id: '',
    jenis: '',
    nopol: '',
    tahun: '',
    kondisi: ''
};

export const EMPTY_SARANA = { id: '', jenis: '', keterangan: 'Ada' };

export const EMPTY_GEDUNG = { id: '', objek: '', status: '', keterangan: '' };

/* ── Default Data: Kendaraan ─────────────────────────────────────────────── */
export const DEFAULT_RODA2 = [
    { jenis: 'Yamaha Mio', nopol: 'BK 5091 T', tahun: '2013', kondisi: 'Rusak Ringan' },
    { jenis: 'Yamaha Mio', nopol: 'BK 5092 T', tahun: '2013', kondisi: 'Rusak Ringan' },
    { jenis: 'Yamaha Mio', nopol: 'BK 5093 T', tahun: '2013', kondisi: 'Rusak Ringan' },
    { jenis: 'Yamaha Jupiter', nopol: 'BK 5095 T', tahun: '2013', kondisi: 'Rusak Ringan' },
    { jenis: 'Yamaha Jupiter MX', nopol: 'BK 2623 T', tahun: '2011', kondisi: 'Rusak Ringan' },
    { jenis: 'Yamaha Mio', nopol: 'BK 5098 T', tahun: '2013', kondisi: 'Rusak Ringan' },
    { jenis: 'Yamaha Mio', nopol: 'BK 6881 T', tahun: '2013', kondisi: 'Rusak Berat' },
    { jenis: 'Kawasaki Trail', nopol: 'B 3475 SQH', tahun: '2024', kondisi: 'Baik' },
    { jenis: 'Kawasaki Trail', nopol: 'B 3445 SQH', tahun: '2024', kondisi: 'Baik' }
].map((item, idx) => ({ ...item, id: `r2_${idx}` }));

export const DEFAULT_RODA4 = [
    { jenis: 'Toyota Hilux Silver', nopol: 'BK 8208 T', tahun: '2023', kondisi: 'Baik' },
    { jenis: 'Toyota Hilux Putih (Patroli)', nopol: 'BK 8209 T', tahun: '2023', kondisi: 'Baik' },
    { jenis: 'Daihatsu Luxio (Penerangan)', nopol: 'BK 2817 XVW', tahun: '2023', kondisi: 'Baik' },
    { jenis: 'Toyota Rush', nopol: 'BK 1418 T', tahun: '2013', kondisi: 'Baik' },
    { jenis: 'Hino Prime cab Long', nopol: 'B 7493 SPA', tahun: '2023', kondisi: 'Baik' },
    { jenis: 'Pajero Sport', nopol: 'BK 1482 T', tahun: '2024', kondisi: 'Baik' },
    { jenis: 'Toyota Fortuner', nopol: 'B 1906 SQH', tahun: '2024', kondisi: 'Baik' },
    { jenis: 'Toyota Zenix', nopol: 'B 1148 SQS', tahun: '2024', kondisi: 'Baik' },
    { jenis: 'Mitsubishi Triton', nopol: 'B 9358 SSC', tahun: '2024', kondisi: 'Baik' },
    { jenis: 'Mitsubishi Xpander', nopol: 'BK 1481 T', tahun: '2024', kondisi: 'Baik' }
].map((item, idx) => ({ ...item, id: `r4_${idx}` }));

export const DEFAULT_RODA6 = [];
export const DEFAULT_KAPAL = [];

/* ── Default Data: Sarana ─────────────────────────────────────────────────── */
export const DEFAULT_SARANA = [
    'Ruang Rapat',
    'Mushola',
    'Tempat Ibu Menyusui',
    'Tempat Bermain Anak-anak',
    'Toilet Khusus Difabel',
    'Tempat Parkir',
    'Tempat Parkir Khusus Difabel',
    'Ruang Tunggu Pemohon',
    'Ruang Tunggu Pengambilan Paspor',
    'Taman Tempat Duduk Dihalaman',
    'Karantina',
    'Kantin',
    'Mesin Antrian Online',
    'Mesin IKM (Indeks Kepuasan Masyarakat)',
    'Tempat Membaca Buku-buku dan Surat Kabar',
].map((jenis, idx) => ({ id: `sarana_${idx}`, jenis, keterangan: 'Ada' }));

/* ── Default Data: Gedung dan Bangunan ────────────────────────────────────── */
export const DEFAULT_GEDUNG = [
    {
        objek: 'Gedung',
        status: 'Kementerian Hukum dan HAM RI Kantor Imigrasi Kelas II Pematang Siantar',
        keterangan: 'Gedung Kantor\nJln. Raya Medan Km.11,5 Purba Sari'
    },
    {
        objek: 'Gedung/Tanah',
        status: 'Kementerian Hukum dan HAM RI Kantor Imigrasi Kelas II Pematang Siantar',
        keterangan: 'Ex Gedung kantor/ Rumah Dinas KepalaKantor\nJln. Letjen Suprapto No.4 / Jln Menambin No.1'
    },
    {
        objek: 'Tanah',
        status: 'Kementerian Hukum dan HAM RI Kantor Imigrasi Kelas II Pematang Siantar',
        keterangan: 'Tanah Bangunan Rumah Dinas\nJln. Purba'
    },
    {
        objek: 'Tanah',
        status: 'Kementerian Hukum dan HAM RI Kantor Imigrasi Kelas II Pematang Siantar',
        keterangan: 'Tanah Bangunan Rumah Dinas\nJln. Penyabungan'
    },
    {
        objek: 'Tanah',
        status: 'Kementerian Hukum dan HAM RI Kantor Imigrasi Kelas II Pematang Siantar',
        keterangan: 'Tanah Bangunan Rumah Dinas/ Exs Gedung BHP\nJln. Dahlia'
    },
    {
        objek: 'Tanah',
        status: 'Kementerian Hukum dan HAM RI Kantor Imigrasi Kelas II Pematang Siantar',
        keterangan: 'Tanah Bangunan Rumah Dinas\nJln. Bakung'
    },
    {
        objek: 'Tanah',
        status: 'Kementerian Hukum dan HAM RI Kantor Imigrasi Kelas II Pematang Siantar',
        keterangan: 'Tanah Bangunan Rumah Dinas\nJln. Bakung'
    },
    {
        objek: 'Tanah',
        status: 'Kementerian Hukum dan HAM RI Kantor Imigra Kelas II Pematang Siantar',
        keterangan: 'Tanah Bangunan Rumah Dinas\nJln. Bakung Belakang'
    },
].map((item, idx) => ({ ...item, id: `gedung_${idx}` }));

/* ── Aggregated default ───────────────────────────────────────────────────── */
export const getDefaultUmumData = () => ({
    roda2: [...DEFAULT_RODA2],
    roda4: [...DEFAULT_RODA4],
    roda6: [...DEFAULT_RODA6],
    kapal: [...DEFAULT_KAPAL],
    sarana: [...DEFAULT_SARANA],
    gedung: [...DEFAULT_GEDUNG],
});
