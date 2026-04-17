import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
    getEmptyPegawaiRow, getEmptyPPPKRow, getEmptyNonAsnRow, GOLONGAN_ROWS, JABATAN_ROWS,
    PENDIDIKAN_ROWS, GENDER_ROWS, STATUS_ROWS,
    REKAPITULASI_PEGAWAI_ROWS, CUTI_ROWS, PEMBINAAN_ROWS, TATA_USAHA_ROWS,
    getDefaultKepegawaianData, calcAllTotals
} from '../../../utils/kepegawaianSchema';

const SEKSI_ID_TU = 4;
const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
const FONT = '"Times New Roman", Georgia, serif';

const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((t, m) => { setMsg({ type: t, text: m }); setTimeout(() => setMsg(null), 5000); }, []);
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
    fontFamily: FONT, fontSize: '9pt', verticalAlign: 'middle', ...extra
});

const defaultInputStyle = { width: '100%', border: '1px solid #ddd', outline: 'none', background: 'transparent', fontFamily: FONT, fontSize: '9pt', padding: '2px 4px', borderRadius: '4px' };

const InputTableText = ({ value, onChange, type = 'text', disabled, center }) => (
    disabled ? <div style={{ textAlign: center ? 'center' : 'left' }}>{value || '-'}</div> :
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{ ...defaultInputStyle, textAlign: center ? 'center' : 'left' }} />
);

const InputTableNum = ({ value, onChange, disabled }) => {
    const [val, setVal] = useState(value === 0 ? '' : value);
    useEffect(() => { setVal(value === 0 ? '' : value); }, [value]);
    return disabled ? <div style={{ textAlign: 'center' }}>{value || 0}</div> : (
        <input type="number" min={0} value={val} disabled={disabled}
            onChange={e => {
                setVal(e.target.value);
                onChange(Number(e.target.value) || 0);
            }}
            style={{ ...defaultInputStyle, textAlign: 'center' }} />
    );
};

