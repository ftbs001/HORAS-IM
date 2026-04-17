/**
 * TemplateUmum.jsx
 * UI Component for BIDANG FASILITATIF - 3. URUSAN UMUM
 *
 * Matches TemplateKeuangan style: dark toolbar, tabs, preview/edit toggle.
 * Three tabs: Kendaraan | Sarana | Gedung
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import {
    getDefaultUmumData, EMPTY_KENDARAAN, EMPTY_SARANA, EMPTY_GEDUNG
} from '../../../utils/umumSchema';

const SEKSI_ID_TU = 4;
const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
const FONT = '"Times New Roman", Georgia, serif';
const HEADER_BG = '#bdd7ee';

/* ── Style helpers (same as TemplateKeuangan) ─────────────────────────────── */
const th = (extra = {}) => ({
    border: '1px solid #000', padding: '4px 6px',
    background: HEADER_BG, fontFamily: FONT, fontSize: '9pt',
    fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle',
    ...extra
});

const td = (extra = {}) => ({
    border: '1px solid #000', padding: '3px 6px',
    fontFamily: FONT, fontSize: '9pt', verticalAlign: 'top', ...extra
});

const inputStyle = {
    width: '100%', border: 'none', outline: 'none', background: 'transparent',
    fontFamily: FONT, fontSize: '9pt', padding: '0'
};

