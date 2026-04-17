/**
 * TemplateInfokimPengaduan.jsx
 * Template editable untuk:
 *   Section 5 – Informasi dan Komunikasi (12 fixed rows, kolom jumlah)
 *   Section 6 – Pengaduan Masyarakat (dynamic rows, 14 kolom)
 *
 * Props:
 *   mode  → 'infokim' | 'pengaduan'
 *   embedded → boolean (hides outer padding)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
    INFOKIM_ROWS, getDefaultInfokimData,
    PENGADUAN_COLS, makePengaduanRow, getDefaultPengaduanData,
} from '../../../utils/infokimSchema';

const FONT = '"Times New Roman", Georgia, serif';
const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

// seksi_id mapping
const SEKSI_ID_INFOKIM = 3;   // tikim
const SEKSI_ID_PENGADUAN = 3; // tikim

const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 5000);
    }, []);
    return [msg, show];
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

// ─── SECTION 5: Informasi dan Komunikasi ─────────────────────────────────────
function TabelInfokim({ data, onChange, isPreview, loading }) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: FONT }}>
                <thead>
                    <tr>
                        <th style={th({ width: '50px' })}>NO.</th>
                        <th style={th()}>KETERANGAN</th>
                        <th style={th({ width: '100px' })}>JUMLAH</th>
                    </tr>
                </thead>
                <tbody>
                    {INFOKIM_ROWS.map(row => {
                        const val = data[row.id]?.jumlah || 0;
                        return (
                            <tr key={row.id}>
                                <td style={td({ textAlign: 'center' })}>{row.no}</td>
                                <td style={td()}>{row.label}</td>
                                <td style={td({ textAlign: 'center' })}>
                                    {isPreview ? (
                                        val > 0 ? val : '-'
                                    ) : (
                                        <input
                                            type="number"
                                            min={0}
                                            value={val === 0 ? '' : val}
                                            disabled={loading}
                                            placeholder="0"
                                            onChange={e => onChange({
                                                ...data,
                                                [row.id]: { jumlah: Math.max(0, parseInt(e.target.value) || 0) }
                                            })}
                                            style={{ width: '70px', border: 'none', outline: 'none', textAlign: 'center', fontFamily: FONT, fontSize: '9pt', background: loading ? '#f1f5f9' : '#fff' }}
                                        />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── SECTION 6: Pengaduan Masyarakat ─────────────────────────────────────────
function TabelPengaduan({ rows, onChange, isPreview, loading }) {
    const addRow = () => onChange([...rows, makePengaduanRow()]);
    const removeRow = (rowId) => onChange(rows.filter(r => r.id !== rowId));
    const setField = (rowId, key, val) =>
        onChange(rows.map(r => r.id === rowId ? { ...r, [key]: val } : r));

    const isEmpty = rows.length === 0;

    return (
        <div>
            <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '1200px', width: '100%', fontFamily: FONT, fontSize: '8pt' }}>
                    <thead>
                        <tr>
                            <th style={th({ width: '28px', fontSize: '8pt' })}>No</th>
                            {PENGADUAN_COLS.map(col => (
                                <th key={col.key} style={th({ width: col.w, fontSize: '7.5pt' })}>{col.label}</th>
                            ))}
                            {!isPreview && <th style={th({ width: '40px', fontSize: '8pt' })}>Aksi</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {isEmpty ? (
                            <tr>
                                <td colSpan={PENGADUAN_COLS.length + (isPreview ? 1 : 2)}
                                    style={td({ textAlign: 'center', fontStyle: 'italic', padding: '20px', background: '#fafafa' })}>
                                    NIHIL
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, idx) => (
                                <tr key={row.id}>
                                    <td style={td({ textAlign: 'center', verticalAlign: 'middle' })}>{idx + 1}</td>
                                    {PENGADUAN_COLS.map(col => (
                                        <td key={col.key} style={td({ padding: '2px' })}>
                                            {isPreview ? (
                                                <span style={{ fontFamily: FONT, fontSize: '8pt', whiteSpace: 'pre-wrap' }}>
                                                    {row[col.key] || '-'}
                                                </span>
                                            ) : col.type === 'textarea' ? (
                                                <textarea
                                                    value={row[col.key] || ''}
                                                    onChange={e => setField(row.id, col.key, e.target.value)}
                                                    disabled={loading}
                                                    rows={2}
                                                    style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', fontFamily: FONT, fontSize: '8pt', background: loading ? '#f1f5f9' : '#fff', minHeight: '32px' }}
                                                />
                                            ) : (
                                                <input
                                                    type={col.type}
                                                    value={row[col.key] || ''}
                                                    onChange={e => setField(row.id, col.key, e.target.value)}
                                                    disabled={loading}
                                                    style={{ width: '100%', border: 'none', outline: 'none', fontFamily: FONT, fontSize: '8pt', background: loading ? '#f1f5f9' : '#fff' }}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    {!isPreview && (
                                        <td style={td({ textAlign: 'center', verticalAlign: 'middle' })}>
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                disabled={loading}
                                                title="Hapus baris"
                                                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px' }}>
                                                🗑
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {!isPreview && (
                <button onClick={addRow} disabled={loading}
                    style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: FONT }}>
                    + Tambah Baris
                </button>
            )}
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function TemplateInfokimPengaduan({ mode = 'infokim', embedded = false }) {
    const [msg, showMsg] = useMsg();

    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [isPreview, setIsPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const [dataInfokim, setDataInfokim] = useState(getDefaultInfokimData());
    const [dataPengaduan, setDataPengaduan] = useState(getDefaultPengaduanData());

    const seksiId = mode === 'infokim' ? SEKSI_ID_INFOKIM : SEKSI_ID_PENGADUAN;
    const templateKey = mode === 'infokim' ? 'infokim' : 'pengaduan';

    const loadData = useCallback(async (b, t) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', seksiId)
                .eq('bulan', b)
                .eq('tahun', t)
                .maybeSingle();

            if (error) throw error;

            if (data?.template_data) {
                const td = data.template_data;
                if (mode === 'infokim') {
                    setDataInfokim(td.infokim || getDefaultInfokimData());
                } else {
                    setDataPengaduan(td.pengaduan || getDefaultPengaduanData());
                }
            } else {
                if (mode === 'infokim') setDataInfokim(getDefaultInfokimData());
                else setDataPengaduan(getDefaultPengaduanData());
            }
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal memuat: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [mode, seksiId, showMsg]);

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun, loadData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Fetch existing record to merge with other keys
            const { data: existing } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', seksiId)
                .eq('bulan', bulan)
                .eq('tahun', tahun)
                .maybeSingle();

            const existingData = existing?.template_data || {};
            const newTemplateData = {
                ...existingData,
                [templateKey]: mode === 'infokim' ? dataInfokim : dataPengaduan,
            };

            const { error } = await supabase.from('laporan_template').upsert({
                seksi_id: seksiId,
                bulan,
                tahun,
                template_data: newTemplateData,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'seksi_id,bulan,tahun' });

            if (error) throw error;
            showMsg('success', `✅ Data ${BULAN_NAMES[bulan]} ${tahun} berhasil disimpan!`);
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal simpan: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const wrap = setter => val => { setter(val); setHasChanges(true); };

    const sectionTitle = mode === 'infokim'
        ? `5. INFORMASI DAN KOMUNIKASI\n   ${BULAN_NAMES[bulan].toUpperCase()} ${tahun}`
        : `6. PENGADUAN MASYARAKAT`;

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
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                        📋 {mode === 'infokim' ? '5. Informasi dan Komunikasi' : '6. Pengaduan Masyarakat'} — {BULAN_NAMES[bulan]} {tahun}
                    </span>
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

            {/* Preview title */}
            {isPreview && (
                <div style={{ fontFamily: FONT, fontSize: '11pt', fontWeight: 'bold', whiteSpace: 'pre-line', marginBottom: '12px' }}>
                    {sectionTitle}
                </div>
            )}

            {/* Content */}
            {mode === 'infokim' ? (
                <TabelInfokim
                    data={dataInfokim}
                    onChange={wrap(setDataInfokim)}
                    isPreview={isPreview}
                    loading={loading}
                />
            ) : (
                <TabelPengaduan
                    rows={dataPengaduan}
                    onChange={wrap(setDataPengaduan)}
                    isPreview={isPreview}
                    loading={loading}
                />
            )}
        </div>
    );
}
