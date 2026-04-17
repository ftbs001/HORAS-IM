/**
 * templateSchema.js
 * Fixed-template schema for BAB II — Pelaksanaan Tugas (Lalintalkim)
 *
 * Tables:
 *   A  Kanim Pematangsiantar (Paspor 48H semua jenis)
 *   B  ULP Tebing Tinggi (Paspor 48H)
 *   C  UKK Dolok Sanggul (ringkas)
 *   D  UKK Tarutung — PASPOR 48H (multi-header kompleks)
 *   E  ULP Tebing Tinggi — PASPOR 24H
 *   F  UKK Tarutung — PASPOR 24H
 *   G  Pas Lintas Batas (PLB)
 *   H  Surat Perjalanan Laksana Paspor (SPLP)
 *  ITK Penerbitan Izin Tinggal — Izin Tinggal Kunjungan
 */

export const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// ── Tabel A: Kanim Pematangsiantar ──────────────────────────────────────────
export const TABEL_A_ROWS = [
    { id: 'p24_baru',       jenisPaspor: 'PASPOR BIASA 24H',                                      jenisPermohonan: 'BARU', isGroupStart: true },
    { id: 'p24_total',      jenisPaspor: '', jenisPermohonan: 'PASPOR BIASA 24H TOTAL',            isTotalRow: true, sumIds: ['p24_baru'] },
    { id: 'p48_baru',       jenisPaspor: 'PASPOR BIASA 48H',                                      jenisPermohonan: 'BARU', isGroupStart: true },
    { id: 'p48_gmb',        jenisPaspor: '', jenisPermohonan: 'GANTI (HABIS MASA BERLAKU)' },
    { id: 'p48_ghilang',    jenisPaspor: '', jenisPermohonan: 'GANTI (HILANG)' },
    { id: 'p48_grusak',     jenisPaspor: '', jenisPermohonan: 'GANTI (RUSAK)' },
    { id: 'p48_gdata',      jenisPaspor: '', jenisPermohonan: 'GANTI (PERUBAHAN DATA)' },
    { id: 'p48_total',      jenisPaspor: '', jenisPermohonan: 'PASPOR BIASA 48H TOTAL',            isTotalRow: true, sumIds: ['p48_baru','p48_gmb','p48_ghilang','p48_grusak','p48_gdata'] },
    { id: 'e10_baru',       jenisPaspor: 'PASPOR BIASA ELEKTRONIK LAMINASI 10 TAHUN',              jenisPermohonan: 'BARU', isGroupStart: true },
    { id: 'e10_gmb',        jenisPaspor: '', jenisPermohonan: 'GANTI (HABIS MASA BERLAKU)' },
    { id: 'e10_ghilang_kh', jenisPaspor: '', jenisPermohonan: 'GANTI (HILANG KARENA KEADAAN KAHAR)' },
    { id: 'e10_ghilang',    jenisPaspor: '', jenisPermohonan: 'GANTI (HILANG)' },
    { id: 'e10_gpenuh',     jenisPaspor: '', jenisPermohonan: 'GANTI (PENUH/HALAMAN PENUH)' },
    { id: 'e10_grusak_kh',  jenisPaspor: '', jenisPermohonan: 'GANTI (RUSAK KARENA KEADAAN KAHAR)' },
    { id: 'e10_total',      jenisPaspor: '', jenisPermohonan: 'PASPOR BIASA ELEKTRONIK LAMINASI 10 TAHUN TOTAL', isTotalRow: true, sumIds: ['e10_baru','e10_gmb','e10_ghilang_kh','e10_ghilang','e10_gpenuh','e10_grusak_kh'] },
    { id: 'e5_baru',        jenisPaspor: 'PASPOR BIASA ELEKTRONIK LAMINASI 5 TAHUN',               jenisPermohonan: 'BARU', isGroupStart: true },
    { id: 'e5_gmb',         jenisPaspor: '', jenisPermohonan: 'GANTI (HABIS MASA BERLAKU)' },
    { id: 'e5_ghilang_kh',  jenisPaspor: '', jenisPermohonan: 'GANTI (HILANG KARENA KEADAAN KAHAR)' },
    { id: 'e5_ghilang',     jenisPaspor: '', jenisPermohonan: 'GANTI (HILANG)' },
    { id: 'e5_gpenuh',      jenisPaspor: '', jenisPermohonan: 'GANTI (PENUH/HALAMAN PENUH)' },
    { id: 'e5_grusak',      jenisPaspor: '', jenisPermohonan: 'GANTI (RUSAK)' },
    { id: 'e5_total',       jenisPaspor: '', jenisPermohonan: 'PASPOR BIASA ELEKTRONIK LAMINASI 5 TAHUN TOTAL', isTotalRow: true, sumIds: ['e5_baru','e5_gmb','e5_ghilang_kh','e5_ghilang','e5_gpenuh','e5_grusak'] },
    { id: 'ne10_baru',      jenisPaspor: 'PASPOR BIASA NON ELEKTRONIK 10 TAHUN',                  jenisPermohonan: 'BARU', isGroupStart: true },
    { id: 'ne10_gmb',       jenisPaspor: '', jenisPermohonan: 'GANTI (HABIS MASA BERLAKU)' },
    { id: 'ne10_total',     jenisPaspor: '', jenisPermohonan: 'PASPOR BIASA NON ELEKTRONIK 10 TAHUN TOTAL', isTotalRow: true, sumIds: ['ne10_baru','ne10_gmb'] },
    { id: 'ne5_baru',       jenisPaspor: 'PASPOR BIASA NON ELEKTRONIK 5 TAHUN',                   jenisPermohonan: 'BARU', isGroupStart: true },
    { id: 'ne5_gmb',        jenisPaspor: '', jenisPermohonan: 'GANTI (HABIS MASA BERLAKU)' },
    { id: 'ne5_gpenuh',     jenisPaspor: '', jenisPermohonan: 'GANTI (PENUH/HALAMAN PENUH)' },
    { id: 'ne5_total',      jenisPaspor: '', jenisPermohonan: 'PASPOR BIASA NON ELEKTRONIK 5 TAHUN TOTAL', isTotalRow: true, sumIds: ['ne5_baru','ne5_gmb','ne5_gpenuh'] },
    { id: 'grand_total',    jenisPaspor: '', jenisPermohonan: 'GRAND TOTAL', isTotalRow: true, isGrandTotal: true,
      sumIds: ['p24_baru','p48_baru','p48_gmb','p48_ghilang','p48_grusak','p48_gdata',
               'e10_baru','e10_gmb','e10_ghilang_kh','e10_ghilang','e10_gpenuh','e10_grusak_kh',
               'e5_baru','e5_gmb','e5_ghilang_kh','e5_ghilang','e5_gpenuh','e5_grusak',
               'ne10_baru','ne10_gmb','ne5_baru','ne5_gmb','ne5_gpenuh'] },
];

