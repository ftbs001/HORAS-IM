/**
 * TemplateInteldakim.jsx
 * Template editable untuk BAB II — Intelijen dan Penindakan Keimigrasian
 *
 * Tabel:
 *   A. Pro Justitia (multi-header: SIDIK/PENUNTUTAN/SIDANG × L/P)
 *   B. Tindakan Administratif Keimigrasian (multi-header 6 kolom × L/P)
 *   C. TIMPORA Bulanan (rapat koordinasi + operasi gabungan)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import {
    PROJUS_COLS, PROJUS_COL_LABELS, PROJUS_DEFAULT_ROWS,
    TAK_COLS, TAK_COL_LABELS, TAK_DEFAULT_ROWS,
    TIMPORA_ROWS,
    getDefaultInteldakimData,
    calcProjusTotals, calcTAKTotals,
} from '../../../utils/inteldakimSchema';

const FONT = '"Times New Roman", Georgia, serif';
const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 5000);
    }, []);
    return [msg, show];
};

const thStyle = (extra = {}) => ({
    border: '1px solid #000', padding: '4px 5px',
    background: '#bdd7ee', fontFamily: FONT, fontSize: '9pt',
    fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle',
    ...extra
});

const tdStyle = (extra = {}) => ({
    border: '1px solid #000', padding: '3px 5px',
    fontFamily: FONT, fontSize: '9pt', ...extra
});

const InputCellLP = ({ l, p, onChange, disabled }) => (
    <>
        <td style={{ border: '1px solid #aaa', padding: '1px', textAlign: 'center', width: '28px' }}>
            <input type="number" min={0} value={l === 0 ? '' : l} disabled={disabled}
                onChange={e => onChange({ l: Math.max(0, parseInt(e.target.value) || 0), p })}
                placeholder="0"
                style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'center', fontSize: '9pt', fontFamily: FONT, background: disabled ? '#f1f5f9' : '#fff' }}
            />
        </td>
        <td style={{ border: '1px solid #aaa', padding: '1px', textAlign: 'center', width: '28px' }}>
            <input type="number" min={0} value={p === 0 ? '' : p} disabled={disabled}
                onChange={e => onChange({ l, p: Math.max(0, parseInt(e.target.value) || 0) })}
                placeholder="0"
                style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'center', fontSize: '9pt', fontFamily: FONT, background: disabled ? '#f1f5f9' : '#fff' }}
            />
        </td>
    </>
);

const NumTD = ({ v, bold, bg }) => {
    const n = Number(v) || 0;
    return (
        <td style={{ ...tdStyle({ textAlign: 'center', fontWeight: bold ? 'bold' : 'normal', background: bg || '#fff' }) }}>
            {n === 0 ? '-' : n}
        </td>
    );
};

// ─── A. PRO JUSTITIA ────────────────────────────────────────────────────────
function TabelProjus({ data, onChange, isPreview, loading }) {
    const totals = calcProjusTotals(data);
    const allZero = Object.entries(data).filter(([k]) => !k.startsWith('total'))
        .every(([, d]) => PROJUS_COLS.every(c => !d[c]?.l && !d[c]?.p));

    const setVal = (rowId, col, lp) => {
        onChange({ ...data, [rowId]: { ...data[rowId], [col]: lp } });
    };
    const setPasal = (rowId, val) => onChange({ ...data, [rowId]: { ...data[rowId], pasal: val } });

    const rows = Object.entries(data).filter(([k]) => !k.startsWith('total'));

    return (
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontFamily: FONT }}>
                <thead>
                    <tr>
                        <th rowSpan={3} style={thStyle({ width: '40px' })}>NO</th>
                        <th rowSpan={3} style={thStyle({ width: '180px' })}>PASAL YANG DILANGGAR</th>
                        <th colSpan={7} style={thStyle()}>PELANGGARAN KEIMIGRASIAN</th>
                    </tr>
                    <tr>
                        <th colSpan={7} style={thStyle()}>PROJUSTITIA</th>
                    </tr>
                    <tr>
                        {PROJUS_COLS.map(col => (
                            <React.Fragment key={col}>
                                <th style={thStyle({ width: '32px' })}>{PROJUS_COL_LABELS[col]}</th>
                                <th style={thStyle({ width: '32px' })}>{/* merged in next row */}</th>
                            </React.Fragment>
                        ))}
                        <th style={thStyle({ width: '40px' })}>JUMLAH</th>
                    </tr>
                    <tr>
                        <th style={thStyle()}></th>
                        <th style={thStyle()}></th>
                        {PROJUS_COLS.map(() => (
                            <React.Fragment key={Math.random()}>
                                <th style={thStyle({ fontSize: '8pt' })}>L</th>
                                <th style={thStyle({ fontSize: '8pt' })}>P</th>
                            </React.Fragment>
                        ))}
                        <th style={thStyle()}></th>
                    </tr>
                </thead>
                <tbody>
                    {isPreview && allZero ? (
                        <tr>
                            <td colSpan={PROJUS_COLS.length * 2 + 3} style={tdStyle({ textAlign: 'center', fontStyle: 'italic', padding: '12px' })}>
                                NIHIL
                            </td>
                        </tr>
                    ) : (
                        rows.map(([rowId, rowData], idx) => {
                            const t = totals[rowId] || {};
                            return (
                                <tr key={rowId}>
                                    <td style={tdStyle({ textAlign: 'center' })}>{PROJUS_DEFAULT_ROWS[idx]?.no || (idx + 1).toString().padStart(2, '0')}</td>
                                    <td style={tdStyle()}>
                                        {isPreview ? rowData.pasal || '' : (
                                            <input value={rowData.pasal || ''} onChange={e => setPasal(rowId, e.target.value)}
                                                disabled={loading}
                                                placeholder="Isi pasal..."
                                                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '9pt', fontFamily: FONT }} />
                                        )}
                                    </td>
                                    {PROJUS_COLS.map(col => isPreview ? (
                                        <React.Fragment key={col}>
                                            <NumTD v={t[col]?.l} />
                                            <NumTD v={t[col]?.p} />
                                        </React.Fragment>
                                    ) : (
                                        <InputCellLP key={col} l={rowData[col]?.l || 0} p={rowData[col]?.p || 0}
                                            disabled={loading}
                                            onChange={lp => setVal(rowId, col, lp)} />
                                    ))}
                                    <NumTD v={t.jumlah} />
                                </tr>
                            );
                        })
                    )}
                    {/* Total Row */}
                    <tr style={{ background: '#c6efce' }}>
                        <td colSpan={2} style={tdStyle({ textAlign: 'center', fontWeight: 'bold' })}>JUMLAH</td>
                        {PROJUS_COLS.map(col => (
                            <React.Fragment key={col}>
                                <NumTD v={totals.total?.[col]?.l} bold bg="#c6efce" />
                                <NumTD v={totals.total?.[col]?.p} bold bg="#c6efce" />
                            </React.Fragment>
                        ))}
                        <NumTD v={totals.total?.jumlah} bold bg="#c6efce" />
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ─── B. TINDAKAN ADMINISTRATIF KEIMIGRASIAN ──────────────────────────────────
function TabelTAK({ data, onChange, isPreview, loading }) {
    const totals = calcTAKTotals(data);
    const allZero = Object.entries(data).filter(([k]) => !k.startsWith('total'))
        .every(([, d]) => TAK_COLS.every(c => !d[c]?.l && !d[c]?.p));

    const setVal = (rowId, col, lp) => onChange({ ...data, [rowId]: { ...data[rowId], [col]: lp } });
    const setPasal = (rowId, val) => onChange({ ...data, [rowId]: { ...data[rowId], pasal: val } });

    const rows = Object.entries(data).filter(([k]) => !k.startsWith('total'));

    return (
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: FONT, fontSize: '8pt' }}>
                <thead>
                    <tr>
                        <th rowSpan={3} style={thStyle({ width: '32px', fontSize: '8pt' })}>NO</th>
                        <th rowSpan={3} style={thStyle({ width: '160px', fontSize: '8pt' })}>PASAL YANG DILANGGAR</th>
                        <th colSpan={TAK_COLS.length * 2 + 1} style={thStyle({ fontSize: '8pt' })}>PELANGGARAN KEIMIGRASIAN</th>
                    </tr>
                    <tr>
                        <th colSpan={TAK_COLS.length * 2 + 1} style={thStyle({ fontSize: '8pt' })}>TINDAKAN ADMINISTRATIF KEIMIGRASIAN</th>
                    </tr>
                    <tr>
                        {TAK_COLS.map(col => (
                            <th key={col} colSpan={2} style={thStyle({ fontSize: '7pt' })}>{TAK_COL_LABELS[col]}</th>
                        ))}
                        <th style={thStyle({ fontSize: '8pt' })}>JUMLAH</th>
                    </tr>
                    <tr>
                        <th style={thStyle({ fontSize: '8pt' })}></th>
                        <th style={thStyle({ fontSize: '8pt' })}></th>
                        {TAK_COLS.map((col) => (
                            <React.Fragment key={col}>
                                <th style={thStyle({ fontSize: '7pt' })}>L</th>
                                <th style={thStyle({ fontSize: '7pt' })}>P</th>
                            </React.Fragment>
                        ))}
                        <th style={thStyle({ fontSize: '8pt' })}></th>
                    </tr>
                </thead>
                <tbody>
                    {isPreview && allZero ? (
                        <tr>
                            <td colSpan={TAK_COLS.length * 2 + 3} style={tdStyle({ textAlign: 'center', fontStyle: 'italic', padding: '12px' })}>
                                NIHIL
                            </td>
                        </tr>
                    ) : (
                        rows.map(([rowId, rowData], idx) => {
                            const t = totals[rowId] || {};
                            return (
                                <tr key={rowId}>
                                    <td style={tdStyle({ textAlign: 'center', fontSize: '8pt' })}>{TAK_DEFAULT_ROWS[idx]?.no || (idx + 1) + '.'}</td>
                                    <td style={tdStyle({ fontSize: '8pt' })}>
                                        {isPreview ? rowData.pasal || '' : (
                                            <input value={rowData.pasal || ''} onChange={e => setPasal(rowId, e.target.value)}
                                                disabled={loading} placeholder="Isi pasal..."
                                                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '8pt', fontFamily: FONT }} />
                                        )}
                                    </td>
                                    {TAK_COLS.map(col => isPreview ? (
                                        <React.Fragment key={col}>
                                            <NumTD v={t[col]?.l} />
                                            <NumTD v={t[col]?.p} />
                                        </React.Fragment>
                                    ) : (
                                        <InputCellLP key={col} l={rowData[col]?.l || 0} p={rowData[col]?.p || 0}
                                            disabled={loading}
                                            onChange={lp => setVal(rowId, col, lp)} />
                                    ))}
                                    <NumTD v={t.jumlah} />
                                </tr>
                            );
                        })
                    )}
                    <tr style={{ background: '#c6efce' }}>
                        <td colSpan={2} style={tdStyle({ textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', background: '#c6efce' })}>JUMLAH</td>
                        {TAK_COLS.map(col => (
                            <React.Fragment key={col}>
                                <NumTD v={totals.total?.[col]?.l} bold bg="#c6efce" />
                                <NumTD v={totals.total?.[col]?.p} bold bg="#c6efce" />
                            </React.Fragment>
                        ))}
                        <NumTD v={totals.total?.jumlah} bold bg="#c6efce" />
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ─── C. TIMPORA ──────────────────────────────────────────────────────────────
function TabelTimpora({ data, onChange, isPreview, loading, bulan, tahun }) {
    const setField = (rowId, field, val) => onChange({ ...data, [rowId]: { ...(data[rowId] || {}), [field]: val } });

    const allEmpty = TIMPORA_ROWS.every(row =>
        !data[row.id]?.rapat_waktu && !data[row.id]?.rapat_ket &&
        !data[row.id]?.ops_waktu && !data[row.id]?.ops_ket
    );

    const textArea = (rowId, field) => {
        const val = data[rowId]?.[field] || '';
        if (isPreview) {
            return <td style={tdStyle({ textAlign: 'center' })}>{val || '-'}</td>;
        }
        return (
            <td style={{ border: '1px solid #aaa', padding: '2px' }}>
                <textarea value={val} onChange={e => setField(rowId, field, e.target.value)}
                    disabled={loading} rows={1}
                    style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', fontFamily: FONT, fontSize: '9pt', background: loading ? '#f1f5f9' : '#fff', minHeight: '28px' }} />
            </td>
        );
    };

    return (
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '6px' }}>
                c. TIMPORA BULAN {BULAN_NAMES[bulan]?.toUpperCase() || ''} {tahun}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: FONT }}>
                <thead>
                    <tr>
                        <th rowSpan={3} style={thStyle({ width: '36px' })}>NO</th>
                        <th rowSpan={3} style={thStyle({ width: '180px' })}>TIM PORA</th>
                        <th colSpan={4} style={thStyle()}>KEGIATAN</th>
                    </tr>
                    <tr>
                        <th colSpan={2} style={thStyle()}>RAPAT KOORDINASI</th>
                        <th colSpan={2} style={thStyle()}>OPERASI GABUNGAN</th>
                    </tr>
                    <tr>
                        <th style={thStyle()}>WAKTU PELAKSANAAN</th>
                        <th style={thStyle()}>KETERANGAN</th>
                        <th style={thStyle()}>WAKTU PELAKSANAAN</th>
                        <th style={thStyle()}>KETERANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    {isPreview && allEmpty ? (
                        <tr>
                            <td colSpan={6} style={tdStyle({ textAlign: 'center', fontStyle: 'italic', padding: '12px' })}>NIHIL</td>
                        </tr>
                    ) : (
                        TIMPORA_ROWS.map(row => (
                            <tr key={row.id} style={{ background: row.isHeader ? '#dce6f1' : '#fff' }}>
                                <td style={tdStyle({ textAlign: 'center', fontWeight: row.isHeader ? 'bold' : 'normal', paddingLeft: row.indent ? `${row.indent * 16 + 4}px` : '4px' })}>
                                    {row.no}
                                </td>
                                <td style={tdStyle({ fontWeight: row.isHeader ? 'bold' : 'normal', paddingLeft: row.indent ? `${row.indent * 12 + 4}px` : '4px' })}>
                                    {row.isHeader ? row.label : (
                                        isPreview ? row.label : (
                                            row.id.startsWith('tim_kec_') ? (
                                                <input value={data[row.id]?.label || row.label}
                                                    onChange={e => setField(row.id, 'label', e.target.value)}
                                                    disabled={loading}
                                                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '9pt', fontFamily: FONT }} />
                                            ) : row.label
                                        )
                                    )}
                                </td>
                                {row.isHeader ? (
                                    <td colSpan={4} style={tdStyle()}></td>
                                ) : (
                                    <>
                                        {textArea(row.id, 'rapat_waktu')}
                                        {textArea(row.id, 'rapat_ket')}
                                        {textArea(row.id, 'ops_waktu')}
                                        {textArea(row.id, 'ops_ket')}
                                    </>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function TemplateInteldakim({ seksiAlias = 'inteldakim', embedded = false }) {
    const { user } = useAuth();
    const [msg, showMsg] = useMsg();

    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [isPreview, setIsPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Template data state
    const [dataProjus, setDataProjus] = useState(getDefaultInteldakimData().projus);
    const [dataTAK, setDataTAK] = useState(getDefaultInteldakimData().tak);
    const [dataTimpora, setDataTimpora] = useState(getDefaultInteldakimData().timpora);

    const SEKSI_ID = 1; // inteldakim

    // ── Load from Supabase ──
    const loadData = useCallback(async (b, t) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('laporan_template')
                .select('*')
                .eq('seksi_id', SEKSI_ID)
                .eq('bulan', b)
                .eq('tahun', t)
                .maybeSingle();

            if (error) throw error;

            const defaults = getDefaultInteldakimData();
            if (data?.template_data) {
                const td = data.template_data;
                setDataProjus(td.projus || defaults.projus);
                setDataTAK(td.tak || defaults.tak);
                setDataTimpora(td.timpora || defaults.timpora);
            } else {
                setDataProjus(defaults.projus);
                setDataTAK(defaults.tak);
                setDataTimpora(defaults.timpora);
            }
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal memuat data: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [showMsg]);

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun, loadData]);

    // ── Save ──
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                seksi_id: SEKSI_ID,
                bulan,
                tahun,
                template_data: { projus: dataProjus, tak: dataTAK, timpora: dataTimpora },
                updated_at: new Date().toISOString(),
            };
            const { error } = await supabase.from('laporan_template')
                .upsert(payload, { onConflict: 'seksi_id,bulan,tahun' });
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

    return (
        <div style={{ fontFamily: FONT, padding: embedded ? '0' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
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
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>📋 BAB II — {BULAN_NAMES[bulan]} {tahun}</span>
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
                <div style={{ marginBottom: '12px', padding: '10px 16px', borderRadius: '8px', background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#15803d' : '#b91c1c', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, fontFamily: FONT }}>
                    {msg.text}
                </div>
            )}
            {hasChanges && !isPreview && (
                <div style={{ marginBottom: '12px', padding: '8px 16px', borderRadius: '8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', fontSize: '12px', fontFamily: FONT }}>
                    ⚠️ Ada perubahan yang belum disimpan
                </div>
            )}

            {/* Preview header */}
            {isPreview && (
                <div style={{ textAlign: 'center', marginBottom: '16px', fontFamily: FONT }}>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>4. INTELIJEN DAN PENINDAKAN KEIMIGRASIAN</div>
                </div>
            )}

            {/* A. PRO JUSTITIA */}
            <div style={{ marginBottom: '20px' }}>
                <p style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '8px' }}>a. Projus {BULAN_NAMES[bulan]} {tahun})</p>
                <TabelProjus data={dataProjus} onChange={wrap(setDataProjus)} isPreview={isPreview} loading={loading} />
            </div>

            {/* B. TINDAKAN ADMINISTRATIF */}
            <div style={{ marginBottom: '20px' }}>
                <p style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '8px' }}>b. Tindakan Administratif Keimigrasian</p>
                <TabelTAK data={dataTAK} onChange={wrap(setDataTAK)} isPreview={isPreview} loading={loading} />
            </div>

            {/* C. TIMPORA */}
            <div style={{ marginBottom: '20px' }}>
                <TabelTimpora data={dataTimpora} onChange={wrap(setDataTimpora)} isPreview={isPreview} loading={loading} bulan={bulan} tahun={tahun} />
            </div>
        </div>
    );
}
