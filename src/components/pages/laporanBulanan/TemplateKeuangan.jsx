/**
 * TemplateKeuangan.jsx
 * UI Component for B. BIDANG FASILITATIF - 1. URUSAN KEUANGAN
 *
 * Handles:
 * - 1. Laporan Realisasi Penyerapan Anggaran (RM, PNBP, RM+PNBP)
 * - 2. Penerimaan Negara Bukan Pajak (Bendahara Penerima)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
    REALISASI_ROWS, BENDAHARA_ROWS,
    getDefaultRealisasiData, getDefaultBendaharaData,
    calcRealisasiTotals, calcGabungan, calcBendaharaTotals
} from '../../../utils/keuanganSchema';

const SEKSI_ID_TU = 4;
const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
const FONT = '"Times New Roman", Georgia, serif';

const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((t, m) => { setMsg({ type: t, text: m }); setTimeout(() => setMsg(null), 5000); }, []);
    return [msg, show];
};

const formatRp = (num) => {
    if (!num) return '-';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

const formatPct = (num) => {
    if (!num) return '-';
    // Format properly: 32.55%
    return Number(num).toFixed(2).replace('.', ',') + '%';
};

const th = (extra = {}) => ({
    border: '1px solid #000', padding: '4px 5px',
    background: '#bdd7ee', fontFamily: FONT, fontSize: '9pt',
    fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle',
    ...extra
});

const td = (extra = {}) => ({
    border: '1px solid #000', padding: '3px 5px',
    fontFamily: FONT, fontSize: '9pt', verticalAlign: 'top', ...extra
});

const InputRp = ({ value, onChange, disabled }) => {
    // Basic local state to handle typing "1000", formats on blur
    const [val, setVal] = useState(value === 0 ? '' : value);
    useEffect(() => { setVal(value === 0 ? '' : value); }, [value]);

    return (
        <input
            type="number"
            min={0}
            value={val}
            disabled={disabled}
            placeholder="-"
            onChange={e => {
                setVal(e.target.value);
                onChange(Number(e.target.value) || 0);
            }}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', fontFamily: FONT, fontSize: '9pt' }}
        />
    );
};

// ─── COMPONENT: Realisasi Anggaran ───────────────────────────────────────────
function TableRealisasi({ title, data, onChange, isPreview, readOnly, loading }) {
    const { rows, total } = readOnly ? { rows: data, total: calcRealisasiTotals(data).total } : calcRealisasiTotals(data);

    const handleAdd = () => onChange([...(data || []), { id: `rm_${Date.now()}`, label: '', pagu: 0, target_rp: 0, realisasi_rp: 0, keterangan: '' }]);
    const handleRemove = (idx) => { const n = [...data]; n.splice(idx, 1); onChange(n); };
    const handleChange = (idx, field, val) => { const n = [...data]; n[idx][field] = val; onChange(n); };

    const PaguCol = (idx) => isPreview || readOnly ? formatRp(rows[idx].pagu) : <InputRp value={rows[idx].pagu} onChange={v => handleChange(idx, 'pagu', v)} disabled={loading} />;
    const TargRpCol = (idx) => isPreview || readOnly ? formatRp(rows[idx].target_rp) : <InputRp value={rows[idx].target_rp} onChange={v => handleChange(idx, 'target_rp', v)} disabled={loading} />;
    const RealRpCol = (idx) => isPreview || readOnly ? formatRp(rows[idx].realisasi_rp) : <InputRp value={rows[idx].realisasi_rp} onChange={v => handleChange(idx, 'realisasi_rp', v)} disabled={loading} />;
    const KetCol = (idx) => isPreview || readOnly ? rows[idx].keterangan : (
        <input type="text" value={rows[idx].keterangan || ''} onChange={e => handleChange(idx, 'keterangan', e.target.value)} disabled={loading}
               style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: FONT, fontSize: '9pt' }} />
    );
    const LblCol = (idx) => isPreview || readOnly ? rows[idx].label : (
        <input type="text" value={rows[idx].label || ''} onChange={e => handleChange(idx, 'label', e.target.value)} disabled={loading}
               style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: FONT, fontSize: '9pt', fontWeight: 'bold' }} />
    );

    return (
        <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold' }}>{title}</div>
                {!isPreview && !readOnly && <button onClick={handleAdd} disabled={loading} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Tambah</button>}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px' }}>
                <thead>
                    <tr>
                        <th rowSpan={2} style={th()}>JENIS BELANJA</th>
                        <th rowSpan={2} style={th()}>PAGU</th>
                        <th colSpan={2} style={th()}>TARGET</th>
                        <th colSpan={2} style={th()}>REALISASI</th>
                        <th rowSpan={2} style={th()}>SISA DANA</th>
                        <th rowSpan={2} style={th()}>KETERANGAN</th>
                        {!isPreview && !readOnly && <th rowSpan={2} style={th({ background: '#f87171' })}>Aksi</th>}
                    </tr>
                    <tr>
                        <th style={th({ width: '100px' })}>Rp.</th>
                        <th style={th({ width: '60px' })}>(%)</th>
                        <th style={th({ width: '100px' })}>Rp.</th>
                        <th style={th({ width: '60px' })}>(%)</th>
                    </tr>
                </thead>
                <tbody>
                    {(rows || []).map((r, idx) => {
                        const pt = r.pagu === 0;
                        return (
                            <tr key={r.id}>
                                <td style={td()}>{LblCol(idx)}</td>
                                <td style={td({ textAlign: 'right', background: pt && !readOnly ? '#fafafa' : '#fff' })}>{PaguCol(idx)}</td>
                                <td style={td({ textAlign: 'right', background: pt && !readOnly ? '#fafafa' : '#fff' })}>{pt ? '-' : TargRpCol(idx)}</td>
                                <td style={td({ textAlign: 'center', background: '#f8fafc' })}>{pt ? '-' : formatPct(r.target_pct)}</td>
                                <td style={td({ textAlign: 'right', background: pt && !readOnly ? '#fafafa' : '#fff' })}>{pt ? '-' : RealRpCol(idx)}</td>
                                <td style={td({ textAlign: 'center', background: '#f8fafc' })}>{pt ? '-' : formatPct(r.realisasi_pct)}</td>
                                <td style={td({ textAlign: 'right', background: '#f8fafc' })}>{pt ? '-' : formatRp(r.sisa_dana)}</td>
                                <td style={td({ background: '#fff' })}>{KetCol(idx)}</td>
                                {!isPreview && !readOnly && <td style={td({ textAlign: 'center' })}><button onClick={() => handleRemove(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>x</button></td>}
                            </tr>
                        );
                    })}
                    {/* Total Row */}
                    <tr>
                        <td style={td({ textAlign: 'center', fontWeight: 'bold' })}>JUMLAH</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total?.pagu)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total?.target_rp)}</td>
                        <td style={td({ textAlign: 'center', fontWeight: 'bold', background: '#f8fafc' })}>{formatPct(total?.target_pct)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total?.realisasi_rp)}</td>
                        <td style={td({ textAlign: 'center', fontWeight: 'bold', background: '#f8fafc' })}>{formatPct(total?.realisasi_pct)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total?.sisa_dana)}</td>
                        <td style={td({ background: '#f8fafc' })}></td>
                        {!isPreview && !readOnly && <td style={td()}></td>}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ─── COMPONENT: Bendahara Penerima ───────────────────────────────────────────