// ── Tabel B: ULP Tebing Tinggi (48H) ────────────────────────────────────────
export const TABEL_B_ROWS = [
    { id: 'ulp_b_e10_baru',    jenisPaspor: 'Paspor Biasa Elektronik Laminasi 10 Tahun', jenisPermohonan: 'BARU', isGroupStart: true },
    { id: 'ulp_b_e5_baru',     jenisPaspor: 'Paspor Biasa Elektronik Laminasi 5 Tahun',  jenisPermohonan: 'BARU' },
    { id: 'ulp_b_baru_total',  jenisPaspor: '', jenisPermohonan: 'TOTAL BARU', isTotalRow: true, sumIds: ['ulp_b_e10_baru','ulp_b_e5_baru'] },
    { id: 'ulp_b_e10_gmb',     jenisPaspor: 'Paspor Biasa Elektronik Laminasi 10 Tahun', jenisPermohonan: 'GANTI (HABIS MASA BERLAKU)', isGroupStart: true },
    { id: 'ulp_b_e5_gmb',      jenisPaspor: 'Paspor Biasa Elektronik Laminasi 5 Tahun',  jenisPermohonan: 'GANTI (HABIS MASA BERLAKU)' },
    { id: 'ulp_b_e10_ghilang', jenisPaspor: 'Paspor Biasa Elektronik Laminasi 10 Tahun', jenisPermohonan: 'GANTI (HILANG)', isGroupStart: true },
    { id: 'ulp_b_e5_ghilang',  jenisPaspor: 'Paspor Biasa Elektronik Laminasi 5 Tahun',  jenisPermohonan: 'GANTI (HILANG)' },
    { id: 'ulp_b_e10_gpenuh',  jenisPaspor: 'Paspor Biasa Elektronik Laminasi 10 Tahun', jenisPermohonan: 'GANTI (PENUH/HALAMAN PENUH)', isGroupStart: true },
    { id: 'ulp_b_e5_gpenuh',   jenisPaspor: 'Paspor Biasa Elektronik Laminasi 5 Tahun',  jenisPermohonan: 'GANTI (PENUH/HALAMAN PENUH)' },
    { id: 'ulp_b_grand',       jenisPaspor: '', jenisPermohonan: 'TOTAL', isTotalRow: true, isGrandTotal: true,
      sumIds: ['ulp_b_e10_baru','ulp_b_e5_baru','ulp_b_e10_gmb','ulp_b_e5_gmb','ulp_b_e10_ghilang','ulp_b_e5_ghilang','ulp_b_e10_gpenuh','ulp_b_e5_gpenuh'] },
];

