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
    const { rows, total } = readOnly ? data : calcRealisasiTotals(data);

    const PaguCol = (id) => isPreview || readOnly ? formatRp(rows[id].pagu) : <InputRp value={rows[id].pagu} onChange={v => onChange(id, 'pagu', v)} disabled={loading} />;
    const TargRpCol = (id) => isPreview || readOnly ? formatRp(rows[id].target_rp) : <InputRp value={rows[id].target_rp} onChange={v => onChange(id, 'target_rp', v)} disabled={loading} />;
    const RealRpCol = (id) => isPreview || readOnly ? formatRp(rows[id].realisasi_rp) : <InputRp value={rows[id].realisasi_rp} onChange={v => onChange(id, 'realisasi_rp', v)} disabled={loading} />;
    const KetCol = (id) => isPreview || readOnly ? rows[id].keterangan : (
        <input type="text" value={rows[id].keterangan || ''} onChange={e => onChange(id, 'keterangan', e.target.value)} disabled={loading}
               style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: FONT, fontSize: '9pt' }} />
    );

    return (
        <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
            <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '8px' }}>{title}</div>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px' }}>
                <thead>
                    <tr>
                        <th rowSpan={2} style={th()}>JENIS BELANJA</th>
                        <th rowSpan={2} style={th()}>PAGU</th>
                        <th colSpan={2} style={th()}>TARGET</th>
                        <th colSpan={2} style={th()}>REALISASI</th>
                        <th rowSpan={2} style={th()}>SISA DANA</th>
                        <th rowSpan={2} style={th()}>KETERANGAN</th>
                    </tr>
                    <tr>
                        <th style={th({ width: '100px' })}>Rp.</th>
                        <th style={th({ width: '60px' })}>(%)</th>
                        <th style={th({ width: '100px' })}>Rp.</th>
                        <th style={th({ width: '60px' })}>(%)</th>
                    </tr>
                </thead>
                <tbody>
                    {REALISASI_ROWS.map((r, idx) => {
                        const isNoInput = readOnly && Object.keys(rows).length === 0;
                        if (isNoInput) return null; // safety check
                        const pt = rows[r.id].pagu === 0; // Check if pagu is 0
                        return (
                            <tr key={r.id}>
                                <td style={td()}>{r.label}</td>
                                <td style={td({ textAlign: 'right', background: pt && !readOnly ? '#fafafa' : '#fff' })}>{PaguCol(r.id)}</td>
                                <td style={td({ textAlign: 'right', background: pt && !readOnly ? '#fafafa' : '#fff' })}>{pt ? '-' : TargRpCol(r.id)}</td>
                                <td style={td({ textAlign: 'center', background: '#f8fafc' })}>{pt ? '-' : formatPct(rows[r.id].target_pct)}</td>
                                <td style={td({ textAlign: 'right', background: pt && !readOnly ? '#fafafa' : '#fff' })}>{pt ? '-' : RealRpCol(r.id)}</td>
                                <td style={td({ textAlign: 'center', background: '#f8fafc' })}>{pt ? '-' : formatPct(rows[r.id].realisasi_pct)}</td>
                                <td style={td({ textAlign: 'right', background: '#f8fafc' })}>{pt ? '-' : formatRp(rows[r.id].sisa_dana)}</td>
                                <td style={td({ background: '#fff' })}>{KetCol(r.id)}</td>
                            </tr>
                        );
                    })}
                    {/* Total Row */}
                    <tr>
                        <td style={td({ textAlign: 'center', fontWeight: 'bold' })}>JUMLAH</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total.pagu)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total.target_rp)}</td>
                        <td style={td({ textAlign: 'center', fontWeight: 'bold', background: '#f8fafc' })}>{formatPct(total.target_pct)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total.realisasi_rp)}</td>
                        <td style={td({ textAlign: 'center', fontWeight: 'bold', background: '#f8fafc' })}>{formatPct(total.realisasi_pct)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total.sisa_dana)}</td>
                        <td style={td({ background: '#f8fafc' })}></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ─── COMPONENT: Bendahara Penerima ───────────────────────────────────────────
function TableBendahara({ data, onChange, isPreview, loading }) {
    const { rows, total } = calcBendaharaTotals(data);

    const TargCol = (id) => isPreview ? formatRp(rows[id].target) : <InputRp value={rows[id].target} onChange={v => onChange(id, 'target', v)} disabled={loading} />;
    const SimpCol = (id) => isPreview ? formatRp(rows[id].realisasi_simponi) : <InputRp value={rows[id].realisasi_simponi} onChange={v => onChange(id, 'realisasi_simponi', v)} disabled={loading} />;
    const SpanCol = (id) => isPreview ? formatRp(rows[id].realisasi_span) : <InputRp value={rows[id].realisasi_span} onChange={v => onChange(id, 'realisasi_span', v)} disabled={loading} />;

    return (
        <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '800px' }}>
                <thead>
                    <tr>
                        <th style={th({ width: '40px' })}>NO.</th>
                        <th style={th({ width: '80px' })}>KODE AKUN</th>
                        <th style={th()}>JENIS PENDAPATAN</th>
                        <th style={th({ width: '130px' })}>TARGET</th>
                        <th style={th({ width: '130px' })}>REALISASI SIMPONI</th>
                        <th style={th({ width: '130px' })}>REALISASI SPAN</th>
                    </tr>
                </thead>
                <tbody>
                    {BENDAHARA_ROWS.map(r => (
                        <tr key={r.id}>
                            <td style={td({ textAlign: 'center' })}>{r.no}</td>
                            <td style={td({ textAlign: 'center' })}>{r.akun}</td>
                            <td style={td()}>{r.label}</td>
                            <td style={td({ textAlign: 'right' })}>{TargCol(r.id)}</td>
                            <td style={td({ textAlign: 'right' })}>{SimpCol(r.id)}</td>
                            <td style={td({ textAlign: 'right' })}>{SpanCol(r.id)}</td>
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={3} style={td({ textAlign: 'center', fontWeight: 'bold' })}>TOTAL</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total.target)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total.realisasi_simponi)}</td>
                        <td style={td({ textAlign: 'right', fontWeight: 'bold', background: '#f8fafc' })}>{formatRp(total.realisasi_span)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}


// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function TemplateKeuangan({ defaultTab = 'realisasi', embedded = false, defaultSubSection = null }) {
    const [msg, showMsg] = useMsg();

    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [isPreview, setIsPreview] = useState(false);
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
                const k = data.template_data.keuangan;
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
            </div>

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
