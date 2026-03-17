import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useLaporan } from '../../../contexts/LaporanContext';
import DocxPreviewRenderer from '../../common/DocxPreviewRenderer';
import PagedDocumentViewer from '../../common/PagedDocumentViewer';

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const normalizeName = (name = '') =>
    name.toLowerCase().trim()
        .replace(/^seksi\s+/i, '')
        .replace(/^subbag(ian)?\s+/i, '');

const sectionScore = (r) =>
    (Number(r.staff) || 0) + (Number(r.programs) || 0) + (Number(r.performance) || 0);

const dedupSections = (rows = []) => {
    const map = new Map();
    rows.forEach(r => {
        const key = normalizeName(r.name);
        const prev = map.get(key);
        if (!prev || sectionScore(r) > sectionScore(prev)) map.set(key, r);
    });
    return Array.from(map.values());
};

const STATUS_COLOR = {
    'Draft': { bg: '#dbeafe', text: '#1d4ed8' },
    'Dikirim': { bg: '#fef9c3', text: '#854d0e' },
    'Perlu Revisi': { bg: '#fee2e2', text: '#b91c1c' },
    'Disetujui': { bg: '#dcfce7', text: '#15803d' },
    'Final': { bg: '#f3e8ff', text: '#7e22ce' },
};