// ── Tabel C: UKK Dolok Sanggul (ringkas) ─────────────────────────────────────
export const TABEL_C_ROWS = [
    { id: 'ukk_c_e10_baru',   keterangan: 'Paspor Biasa Elektronik Laminasi 10 Tahun - BARU' },
    { id: 'ukk_c_e5_baru',    keterangan: 'Paspor Biasa Elektronik Laminasi 5 Tahun - BARU' },
    { id: 'ukk_c_e10_gmb',    keterangan: 'Paspor Biasa Elektronik Laminasi 10 Tahun - GANTI (HABIS MASA BERLAKU)' },
    { id: 'ukk_c_e5_gmb',     keterangan: 'Paspor Biasa Elektronik Laminasi 5 Tahun - GANTI (HABIS MASA BERLAKU)' },
    { id: 'ukk_c_e10_gpenuh', keterangan: 'Paspor Biasa Elektronik Laminasi 10 Tahun - GANTI (PENUH/HALAMAN PENUH)' },
    { id: 'ukk_c_e5_gpenuh',  keterangan: 'Paspor Biasa Elektronik Laminasi 5 Tahun - GANTI (PENUH/HALAMAN PENUH)' },
    { id: 'ukk_c_total',       keterangan: 'TOTAL', isTotalRow: true, isGrandTotal: true,
      sumIds: ['ukk_c_e10_baru','ukk_c_e5_baru','ukk_c_e10_gmb','ukk_c_e5_gmb','ukk_c_e10_gpenuh','ukk_c_e5_gpenuh'] },
];

// ── Multi-header tables D / E / F ────────────────────────────────────────────
// Kolom: NO | JENIS PERMOHONAN | DISETUJUI(L/P) | WWCR(L/P) | ADJ KANIM(L/P) | ADJ PUSAT(L/P) | SISTEM(L/P) | JUMLAH(L/P, auto)
export const TABEL_D_COLS         = ['disetujui','wwcs','adj_kanim','adj_pusat','sistem','jumlah'];
export const TABEL_DEF_INPUT_COLS = ['disetujui','wwcs','adj_kanim','adj_pusat','sistem']; // editable
export const TABEL_D_COL_LABELS   = { disetujui:'DISETUJUI', wwcs:'WWCR', adj_kanim:'ADJ KANIM', adj_pusat:'ADJ PUSAT', sistem:'SISTEM', jumlah:'JUMLAH' };

// ── Tabel D: UKK Tarutung — Paspor 48H ──────────────────────────────────────
export const TABEL_D_ROWS = [
    { id: 'd_baru_5',       no: '1', label: 'Baru 5 Tahun' },
    { id: 'd_baru_10',      no: '2', label: 'Baru 10 Tahun' },
    { id: 'd_gmb',          no: '3', label: 'Penggantian Habis Berlaku' },
    { id: 'd_gpenuh',       no: '4', label: 'Penggantian Halaman Penuh' },
    { id: 'd_geks',         no: '5', label: 'Penggantian Eks Pemegang SPRI 24/48' },
    { id: 'd_grusak',       no: '6', label: 'Penggantian Karena Rusak' },
    { id: 'd_rusak_proses', no: '7', label: 'Rusak Dalam Proses' },
    { id: 'd_total',        no: '',  label: 'JUMLAH', isTotalRow: true, isGrandTotal: true,
      sumIds: ['d_baru_5','d_baru_10','d_gmb','d_gpenuh','d_geks','d_grusak','d_rusak_proses'] },
];

