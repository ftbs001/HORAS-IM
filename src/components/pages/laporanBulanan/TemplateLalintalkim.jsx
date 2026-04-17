/**
 * TemplateLalintalkim.jsx
 * Template editable untuk Seksi Lalintalkim — BAB II
 *
 * Tabs:
 *   a. Penerbitan Paspor
 *   b. Penerbitan Izin Tinggal
 *   c. Rekapitulasi Data Perlintasan
 *
 * Standardisasi: header/toolbar sama dengan TemplateKeuangan, TemplateUmum, TemplateKepegawaian
 * Semua cell tabel dapat diedit langsung dengan keyboard, nilai tersimpan ke Supabase
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

const FONT = '"Times New Roman", Georgia, serif';
const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
const SEKSI_ID = 2; // Lalintalkim

// ── DEFAULT DATA ──────────────────────────────────────────────────────────────
const DEFAULT_PASPOR_ROWS = [
    { id: 'p1', jenis: 'Paspor 48 Hal - Biasa', baru: 0, penggantian: 0, hilang: 0, rusak: 0 },
    { id: 'p2', jenis: 'Paspor 48 Hal - Elektronik', baru: 0, penggantian: 0, hilang: 0, rusak: 0 },
    { id: 'p3', jenis: 'Paspor 24 Hal - Biasa', baru: 0, penggantian: 0, hilang: 0, rusak: 0 },
    { id: 'p4', jenis: 'Pas Lintas Batas (PLB)', baru: 0, penggantian: 0, hilang: 0, rusak: 0 },
    { id: 'p5', jenis: 'SPLP', baru: 0, penggantian: 0, hilang: 0, rusak: 0 },
];

const DEFAULT_IZIN_ROWS = [
    { id: 'i1', jenis: 'Izin Kunjungan (ITK)', l: 0, p: 0 },
    { id: 'i2', jenis: 'Izin Tinggal Terbatas (ITAS)', l: 0, p: 0 },
    { id: 'i3', jenis: 'Izin Tinggal Tetap (ITAP)', l: 0, p: 0 },
    { id: 'i4', jenis: 'Lain-lain', l: 0, p: 0 },
];

const DEFAULT_PERLINTASAN_ROWS = [
    { id: 'pl1', kategori: 'WNI Keluar', l: 0, p: 0 },
    { id: 'pl2', kategori: 'WNI Masuk', l: 0, p: 0 },
    { id: 'pl3', kategori: 'WNA Keluar', l: 0, p: 0 },
    { id: 'pl4', kategori: 'WNA Masuk', l: 0, p: 0 },
];

const getDefaultData = () => ({
    paspor: DEFAULT_PASPOR_ROWS.map(r => ({ ...r })),
    izin: DEFAULT_IZIN_ROWS.map(r => ({ ...r })),
    perlintasan: DEFAULT_PERLINTASAN_ROWS.map(r => ({ ...r })),
    catatanPaspor: '',
    catatanIzin: '',
    catatanPerlintasan: '',
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
const thS = (extra = {}) => ({
    border: '1px solid #000', padding: '5px 6px',
    background: '#bdd7ee', fontFamily: FONT, fontSize: '9pt',
    fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle',
    ...extra,
});

const tdS = (extra = {}) => ({
    border: '1px solid #000', padding: '3px 6px',
    fontFamily: FONT, fontSize: '9pt',
    ...extra,
});

const inputStyle = (disabled) => ({
    width: '100%', border: 'none', outline: 'none', fontSize: '9pt',
    fontFamily: FONT, background: disabled ? '#f1f5f9' : 'transparent',
    textAlign: 'center',
});

const NumInput = ({ value, onChange, disabled }) => (
    <td style={{ border: '1px solid #aaa', padding: '2px', textAlign: 'center' }}>
        <input
            type="number" min={0}
            value={value === 0 ? '' : value}
            onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={disabled}
            placeholder="0"
            style={{ ...inputStyle(disabled), width: '100%', minWidth: '36px' }}
        />
    </td>
);

const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 5000);
    }, []);
    return [msg, show];
};

// ── TAB: PENERBITAN PASPOR ────────────────────────────────────────────────────
function TabelPaspor({ rows, onChange, disabled }) {
    const total = (field) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
    const totalPerRow = (r) => (Number(r.baru) || 0) + (Number(r.penggantian) || 0) + (Number(r.hilang) || 0) + (Number(r.rusak) || 0);

    const updateRow = (idx, field, val) => {
        const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r);
        onChange(next);
    };

    return (
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: FONT }}>
                <thead>
                    <tr>
                        <th style={thS({ width: '36px' })}>NO</th>
                        <th style={thS()}>JENIS PASPOR / DOKUMEN</th>
                        <th style={thS({ width: '70px' })}>BARU</th>
                        <th style={thS({ width: '70px' })}>PENGGANTIAN</th>
                        <th style={thS({ width: '70px' })}>HILANG</th>
                        <th style={thS({ width: '70px' })}>RUSAK</th>
                        <th style={thS({ width: '70px' })}>JUMLAH</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id}>
                            <td style={tdS({ textAlign: 'center' })}>{i + 1}.</td>
                            <td style={{ border: '1px solid #aaa', padding: '3px 6px' }}>
                                <input
                                    value={r.jenis || ''}
                                    onChange={e => updateRow(i, 'jenis', e.target.value)}
                                    disabled={disabled}
                                    style={{ ...inputStyle(disabled), textAlign: 'left', width: '100%' }}
                                    placeholder="Jenis paspor..."
                                />
                            </td>
                            {['baru', 'penggantian', 'hilang', 'rusak'].map(f => (
                                <NumInput key={f} value={r[f] || 0} disabled={disabled}
                                    onChange={v => updateRow(i, f, v)} />
                            ))}
                            <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#e8f5e9' })}>
                                {totalPerRow(r) || '-'}
                            </td>
                        </tr>
                    ))}
                    {/* Add row button */}
                    {!disabled && (
                        <tr>
                            <td colSpan={7} style={{ padding: '4px', border: '1px dashed #aaa' }}>
                                <button onClick={() => onChange([...rows, { id: `p${Date.now()}`, jenis: '', baru: 0, penggantian: 0, hilang: 0, rusak: 0 }])}
                                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px' }}>
                                    + Tambah Baris
                                </button>
                                {rows.length > 1 && (
                                    <button onClick={() => onChange(rows.slice(0, -1))}
                                        style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px' }}>
                                        × Hapus Baris
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                    {/* Total row */}
                    <tr style={{ background: '#c6efce' }}>
                        <td colSpan={2} style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>JUMLAH</td>
                        {['baru', 'penggantian', 'hilang', 'rusak'].map(f => (
                            <td key={f} style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>
                                {total(f) || '-'}
                            </td>
                        ))}
                        <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>
                            {rows.reduce((s, r) => s + totalPerRow(r), 0) || '-'}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ── TAB: PENERBITAN IZIN TINGGAL ──────────────────────────────────────────────
function TabelIzinTinggal({ rows, onChange, disabled }) {
    const updateRow = (idx, field, val) => {
        const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r);
        onChange(next);
    };

    const total = (f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);

    return (
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: FONT }}>
                <thead>
                    <tr>
                        <th style={thS({ width: '36px' })}>NO</th>
                        <th style={thS()}>JENIS IZIN TINGGAL</th>
                        <th style={thS({ width: '70px' })}>L</th>
                        <th style={thS({ width: '70px' })}>P</th>
                        <th style={thS({ width: '70px' })}>JUMLAH</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id}>
                            <td style={tdS({ textAlign: 'center' })}>{i + 1}.</td>
                            <td style={{ border: '1px solid #aaa', padding: '3px 6px' }}>
                                <input value={r.jenis || ''} onChange={e => updateRow(i, 'jenis', e.target.value)}
                                    disabled={disabled} style={{ ...inputStyle(disabled), textAlign: 'left', width: '100%' }} placeholder="Jenis izin tinggal..." />
                            </td>
                            <NumInput value={r.l || 0} disabled={disabled} onChange={v => updateRow(i, 'l', v)} />
                            <NumInput value={r.p || 0} disabled={disabled} onChange={v => updateRow(i, 'p', v)} />
                            <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#e8f5e9' })}>
                                {((Number(r.l) || 0) + (Number(r.p) || 0)) || '-'}
                            </td>
                        </tr>
                    ))}
                    {!disabled && (
                        <tr>
                            <td colSpan={5} style={{ padding: '4px', border: '1px dashed #aaa' }}>
                                <button onClick={() => onChange([...rows, { id: `i${Date.now()}`, jenis: '', l: 0, p: 0 }])}
                                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px' }}>
                                    + Tambah Baris
                                </button>
                                {rows.length > 1 && (
                                    <button onClick={() => onChange(rows.slice(0, -1))}
                                        style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px' }}>
                                        × Hapus Baris
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                    <tr style={{ background: '#c6efce' }}>
                        <td colSpan={2} style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>JUMLAH</td>
                        <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>{total('l') || '-'}</td>
                        <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>{total('p') || '-'}</td>
                        <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>
                            {(total('l') + total('p')) || '-'}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ── TAB: REKAPITULASI DATA PERLINTASAN ────────────────────────────────────────
function TabelPerlintasan({ rows, onChange, disabled }) {
    const updateRow = (idx, field, val) => {
        const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r);
        onChange(next);
    };

    const total = (f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);

    return (
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: FONT }}>
                <thead>
                    <tr>
                        <th style={thS({ width: '36px' })}>NO</th>
                        <th style={thS()}>KATEGORI PERLINTASAN</th>
                        <th style={thS({ width: '80px' })}>L</th>
                        <th style={thS({ width: '80px' })}>P</th>
                        <th style={thS({ width: '80px' })}>JUMLAH</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id}>
                            <td style={tdS({ textAlign: 'center' })}>{i + 1}.</td>
                            <td style={{ border: '1px solid #aaa', padding: '3px 6px' }}>
                                <input value={r.kategori || ''} onChange={e => updateRow(i, 'kategori', e.target.value)}
                                    disabled={disabled} style={{ ...inputStyle(disabled), textAlign: 'left', width: '100%' }} placeholder="Kategori perlintasan..." />
                            </td>
                            <NumInput value={r.l || 0} disabled={disabled} onChange={v => updateRow(i, 'l', v)} />
                            <NumInput value={r.p || 0} disabled={disabled} onChange={v => updateRow(i, 'p', v)} />
                            <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#e8f5e9' })}>
                                {((Number(r.l) || 0) + (Number(r.p) || 0)) || '-'}
                            </td>
                        </tr>
                    ))}
                    {!disabled && (
                        <tr>
                            <td colSpan={5} style={{ padding: '4px', border: '1px dashed #aaa' }}>
                                <button onClick={() => onChange([...rows, { id: `pl${Date.now()}`, kategori: '', l: 0, p: 0 }])}
                                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px' }}>
                                    + Tambah Baris
                                </button>
                                {rows.length > 1 && (
                                    <button onClick={() => onChange(rows.slice(0, -1))}
                                        style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px' }}>
                                        × Hapus Baris
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                    <tr style={{ background: '#c6efce' }}>
                        <td colSpan={2} style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>JUMLAH</td>
                        <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>{total('l') || '-'}</td>
                        <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>{total('p') || '-'}</td>
                        <td style={tdS({ textAlign: 'center', fontWeight: 'bold', background: '#c6efce' })}>
                            {(total('l') + total('p')) || '-'}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'paspor', label: '📄 Penerbitan Paspor' },
    { id: 'izin', label: '🪪 Izin Tinggal' },
    { id: 'perlintasan', label: '🚶 Data Perlintasan' },
];

export default function TemplateLalintalkim({ embedded = false, defaultTab = 'paspor' }) {
    const { user } = useAuth();
    const [msg, showMsg] = useMsg();

    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [isPreview, setIsPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);

    const [dataPaspor, setDataPaspor] = useState(getDefaultData().paspor);
    const [dataIzin, setDataIzin] = useState(getDefaultData().izin);
    const [dataPerlintasan, setDataPerlintasan] = useState(getDefaultData().perlintasan);

    const loadData = useCallback(async (b, t) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', SEKSI_ID)
                .eq('bulan', b)
                .eq('tahun', t)
                .maybeSingle();
            if (error) throw error;
            const def = getDefaultData();
            const td = data?.template_data?.lalintalkim;
            if (td) {
                setDataPaspor(td.paspor || def.paspor);
                setDataIzin(td.izin || def.izin);
                setDataPerlintasan(td.perlintasan || def.perlintasan);
            } else {
                setDataPaspor(def.paspor);
                setDataIzin(def.izin);
                setDataPerlintasan(def.perlintasan);
            }
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal memuat: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [showMsg]);

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun, loadData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Fetch existing to merge (don't overwrite other templates in same row)
            const { data: existing } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', SEKSI_ID)
                .eq('bulan', bulan)
                .eq('tahun', tahun)
                .maybeSingle();

            const existingData = existing?.template_data || {};
            const newTemplateData = {
                ...existingData,
                lalintalkim: {
                    paspor: dataPaspor,
                    izin: dataIzin,
                    perlintasan: dataPerlintasan,
                },
            };

            const { error } = await supabase
                .from('laporan_template')
                .upsert(
                    { seksi_id: SEKSI_ID, bulan, tahun, template_data: newTemplateData, updated_at: new Date().toISOString() },
                    { onConflict: 'seksi_id,bulan,tahun' }
                );
            if (error) throw error;
            showMsg('success', `✅ Data ${BULAN_NAMES[bulan]} ${tahun} berhasil disimpan!`);
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal simpan: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const wrap = (setter) => (val) => { setter(val); setHasChanges(true); };

    const tabBtnStyle = (id) => ({
        padding: '7px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
        fontFamily: FONT, fontSize: '12px', fontWeight: 'bold', transition: 'background 0.2s',
        background: activeTab === id ? '#3b82f6' : '#475569',
        color: '#fff',
    });

    const toolBtn = (variant = 'default') => ({
        padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
        fontFamily: FONT, fontSize: '12px', fontWeight: 'bold',
        ...(variant === 'primary' ? { background: '#16a34a', color: '#fff' } :
            variant === 'preview' ? { background: isPreview ? '#0891b2' : '#475569', color: '#fff' } :
            variant === 'edit' ? { background: !isPreview ? '#a855f7' : '#475569', color: '#fff' } :
            { background: '#475569', color: '#fff' }),
    });

    return (
        <div style={{ fontFamily: FONT, padding: embedded ? '0' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', padding: '12px 16px', background: '#1e293b', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select value={bulan} onChange={e => setBulan(parseInt(e.target.value))}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 'bold', background: '#fff', cursor: 'pointer' }}>
                        {BULAN_NAMES.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                    </select>
                    <select value={tahun} onChange={e => setTahun(parseInt(e.target.value))}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 'bold', background: '#fff', cursor: 'pointer' }}>
                        {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>📋 BAB II — {BULAN_NAMES[bulan]} {tahun}</span>
                </div>
                <div style={{ flex: 1 }} />
                <button onClick={() => setIsPreview(false)} style={toolBtn('edit')}>✏️ Edit</button>
                <button onClick={() => setIsPreview(true)} style={toolBtn('preview')}>👁 Preview</button>
                <button onClick={handleSave} disabled={saving || loading}
                    style={{ ...toolBtn('primary'), opacity: (saving || loading) ? 0.6 : 1, cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? '💾 Menyimpan...' : '💾 Simpan'}
                </button>
            </div>

            {/* ── TABS ────────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabBtnStyle(tab.id)}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
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
            {loading && (
                <div style={{ marginBottom: '12px', padding: '8px 16px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '12px' }}>
                    ⏳ Memuat data...
                </div>
            )}

            {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
                {activeTab === 'paspor' && (
                    <div>
                        <h3 style={{ fontFamily: FONT, fontSize: '11pt', fontWeight: 'bold', marginBottom: '14px', paddingBottom: '6px', borderBottom: '2px solid #bdd7ee' }}>
                            1. PENERBITAN DOKUMEN PERJALANAN INDONESIA — {BULAN_NAMES[bulan]} {tahun}
                        </h3>
                        <TabelPaspor rows={dataPaspor} onChange={wrap(setDataPaspor)} disabled={isPreview || loading} />
                    </div>
                )}

                {activeTab === 'izin' && (
                    <div>
                        <h3 style={{ fontFamily: FONT, fontSize: '11pt', fontWeight: 'bold', marginBottom: '14px', paddingBottom: '6px', borderBottom: '2px solid #bdd7ee' }}>
                            2. PENERBITAN IZIN TINGGAL — {BULAN_NAMES[bulan]} {tahun}
                        </h3>
                        <TabelIzinTinggal rows={dataIzin} onChange={wrap(setDataIzin)} disabled={isPreview || loading} />
                    </div>
                )}

                {activeTab === 'perlintasan' && (
                    <div>
                        <h3 style={{ fontFamily: FONT, fontSize: '11pt', fontWeight: 'bold', marginBottom: '14px', paddingBottom: '6px', borderBottom: '2px solid #bdd7ee' }}>
                            3. REKAPITULASI DATA PERLINTASAN — {BULAN_NAMES[bulan]} {tahun}
                        </h3>
                        <TabelPerlintasan rows={dataPerlintasan} onChange={wrap(setDataPerlintasan)} disabled={isPreview || loading} />
                    </div>
                )}
            </div>
        </div>
    );
}
