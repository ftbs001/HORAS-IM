/**
 * inteldakimSchema.js
 * Schema for Inteldakim section template tables:
 *  A. Pro Justitia (Projus)
 *  B. Tindakan Administratif Keimigrasian (TAK)
 *  C. TIMPORA Bulanan
 */

// ── A. PRO JUSTITIA (Projus) ─────────────────────────────────────────────────
// Columns: SIDIK(L/P), PENUNTUTAN(L/P), SIDANG(L/P), JUMLAH
export const PROJUS_COLS = ['sidik', 'penuntutan', 'sidang'];
export const PROJUS_COL_LABELS = {
    sidik: 'SIDIK',
    penuntutan: 'PENUNTUTAN',
    sidang: 'SIDANG',
};

export const PROJUS_DEFAULT_ROWS = [
    { id: 'projus_01', no: '01', pasal: '' },
    { id: 'projus_02', no: '02', pasal: '' },
    { id: 'projus_03', no: '03', pasal: '' },
    { id: 'projus_04', no: '04', pasal: '' },
];

export const getDefaultProjusData = () => {
    const rows = {};
    PROJUS_DEFAULT_ROWS.forEach(row => {
        rows[row.id] = { pasal: '' };
        PROJUS_COLS.forEach(col => { rows[row.id][col] = { l: 0, p: 0 }; });
    });
    return rows;
};

// Calculate totals: sum L and P per column, plus row JUMLAH
export const calcProjusTotals = (data) => {
    const result = {};
    const entries = Object.entries(data || {}).filter(([k]) => !k.startsWith('total'));
    entries.forEach(([rowId, rowData]) => {
        result[rowId] = { pasal: rowData.pasal || '' };
        PROJUS_COLS.forEach(col => {
            result[rowId][col] = {
                l: Number(rowData[col]?.l) || 0,
                p: Number(rowData[col]?.p) || 0,
            };
        });
        result[rowId].jumlah = PROJUS_COLS.reduce((acc, col) =>
            acc + (Number(rowData[col]?.l) || 0) + (Number(rowData[col]?.p) || 0), 0);
    });
    // Grand total row
    const totL = {}, totP = {};
    PROJUS_COLS.forEach(col => {
        totL[col] = entries.reduce((acc, [, d]) => acc + (Number(d[col]?.l) || 0), 0);
        totP[col] = entries.reduce((acc, [, d]) => acc + (Number(d[col]?.p) || 0), 0);
    });
    result['total'] = { pasal: 'JUMLAH', isTotal: true };
    PROJUS_COLS.forEach(col => { result['total'][col] = { l: totL[col], p: totP[col] }; });
    result['total'].jumlah = PROJUS_COLS.reduce((acc, col) => acc + totL[col] + totP[col], 0);
    return result;
};


// ── B. TINDAKAN ADMINISTRATIF KEIMIGRASIAN (TAK) ─────────────────────────────
export const TAK_COLS = [
    'cekal', 'pembatalan', 'larangan', 'deportasi', 'detensi', 'biaya'
];
export const TAK_COL_LABELS = {
    cekal: 'DAFTAR CEKAL',
    pembatalan: 'PEMBATALAN IZIN TINGGAL/DOKIM',
    larangan: 'LARANGAN BERADA DI WILAYAH INDONESIA',
    deportasi: 'DEPORTASI/PEMINDAHAN',
    detensi: 'RUANG DETENSI',
    biaya: 'BIAYA BEBAN',
};

export const TAK_DEFAULT_ROWS = [
    { id: 'tak_01', no: '01', pasal: 'Pasal 78 ayat 1 dan 2' },
    { id: 'tak_02', no: '02', pasal: '' },
    { id: 'tak_03', no: '03', pasal: '' },
];