// ── Tabel E: ULP Tebing Tinggi — Paspor 24H ─────────────────────────────────
export const TABEL_E_ROWS = [
    { id: 'e_baru',         no: '1', label: 'Baru' },
    { id: 'e_gmb',          no: '2', label: 'Penggantian Habis Berlaku' },
    { id: 'e_gpenuh',       no: '3', label: 'Penggantian Halaman Penuh' },
    { id: 'e_ghilang',      no: '4', label: 'Penggantian Karena Hilang' },
    { id: 'e_grusak',       no: '5', label: 'Penggantian Karena Rusak' },
    { id: 'e_rusak_proses', no: '6', label: 'Rusak Dalam Proses' },
    { id: 'e_total',        no: '',  label: 'JUMLAH', isTotalRow: true, isGrandTotal: true,
      sumIds: ['e_baru','e_gmb','e_gpenuh','e_ghilang','e_grusak','e_rusak_proses'] },
];

// ── Tabel F: UKK Tarutung — Paspor 24H ──────────────────────────────────────
export const TABEL_F_ROWS = [
    { id: 'f_baru',         no: '1', label: 'Baru' },
    { id: 'f_gmb',          no: '2', label: 'Penggantian Habis Berlaku' },
    { id: 'f_gpenuh',       no: '3', label: 'Penggantian Halaman Penuh' },
    { id: 'f_ghilang',      no: '4', label: 'Penggantian Karena Hilang' },
    { id: 'f_grusak',       no: '5', label: 'Penggantian Karena Rusak' },
    { id: 'f_rusak_proses', no: '6', label: 'Rusak Dalam Proses' },
    { id: 'f_total',        no: '',  label: 'JUMLAH', isTotalRow: true, isGrandTotal: true,
      sumIds: ['f_baru','f_gmb','f_gpenuh','f_ghilang','f_grusak','f_rusak_proses'] },
];

// ── Simple tables G / H / ITK ────────────────────────────────────────────────
// Kolom data: DISETUJUI (L/P) | DITOLAK (L/P) → JUMLAH auto
export const TABEL_SIMPLE_COLS       = ['disetujui','ditolak'];
export const TABEL_SIMPLE_COL_LABELS = { disetujui: 'DISETUJUI', ditolak: 'DITOLAK' };

// ── Tabel G: Pas Lintas Batas (PLB) ─────────────────────────────────────────
export const TABEL_G_ROWS = [
    { id: 'g_plb',   no: '01', label: 'Pas Lintas Batas' },
    { id: 'g_total', no: '',   label: 'JUMLAH', isTotalRow: true, isGrandTotal: true, sumIds: ['g_plb'] },
];

// ── Tabel H: SPLP ────────────────────────────────────────────────────────────
export const TABEL_H_ROWS = [
    { id: 'h_wni',   no: '01', label: 'Surat Perjalanan Laksana Paspor (SPLP) WNI' },
    { id: 'h_wna',   no: '02', label: 'Surat Perjalanan Laksana Paspor (SPLP) WNA' },
    { id: 'h_total', no: '',   label: 'JUMLAH', isTotalRow: true, isGrandTotal: true, sumIds: ['h_wni','h_wna'] },
];

// ── Tabel ITK: Penerbitan Izin Tinggal Kunjungan ─────────────────────────────
export const TABEL_ITK_ROWS = [
    { id: 'itk_baru',         no: '01', label: 'Baru' },
    { id: 'itk_perpanjangan', no: '02', label: 'Perpanjangan' },
    { id: 'itk_alih',         no: '03', label: 'Alih Status/ Konversi' },
    { id: 'itk_total',        no: '',   label: 'JUMLAH', isTotalRow: true, isGrandTotal: true,
      sumIds: ['itk_baru','itk_perpanjangan','itk_alih'] },
];