function TablePegawaiDetail({ data, onChange, isPreview, loading }) {
    const handleAdd = () => onChange([...(data || []), getEmptyPegawaiRow()]);
    const handleRemove = (idx) => {
        const newData = [...data];
        newData.splice(idx, 1);
        onChange(newData.length ? newData : [getEmptyPegawaiRow()]);
    };
    const handleChange = (idx, field, value) => {
        const newData = [...data];
        newData[idx][field] = value;
        onChange(newData);
    };
    return (
        <div style={{ marginBottom: '32px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold' }}>1. LAPORAN BEZETTING PEGAWAI</div>
                {!isPreview && <button onClick={handleAdd} disabled={loading} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Tambah</button>}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1300px' }}>
                <thead>
                    <tr>
                        <th style={th()}>NO</th><th style={th()}>NAMA</th><th style={th()}>NIP</th><th style={th()}>JK</th><th style={th()}>JABATAN</th><th style={th()}>ESELON</th><th style={th()}>GOL</th><th style={th()}>TMT</th><th style={th()}>PEND</th><th style={th()}>DIKLAT</th><th style={th()}>LAIN</th><th style={th()}>KET</th>
                        {!isPreview && <th style={th({ background: '#f87171' })}>Aksi</th>}
                    </tr>
                </thead>
                <tbody>
                    {(data || []).map((r, idx) => (
                        <tr key={r.id}>
                            <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                            <td style={td()}><InputTableText value={r.nama} onChange={v => handleChange(idx, 'nama', v)} disabled={isPreview||loading} /></td>
                            <td style={td()}><InputTableText value={r.nip} onChange={v => handleChange(idx, 'nip', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.jenis_kelamin} onChange={v => handleChange(idx, 'jenis_kelamin', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.jabatan} onChange={v => handleChange(idx, 'jabatan', v)} disabled={isPreview||loading} /></td>
                            <td style={td()}><InputTableText value={r.eselon} onChange={v => handleChange(idx, 'eselon', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.pangkat_gol} onChange={v => handleChange(idx, 'pangkat_gol', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.tmt_gol} onChange={v => handleChange(idx, 'tmt_gol', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.pendidikan} onChange={v => handleChange(idx, 'pendidikan', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.diklat_teknis} onChange={v => handleChange(idx, 'diklat_teknis', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.diklat_lainnya} onChange={v => handleChange(idx, 'diklat_lainnya', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.keterangan} onChange={v => handleChange(idx, 'keterangan', v)} disabled={isPreview||loading} center /></td>
                            {!isPreview && <td style={td({ textAlign: 'center' })}><button onClick={() => handleRemove(idx)} style={{ color: 'red', border: 'none', background: 'none' }}>x</button></td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TablePegawaiPPPK({ data, onChange, isPreview, loading }) {
    const handleAdd = () => onChange([...(data || []), getEmptyPPPKRow()]);
    const handleRemove = (idx) => { const n = [...data]; n.splice(idx, 1); onChange(n); };
    const handleChange = (idx, field, value) => { const n = [...data]; n[idx][field] = value; onChange(n); };
    return (
        <div style={{ marginBottom: '32px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold' }}>DAFTAR NAMA PEGAWAI PPPK</div>
                {!isPreview && <button onClick={handleAdd} disabled={loading} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Tambah</button>}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1000px' }}>
                <thead>
                    <tr><th style={th()}>No</th><th style={th()}>Nama</th><th style={th()}>JK</th><th style={th()}>Jabatan</th><th style={th()}>Unit Kerja</th>{!isPreview && <th style={th()}>Aksi</th>}</tr>
                </thead>
                <tbody>
                    {(data || []).map((r, idx) => (
                        <tr key={r.id}>
                            <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                            <td style={td()}><InputTableText value={r.nama_lengkap} onChange={v => handleChange(idx, 'nama_lengkap', v)} disabled={isPreview||loading} /></td>
                            <td style={td()}><InputTableText value={r.jk} onChange={v => handleChange(idx, 'jk', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.jab_nama} onChange={v => handleChange(idx, 'jab_nama', v)} disabled={isPreview||loading} /></td>
                            <td style={td()}><InputTableText value={r.unit_kerja} onChange={v => handleChange(idx, 'unit_kerja', v)} disabled={isPreview||loading} /></td>
                            {!isPreview && <td style={td({ textAlign: 'center' })}><button onClick={() => handleRemove(idx)} style={{ color: 'red', border: 'none', background: 'none' }}>x</button></td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TablePegawaiNonASN({ data, onChange, isPreview, loading }) {
    const handleAdd = () => onChange([...(data || []), getEmptyNonAsnRow()]);
    const handleRemove = (idx) => { const n = [...data]; n.splice(idx, 1); onChange(n); };
    const handleChange = (idx, field, value) => { const n = [...data]; n[idx][field] = value; onChange(n); };
    return (
        <div style={{ marginBottom: '32px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold' }}>DAFTAR NAMA TENAGA NON ASN</div>
                {!isPreview && <button onClick={handleAdd} disabled={loading} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Tambah</button>}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1000px' }}>
                <thead>
                    <tr><th style={th()}>No</th><th style={th()}>Nama</th><th style={th()}>JK</th><th style={th()}>Jabatan</th><th style={th()}>Unit Kerja</th>{!isPreview && <th style={th()}>Aksi</th>}</tr>
                </thead>
                <tbody>
                    {(data || []).map((r, idx) => (
                        <tr key={r.id}>
                            <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                            <td style={td()}><InputTableText value={r.nama_lengkap} onChange={v => handleChange(idx, 'nama_lengkap', v)} disabled={isPreview||loading} /></td>
                            <td style={td()}><InputTableText value={r.jk} onChange={v => handleChange(idx, 'jk', v)} disabled={isPreview||loading} center /></td>
                            <td style={td()}><InputTableText value={r.jab_nama} onChange={v => handleChange(idx, 'jab_nama', v)} disabled={isPreview||loading} /></td>
                            <td style={td()}><InputTableText value={r.unit_kerja} onChange={v => handleChange(idx, 'unit_kerja', v)} disabled={isPreview||loading} /></td>
                            {!isPreview && <td style={td({ textAlign: 'center' })}><button onClick={() => handleRemove(idx)} style={{ color: 'red', border: 'none', background: 'none' }}>x</button></td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TableSummary({ title, structRows, data, totalKey, onChange, isPreview, loading }) {
    return (
        <div style={{ marginBottom: '24px', flex: 1, minWidth: '300px' }}>
            <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '8px' }}>{title}</div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr><th style={th()}>NO</th><th style={th()}>URAIAN</th><th style={th()}>JUMLAH</th></tr></thead>
                <tbody>
                    {structRows.map((r, idx) => (
                        <tr key={r.id}>
                            <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                            <td style={td()}>{r.label}</td>
                            <td style={td()}><InputTableNum value={data[r.id] || 0} onChange={v => onChange(r.id, v)} disabled={isPreview||loading} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AdminTableRekapitulasi({ data, onChange, disabled }) {
    const handleChange = (idx, field, val) => { const n = [...data]; n[idx][field] = val; onChange(n); };
    const tblKeys = ['pangkat_a', 'pangkat_b', 'pangkat_c', 'pangkat_d', 'teknis_lk', 'teknis_pr', 'non_teknis_lk', 'non_teknis_pr', 'struktural_lk', 'struktural_pr', 'non_struktural_lk', 'non_struktural_pr'];
    return (
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px' }}>
            <thead>
                <tr><th rowSpan={2} style={th()}>NO</th><th rowSpan={2} style={th()}>GOL</th><th colSpan={4} style={th()}>PANGKAT</th><th colSpan={2} style={th()}>TEKNIS</th><th colSpan={2} style={th()}>NON TEKNIS</th><th colSpan={2} style={th()}>STRUKTURAL</th><th colSpan={2} style={th()}>NON STRUKTURAL</th></tr>
                <tr>{['A', 'B', 'C', 'D'].map(k => <th key={k} style={th()}>{k}</th>)}<th style={th()}>LK</th><th style={th()}>PR</th><th style={th()}>LK</th><th style={th()}>PR</th><th style={th()}>LK</th><th style={th()}>PR</th><th style={th()}>LK</th><th style={th()}>PR</th></tr>
            </thead>
            <tbody>
                {data.map((r, idx) => (
                    <tr key={r.id}>
                        <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                        <td style={td({ fontWeight: 'bold' })}>{r.name}</td>
                        {tblKeys.map(k => <td key={k} style={td()}><InputTableText type="number" value={r[k]} onChange={v => handleChange(idx, k, v)} disabled={disabled} center /></td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function AdminTableCuti({ data, onChange, disabled, total }) {
    const handleChange = (idx, field, val) => { const n = [...data]; n[idx][field] = val; onChange(n); };
    return (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '800px' }}>
            <thead><tr><th style={th()}>NO</th><th style={th()}>PEGAWAI CUTI</th><th style={th()}>JUMLAH</th><th style={th()}>KETERANGAN</th></tr></thead>
            <tbody>
                {data.map((r, idx) => (
                    <tr key={r.id}>
                        <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                        <td style={td()}><InputTableText value={r.nama} onChange={v => handleChange(idx, 'nama', v)} disabled={disabled} /></td>
                        <td style={td()}><InputTableText type="number" value={r.jumlah} onChange={v => handleChange(idx, 'jumlah', v)} disabled={disabled} center /></td>
                        <td style={td()}><InputTableText value={r.ket} onChange={v => handleChange(idx, 'ket', v)} disabled={disabled} /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function AdminTableGeneric({ data, columns, keys, types, onChange, disabled }) {
    const handleChange = (idx, field, val) => { const n = [...data]; n[idx][field] = val; onChange(n); };
    return (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '800px' }}>
            <thead><tr><th style={th()}>NO</th>{columns.map(c => <th key={c} style={th()}>{c}</th>)}</tr></thead>
            <tbody>
                {data.map((r, idx) => (
                    <tr key={r.id}>
                        <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                        {keys.map((k, kIdx) => <td key={k} style={td()}><InputTableText type={types?.[kIdx] || 'text'} value={r[k]} onChange={v => handleChange(idx, k, v)} disabled={disabled} center={types?.[kIdx] === 'number'} /></td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function TemplateKepegawaian({ embedded = false, defaultTab = 'detail' }) {
    const [msg, showMsg] = useMsg();
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [isPreview, setIsPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [kData, setKData] = useState(getDefaultKepegawaianData());

    const loadData = useCallback(async (b, t) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('laporan_template').select('template_data').eq('seksi_id', SEKSI_ID_TU).eq('bulan', b).eq('tahun', t).maybeSingle();
            if (error) throw error;
            setKData(data?.template_data?.kepegawaian || getDefaultKepegawaianData());
            setHasChanges(false);
        } catch (e) { showMsg('error', e.message); } finally { setLoading(false); }
    }, [showMsg]);

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun, loadData]);

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
            const newTemplateData = { ...existingData, kepegawaian: kData };

            const { error } = await supabase
                .from('laporan_template')
                .upsert(
                    { seksi_id: SEKSI_ID_TU, bulan, tahun, template_data: newTemplateData, updated_at: new Date().toISOString() },
                    { onConflict: 'seksi_id,bulan,tahun' }
                );

            if (error) throw error;
            showMsg('success', 'Data berhasil disimpan!');
            setHasChanges(false);
        } catch (e) { showMsg('error', e.message); } finally { setSaving(false); }
    };

    const updateSection = (s, v) => { setKData(p => ({ ...p, [s]: v })); setHasChanges(true); };
    const updateSummary = (s, k, v) => { setKData(p => ({ ...p, [s]: { ...p[s], [k]: v } })); setHasChanges(true); };
    const totals = useMemo(() => calcAllTotals(kData), [kData]);

    const toolBtn = (variant = 'default') => ({
        padding: '5px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer',
        fontFamily: FONT, fontSize: '11px', fontWeight: 'bold',
        ...(variant === 'primary'  ? { background: '#3b82f6', color: '#fff' } :
            variant === 'success'  ? { background: '#22c55e', color: '#fff' } :
            variant === 'warning'  ? { background: '#f59e0b', color: '#fff' } :
            { background: '#fff', color: '#1e293b' })
    });

    const TABS = [
        { id: 'detail',  label: '👤 Detail' },
        { id: 'pppk',    label: '📋 PPPK' },
        { id: 'nonasn',  label: '📝 Non ASN' },
        { id: 'summary', label: '📊 Summary' },
        { id: 'lainnya', label: '📁 Lainnya' },
    ];

    return (
        <div style={{ fontFamily: FONT, padding: embedded ? '0' : '24px' }}>

            {/* ── Toolbar ──────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
                padding: '10px 14px', background: '#1e293b', borderRadius: '8px', marginBottom: '12px'
            }}>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Bulan:</span>
                <select value={bulan} onChange={e => setBulan(parseInt(e.target.value))}
                    style={{ padding: '4px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: FONT }}>
                    {BULAN_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
                </select>
                <select value={tahun} onChange={e => setTahun(parseInt(e.target.value))}
                    style={{ padding: '4px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: FONT }}>
                    {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={() => setIsPreview(!isPreview)} style={toolBtn()}>
                        {isPreview ? '✏️ Edit' : '👁 Preview'}
                    </button>
                    <button onClick={handleSave} disabled={saving || loading}
                        style={toolBtn(hasChanges ? 'warning' : 'success')}>
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
                }}>{msg.text}</div>
            )}

            {/* ── Tabs ── */}
            {!isPreview && (
                <div style={{
                    display: 'flex', gap: '6px', padding: '6px 8px',
                    background: '#334155', borderRadius: '8px', marginBottom: '12px'
                }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            padding: '5px 16px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                            fontFamily: FONT, fontSize: '11px',
                            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                            background: activeTab === tab.id ? '#fff' : 'transparent',
                            color: activeTab === tab.id ? '#1e40af' : '#cbd5e1',
                            boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,.2)' : 'none',
                        }}>{tab.label}</button>
                    ))}
                </div>
            )}

            {(activeTab === 'detail' || isPreview) && (
                <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
                    <TablePegawaiDetail data={kData.detail} onChange={v => updateSection('detail', v)} isPreview={isPreview} loading={loading} />
                </div>
            )}
            
            {(activeTab === 'pppk' || isPreview) && (
                <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
                    <TablePegawaiPPPK data={kData.pppk} onChange={v => updateSection('pppk', v)} isPreview={isPreview} loading={loading} />
                </div>
            )}

            {(activeTab === 'nonasn' || isPreview) && (
                <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
                    <TablePegawaiNonASN data={kData.non_asn} onChange={v => updateSection('non_asn', v)} isPreview={isPreview} loading={loading} />
                </div>
            )}

            {(activeTab === 'summary' || isPreview) && (
                <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px' }}>
                    <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>4. REKAPITULASI BEZETTING</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                        <TableSummary title="4.1. Berdasarkan Golongan" structRows={GOLONGAN_ROWS} data={kData.golongan} totalKey={totals.golongan} onChange={(k,v)=>updateSummary('golongan',k,v)} isPreview={isPreview} loading={loading} />
                        <TableSummary title="4.2. Berdasarkan Jabatan" structRows={JABATAN_ROWS} data={kData.jabatan} totalKey={totals.jabatan} onChange={(k,v)=>updateSummary('jabatan',k,v)} isPreview={isPreview} loading={loading} />
                        <TableSummary title="4.3. Berdasarkan Pendidikan" structRows={PENDIDIKAN_ROWS} data={kData.pendidikan} totalKey={totals.pendidikan} onChange={(k,v)=>updateSummary('pendidikan',k,v)} isPreview={isPreview} loading={loading} />
                        <TableSummary title="4.4. Berdasarkan Jenis Kelamin" structRows={GENDER_ROWS} data={kData.gender} totalKey={totals.gender} onChange={(k,v)=>updateSummary('gender',k,v)} isPreview={isPreview} loading={loading} />
                        <TableSummary title="4.5. Berdasarkan Status" structRows={STATUS_ROWS} data={kData.status} totalKey={totals.status} onChange={(k,v)=>updateSummary('status',k,v)} isPreview={isPreview} loading={loading} />
                    </div>
                </div>
            )}

            {(activeTab === 'lainnya' || isPreview) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                        <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>2. Rekapitulasi Pegawai</div>
                        <AdminTableRekapitulasi data={kData.rekap_pegawai} onChange={v => updateSection('rekap_pegawai', v)} disabled={isPreview || loading} />
                    </div>

                    <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                        <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>3. Data Cuti Pegawai</div>
                        <AdminTableCuti data={kData.cuti} onChange={v => updateSection('cuti', v)} disabled={isPreview || loading} total={totals.cuti} />
                    </div>

                    <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                        <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>4. Pembinaan Pegawai</div>
                        <AdminTableGeneric data={kData.pembinaan} onChange={v => updateSection('pembinaan', v)} columns={['JENIS KEGIATAN', 'KETERANGAN']} keys={['nama', 'ket']} disabled={isPreview || loading} />
                    </div>

                    <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                        <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>5. Tata Usaha (Persuratan)</div>
                        <AdminTableGeneric data={kData.tata_usaha} onChange={v => updateSection('tata_usaha', v)} columns={['JENIS KEGIATAN', 'JUMLAH']} keys={['nama', 'jumlah']} types={['text', 'number']} disabled={isPreview || loading} />
                    </div>
                </div>
            )}
        </div>
    );
}