/* ── Generic text input ───────────────────────────────────────────────────── */
const TdInput = ({ value, onChange, disabled, center, multiline }) => {
    if (disabled) {
        return (
            <div style={{ textAlign: center ? 'center' : 'left', whiteSpace: 'pre-line' }}>
                {value || ''}
            </div>
        );
    }
    if (multiline) {
        return (
            <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', whiteSpace: 'pre-wrap' }}
            />
        );
    }
    return (
        <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputStyle, textAlign: center ? 'center' : 'left' }}
        />
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1: KENDARAAN OPERASIONAL
═══════════════════════════════════════════════════════════════════════════ */
function KendaraanGroup({ numFormat, title, data, onChange, isPreview }) {
    const addRow = () => onChange([...data, { ...EMPTY_KENDARAAN, id: `new_${Date.now()}` }]);
    const removeRow = (idx) => onChange(data.filter((_, i) => i !== idx));
    const updateRow = (idx, field, val) => {
        const n = [...data];
        n[idx] = { ...n[idx], [field]: val };
        onChange(n);
    };

    if (isPreview) {
        if (!data || data.length === 0) {
            return (
                <tr>
                    <td style={td({ textAlign: 'center', fontWeight: 'bold' })}>{numFormat}</td>
                    <td style={td({ fontWeight: 'bold' })}>{title}</td>
                    <td style={td({ textAlign: 'center', fontStyle: 'italic' })} colSpan={3}>Nihil</td>
                </tr>
            );
        }
        return (
            <tr>
                <td style={td({ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' })}>{numFormat}</td>
                <td style={td({ verticalAlign: 'top' })}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{title}</div>
                    {data.map((r, i) => (
                        <div key={r.id || i}>{i + 1}. {r.jenis}</div>
                    ))}
                </td>
                <td style={td({ textAlign: 'center', verticalAlign: 'top' })}>
                    {data.map((r, i) => <div key={r.id || i}>{r.nopol}</div>)}
                </td>
                <td style={td({ textAlign: 'center', verticalAlign: 'top' })}>
                    {data.map((r, i) => <div key={r.id || i}>{r.tahun}</div>)}
                </td>
                <td style={td({ textAlign: 'center', verticalAlign: 'top' })}>
                    {data.map((r, i) => <div key={r.id || i}>{r.kondisi}</div>)}
                </td>
            </tr>
        );
    }

    // Edit mode
    return (
        <>
            {/* Group header row */}
            <tr style={{ background: '#f1f5f9' }}>
                <td style={{ ...td(), fontWeight: 'bold', color: '#1e40af' }}>{numFormat}</td>
                <td style={{ ...td(), fontWeight: 'bold', color: '#1e40af' }} colSpan={4}>
                    {title}
                    <button onClick={addRow} style={{
                        marginLeft: '12px', fontSize: '11px', background: '#3b82f6',
                        color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer'
                    }}>+ Tambah</button>
                    {data.length > 0 && (
                        <button onClick={() => onChange([])} style={{
                            marginLeft: '6px', fontSize: '11px', background: '#f59e0b',
                            color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer'
                        }}>Kosongkan (Nihil)</button>
                    )}
                </td>
            </tr>
            {data.length === 0 ? (
                <tr>
                    <td colSpan={6} style={{ ...td(), textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' }}>
                        — Nihil —
                    </td>
                </tr>
            ) : (
                data.map((row, idx) => (
                    <tr key={row.id || idx}>
                        <td style={td({ textAlign: 'center', width: '40px' })}>{idx + 1}</td>
                        <td style={td()}><TdInput value={row.jenis} onChange={v => updateRow(idx, 'jenis', v)} /></td>
                        <td style={td({ width: '140px' })}><TdInput value={row.nopol} onChange={v => updateRow(idx, 'nopol', v)} center /></td>
                        <td style={td({ width: '80px' })}><TdInput value={row.tahun} onChange={v => updateRow(idx, 'tahun', v)} center /></td>
                        <td style={td({ width: '120px' })}><TdInput value={row.kondisi} onChange={v => updateRow(idx, 'kondisi', v)} center /></td>
                        <td style={{ ...td(), textAlign: 'center', width: '36px' }}>
                            <button onClick={() => removeRow(idx)} style={{
                                color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                            }}>×</button>
                        </td>
                    </tr>
                ))
            )}
        </>
    );
}

function TabKendaraan({ data, onChange, isPreview }) {
    const groups = [
        { key: 'roda2', num: '01.', title: 'Kendaraan Roda 2' },
        { key: 'roda4', num: '02.', title: 'Kendaraan Roda 4' },
        { key: 'roda6', num: '03.', title: 'Kendaraan Roda 6' },
        { key: 'kapal', num: '04.', title: 'Kapal Patroli' },
    ];

    const tableStyle = { borderCollapse: 'collapse', width: '100%' };

    return (
        <div>
            {!isPreview && (
                <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>
                    a. Kendaraan Operasional
                </div>
            )}
            {isPreview && (
                <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '4px' }}>
                    a. Kendaraan Operasional
                </div>
            )}
            <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={th({ width: '40px' })}>NO</th>
                            <th style={th()}>JENIS KENDARAAN</th>
                            <th style={th({ width: '140px' })}>NO POLISI</th>
                            <th style={th({ width: '80px' })}>TAHUN</th>
                            <th style={th({ width: '120px' })}>KONDISI</th>
                            {!isPreview && <th style={th({ width: '36px' })}>-</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(g => (
                            <KendaraanGroup
                                key={g.key}
                                numFormat={g.num}
                                title={g.title}
                                data={data[g.key] || []}
                                onChange={v => onChange({ ...data, [g.key]: v })}
                                isPreview={isPreview}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2: SARANA DAN PRASARANA
═══════════════════════════════════════════════════════════════════════════ */
function TabSarana({ data, onChange, isPreview }) {
    const sarana = data.sarana || [];

    const addRow = () => {
        const newRow = { ...EMPTY_SARANA, id: `sarana_new_${Date.now()}` };
        onChange({ ...data, sarana: [...sarana, newRow] });
    };

    const removeRow = (idx) => {
        onChange({ ...data, sarana: sarana.filter((_, i) => i !== idx) });
    };

    const updateRow = (idx, field, val) => {
        const n = [...sarana];
        n[idx] = { ...n[idx], [field]: val };
        onChange({ ...data, sarana: n });
    };

    const KET_OPTIONS = ['Ada', 'Tidak Ada', 'Rusak', 'Dalam Perbaikan'];

    return (
        <div>
            <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '8px' }}>
                b. Sarana dan Prasarana
            </div>
            {!isPreview && (
                <div style={{ marginBottom: '8px' }}>
                    <button onClick={addRow} style={{
                        fontSize: '12px', background: '#3b82f6', color: '#fff',
                        border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer'
                    }}>+ Tambah Sarana</button>
                </div>
            )}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={th({ width: '40px' })}>NO</th>
                            <th style={th()}>JENIS SARANA</th>
                            <th style={th({ width: '160px' })}>KETERANGAN</th>
                            {!isPreview && <th style={th({ width: '36px' })}>-</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sarana.length === 0 ? (
                            <tr>
                                <td colSpan={isPreview ? 3 : 4} style={{ ...td(), textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' }}>
                                    — Nihil —
                                </td>
                            </tr>
                        ) : (
                            sarana.map((r, idx) => (
                                <tr key={r.id || idx}>
                                    <td style={td({ textAlign: 'center' })}>{String(idx + 1).padStart(2, '0')}.</td>
                                    <td style={td()}>
                                        {isPreview ? r.jenis : (
                                            <TdInput value={r.jenis} onChange={v => updateRow(idx, 'jenis', v)} />
                                        )}
                                    </td>
                                    <td style={td({ textAlign: 'center' })}>
                                        {isPreview ? r.keterangan : (
                                            <select
                                                value={r.keterangan || 'Ada'}
                                                onChange={e => updateRow(idx, 'keterangan', e.target.value)}
                                                style={{ width: '100%', border: 'none', fontFamily: FONT, fontSize: '9pt', background: 'transparent' }}
                                            >
                                                {KET_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                    {!isPreview && (
                                        <td style={{ ...td(), textAlign: 'center' }}>
                                            <button onClick={() => removeRow(idx)} style={{
                                                color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                                            }}>×</button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3: GEDUNG DAN BANGUNAN
═══════════════════════════════════════════════════════════════════════════ */
function TabGedung({ data, onChange, isPreview }) {
    const gedung = data.gedung || [];

    const addRow = () => {
        const newRow = { ...EMPTY_GEDUNG, id: `gedung_new_${Date.now()}` };
        onChange({ ...data, gedung: [...gedung, newRow] });
    };

    const removeRow = (idx) => {
        onChange({ ...data, gedung: gedung.filter((_, i) => i !== idx) });
    };

    const updateRow = (idx, field, val) => {
        const n = [...gedung];
        n[idx] = { ...n[idx], [field]: val };
        onChange({ ...data, gedung: n });
    };

    return (
        <div>
            <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '8px' }}>
                c. Gedung Dan Bangunan
            </div>
            {!isPreview && (
                <div style={{ marginBottom: '8px' }}>
                    <button onClick={addRow} style={{
                        fontSize: '12px', background: '#3b82f6', color: '#fff',
                        border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer'
                    }}>+ Tambah Baris</button>
                </div>
            )}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={th({ width: '40px' })}>NO</th>
                            <th style={th({ width: '110px' })}>OBJEK</th>
                            <th style={th()}>STATUS KEPEMILIKAN</th>
                            <th style={th()}>KETERANGAN</th>
                            {!isPreview && <th style={th({ width: '36px' })}>-</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {gedung.length === 0 ? (
                            <tr>
                                <td colSpan={isPreview ? 4 : 5} style={{ ...td(), textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' }}>
                                    — Nihil —
                                </td>
                            </tr>
                        ) : (
                            gedung.map((r, idx) => (
                                <tr key={r.id || idx}>
                                    <td style={td({ textAlign: 'center' })}>{String(idx + 1).padStart(2, '0')}.</td>
                                    <td style={td()}>
                                        {isPreview
                                            ? <div style={{ whiteSpace: 'pre-line' }}>{r.objek}</div>
                                            : <TdInput value={r.objek} onChange={v => updateRow(idx, 'objek', v)} />
                                        }
                                    </td>
                                    <td style={td({ textAlign: 'center' })}>
                                        {isPreview
                                            ? <div style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>{r.status}</div>
                                            : <TdInput value={r.status} onChange={v => updateRow(idx, 'status', v)} multiline />
                                        }
                                    </td>
                                    <td style={td()}>
                                        {isPreview
                                            ? <div style={{ whiteSpace: 'pre-line' }}>{r.keterangan}</div>
                                            : <TdInput value={r.keterangan} onChange={v => updateRow(idx, 'keterangan', v)} multiline />
                                        }
                                    </td>
                                    {!isPreview && (
                                        <td style={{ ...td(), textAlign: 'center' }}>
                                            <button onClick={() => removeRow(idx)} style={{
                                                color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                                            }}>×</button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 4000);
    }, []);
    return [msg, show];
};

export default function TemplateUmum({ embedded = false, defaultTab = 'kendaraan' }) {
    const { user } = useAuth();
    const d = new Date();
    const [bulan, setBulan] = useState(d.getMonth() + 1);
    const [tahun, setTahun] = useState(d.getFullYear());
    const [uData, setUData] = useState(getDefaultUmumData());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [msg, showMsg] = useMsg();

    // Load from TU shared row (seksi_id=4)
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

            if (!error && data?.template_data?.umum) {
                // Merge with defaults so new keys (e.g. gedung) are always present
                const saved = data.template_data.umum;
                const defaults = getDefaultUmumData();
                setUData({
                    roda2: saved.roda2 ?? defaults.roda2,
                    roda4: saved.roda4 ?? defaults.roda4,
                    roda6: saved.roda6 ?? defaults.roda6,
                    kapal: saved.kapal ?? defaults.kapal,
                    sarana: saved.sarana ?? defaults.sarana,
                    gedung: saved.gedung ?? defaults.gedung,
                });
            } else {
                setUData(getDefaultUmumData());
            }
            setHasChanges(false);
        } catch (err) {
            console.error('[TemplateUmum] load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(bulan, tahun);
    }, [bulan, tahun, loadData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Fetch existing to merge
            const { data: existing } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', SEKSI_ID_TU)
                .eq('bulan', bulan)
                .eq('tahun', tahun)
                .maybeSingle();

            const existingData = existing?.template_data || {};
            const newTemplateData = { ...existingData, umum: uData };

            const { error } = await supabase
                .from('laporan_template')
                .upsert(
                    { seksi_id: SEKSI_ID_TU, bulan, tahun, template_data: newTemplateData, updated_at: new Date().toISOString() },
                    { onConflict: 'seksi_id,bulan,tahun' }
                );

            if (error) throw error;
            showMsg('success', '✅ Data Urusan Umum berhasil disimpan!');
            setHasChanges(false);
        } catch (err) {
            showMsg('error', '❌ Gagal menyimpan: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const updateData = (newData) => {
        setUData(newData);
        setHasChanges(true);
    };

    const TABS = [
        { id: 'kendaraan', label: '🚗 Kendaraan' },
        { id: 'sarana', label: '🏢 Sarana' },
        { id: 'gedung', label: '🏛 Gedung' },
    ];

    // Toolbar button style (matches TemplateKeuangan)
    const toolBtn = (variant = 'default') => ({
        padding: '5px 12px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: FONT,
        fontSize: '11px',
        fontWeight: 'bold',
        ...(variant === 'primary' ? { background: '#3b82f6', color: '#fff' } :
            variant === 'success' ? { background: '#22c55e', color: '#fff' } :
            variant === 'warning' ? { background: '#f59e0b', color: '#fff' } :
            { background: '#fff', color: '#1e293b' })
    });

    const tabBtn = (id) => ({
        padding: '5px 16px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: FONT,
        fontSize: '11px',
        fontWeight: activeTab === id ? 'bold' : 'normal',
        background: activeTab === id ? '#fff' : 'transparent',
        color: activeTab === id ? '#1e40af' : '#cbd5e1',
        boxShadow: activeTab === id ? '0 1px 3px rgba(0,0,0,.2)' : 'none',
    });

    return (
        <div style={{ fontFamily: FONT, padding: embedded ? '0' : '24px', background: embedded ? 'transparent' : '#f8fafc', minHeight: embedded ? 'auto' : '100vh' }}>

            {/* ── Toolbar ── */}
            <div style={{
                display: 'flex', gap: '8px', flexWrap: 'wrap',
                alignItems: 'center', padding: '10px 14px',
                background: '#1e293b', borderRadius: '8px', marginBottom: '12px'
            }}>
                <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: FONT }}>Bulan:</span>
                <select value={bulan} onChange={e => setBulan(parseInt(e.target.value))}
                    style={{ padding: '4px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: FONT }}>
                    {BULAN_NAMES.slice(1).map((n, i) => (
                        <option key={i + 1} value={i + 1}>{n}</option>
                    ))}
                </select>
                <select value={tahun} onChange={e => setTahun(parseInt(e.target.value))}
                    style={{ padding: '4px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: FONT }}>
                    {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={() => setIsPreview(!isPreview)} style={toolBtn()}>
                        {isPreview ? '✏️ Edit' : '👁 Preview'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        style={toolBtn(hasChanges ? 'warning' : 'success')}
                    >
                        {saving ? 'Menyimpan...' : '💾 Simpan'}
                    </button>
                    {loading && <span style={{ color: '#94a3b8', fontSize: '11px' }}>Memuat...</span>}
                </div>
            </div>

            {/* ── Notification ── */}
            {msg && (
                <div style={{
                    padding: '8px 14px', borderRadius: '6px', marginBottom: '10px',
                    background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: msg.type === 'success' ? '#166534' : '#991b1b',
                    fontFamily: FONT, fontSize: '11px'
                }}>
                    {msg.text}
                </div>
            )}

            {/* ── Tabs (hidden in preview mode — show all) ── */}
            {!isPreview && (
                <div style={{
                    display: 'flex', gap: '6px', padding: '6px 8px',
                    background: '#334155', borderRadius: '8px', marginBottom: '12px'
                }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabBtn(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Content Area ── */}
            <div style={{
                padding: '16px', background: '#fff',
                borderRadius: '8px', border: '1px solid #e2e8f0',
                fontFamily: FONT
            }}>
                {/* HEADING shown only in preview */}
                {isPreview && (
                    <div style={{ fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase' }}>
                        3. Urusan Umum
                    </div>
                )}

                {/* Kendaraan */}
                {(activeTab === 'kendaraan' || isPreview) && (
                    <div style={{ marginBottom: isPreview ? '20px' : '0' }}>
                        <TabKendaraan
                            data={uData}
                            onChange={updateData}
                            isPreview={isPreview}
                        />
                    </div>
                )}

                {/* Sarana */}
                {(activeTab === 'sarana' || isPreview) && (
                    <div style={{ marginTop: isPreview ? '20px' : '0', marginBottom: isPreview ? '20px' : '0' }}>
                        <TabSarana
                            data={uData}
                            onChange={updateData}
                            isPreview={isPreview}
                        />
                    </div>
                )}

                {/* Gedung */}
                {(activeTab === 'gedung' || isPreview) && (
                    <div style={{ marginTop: isPreview ? '20px' : '0' }}>
                        <TabGedung
                            data={uData}
                            onChange={updateData}
                            isPreview={isPreview}
                        />
                    </div>
                )}
            </div>

            {/* ── Change indicator ── */}
            {hasChanges && !saving && (
                <div style={{
                    marginTop: '8px', fontSize: '11px', color: '#92400e',
                    background: '#fef3c7', padding: '6px 12px', borderRadius: '6px',
                    fontFamily: FONT
                }}>
                    ⚠️ Terdapat perubahan yang belum disimpan. Klik "Simpan" untuk menyimpan data.
                </div>
            )}
        </div>
    );
}
