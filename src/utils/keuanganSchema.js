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
    id: `rm_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    label: '',
    pagu: 0,
    target_rp: 0,
    realisasi_rp: 0,
    keterangan: ''
});

export const getDefaultRealisasiData = () => {
    return REALISASI_ROWS.map(r => ({
        id: r.id,
        label: r.label,
        pagu: 0,
        target_rp: 0,
        realisasi_rp: 0,
        keterangan: ''
    }));
};

export const getDefaultBendaharaRow = () => ({
    id: `bdp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    no: '',
    akun: '',
    label: '',
    target: 0,
    realisasi_simponi: 0,
    realisasi_span: 0
});

export const getDefaultBendaharaData = () => {
    return BENDAHARA_ROWS.map(r => ({
        id: r.id,
        no: r.no,
        akun: r.akun,
        label: r.label,
        target: 0,
        realisasi_simponi: 0,
        realisasi_span: 0
    }));
};

// --- Calculation Logic ---

export const getPercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return (value / total) * 100;
};

export const calcRealisasiTotals = (dataArray) => {
    let sumPagu = 0, sumTargetRp = 0, sumRealisasiRp = 0;

    const rows = (dataArray || []).map(d => {
        const pagu = Number(d.pagu) || 0;
        const targetRp = Number(d.target_rp) || 0;
        const realisasiRp = Number(d.realisasi_rp) || 0;

        sumPagu += pagu;
        sumTargetRp += targetRp;
        sumRealisasiRp += realisasiRp;

        return {
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

    const gabunganData = rm.map((r, i) => {
        const pObj = pnp[i] || {};
        return {
            id: r.id,
            label: r.label,
            pagu: (r.pagu || 0) + (pObj.pagu || 0),
            target_rp: (r.target_rp || 0) + (pObj.target_rp || 0),
            realisasi_rp: (r.realisasi_rp || 0) + (pObj.realisasi_rp || 0),
            keterangan: (r.keterangan ? r.keterangan + '. ' : '') + (pObj.keterangan || '')
        };
    });

    return calcRealisasiTotals(gabunganData);
};

export const calcBendaharaTotals = (dataArray) => {
    let sumTarget = 0, sumSimponi = 0, sumSpan = 0;

    const rows = (dataArray || []).map(d => {
        const target = Number(d.target) || 0;
        const simponi = Number(d.realisasi_simponi) || 0;
        const span = Number(d.realisasi_span) || 0;

        sumTarget += target;
        sumSimponi += simponi;
        sumSpan += span;

        return { ...d, target, realisasi_simponi: simponi, realisasi_span: span };
    });

    return {
        rows,
        total: { target: sumTarget, realisasi_simponi: sumSimponi, realisasi_span: sumSpan }
    };
};