function TableBendahara({ data, onChange, isPreview, loading }) {
    const { rows, total } = calcBendaharaTotals(data);

    const handleAdd = () => onChange([...(data || []), { id: `bdp_${Date.now()}`, no: '', akun: '', label: '', target: 0, realisasi_simponi: 0, realisasi_span: 0 }]);
    const handleRemove = (idx) => { const n = [...data]; n.splice(idx, 1); onChange(n); };
    const handleChange = (idx, field, val) => { const n = [...data]; n[idx][field] = val; onChange(n); };

    const TargCol = (idx) => isPreview ? formatRp(rows[idx].target) : <InputRp value={rows[idx].target} onChange={v => handleChange(idx, 'target', v)} disabled={loading} />;
    const SimpCol = (idx) => isPreview ? formatRp(rows[idx].realisasi_simponi) : <InputRp value={rows[idx].realisasi_simponi} onChange={v => handleChange(idx, 'realisasi_simponi', v)} disabled={loading} />;
    const SpanCol = (idx) => isPreview ? formatRp(rows[idx].realisasi_span) : <InputRp value={rows[idx].realisasi_span} onChange={v => handleChange(idx, 'realisasi_span', v)} disabled={loading} />;
    
    const TextInput = (idx, field) => isPreview ? rows[idx][field] : (
        <input type="text" value={rows[idx][field] || ''} onChange={e => handleChange(idx, field, e.target.value)} disabled={loading}
               style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: FONT, fontSize: '9pt' }} />
    );

    return (
        <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                {!isPreview && <button onClick={handleAdd} disabled={loading} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Tambah</button>}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '800px' }}>
                <thead>
                    <tr>
                        <th style={th({ width: '40px' })}>NO.</th>
                        <th style={th({ width: '80px' })}>KODE AKUN</th>
                        <th style={th()}>JENIS PENDAPATAN</th>
                        <th style={th({ width: '130px' })}>TARGET</th>
                        <th style={th({ width: '130px' })}>REALISASI SIMPONI</th>
                        <th style={th({ width: '130px' })}>REALISASI SPAN</th>
                        {!isPreview && <th style={th({ background: '#f87171' })}>Aksi</th>}
                    </tr>
                </thead>
                <tbody>
                    {(rows || []).map((r, idx) => (
                        <tr key={r.id}>
                            <td style={td({ textAlign: 'center' })}>{TextInput(idx, 'no')}</td>
                            <td style={td({ textAlign: 'center' })}>{TextInput(idx, 'akun')}</td>
                            <td style={td()}>{TextInput(idx, 'label')}</td>
                            <td style={td({ textAlign: 'right' })}>{TargCol(idx)}</td>
                            <td style={td({ textAlign: 'right' })}>{SimpCol(idx)}</td>
                            <td style={td({ textAlign: 'right' })}>{SpanCol(idx)}</td>
                            {!isPreview && <td style={td({ textAlign: 'center' })}><button onClick={() => handleRemove(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>x</button></td>}
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={3} style={td({ textAlign: 'center', fontWeight: 'bold' })}>TOTAL</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total?.target)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total?.realisasi_simponi)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total?.realisasi_span)}</td>
                        {!isPreview && <td style={td()}></td>}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}


// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function TemplateKeuangan({ defaultTab = 'realisasi', embedded = false, defaultSubSection = null, forcePreview = false, propBulan = null, propTahun = null }) {
    const [msg, showMsg] = useMsg();

    const [bulan, setBulan] = useState(propBulan || new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(propTahun || new Date().getFullYear());
    const [isPreview, setIsPreview] = useState(forcePreview);
    
    // Sync external props if they change
    useEffect(() => {
        if (propBulan) setBulan(propBulan);
        if (propTahun) setTahun(propTahun);
    }, [propBulan, propTahun]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Active sub-menu inside the widget
    const [activeTab, setActiveTab] = useState(defaultTab); // 'realisasi' or 'pnbp'

    // Data states
    const [rmData, setRmData] = useState(getDefaultRealisasiData());
    const [pnpData, setPnpData] = useState(getDefaultRealisasiData());
    const [bendaharaData, setBendaharaData] = useState(getDefaultBendaharaData());

    const loadData = useCallback(async (b, t) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', SEKSI_ID_TU)
                .eq('bulan', b)
                .eq('tahun', t)
                .maybeSingle();

            if (error) throw error;

            if (data?.template_data?.keuangan) {
                let k = data.template_data.keuangan;
                
                // --- Legacy Map to Array Migration ---
                if (k.rm && !Array.isArray(k.rm)) {
                     k.rm = REALISASI_ROWS.map(r => ({ id: r.id, label: r.label, ...(k.rm[r.id] || {}) }));
                     k.pnp = REALISASI_ROWS.map(r => ({ id: r.id, label: r.label, ...(k.pnp[r.id] || {}) }));
                     k.bendahara = BENDAHARA_ROWS.map(r => ({ id: r.id, no: r.no, akun: r.akun, label: r.label, ...(k.bendahara[r.id] || {}) }));
                }

                setRmData(k.rm || getDefaultRealisasiData());
                setPnpData(k.pnp || getDefaultRealisasiData());
                setBendaharaData(k.bendahara || getDefaultBendaharaData());
            } else {
                setRmData(getDefaultRealisasiData());
                setPnpData(getDefaultRealisasiData());
                setBendaharaData(getDefaultBendaharaData());
            }
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal memuat: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [showMsg]);

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun, loadData]);

    // Deep link scroll
    useEffect(() => {
        if (!defaultSubSection) return;
        const sectionMap = {
            'bab2_fasilitatif_keuangan_rm': 'sec_rm',
            'bab2_fasilitatif_keuangan_pnp': 'sec_pnp',
            'bab2_fasilitatif_keuangan_gabungan': 'sec_gabungan',
            'bab2_fasilitatif_keuangan_pnbp': 'sec_bendahara',
        };
        const anchorId = sectionMap[defaultSubSection];
        if (!anchorId) return;
        const t = setTimeout(() => {
            const el = document.getElementById(anchorId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultSubSection]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: existing } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', SEKSI_ID_TU)
                .eq('bulan', bulan)
                .eq('tahun', tahun)
                .maybeSingle();

            const existingData = existing?.template_data || {};
            const newKeuangan = { rm: rmData, pnp: pnpData, bendahara: bendaharaData };
            const newTemplateData = { ...existingData, keuangan: newKeuangan };

            const { error } = await supabase.from('laporan_template').upsert({
                seksi_id: SEKSI_ID_TU,
                bulan, tahun,
                template_data: newTemplateData,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'seksi_id,bulan,tahun' });

            if (error) throw error;
            showMsg('success', `✅ Data Keuangan ${BULAN_NAMES[bulan]} ${tahun} berhasil disimpan!`);
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal simpan: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleRmChange = (rowId, key, val) => {
        setRmData(prev => ({ ...prev, [rowId]: { ...prev[rowId], [key]: val }}));
        setHasChanges(true);
    };

    const handlePnpChange = (rowId, key, val) => {
        setPnpData(prev => ({ ...prev, [rowId]: { ...prev[rowId], [key]: val }}));
        setHasChanges(true);
    };

    const handleBendaharaChange = (rowId, key, val) => {
        setBendaharaData(prev => ({ ...prev, [rowId]: { ...prev[rowId], [key]: val }}));
        setHasChanges(true);
    };

    const gabunganDataComputed = useMemo(() => calcGabungan(rmData, pnpData), [rmData, pnpData]);

    return (
        <div style={{ fontFamily: FONT, padding: embedded ? '0' : '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Toolbar */}
            {!forcePreview && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '16px', padding: '12px 16px', background: '#1e293b', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select value={bulan} onChange={e => setBulan(parseInt(e.target.value))}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 'bold', background: '#fff', cursor: 'pointer' }}>
                            {BULAN_NAMES.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                        </select>
                        <select value={tahun} onChange={e => setTahun(parseInt(e.target.value))}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 'bold', background: '#fff', cursor: 'pointer' }}>
                            {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setIsPreview(false)}
                        style={{ padding: '6px 14px', borderRadius: '6px', background: !isPreview ? '#a855f7' : '#475569', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                        ✏️ Edit
                    </button>
                    <button onClick={() => setIsPreview(true)}
                        style={{ padding: '6px 14px', borderRadius: '6px', background: isPreview ? '#0891b2' : '#475569', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                        👁 Preview
                    </button>
                    <button onClick={handleSave} disabled={saving || loading}
                        style={{ padding: '6px 16px', borderRadius: '6px', background: '#16a34a', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer', opacity: (saving || loading) ? 0.6 : 1 }}>
                        {saving ? '💾 Menyimpan...' : '💾 Simpan'}
                    </button>
                    <button
                        onClick={async () => {
                            if (hasChanges) {
                                showMsg('error', '⚠️ Harap simpan perubahan terlebih dahulu (klik tombol Simpan) sebelum mengekspor!');
                                return;
                            }
                            showMsg('info', 'Mengambil data seluruh Tata Usaha...');
                            try {
                                const { data, error } = await supabase
                                    .from('laporan_template')
                                    .select('template_data')
                                    .eq('seksi_id', SEKSI_ID_TU)
                                    .eq('bulan', bulan)
                                    .eq('tahun', tahun)
                                    .maybeSingle();
                                
                                if (error) throw error;
                                const td = data?.template_data || {};
                                
                                const bName = BULAN_NAMES[bulan] || '';
                                const { exportStandaloneTemplateDocx, getKeuanganDocxElements, getKepegawaianDocxElements, getUmumDocxElements } = await import('../../../utils/templateDocxExporter.js');
                                
                                const elems = [];
                                
                                // 1. Keuangan (Use local state to be safe, or db. Here we use db to be consistent, but user was prompted to save first)
                                elems.push(...getKeuanganDocxElements('rm', td, bName, tahun));
                                elems.push(...getKeuanganDocxElements('pnp', td, bName, tahun));
                                elems.push(...getKeuanganDocxElements('gabungan', td, bName, tahun));
                                elems.push(...getKeuanganDocxElements('bendahara', td, bName, tahun));
                                
                                // 2. Kepegawaian
                                elems.push(...getKepegawaianDocxElements('bezetting', td, bName, tahun));
                                elems.push(...getKepegawaianDocxElements('rekap', td, bName, tahun));
                                elems.push(...getKepegawaianDocxElements('cuti', td, bName, tahun));
                                elems.push(...getKepegawaianDocxElements('pembinaan', td, bName, tahun));
                                elems.push(...getKepegawaianDocxElements('persuratan', td, bName, tahun));
                                
                                // 3. Umum
                                elems.push(...getUmumDocxElements('kendaraan', td, bName, tahun));
                                elems.push(...getUmumDocxElements('sarana', td, bName, tahun));
                                elems.push(...getUmumDocxElements('gedung', td, bName, tahun));
                                
                                await exportStandaloneTemplateDocx({
                                    title: 'B. BIDANG FASILITATIF',
                                    filename: 'Template_TataUsaha_Gabungan',
                                    bulanName: bName,
                                    tahun,
                                    elements: elems,
                                    isLandscape: true
                                });
                                showMsg('success', '✅ Ekspor Tata Usaha Gabungan berhasil!');
                            } catch (err) {
                                showMsg('error', '❌ Gagal ekspor Word: ' + err.message);
                            }
                        }}
                        disabled={saving || loading}
                        style={{ padding: '6px 14px', borderRadius: '6px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                        title="Cetak seluruh template Tata Usaha (Keuangan, Kepegawaian, Umum)"
                    >
                        📄 Ekspor Tata Usaha
                    </button>
                </div>
            )}

            {/* Notification */}
            {msg && (
                <div style={{ marginBottom: '12px', padding: '10px 16px', borderRadius: '8px', background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#15803d' : '#b91c1c', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
                    {msg.text}
                </div>
            )}
            {hasChanges && !isPreview && (
                <div style={{ marginBottom: '12px', padding: '8px 16px', borderRadius: '8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', fontSize: '12px' }}>
                    ⚠️ Ada perubahan yang belum disimpan
                </div>
            )}

            {/* Tabs switcher for non-preview mode to avoid clutter */}
            {!isPreview && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button onClick={() => setActiveTab('realisasi')} style={{ padding: '8px 16px', border: 'none', background: activeTab === 'realisasi' ? '#eff6ff' : 'transparent', color: activeTab === 'realisasi' ? '#1d4ed8' : '#64748b', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px' }}>
                        1. Laporan Realisasi Anggaran
                    </button>
                    <button onClick={() => setActiveTab('pnbp')} style={{ padding: '8px 16px', border: 'none', background: activeTab === 'pnbp' ? '#eff6ff' : 'transparent', color: activeTab === 'pnbp' ? '#1d4ed8' : '#64748b', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px' }}>
                        2. PNBP Bendahara Penerima
                    </button>
                </div>
            )}

            {/* Title container for Export match */}
            {isPreview && (
                <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px', whiteSpace: 'pre-line' }}>
                    {activeTab === 'realisasi' ? (
`1) URUSAN KEUANGAN
1. LAPORAN REALISASI PENYERAPAN ANGGARAN (BERDASARKAN JENIS BELANJA)`
                    ) : (
`2. PENERIMAAN NEGARA BUKAN PAJAK (PNBP)
LAPORAN BENDAHARA PENERIMA`
                    )}
                </div>
            )}

            {/* Content Area */}
            {(activeTab === 'realisasi' || isPreview) && (
                <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px' }}>
                    <div id="sec_rm" style={{ scrollMarginTop: '16px' }}>
                        <TableRealisasi title="a. Rupiah Murni (RM)" data={rmData} onChange={handleRmChange} isPreview={isPreview} loading={loading} />
                    </div>
                    <div id="sec_pnp" style={{ scrollMarginTop: '16px' }}>
                        <TableRealisasi title="b. Penerimaan Non Pajak (PNBP)" data={pnpData} onChange={handlePnpChange} isPreview={isPreview} loading={loading} />
                    </div>
                    {/* Gabungan is always readonly */}
                    <div id="sec_gabungan" style={{ scrollMarginTop: '16px' }}>
                        <TableRealisasi title="c. Rupiah Murni + PNBP" data={gabunganDataComputed} onChange={()=>{}} isPreview={isPreview} readOnly={true} loading={loading} />
                    </div>
                </div>
            )}

            {(activeTab === 'pnbp' || isPreview) && (
                <div id="sec_bendahara" style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', scrollMarginTop: '16px' }}>
                    <TableBendahara data={bendaharaData} onChange={handleBendaharaChange} isPreview={isPreview} loading={loading} />
                </div>
            )}
        </div>
    );
}
