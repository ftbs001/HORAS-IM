/**
 * TemplatePenutup.jsx
 * UI Component for BAB IV PENUTUP
 *
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useReport } from '../../../contexts/ReportContext';
import { supabase } from '../../../lib/supabaseClient';
import { getDefaultPenutupData, EMPTY_SARAN } from '../../../utils/penutupSchema';
import BsreBadge from '../../common/BsreBadge';

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
const FONT = '"Times New Roman", Georgia, serif';
const HEADER_BG = '#fff'; // Black & white — no fill

/* ── Style helpers ───────────────────────────────────────────────────────── */
const th = (extra = {}) => ({
    border: '1px solid #000', padding: '6px',
    background: HEADER_BG, fontFamily: FONT, fontSize: '10pt',
    fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle',
    ...extra
});

const td = (extra = {}) => ({
    border: '1px solid #000', padding: '6px',
    fontFamily: FONT, fontSize: '10pt', verticalAlign: 'top', ...extra
});

const inputStyle = {
    width: '100%', border: 'none', outline: 'none', background: 'transparent',
    fontFamily: FONT, fontSize: '10pt', padding: '4px'
};

/* ── Generic text input ───────────────────────────────────────────────────── */
const TdInput = ({ value, onChange, disabled, multiline, rows = 3 }) => {
    if (disabled) {
        return (
            <div style={{ textAlign: 'left', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                {value || ''}
            </div>
        );
    }
    if (multiline) {
        return (
            <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                rows={rows}
                style={{ ...inputStyle, resize: 'vertical', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', borderRadius: '4px' }}
            />
        );
    }
    return (
        <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputStyle, border: '1px solid #e2e8f0', borderRadius: '4px' }}
        />
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
   KOMPONEN SARAN & KESIMPULAN
═══════════════════════════════════════════════════════════════════════════ */
function PenutupEditor({ data, onChange, isPreview, bulan, tahun, esignLogoUrl = null }) {
    const { saran, kesimpulan } = data;

    const safeTtd = {
        jabatan: data.ttd?.jabatan || 'Kepala Kantor,',
        nama: data.ttd?.nama || 'Benyamin Kali Patembal Harahap',
        kiri: data.ttd?.kiri || '${ttd_pengirim}',
        showEsign: data.ttd?.showEsign !== false,
    };
    const safeTembusan = data.tembusan || [];

    const addSaran = () => onChange({ ...data, saran: [...saran, { ...EMPTY_SARAN, id: `saran_${Date.now()}` }] });
    const removeSaran = (idx) => {
        const newData = [...saran];
        newData.splice(idx, 1);
        onChange({ ...data, saran: newData });
    };
    const updateSaran = (idx, field, val) => {
        const newData = [...saran];
        newData[idx] = { ...newData[idx], [field]: val };
        onChange({ ...data, saran: newData });
    };

    const updateKesimpulan = (val) => onChange({ ...data, kesimpulan: val });
    const updateTtd = (field, val) => onChange({ ...data, ttd: { ...safeTtd, [field]: val } });
    
    const addTembusan = () => onChange({ ...data, tembusan: [...safeTembusan, { id: `temb_${Date.now()}`, isi: '' }] });
    const removeTembusan = (idx) => {
        const newData = [...safeTembusan];
        newData.splice(idx, 1);
        onChange({ ...data, tembusan: newData });
    };
    const updateTembusan = (idx, val) => {
        const newData = [...safeTembusan];
        newData[idx] = { ...newData[idx], isi: val };
        onChange({ ...data, tembusan: newData });
    };

    const kesimpulanPreview = isPreview ? (kesimpulan||'').replace(/{Bulan}/g, BULAN_NAMES[bulan] || '').replace(/{Tahun}/g, tahun) : kesimpulan;

    if (isPreview) {
        return (
            <div>
                {/* A. SARAN */}
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>A. SARAN</div>
                <div style={{ paddingLeft: '16px', marginBottom: '20px' }}>
                    {saran.length === 0 ? (
                        <div style={{ fontStyle: 'italic', color: '#64748b' }}>Belum ada saran.</div>
                    ) : (
                        <ol style={{ margin: 0, paddingLeft: '16px' }}>
                            {saran.map((row, idx) => (
                                <li key={row.id || idx} style={{ marginBottom: '12px', paddingLeft: '4px' }}>
                                    <div>{row.judul}</div>
                                    <div style={{ textAlign: 'justify', lineHeight: '1.5', marginTop: '4px' }}>
                                        {row.isi}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* B. KESIMPULAN */}
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>B. KESIMPULAN</div>
                <div style={{ textAlign: 'justify', lineHeight: '1.5', paddingLeft: '24px', whiteSpace: 'pre-line', marginBottom: '40px' }}>
                    {kesimpulanPreview}
                </div>

                {/* TANDA TANGAN & TEMBUSAN (Preview) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingLeft: '24px' }}>
                    <div style={{ width: '45%' }}>
                        <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center' }}>
                            {safeTtd.kiri}
                        </div>
                    </div>
                    <div style={{ width: '45%' }}>
                        <div style={{ marginBottom: 8 }}>{safeTtd.jabatan}</div>
                        {safeTtd.showEsign ? (
                            <div style={{ margin: '6px 0 10px 0' }}>
                                <BsreBadge width={280} logoSrc={esignLogoUrl || null} />
                            </div>
                        ) : (
                            <div style={{ height: '70px' }}></div>
                        )}
                        <div style={{ fontWeight: 'bold', marginTop: 4 }}>{safeTtd.nama}</div>
                    </div>
                </div>

                <div style={{ marginTop: '40px', paddingLeft: '24px' }}>
                    <div style={{ marginBottom: '4px' }}>Tembusan :</div>
                    {safeTembusan.length === 0 ? (
                        <div style={{ fontStyle: 'italic', color: '#64748b' }}>Belum ada tembusan.</div>
                    ) : (
                        <ol style={{ margin: 0, paddingLeft: '16px' }}>
                            {safeTembusan.map((row, idx) => (
                                <li key={row.id || idx} style={{ marginBottom: '4px', whiteSpace: 'pre-line' }}>
                                    {row.isi}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>
        );
    }

    // Edit mode
    return (
        <div>
            {/* A. SARAN */}
            <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '11pt' }}>A. SARAN</div>
                    <button onClick={addSaran} style={{
                        fontSize: '11px', background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                    }}>+ Tambah Saran</button>
                </div>
                
                {saran.length === 0 ? (
                    <div style={{ textAlign: 'center', fontStyle: 'italic', color: '#94a3b8', padding: '10px' }}>
                        — Belum ada data —
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {saran.map((row, idx) => (
                            <div key={row.id || idx} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                    <button onClick={() => removeSaran(idx)} style={{
                                        color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', padding: '2px 6px', borderRadius: '4px'
                                    }}>Hapus</button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 'bold' }}>{idx + 1}.</span>
                                    <div style={{ flex: 1, paddingRight: '40px' }}>
                                        <TdInput value={row.judul} onChange={v => updateSaran(idx, 'judul', v)} placeholder="Judul Bagian Saran (contoh: Urusan Kepegawaian)" />
                                    </div>
                                </div>
                                <div style={{ paddingLeft: '20px' }}>
                                    <TdInput value={row.isi} onChange={v => updateSaran(idx, 'isi', v)} multiline rows={4} placeholder="Isi Saran..." />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* B. KESIMPULAN */}
            <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '11pt', marginBottom: '8px' }}>B. KESIMPULAN</div>
                <div style={{ marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>
                    Tip: Gunakan variabel <b>{'{Bulan}'}</b> dan <b>{'{Tahun}'}</b> untuk otomatisasi bulan dan tahun saat render.
                </div>
                <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                    <TdInput value={kesimpulan} onChange={updateKesimpulan} multiline rows={6} placeholder="Isi Kesimpulan..." />
                </div>
            </div>

            {/* TANDA TANGAN */}
            <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', marginTop: '12px' }}>
                <div style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '11pt', marginBottom: '8px' }}>PENANDATANGAN</div>
                <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Teks Kiri Bawah (Misal: {'${ttd_pengirim}'})</div>
                        <TdInput value={safeTtd.kiri} onChange={v => updateTtd('kiri', v)} placeholder="${ttd_pengirim}" />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Jabatan Kanan (Baris Atas)</div>
                        <TdInput value={safeTtd.jabatan} onChange={v => updateTtd('jabatan', v)} placeholder="Kepala Kantor," />
                        
                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '12px', marginBottom: '4px', color: '#475569' }}>Nama Pejabat</div>
                        <TdInput value={safeTtd.nama} onChange={v => updateTtd('nama', v)} placeholder="Nama Lengkap Pejabat" />
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', cursor: 'pointer', fontSize: '11px' }}>
                            <input type="checkbox" checked={safeTtd.showEsign} onChange={e => updateTtd('showEsign', e.target.checked)} />
                            <span>Tampilkan Blok E-Sign (Logo KEMENIMIPAS)</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* TEMBUSAN */}
            <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', marginTop: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '11pt' }}>TEMBUSAN</div>
                    <button onClick={addTembusan} style={{
                        fontSize: '11px', background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                    }}>+ Tambah Tembusan</button>
                </div>
                {safeTembusan.length === 0 ? (
                    <div style={{ textAlign: 'center', fontStyle: 'italic', color: '#94a3b8', padding: '10px' }}>— Belum ada tembusan —</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {safeTembusan.map((row, idx) => (
                            <div key={row.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px' }}>
                                <span style={{ fontWeight: 'bold', marginTop: '8px' }}>{idx + 1}.</span>
                                <div style={{ flex: 1 }}>
                                    <TdInput value={row.isi} onChange={v => updateTembusan(idx, v)} multiline rows={2} placeholder="Isi tembusan..." />
                                </div>
                                <button onClick={() => removeTembusan(idx)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', padding: '4px' }} title="Hapus">×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN TEMPLATE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function TemplatePenutup({
    embedded = false,
    propBulan,
    propTahun,
    forcePreview = false
}) {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';
    // coverLetterData adalah SUMBER TUNGGAL untuk esignLogoUrl
    // — sama dengan yang diupload di Surat Pengantar
    const { coverLetterData, updateCoverLetter } = useReport();

    const [bulan, setBulan] = useState(propBulan || new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(propTahun || new Date().getFullYear());
    const [uData, setUData] = useState(getDefaultPenutupData());

    const [loading, setLoading]           = useState(false);
    const [saving, setSaving]             = useState(false);
    const [isPreview, setIsPreview]       = useState(forcePreview);
    const [logoUploading, setLogoUploading] = useState(false);
    const logoInputRef = useRef(null);

    // esignLogoUrl — langsung dari context (sinkron dengan Surat Pengantar)
    const esignLogoUrl = coverLetterData?.esignLogoUrl || null;

    /* ── Upload logo TTD ──────────────────────────────────────── */
    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showMsg('error', 'File harus berupa gambar (PNG, JPG, dll)');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showMsg('error', 'Ukuran gambar maksimal 5MB');
            return;
        }
        setLogoUploading(true);
        try {
            const ext      = file.name.split('.').pop();
            const filePath = `esign-logos/logo_ttd_${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('report-images')
                .upload(filePath, file, { upsert: true });
            if (upErr) throw upErr;
            const { data: urlData } = supabase.storage
                .from('report-images')
                .getPublicUrl(filePath);
            const publicUrl = urlData?.publicUrl;
            if (!publicUrl) throw new Error('Gagal mendapat URL gambar');
            // Simpan ke cover_letter data (sinkron dengan Surat Pengantar)
            await updateCoverLetter({ ...coverLetterData, esignLogoUrl: publicUrl });
            showMsg('success', '✅ Logo TTD berhasil diupload!');
        } catch (err) {
            console.error('Logo upload error:', err);
            showMsg('error', '❌ Gagal upload: ' + err.message);
        } finally {
            setLogoUploading(false);
            if (logoInputRef.current) logoInputRef.current.value = '';
        }
    };

    const handleRemoveLogo = async () => {
        await updateCoverLetter({ ...coverLetterData, esignLogoUrl: null });
        showMsg('info', 'Logo TTD dihapus, kembali ke default');
    };

    // Track original data for dirty check
    const [originalData, setOriginalData] = useState('');
    const hasChanges = JSON.stringify(uData) !== originalData;

    const [msg, setMsg] = useState(null);
    const showMsg = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 3000);
    };

    const updateData = useCallback((newData) => {
        setUData(newData);
    }, []);

    const loadData = async (b, t) => {
        if (!b || !t) return;
        setLoading(true);
        setMsg(null);
        try {
            const { data, error } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', 4)  // TU row (same as Kepegawaian/Keuangan/Umum)
                .eq('bulan', b)
                .eq('tahun', t)
                .maybeSingle();

            if (error) throw error;
            // penutup data is nested inside template_data.penutup
            const raw = data?.template_data?.penutup;
            if (raw) {
                const parsed = { ...getDefaultPenutupData(), ...raw };
                setUData(parsed);
                setOriginalData(JSON.stringify(parsed));
            } else {
                const def = getDefaultPenutupData();
                setUData(def);
                setOriginalData(JSON.stringify(def));
            }
        } catch (err) {
            console.error('loadData err:', err);
            showMsg('error', 'Gagal memuat data dari database.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun]);

    useEffect(() => {
        if (propBulan && propTahun) {
            setBulan(propBulan);
            setTahun(propTahun);
        }
    }, [propBulan, propTahun]);

    useEffect(() => {
        setIsPreview(forcePreview);
    }, [forcePreview]);
    useEffect(() => {
        const uStr = JSON.stringify(uData);
        if (originalData && uStr !== originalData && !loading && !saving && !isPreview) {
            const timer = setTimeout(() => {
                handleSave(true); // auto-save silent
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [uData, originalData, loading, saving, isPreview]);

    const handleSave = async (isAutoSave = false) => {
        if (loading || (saving && !isAutoSave)) return;
        if (!isAutoSave) setSaving(true);
        if (!isAutoSave) setMsg(null);
        try {
            // Fetch existing TU row to preserve other keys (keuangan, kepegawaian, umum)
            const { data: existing } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', 4)
                .eq('bulan', bulan)
                .eq('tahun', tahun)
                .maybeSingle();

            const existingData = existing?.template_data || {};
            const newTemplateData = { ...existingData, penutup: uData };

            const { error } = await supabase
                .from('laporan_template')
                .upsert(
                    { seksi_id: 4, bulan, tahun, template_data: newTemplateData, updated_at: new Date().toISOString() },
                    { onConflict: 'seksi_id,bulan,tahun' }
                );
            if (error) throw error;
            setOriginalData(JSON.stringify(uData));
            if (!isAutoSave) showMsg('success', 'Data penutup berhasil disimpan!');
        } catch (err) {
            console.error('handleSave err:', err);
            if (!isAutoSave) showMsg('error', 'Gagal menyimpan data.');
        } finally {
            if (!isAutoSave) setSaving(false);
        }
    };

    const toolBtn = (mode) => ({
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
        fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
        background: mode === 'primary' ? '#2563eb' : mode === 'toggle' ? '#f1f5f9' : '#fff',
        color: mode === 'primary' ? '#fff' : mode === 'toggle' ? '#475569' : '#333',
        border: mode === 'toggle' ? '1px solid #cbd5e1' : 'none',
        boxShadow: mode === 'primary' ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
    });

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', fontSize: '10pt', fontFamily: FONT, background: embedded ? 'transparent' : '#f8fafc', padding: embedded ? '0' : '20px' }}>
            {/* ── Toolbar ── */}
            {(!embedded || (!forcePreview && embedded)) && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '16px', background: '#fff', padding: '12px 16px',
                    borderRadius: '8px', border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div>
                            <select value={bulan} onChange={e => setBulan(+e.target.value)} disabled={embedded && propBulan}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                                {BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                            </select>
                        </div>
                        <div>
                            <select value={tahun} onChange={e => setTahun(+e.target.value)} disabled={embedded && propTahun}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                                {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!forcePreview && (
                            <button onClick={() => setIsPreview(!isPreview)} style={toolBtn('toggle')} title="Toggle mode Edit / Preview">
                                {isPreview ? '✏️ Mode Edit' : '👁️ Mode Preview'}
                            </button>
                        )}
                        {!isPreview && (
                            <button onClick={handleSave} disabled={saving || loading || !hasChanges} style={{ ...toolBtn('primary'), opacity: hasChanges ? 1 : 0.6 }}>
                                {saving ? '⏳ Menyimpan...' : '💾 Simpan Data'}
                            </button>
                        )}
                        <button 
                            onClick={async () => {
                                try {
                                    setMsg({ type: 'info', text: 'Mengekspor Word...' });
                                    const { data, error } = await supabase
                                        .from('laporan_template')
                                        .select('template_data')
                                        .eq('seksi_id', 4)
                                        .eq('bulan', bulan)
                                        .eq('tahun', tahun)
                                        .maybeSingle();
                                    
                                    if (error) throw error;
                                    const td = data?.template_data?.penutup || uData;
                                    
                                    const bName = BULAN_NAMES[bulan] || '';
                                    const { exportStandaloneTemplateDocx, getPenutupDocxElements } = await import('../../../utils/templateDocxExporter.js');
                                    
                                    // Generate BSrE badge PNG — pakai logo yang diupload user (esignLogoUrl)
                                    let bsrePngBuf = null;
                                    try {
                                        const { getBsreBadgePngBuffer } = await import('../../common/BsreBadge.jsx');
                                        // Pass esignLogoUrl agar logo yang diupload user tampil di Word juga
                                        bsrePngBuf = await getBsreBadgePngBuffer(380, esignLogoUrl || null);
                                    } catch (e) {
                                        console.warn('BSrE badge PNG gagal:', e);
                                        try {
                                            const res = await fetch(esignLogoUrl || '/bsre_shield.png');
                                            if (res.ok) bsrePngBuf = await res.arrayBuffer();
                                        } catch {}
                                    }

                                    const elems = getPenutupDocxElements(td, bName, tahun, bsrePngBuf);
                                    
                                    await exportStandaloneTemplateDocx({
                                        title: 'BAB IV PENUTUP',
                                        filename: 'Template_BAB_IV_Penutup',
                                        bulanName: bName,
                                        tahun,
                                        elements: elems,
                                        isLandscape: false
                                    });
                                    showMsg('success', '✅ Ekspor Penutup berhasil!');
                                } catch (err) {
                                    showMsg('error', '❌ Gagal ekspor Word: ' + err.message);
                                }
                            }}
                            disabled={saving || loading}
                            style={toolBtn('primary')}
                            title="Cetak template BAB IV Penutup"
                        >
                            📄 Ekspor BAB IV (Standalone)
                        </button>
                        {loading && <span style={{ color: '#94a3b8', fontSize: '11px' }}>Memuat...</span>}
                    </div>
                </div>
            )}

            {/* ── Panel Upload Logo TTD ── */}
            {!embedded && (
                <div style={{
                    margin: '0 0 16px 0',
                    padding: '14px 18px',
                    border: '2px dashed #94a3b8',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}>
                    {/* Preview logo */}
                    <div style={{
                        width: '80px', height: '80px',
                        border: '2px solid #e2e8f0', borderRadius: '8px',
                        background: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', flexShrink: 0,
                    }}>
                        <img
                            src={esignLogoUrl || '/bsre_shield.png'}
                            alt="Logo TTD"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>

                    {/* Controls */}
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#1e40af', marginBottom: '3px' }}>
                            🖼️ Logo Tanda Tangan Elektronik
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                            {esignLogoUrl
                                ? '✅ Logo kustom aktif — sinkron dengan Surat Pengantar & ekspor Word.'
                                : 'Menggunakan logo default. Upload logo untuk tampil persis seperti referensi.'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '6px 14px',
                                background: logoUploading ? '#94a3b8' : '#1e40af',
                                color: '#fff', borderRadius: '6px',
                                fontSize: '11px', fontWeight: 600,
                                cursor: logoUploading ? 'not-allowed' : 'pointer',
                            }}>
                                {logoUploading ? '⏳ Mengupload...' : '📤 Upload Logo TTD'}
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleLogoUpload}
                                    disabled={logoUploading}
                                />
                            </label>
                            {esignLogoUrl && (
                                <button
                                    onClick={handleRemoveLogo}
                                    style={{
                                        padding: '6px 12px',
                                        background: '#fee2e2', color: '#dc2626',
                                        border: '1px solid #fca5a5',
                                        borderRadius: '6px', fontSize: '11px',
                                        fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    🗑️ Hapus
                                </button>
                            )}
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                PNG/JPG • Maks 5MB • Otomatis sync ke Surat Pengantar
                            </span>
                        </div>
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
                }}>
                    {msg.text}
                </div>
            )}

            {/* ── Content Area ── */}
            <div style={{
                padding: '30px 45px', background: '#fff',
                borderRadius: '8px', border: '1px solid #e2e8f0',
                fontFamily: FONT, minHeight: '600px',
                boxShadow: isPreview ? '0 10px 25px rgba(0,0,0,0.05)' : 'none',
                maxWidth: isPreview ? '21cm' : '100%', // A4 width hint for preview
                margin: isPreview ? '0 auto' : '0'
            }}>
                {/* HEADING shown only in preview */}
                {isPreview && (
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>BAB IV</div>
                        <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>PENUTUP</div>
                    </div>
                )}

                <PenutupEditor
                    data={uData}
                    onChange={updateData}
                    isPreview={isPreview}
                    bulan={bulan}
                    tahun={tahun}
                    esignLogoUrl={esignLogoUrl}
                />
            </div>

            {/* ── Change indicator ── */}
            {hasChanges && !saving && !isPreview && (
                <div style={{
                    marginTop: '8px', fontSize: '11px', color: '#92400e',
                    background: '#fef3c7', padding: '6px 12px', borderRadius: '6px',
                    fontFamily: FONT
                }}>
                    ⚠️ Terdapat perubahan yang belum disimpan. Klik "Simpan Data" untuk menyimpan.
                </div>
            )}
        </div>
    );
}