// ── Tabel ITAS: Izin Tinggal Terbatas ───────────────────────────────────────
export const TABEL_ITAS_ROWS = [
    { id: 'itas_baru',        no: '01', label: 'Baru' },
    { id: 'itas_perpanjangan',no: '02', label: 'Perpanjangan' },
    { id: 'itas_alih',        no: '03', label: 'Alih Status/Konversi' },
    { id: 'itas_ghilang',     no: '04', label: 'Penggantian Karena Hilang' },
    { id: 'itas_grusak',      no: '05', label: 'Penggantian Karena Rusak' },
    { id: 'itas_total',       no: '',   label: 'JUMLAH', isTotalRow: true, isGrandTotal: true,
      sumIds: ['itas_baru','itas_perpanjangan','itas_alih','itas_ghilang','itas_grusak'] },
];

// ── Tabel ITAP: Izin Tinggal Tetap ──────────────────────────────────────────
export const TABEL_ITAP_ROWS = [
    { id: 'itap_alih',        no: '01', label: 'Alih Status/Konversi' },
    { id: 'itap_perpanjangan',no: '02', label: 'Perpanjangan' },
    { id: 'itap_ghilang',     no: '03', label: 'Penggantian Karena Hilang' },
    { id: 'itap_grusak',      no: '04', label: 'Penggantian Karena Rusak' },
    { id: 'itap_total',       no: '',   label: 'JUMLAH', isTotalRow: true, isGrandTotal: true,
      sumIds: ['itap_alih','itap_perpanjangan','itap_ghilang','itap_grusak'] },
];

// ── Tabel Lain-Lain ──────────────────────────────────────────────────────────
export const TABEL_LAIN_ROWS = [
    { id: 'lain_smartcart', no: '01', label: 'Smart Cart' },
    { id: 'lain_abtc',      no: '02', label: 'ABTC' },
    { id: 'lain_affidavit', no: '03', label: 'Affidavit' },
    { id: 'lain_skk',       no: '04', label: 'Surat Keterangan Keimigrasian' },
    { id: 'lain_voa',       no: '05', label: 'Visa On Arrival' },
    { id: 'lain_total',     no: '',   label: 'JUMLAH', isTotalRow: true, isGrandTotal: true,
      sumIds: ['lain_smartcart','lain_abtc','lain_affidavit','lain_skk','lain_voa'] },
];

// ── Rekapitulasi Perlintasan (Udara & Laut) ──────────────────────────────────
export const TABEL_PERLINTASAN_COLS = [
    'ked_p_wni', 'ked_p_wna', 'ked_c_wni', 'ked_c_wna',
    'keb_p_wni', 'keb_p_wna', 'keb_c_wni', 'keb_c_wna'
];
export const TABEL_PERLINTASAN_ROWS = [
    { id: 'r1' }, { id: 'r2' }, { id: 'r3' },
    { id: 'total', isTotalRow: true, sumIds: ['r1','r2','r3'] }
];

// ── Default data factory ──────────────────────────────────────────────────────
export const getDefaultTemplateData = (bulan, tahun) => {
    const emptyLP    = () => ({ l: 0, p: 0 });
    const emptyMulti = (cols) => {
        const o = {}; cols.forEach(c => { o[c] = emptyLP(); }); return o;
    };

    const tabel_a = {}; TABEL_A_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_a[r.id] = emptyLP(); });
    const tabel_b = {}; TABEL_B_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_b[r.id] = emptyLP(); });
    const tabel_c = {}; TABEL_C_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_c[r.id] = emptyLP(); });

    const tabel_d = {}; TABEL_D_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_d[r.id] = emptyMulti(TABEL_DEF_INPUT_COLS); });
    const tabel_e = {}; TABEL_E_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_e[r.id] = emptyMulti(TABEL_DEF_INPUT_COLS); });
    const tabel_f = {}; TABEL_F_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_f[r.id] = emptyMulti(TABEL_DEF_INPUT_COLS); });

    const tabel_g   = {}; TABEL_G_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_g[r.id]   = emptyMulti(TABEL_SIMPLE_COLS); });
    const tabel_h   = {}; TABEL_H_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_h[r.id]   = emptyMulti(TABEL_SIMPLE_COLS); });
    const tabel_itk = {}; TABEL_ITK_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_itk[r.id] = emptyMulti(TABEL_SIMPLE_COLS); });
    const tabel_itas= {}; TABEL_ITAS_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_itas[r.id]= emptyMulti(TABEL_SIMPLE_COLS); });
    const tabel_itap= {}; TABEL_ITAP_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_itap[r.id]= emptyMulti(TABEL_SIMPLE_COLS); });
    const tabel_lain= {}; TABEL_LAIN_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_lain[r.id]= emptyMulti(TABEL_SIMPLE_COLS); });

    const tabel_udara = {}; TABEL_PERLINTASAN_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_udara[r.id] = emptyMulti(TABEL_PERLINTASAN_COLS); });
    const tabel_laut  = {}; TABEL_PERLINTASAN_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_laut[r.id]  = emptyMulti(TABEL_PERLINTASAN_COLS); });
    const tabel_darat = {}; TABEL_PERLINTASAN_ROWS.filter(r => !r.isTotalRow).forEach(r => { tabel_darat[r.id] = emptyMulti(TABEL_PERLINTASAN_COLS); });

    return { 
        bulan, tahun, 
        tabel_a, tabel_b, tabel_c, tabel_d, tabel_e, tabel_f, 
        tabel_g, tabel_h, tabel_itk, tabel_itas, tabel_itap, tabel_lain,
        tabel_udara, tabel_laut, tabel_darat
    };
};