export const getDefaultTAKData = () => {
    const rows = {};
    TAK_DEFAULT_ROWS.forEach(row => {
        rows[row.id] = { pasal: row.pasal || '' };
        TAK_COLS.forEach(col => { rows[row.id][col] = { l: 0, p: 0 }; });
    });
    return rows;
};

export const calcTAKTotals = (data) => {
    const result = {};
    const entries = Object.entries(data || {}).filter(([k]) => !k.startsWith('total'));
    entries.forEach(([rowId, rowData]) => {
        result[rowId] = { pasal: rowData.pasal || '' };
        TAK_COLS.forEach(col => {
            result[rowId][col] = {
                l: Number(rowData[col]?.l) || 0,
                p: Number(rowData[col]?.p) || 0,
            };
        });
        result[rowId].jumlah = TAK_COLS.reduce((acc, col) =>
            acc + (Number(rowData[col]?.l) || 0) + (Number(rowData[col]?.p) || 0), 0);
    });
    const totL = {}, totP = {};
    TAK_COLS.forEach(col => {
        totL[col] = entries.reduce((acc, [, d]) => acc + (Number(d[col]?.l) || 0), 0);
        totP[col] = entries.reduce((acc, [, d]) => acc + (Number(d[col]?.p) || 0), 0);
    });
    result['total'] = { pasal: 'JUMLAH', isTotal: true };
    TAK_COLS.forEach(col => { result['total'][col] = { l: totL[col], p: totP[col] }; });
    result['total'].jumlah = TAK_COLS.reduce((acc, col) => acc + totL[col] + totP[col], 0);
    return result;
};


// ── C. TIMPORA ────────────────────────────────────────────────────────────────
// Columns: RAPAT KOORDINASI (waktu, keterangan), OPERASI GABUNGAN (waktu, keterangan)
export const TIMPORA_ROWS = [
    { id: 'tim_provinsi', no: '1.', label: 'PROVINSI', isHeader: true },
    { id: 'tim_kab', no: '2.', label: 'KABUPATEN / KOTA', isHeader: true },
    { id: 'tim_simalungun', no: 'a.', label: 'Simalungun', indent: 1 },
    { id: 'tim_serdang', no: 'b.', label: 'Serdang Bedagai', indent: 1 },
    { id: 'tim_dairi', no: 'c.', label: 'Dairi', indent: 1 },
    { id: 'tim_pakpak', no: 'd.', label: 'Pakpak Barat', indent: 1 },
    { id: 'tim_humbang', no: 'e.', label: 'Humbang Hasundutan', indent: 1 },
    { id: 'tim_toba', no: 'f.', label: 'Toba', indent: 1 },
    { id: 'tim_taput', no: 'g.', label: 'Tapanuli Utara', indent: 1 },
    { id: 'tim_samosir', no: 'h.', label: 'Samosir', indent: 1 },
    { id: 'tim_siantar', no: 'i.', label: 'Kota Pematang Siantar', indent: 1 },
    { id: 'tim_tebing', no: 'j.', label: 'Kota Tebing Tinggi', indent: 1 },
    { id: 'tim_kecamatan', no: '3.', label: 'KECAMATAN', isHeader: true },
    { id: 'tim_kec_a', no: 'a.', label: 'a.', indent: 1 },
    { id: 'tim_kec_b', no: 'b.', label: 'b.', indent: 1 },
    { id: 'tim_kec_c', no: 'c.', label: 'c.', indent: 1 },
    { id: 'tim_kec_d', no: 'd.', label: 'd.', indent: 1 },
];

export const getDefaultTimporaData = () => {
    const rows = {};
    TIMPORA_ROWS.forEach(row => {
        rows[row.id] = {
            rapat_waktu: '',
            rapat_ket: '',
            ops_waktu: '',
            ops_ket: '',
        };
    });
    return rows;
};

// Default complete inteldakim template
export const getDefaultInteldakimData = () => ({
    projus: getDefaultProjusData(),
    tak: getDefaultTAKData(),
    timpora: getDefaultTimporaData(),
});