export default function MonitoringLaporan({ onNavigate }) {
    const { user } = useAuth();
    const { loadLaporan, getLaporan, subscribe, submitLaporan: ctxSubmit } = useLaporan();

    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);

    // Modal review
    const [reviewModal, setReviewModal] = useState(null);
    const [catatan, setCatatan] = useState('');
    const [processing, setProcessing] = useState(false);

    // DOCX inline preview
    const [docxPreviewTarget, setDocxPreviewTarget] = useState(null);
    const [docxPreviewTab, setDocxPreviewTab] = useState('structured'); // 'structured' | 'html'

    const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

    // ── Load sections & laporan
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: sec, error: secErr } = await supabase
                .from('sections')
                .select('id, name, urutan_penggabungan')
                .order('urutan_penggabungan');
            if (secErr) console.error('MonitoringLaporan: gagal load sections:', secErr);
            setSections(dedupSections(sec || []));
            await loadLaporan(bulan, tahun);
        } catch (err) {
            console.error('MonitoringLaporan loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, [bulan, tahun, loadLaporan]);

    // ── Force refresh
    const handleRefresh = useCallback(() => loadData(), [loadData]);

    useEffect(() => { loadData(); }, [loadData]);

    // Subscribe to LaporanContext changes (upload by admin_seksi triggers refresh here)
    useEffect(() => {
        const unsub = subscribe((b, t) => {
            if (b === bulan && t === tahun) loadLaporan(bulan, tahun);
        });
        return unsub;
    }, [subscribe, bulan, tahun, loadLaporan]);

    // Get laporan list from context cache
    const laporan = getLaporan(bulan, tahun);

    // Derive rows (section + their laporan)
    const rows = sections.map(s => ({
        ...s,
        laporan: laporan.find(l => l.seksi_id === s.id) || null,
    }));

    // Laporan yang seksi_id-nya tidak cocok dengan sections yang ada (orphan)
    const matchedIds = new Set(rows.filter(r => r.laporan).map(r => r.laporan.id));
    const orphanLaporan = laporan.filter(l => !matchedIds.has(l.id));

    const semuaDisetujui = sections.length > 0 &&
        sections.every(s => laporan.find(l => l.seksi_id === s.id && l.status === 'Disetujui'));
    const sudahFinal = laporan.length > 0 && laporan.every(l => l.status === 'Final');

    // ── Review action
    const openReview = (l, action) => { setReviewModal({ laporan: l, action }); setCatatan(''); };

    const handleReview = async () => {
        if (!reviewModal) return;
        const { laporan: l, action } = reviewModal;
        if (action === 'revisi' && !catatan.trim())
            return showMsg('error', 'Isi catatan revisi terlebih dahulu.');

        setProcessing(true);
        try {
            const updateData = {
                status: action === 'approve' ? 'Disetujui' : 'Perlu Revisi',
                catatan_revisi: action === 'revisi' ? catatan.trim() : null,
                reviewed_by: user.id,
                approved_at: action === 'approve' ? new Date().toISOString() : null,
            };
            const { error } = await supabase.from('laporan_bulanan').update(updateData).eq('id', l.id);
            if (error) throw error;

            await supabase.from('activity_logs').insert({
                user_id: user.id, user_name: user.nama,
                action: action === 'approve' ? 'approve' : 'revisi',
                entity_type: 'laporan_bulanan', entity_id: l.id,
                detail: `${action === 'approve' ? 'Setujui' : 'Minta revisi'} laporan seksi_id=${l.seksi_id} ${BULAN_NAMES[bulan]} ${tahun}`,
            });

            setReviewModal(null);
            showMsg('success', action === 'approve' ? 'Laporan disetujui!' : 'Catatan revisi dikirim!');
            await loadLaporan(bulan, tahun);
        } catch (err) {
            showMsg('error', err.message);
        } finally {
            setProcessing(false);
        }
    };

    // ── Paksa Submit
    const handlePaksaSubmit = async (l) => {
        if (!window.confirm('Paksa status laporan ini menjadi "Dikirim"?')) return;
        setProcessing(true);
        try {
            const { error } = await supabase.from('laporan_bulanan')
                .update({ status: 'Dikirim', submitted_at: new Date().toISOString() })
                .eq('id', l.id);
            if (error) throw error;
            showMsg('success', 'Laporan berhasil dipindah ke status Dikirim.');
            await loadLaporan(bulan, tahun);
        } catch (err) {
            showMsg('error', err.message);
        } finally {
            setProcessing(false);
        }
    };

    // ── Render action buttons per status
    const renderActions = (l) => {
        const previewBtn = (l?.structured_json?.pages?.length || l?.docx_html || l?.file_url) ? (
            <button
                onClick={() => {
                    if (l.structured_json?.pages?.length || l.docx_html) {
                        setDocxPreviewTab(l.structured_json?.pages?.length ? 'structured' : 'html');
                        setDocxPreviewTarget(l);
                    } else {
                        window.open(l.file_url, '_blank');
                    }
                }}
                title={l.structured_json?.pages?.length ? 'Preview halaman lengkap (gambar/tabel)' : l.docx_html ? 'Preview DOCX inline' : 'Buka file'}
                style={{
                    padding: '5px 10px', borderRadius: '6px',
                    border: '1px solid #bfdbfe', background: '#eff6ff',
                    color: '#1d4ed8', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                }}
            >
                {(l.structured_json?.pages?.length || l.docx_html) ? '👁 Preview' : '📂 Buka'}
            </button>
        ) : null;

        if (!l || l.final_locked)
            return (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 600 }}>🔒 Final</span>
                    {previewBtn}
                </div>
            );

        if (l.status === 'Draft') return (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {previewBtn}
                <button onClick={() => openReview(l, 'approve')}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    ✅ Setujui
                </button>
                <button onClick={() => handlePaksaSubmit(l)}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    📤 Submit
                </button>
            </div>
        );

        if (l.status === 'Dikirim' || l.status === 'Perlu Revisi') return (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {previewBtn}
                <button onClick={() => openReview(l, 'approve')}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    ✅ Setujui
                </button>
                <button onClick={() => openReview(l, 'revisi')}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    🔄 Revisi
                </button>
            </div>
        );

        if (l.status === 'Disetujui') return (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {previewBtn}
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>✅ Disetujui</span>
                <button onClick={() => openReview(l, 'revisi')}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: '11px', cursor: 'pointer' }}>
                    ↩ Revisi
                </button>
            </div>
        );

        return <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>;
    };

    // ── Finalisasi
    const handleFinalisasi = async () => {
        if (!semuaDisetujui) return;
        if (!window.confirm('Finalisasi akan mengunci semua laporan. Tidak bisa diedit kembali tanpa membuka manual. Lanjutkan?')) return;

        setProcessing(true);
        try {
            const ids = laporan.filter(l => l.status === 'Disetujui').map(l => l.id);
            const { error } = await supabase.from('laporan_bulanan')
                .update({ status: 'Final', final_locked: true })
                .in('id', ids);
            if (error) throw error;

            await supabase.from('activity_logs').insert({
                user_id: user.id, user_name: user.nama, action: 'finalisasi',
                entity_type: 'laporan_bulanan',
                detail: `Finalisasi laporan ${BULAN_NAMES[bulan]} ${tahun}`,
            });

            showMsg('success', 'Laporan berhasil difinalisasi dan dikunci!');
            await loadLaporan(bulan, tahun);
        } catch (err) {
            showMsg('error', err.message);
        } finally {
            setProcessing(false);
        }
    };

    const tahunOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const summaryStats = {
        draft: laporan.filter(l => l.status === 'Draft').length,
        dikirim: laporan.filter(l => l.status === 'Dikirim').length,
        revisi: laporan.filter(l => l.status === 'Perlu Revisi').length,
        setuju: laporan.filter(l => l.status === 'Disetujui').length,
        final: laporan.filter(l => l.status === 'Final').length,
    };

    // Seksi yang belum upload (untuk info di tombol)
    const belumUpload = rows.filter(r => !r.laporan).map(r => r.name);

    return (
        <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

            {/* DOCX Inline Preview Modal — with PagedDocumentViewer for images */}
            {docxPreviewTarget && (() => {
                const hasStructured = !!docxPreviewTarget.structured_json?.pages?.length;
                const hasHtml = !!docxPreviewTarget.docx_html;
                const tabs = [];
                if (hasStructured) tabs.push({ id: 'structured', label: '🖥 Halaman' });
                if (hasHtml) tabs.push({ id: 'html', label: '📄 HTML' });
                const activeTab = tabs.find(t => t.id === docxPreviewTab)?.id || tabs[0]?.id;
                return (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, padding: '16px',
                    }}>
                        <div style={{
                            background: '#fff', borderRadius: '16px', width: '100%',
                            maxWidth: '1100px', maxHeight: '92vh', display: 'flex',
                            flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                flexWrap: 'wrap', gap: '8px',
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                                        👁️ Preview — {docxPreviewTarget.judul_laporan || docxPreviewTarget.file_name}
                                    </h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                                        {BULAN_NAMES[docxPreviewTarget.bulan]} {docxPreviewTarget.tahun} ·{' '}
                                        {sections.find(s => s.id === docxPreviewTarget.seksi_id)?.name || '—'}
                                        {hasStructured && ` · ${docxPreviewTarget.structured_json.pages.length} halaman`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setDocxPreviewTarget(null)}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        border: '1px solid #e2e8f0', background: '#f8fafc',
                                        cursor: 'pointer', fontSize: '18px',
                                    }}
                                >×</button>
                            </div>

                            {/* Tabs (only if multiple tab options exist) */}
                            {tabs.length > 1 && (
                                <div style={{
                                    display: 'flex', gap: '4px', padding: '0 16px',
                                    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                                }}>
                                    {tabs.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setDocxPreviewTab(t.id)}
                                            style={{
                                                padding: '6px 14px', borderRadius: '6px 6px 0 0',
                                                border: 'none',
                                                borderBottom: activeTab === t.id ? '2px solid #2563eb' : '2px solid transparent',
                                                background: activeTab === t.id ? '#eff6ff' : 'transparent',
                                                color: activeTab === t.id ? '#1d4ed8' : '#64748b',
                                                fontWeight: activeTab === t.id ? 700 : 500,
                                                cursor: 'pointer', fontSize: '13px',
                                            }}
                                        >{t.label}</button>
                                    ))}
                                </div>
                            )}

                            {/* Body */}
                            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                                {activeTab === 'structured' && hasStructured && (
                                    <PagedDocumentViewer
                                        structuredJson={docxPreviewTarget.structured_json}
                                        maxHeight="74vh"
                                        showPageNumbers={true}
                                    />
                                )}
                                {activeTab === 'html' && hasHtml && (
                                    <DocxPreviewRenderer
                                        html={docxPreviewTarget.docx_html}
                                        styleMetadata={docxPreviewTarget.docx_meta || {}}
                                        preserveLayout={docxPreviewTarget.preserve_layout !== false}
                                        maxHeight="74vh"
                                        showToolbar={true}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        📊 Monitoring Laporan Bulanan
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
                        Super Admin — Pantau dan review laporan dari semua seksi.
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    title="Muat ulang data laporan"
                    style={{
                        padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1',
                        background: '#f8fafc', color: '#475569', fontSize: '13px',
                        fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                >
                    {loading ? '⏳' : '🔄'} Refresh
                </button>
            </div>

            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
                    background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: msg.type === 'success' ? '#15803d' : '#b91c1c',
                    border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                }}>
                    {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
                </div>
            )}

            {/* Filter */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Bulan</label>
                    <select value={bulan} onChange={e => setBulan(+e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}>
                        {BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Tahun</label>
                    <select value={tahun} onChange={e => setTahun(+e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}>
                        {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Draft', val: summaryStats.draft, ...STATUS_COLOR['Draft'] },
                    { label: 'Dikirim', val: summaryStats.dikirim, ...STATUS_COLOR['Dikirim'] },
                    { label: 'Perlu Revisi', val: summaryStats.revisi, ...STATUS_COLOR['Perlu Revisi'] },
                    { label: 'Disetujui', val: summaryStats.setuju, ...STATUS_COLOR['Disetujui'] },
                    { label: 'Final', val: summaryStats.final, ...STATUS_COLOR['Final'] },
                ].map(s => (
                    <div key={s.label} style={{
                        padding: '16px', borderRadius: '10px', background: s.bg, textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: s.text }}>{s.val}</div>
                        <div style={{ fontSize: '12px', color: s.text, marginTop: '2px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabel */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    Status per Seksi — {BULAN_NAMES[bulan]} {tahun}
                </h2>

                {/* Warning jika ada seksi belum upload */}
                {belumUpload.length > 0 && !loading && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                        background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '13px', color: '#9a3412',
                    }}>
                        ⚠️ <strong>{belumUpload.length} seksi belum upload:</strong> {belumUpload.join(', ')}
                    </div>
                )}

                {loading ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Memuat...</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['Seksi', 'Judul / File', 'Status', 'Dikirim', 'Catatan Revisi', 'Aksi'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => {
                                    const l = row.laporan;
                                    return (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontWeight: 600 }}>{row.name}</td>
                                            <td style={{ padding: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                                                {l?.file_url
                                                    ? <a href={l.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                                                        {l.judul_laporan || l.file_name || 'Lihat'}
                                                    </a>
                                                    : <span style={{ color: '#94a3b8' }}>Belum ada</span>
                                                }
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {l ? (
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: '99px', fontWeight: 600, fontSize: '12px',
                                                        background: STATUS_COLOR[l.status]?.bg, color: STATUS_COLOR[l.status]?.text,
                                                    }}>{l.status}</span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Belum Upload</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                {l?.submitted_at ? new Date(l.submitted_at).toLocaleDateString('id-ID') : '—'}
                                            </td>
                                            <td style={{ padding: '12px', maxWidth: '180px', fontSize: '12px', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {l?.catatan_revisi || '—'}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {l ? renderActions(l) : <span style={{ fontSize: '12px', color: '#94a3b8' }}>Belum Upload</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Laporan Orphan — seksi_id tidak cocok dengan sections */}
            {orphanLaporan.length > 0 && (
                <div style={{
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: '12px', padding: '20px', marginBottom: '20px',
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', margin: '0 0 12px' }}>
                        ⚠️ Laporan Tidak Terasosiasi ({orphanLaporan.length})
                    </h3>
                    <p style={{ fontSize: '12px', color: '#78350f', margin: '0 0 12px' }}>
                        Laporan berikut ada di database tetapi <strong>seksi_id</strong>-nya tidak cocok dengan daftar seksi yang ada.
                        Ini bisa disebabkan oleh seksiId yang tidak sinkron antara data user dan tabel sections.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#fef3c7' }}>
                                    {['seksi_id', 'Judul / File', 'Status', 'Bulan/Tahun', 'Aksi'].map(h => (
                                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#92400e', fontWeight: 600, borderBottom: '1px solid #fde68a' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {orphanLaporan.map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                                        <td style={{ padding: '10px' }}>
                                            <code style={{ background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>seksi_id={l.seksi_id}</code>
                                        </td>
                                        <td style={{ padding: '10px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {l.file_url
                                                ? <a href={l.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{l.judul_laporan || l.file_name || 'Lihat'}</a>
                                                : <span style={{ color: '#94a3b8' }}>—</span>
                                            }
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '99px', fontWeight: 600, fontSize: '12px',
                                                background: STATUS_COLOR[l.status]?.bg, color: STATUS_COLOR[l.status]?.text,
                                            }}>{l.status}</span>
                                        </td>
                                        <td style={{ padding: '10px', whiteSpace: 'nowrap', color: '#64748b' }}>
                                            {BULAN_NAMES[l.bulan]} {l.tahun}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {renderActions(l)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        onClick={() => onNavigate('gabung-laporan', { bulan, tahun })}
                        disabled={!semuaDisetujui || sudahFinal || sections.length === 0}
                        style={{
                            padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px',
                            cursor: semuaDisetujui && !sudahFinal ? 'pointer' : 'not-allowed',
                            background: semuaDisetujui && !sudahFinal ? '#7c3aed' : '#e2e8f0',
                            color: semuaDisetujui && !sudahFinal ? '#fff' : '#94a3b8',
                        }}
                    >
                        📎 Gabungkan Laporan
                    </button>
                    {!semuaDisetujui && belumUpload.length > 0 && sections.length > 0 && (
                        <p style={{ fontSize: '12px', color: '#9a3412', margin: 0 }}>
                            Menunggu: {belumUpload.join(', ')}
                        </p>
                    )}
                </div>

                {semuaDisetujui && !sudahFinal && (
                    <button
                        onClick={handleFinalisasi}
                        disabled={processing}
                        style={{
                            padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px',
                            cursor: processing ? 'not-allowed' : 'pointer',
                            background: processing ? '#94a3b8' : '#dc2626', color: '#fff',
                        }}
                    >
                        {processing ? '⏳ Proses...' : '🔒 Finalisasi & Kunci Laporan'}
                    </button>
                )}
            </div>

            {/* Modal Review */}
            {reviewModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '28px',
                        width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
                    }}>
                        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
                            {reviewModal.action === 'approve' ? '✅ Setujui Laporan' : '🔄 Minta Revisi'}
                        </h3>
                        <div style={{ marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
                            Seksi: <strong style={{ color: '#1e293b' }}>
                                {sections.find(s => s.id === reviewModal.laporan.seksi_id)?.name || '—'}
                            </strong>
                            {' · '}Status saat ini:
                            <span style={{
                                marginLeft: '4px', padding: '1px 8px', borderRadius: '99px',
                                fontSize: '11px', fontWeight: 600,
                                background: STATUS_COLOR[reviewModal.laporan.status]?.bg,
                                color: STATUS_COLOR[reviewModal.laporan.status]?.text,
                            }}>
                                {reviewModal.laporan.status}
                            </span>
                        </div>

                        {reviewModal.action === 'revisi' && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                                    Catatan Revisi <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <textarea
                                    value={catatan}
                                    onChange={e => setCatatan(e.target.value)}
                                    rows={4}
                                    placeholder="Tuliskan bagian yang perlu diperbaiki..."
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #cbd5e1', fontSize: '14px',
                                        resize: 'vertical', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        )}

                        {reviewModal.action === 'approve' && (
                            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
                                Laporan akan ditandai sebagai <strong>Disetujui</strong>. Tindakan ini dapat dibatalkan dengan memilih <em>↩ Revisi</em>.
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setReviewModal(null)} style={{
                                padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                background: '#fff', cursor: 'pointer', fontWeight: 600,
                            }}>Batal</button>
                            <button onClick={handleReview} disabled={processing} style={{
                                padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700,
                                cursor: 'pointer',
                                background: reviewModal.action === 'approve' ? '#16a34a' : '#dc2626',
                                color: '#fff',
                            }}>
                                {processing ? 'Proses...' : reviewModal.action === 'approve' ? 'Ya, Setujui' : 'Kirim Revisi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