/**
 * Hitung semua totals berdasarkan tableName:
 *   'a','b','c' → LP biasa
 *   'd','e','f' → multi-header (jumlah per baris auto-hitung)
 *   'g','h','itk' → simple (disetujui + ditolak)
 */
export const calculateTotals = (tableName, tableData, schemaRows) => {
    const data = JSON.parse(JSON.stringify(tableData || {}));

    if (['d','e','f'].includes(tableName)) {
        // Auto-compute 'jumlah' per data row
        schemaRows.filter(r => !r.isTotalRow).forEach(row => {
            if (!data[row.id]) return;
            const sumL = TABEL_DEF_INPUT_COLS.reduce((acc, c) => acc + (Number(data[row.id][c]?.l) || 0), 0);
            const sumP = TABEL_DEF_INPUT_COLS.reduce((acc, c) => acc + (Number(data[row.id][c]?.p) || 0), 0);
            data[row.id]['jumlah'] = { l: sumL, p: sumP };
        });
        // Sum total rows per col
        schemaRows.filter(r => r.isTotalRow && r.sumIds).forEach(row => {
            data[row.id] = data[row.id] || {};
            TABEL_D_COLS.forEach(col => {
                const sumL = row.sumIds.reduce((acc, id) => acc + (Number(data[id]?.[col]?.l) || 0), 0);
                const sumP = row.sumIds.reduce((acc, id) => acc + (Number(data[id]?.[col]?.p) || 0), 0);
                data[row.id][col] = { l: sumL, p: sumP };
            });
        });

    } else if (['udara','laut','darat'].includes(tableName)) {
        schemaRows.filter(r => r.isTotalRow && r.sumIds).forEach(row => {
            data[row.id] = data[row.id] || {};
            TABEL_PERLINTASAN_COLS.forEach(col => {
                const sumL = row.sumIds.reduce((acc, id) => acc + (Number(data[id]?.[col]?.l) || 0), 0);
                const sumP = row.sumIds.reduce((acc, id) => acc + (Number(data[id]?.[col]?.p) || 0), 0);
                data[row.id][col] = { l: sumL, p: sumP };
            });
        });

    } else if (['g','h','itk','itas','itap','lain'].includes(tableName)) {
        schemaRows.filter(r => r.isTotalRow && r.sumIds).forEach(row => {
            data[row.id] = data[row.id] || {};
            TABEL_SIMPLE_COLS.forEach(col => {
                const sumL = row.sumIds.reduce((acc, id) => acc + (Number(data[id]?.[col]?.l) || 0), 0);
                const sumP = row.sumIds.reduce((acc, id) => acc + (Number(data[id]?.[col]?.p) || 0), 0);
                data[row.id][col] = { l: sumL, p: sumP };
            });
        });

    } else {
        // a, b, c
        schemaRows.filter(r => r.isTotalRow && r.sumIds).forEach(row => {
            const sumL = row.sumIds.reduce((acc, id) => acc + (Number(data[id]?.l) || 0), 0);
            const sumP = row.sumIds.reduce((acc, id) => acc + (Number(data[id]?.p) || 0), 0);
            data[row.id] = { l: sumL, p: sumP };
        });
    }

    return data;
};
