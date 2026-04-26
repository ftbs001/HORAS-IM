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

function TableSummary({ titleValue, titleKey, data, totalKey, onChange, isPreview, loading, onTitleChange }) {
    const handleAdd = () => onChange([...(data || []), { id: `rs_${Date.now()}`, label: '', value: 0 }]);
    const handleRemove = (idx) => { const n = [...data]; n.splice(idx, 1); onChange(n); };
    const handleChange = (idx, field, val) => { const n = [...data]; n[idx][field] = val; onChange(n); };

    return (
        <div style={{ marginBottom: '24px', flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                {isPreview ? (
                    <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold' }}>{titleValue}</div>
                ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                        <input type="text" value={titleValue || ''} onChange={e => onTitleChange(e.target.value)} disabled={loading}
                            style={{ flex: 1, fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', border: '1px solid #ddd', padding: '4px', borderRadius: '4px', background: 'transparent' }} />
                        <button onClick={handleAdd} disabled={loading} style={{ padding: '2px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px' }}>+ Tambah</button>
                    </div>
                )}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr><th style={th()}>NO</th><th style={th()}>URAIAN</th><th style={th()}>JUMLAH</th>{!isPreview && <th style={th({ background: '#f87171' })}>Aksi</th>}</tr></thead>
                <tbody>
                    {(data || []).map((r, idx) => (
                        <tr key={r.id}>
                            <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                            <td style={td()}><InputTableText value={r.label} onChange={v => handleChange(idx, 'label', v)} disabled={isPreview||loading} /></td>
                            <td style={td()}><InputTableNum value={r.value || 0} onChange={v => handleChange(idx, 'value', v)} disabled={isPreview||loading} /></td>
                            {!isPreview && <td style={td({ textAlign: 'center' })}><button onClick={() => handleRemove(idx)} style={{ color: 'red', border: 'none', background: 'none' }}>x</button></td>}
                        </tr>
                    ))}
                    {/* Baris Total */}
                    <tr>
                        <td colSpan={2} style={td({ textAlign: 'right', fontWeight: 'bold' })}>TOTAL</td>
                        <td style={td({ textAlign: 'center', fontWeight: 'bold' })}>{totalKey}</td>
                        {!isPreview && <td style={td()}></td>}
                    </tr>
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
export default function TemplateKepegawaian({ embedded = false, defaultTab = 'detail', defaultSubSection = null, forcePreview = false, propBulan = null, propTahun = null }) {
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
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [kData, setKData] = useState(getDefaultKepegawaianData());

    const loadData = useCallback(async (b, t) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('laporan_template').select('template_data').eq('seksi_id', SEKSI_ID_TU).eq('bulan', b).eq('tahun', t).maybeSingle();
            if (error) throw error;
            let kd = data?.template_data?.kepegawaian || getDefaultKepegawaianData();
            
            // Legacy Migration: convert old keyed objects to dynamic arrays
            if (kd.golongan && !Array.isArray(kd.golongan)) {
                kd.golongan = GOLONGAN_ROWS.map(r => ({ id: r.id, label: r.label, value: kd.golongan[r.id] || 0 }));
                kd.jabatan = JABATAN_ROWS.map(r => ({ id: r.id, label: r.label, value: kd.jabatan[r.id] || 0 }));
                kd.pendidikan = PENDIDIKAN_ROWS.map(r => ({ id: r.id, label: r.label, value: kd.pendidikan[r.id] || 0 }));
                kd.gender = GENDER_ROWS.map(r => ({ id: r.id, label: r.label, value: kd.gender[r.id] || 0 }));
                kd.status = STATUS_ROWS.map(r => ({ id: r.id, label: r.label, value: kd.status[r.id] || 0 }));
            }
            
            // Auto inject titles if missing
            kd.title_golongan = kd.title_golongan || "4.1. Berdasarkan Golongan";
            kd.title_jabatan = kd.title_jabatan || "4.2. Berdasarkan Jabatan";
            kd.title_pendidikan = kd.title_pendidikan || "4.3. Berdasarkan Pendidikan";
            kd.title_gender = kd.title_gender || "4.4. Berdasarkan Jenis Kelamin";
            kd.title_status = kd.title_status || "4.5. Berdasarkan Status";

            setKData(kd);
            setHasChanges(false);
        } catch (e) { showMsg('error', e.message); } finally { setLoading(false); }
    }, [showMsg]);

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun, loadData]);

    // Deep link scroll
    useEffect(() => {
        if (!defaultSubSection) return;
        const sectionMap = {
            'bab2_fasilitatif_kepegawaian_rekap': 'sec_rekap_pegawai',
            'bab2_fasilitatif_kepegawaian_cuti': 'sec_cuti',
            'bab2_fasilitatif_kepegawaian_pembinaan': 'sec_pembinaan',
            'bab2_fasilitatif_kepegawaian_persuratan': 'sec_persuratan',
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
            {!forcePreview && (
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
                                    
                                    // 1. Keuangan
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
                            style={toolBtn('primary')}
                            title="Cetak seluruh template Tata Usaha (Keuangan, Kepegawaian, Umum)"
                        >
                            📄 Ekspor Tata Usaha
                        </button>
                        {loading && <span style={{ color: '#94a3b8', fontSize: '11px' }}>Memuat...</span>}
                    </div>
                </div>
            )}

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
                        <TableSummary titleValue={kData.title_golongan} titleKey="title_golongan" data={kData.golongan} totalKey={totals.golongan} onChange={(v)=>updateSection('golongan', v)} onTitleChange={(v)=>updateSection('title_golongan', v)} isPreview={isPreview} loading={loading} />
                        <TableSummary titleValue={kData.title_jabatan} titleKey="title_jabatan" data={kData.jabatan} totalKey={totals.jabatan} onChange={(v)=>updateSection('jabatan', v)} onTitleChange={(v)=>updateSection('title_jabatan', v)} isPreview={isPreview} loading={loading} />
                        <TableSummary titleValue={kData.title_pendidikan} titleKey="title_pendidikan" data={kData.pendidikan} totalKey={totals.pendidikan} onChange={(v)=>updateSection('pendidikan', v)} onTitleChange={(v)=>updateSection('title_pendidikan', v)} isPreview={isPreview} loading={loading} />
                        <TableSummary titleValue={kData.title_gender} titleKey="title_gender" data={kData.gender} totalKey={totals.gender} onChange={(v)=>updateSection('gender', v)} onTitleChange={(v)=>updateSection('title_gender', v)} isPreview={isPreview} loading={loading} />
                        <TableSummary titleValue={kData.title_status} titleKey="title_status" data={kData.status} totalKey={totals.status} onChange={(v)=>updateSection('status', v)} onTitleChange={(v)=>updateSection('title_status', v)} isPreview={isPreview} loading={loading} />
                    </div>
                </div>
            )}

            {(activeTab === 'lainnya' || isPreview) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div id="sec_rekap_pegawai" style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', scrollMarginTop: '16px' }}>
                        <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>2. Rekapitulasi Pegawai</div>
                        <AdminTableRekapitulasi data={kData.rekap_pegawai} onChange={v => updateSection('rekap_pegawai', v)} disabled={isPreview || loading} />
                    </div>

                    <div id="sec_cuti" style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', scrollMarginTop: '16px' }}>
                        <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>3. Data Cuti Pegawai</div>
                        <AdminTableCuti data={kData.cuti} onChange={v => updateSection('cuti', v)} disabled={isPreview || loading} total={totals.cuti} />
                    </div>

                    <div id="sec_pembinaan" style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', scrollMarginTop: '16px' }}>
                        <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>4. Pembinaan Pegawai</div>
                        <AdminTableGeneric data={kData.pembinaan} onChange={v => updateSection('pembinaan', v)} columns={['JENIS KEGIATAN', 'KETERANGAN']} keys={['nama', 'ket']} disabled={isPreview || loading} />
                    </div>

                    <div id="sec_persuratan" style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', scrollMarginTop: '16px' }}>
                        <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px' }}>5. Tata Usaha (Persuratan)</div>
                        <AdminTableGeneric data={kData.tata_usaha} onChange={v => updateSection('tata_usaha', v)} columns={['JENIS KEGIATAN', 'JUMLAH']} keys={['nama', 'jumlah']} types={['text', 'number']} disabled={isPreview || loading} />
                    </div>
                </div>
            )}
        </div>
    );
}
