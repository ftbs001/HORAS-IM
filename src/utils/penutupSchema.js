/**
 * penutupSchema.js
 * Structure and data for BAB IV PENUTUP
 */

export const EMPTY_SARAN = {
    id: '',
    judul: '',
    isi: ''
};

/* ── Default Data: Saran ─────────────────────────────────────────────────── */
export const DEFAULT_SARAN = [
    {
        judul: 'Urusan Kepegawaian',
        isi: 'Mengingat akan kebutuhan dan urgensi Sumber Daya Manusia (SDM) dikarenakan wilayah kerja yang luas dan untuk kelancaran tugas dan fungsi Keimigrasian dipandang perlu penambahan Sumber Daya Manusia (Pejabat/Pegawai) pada Kantor Imigrasi Kelas II TPI Pematang Siantar demi kelancaran tugas pokok dan fungsi pada Kantor Imigrasi Kelas II TPI Pematang Siantar.'
    },
    {
        judul: 'Urusan Keuangan',
        isi: 'Perlunya penambahan anggaran dan belanja modal demi terpenuhinya sarana dan prasarana serta tugas pokok dan fungsi masing-masing seksi pada Kantor Imigrasi Kelas II TPI Pematang Siantar.'
    }
].map((item, idx) => ({ ...item, id: `saran_${idx}` }));

/* ── Default Data: Kesimpulan ────────────────────────────────────────────── */
export const DEFAULT_KESIMPULAN = 'Dari satu bulan kalender kerja yang telah dilalui yakni selama periode Bulan {Bulan} {Tahun} kegiatan yang telah dilakukan pada Kantor Imigrasi Kelas II TPI Pematang Siantar berjalan baik.\nDemikian laporan kegiatan ini kami sampaikan, atas perkenan dan petunjuk lebih lanjut kami ucapkan terima kasih.';

export const DEFAULT_TTD = {
    jabatan: 'Kepala Kantor,',
    nama: 'Benyamin Kali Patembal Harahap',
    kiri: '${ttd_pengirim}',
    showEsign: true
};

export const DEFAULT_TEMBUSAN = [
    {
        id: 'temb_0',
        isi: 'Sekretaris Direktorat Jenderal Imigrasi\nKementerian Imigrasi dan Pemasyarakatan Republik Indonesia'
    }
];

/* ── Aggregated default ───────────────────────────────────────────────────── */
export const getDefaultPenutupData = () => ({
    saran: [...DEFAULT_SARAN],
    kesimpulan: DEFAULT_KESIMPULAN,
    ttd: { ...DEFAULT_TTD },
    tembusan: [...DEFAULT_TEMBUSAN]
});
