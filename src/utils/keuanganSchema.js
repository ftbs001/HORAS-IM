/**
 * keuanganSchema.js
 * Schema and calculation logic for Sub TU (Keuangan)
 *
 * seksi_id = 4 (Tata Usaha)
 *
 * Tables:
 * 1. rm (Rupiah Murni)
 * 2. pnp (Penerimaan Non Pajak)
 * 3. gabungan (RM + PNBP) -> Computed
 * 4. bendahara (PNBP Laporan Bendahara Penerima)
 */

export const REALISASI_ROWS = [
    { id: 'pegawai', label: 'Belanja Pegawai' },
    { id: 'barang_rm', label: 'Belanja Barang RM' },
    { id: 'barang_pnbp', label: 'Belanja Barang PNBP' },
    { id: 'modal', label: 'Belanja Modal' }
];

export const BENDAHARA_ROWS = [
    { id: 'b_425151', no: '1', akun: '425151', label: 'PENDAPATAN PENGGUNAAN SARANA DAN PRASARANA SESUAI DENGAN TUSI' },
    { id: 'b_425211', no: '2', akun: '425211', label: 'PENDAPATAN PASPOR' },
    { id: 'b_425213', no: '3', akun: '425213', label: 'PENDAPATAN IZIN KEIMIGRASIAN DAN IZIN MASUK KEMBALI (RE-ENTRY PERMIT)' },
    { id: 'b_425214', no: '4', akun: '425214', label: 'PENDAPATAN PELAYANAN KEIMIGRASIAN LAINNYA' }
];

export const getDefaultRealisasiRow = () => ({
    pagu: 0,
    target_rp: 0,
    // target_pct is computed
    realisasi_rp: 0,
    // realisasi_pct is computed
    // sisa_dana is computed
    keterangan: ''
});

export const getDefaultRealisasiData = () => {
    const d = {};
    REALISASI_ROWS.forEach(r => { d[r.id] = getDefaultRealisasiRow(); });
    return d;
};

export const getDefaultBendaharaRow = () => ({
    target: 0,
    realisasi_simponi: 0,
    realisasi_span: 0
});

export const getDefaultBendaharaData = () => {
    const d = {};
    BENDAHARA_ROWS.forEach(r => { d[r.id] = getDefaultBendaharaRow(); });
    return d;
};

// --- Calculation Logic ---

export const getPercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return (value / total) * 100;
};

export const calcRealisasiTotals = (data) => {
    const rows = {};
    let sumPagu = 0;
    let sumTargetRp = 0;
    let sumRealisasiRp = 0;

    REALISASI_ROWS.forEach(r => {
        const d = data[r.id] || getDefaultRealisasiRow();
        const pagu = Number(d.pagu) || 0;
        const targetRp = Number(d.target_rp) || 0;
        const realisasiRp = Number(d.realisasi_rp) || 0;

        sumPagu += pagu;
        sumTargetRp += targetRp;
        sumRealisasiRp += realisasiRp;

        rows[r.id] = {
            ...d,
            pagu,
            target_rp: targetRp,
            target_pct: getPercentage(targetRp, pagu),
            realisasi_rp: realisasiRp,
            realisasi_pct: getPercentage(realisasiRp, pagu),
            sisa_dana: pagu > 0 ? (pagu - realisasiRp) : 0
        };
    });

    const total = {
        pagu: sumPagu,
        target_rp: sumTargetRp,
        target_pct: getPercentage(sumTargetRp, sumPagu),
        realisasi_rp: sumRealisasiRp,
        realisasi_pct: getPercentage(sumRealisasiRp, sumPagu),
        sisa_dana: sumPagu > 0 ? (sumPagu - sumRealisasiRp) : 0
    };

    return { rows, total };
};

export const calcGabungan = (rmData, pnpData) => {
    const rm = calcRealisasiTotals(rmData || {}).rows;
    const pnp = calcRealisasiTotals(pnpData || {}).rows;

    const gabunganData = {};
    REALISASI_ROWS.forEach(r => {
        gabunganData[r.id] = {
            pagu: (rm[r.id].pagu) + (pnp[r.id].pagu),
            target_rp: (rm[r.id].target_rp) + (pnp[r.id].target_rp),
            realisasi_rp: (rm[r.id].realisasi_rp) + (pnp[r.id].realisasi_rp),
            keterangan: (rm[r.id].keterangan ? rm[r.id].keterangan + '. ' : '') + (pnp[r.id].keterangan || '')
        };
    });

    return calcRealisasiTotals(gabunganData);
};

export const calcBendaharaTotals = (data) => {
    const rows = {};
    let sumTarget = 0;
    let sumSimponi = 0;
    let sumSpan = 0;

    BENDAHARA_ROWS.forEach(r => {
        const d = data[r.id] || getDefaultBendaharaRow();
        const target = Number(d.target) || 0;
        const simponi = Number(d.realisasi_simponi) || 0;
        const span = Number(d.realisasi_span) || 0;

        sumTarget += target;
        sumSimponi += simponi;
        sumSpan += span;

        rows[r.id] = { target, realisasi_simponi: simponi, realisasi_span: span };
    });

    return {
        rows,
        total: { target: sumTarget, realisasi_simponi: sumSimponi, realisasi_span: sumSpan }
    };
};
