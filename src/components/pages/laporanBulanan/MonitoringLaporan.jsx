import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// ── Deduplicate sections by normalized name ──────────────────────────────────
// Strips "Seksi" / "Subbag" prefix then groups by lowercased name.
// Keeps the row with the highest data score (staff + programs + performance).
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
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [laporan, setLaporan] = useState([]);          // semua laporan bulan ini
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);

    // Modal review
    const [reviewModal, setReviewModal] = useState(null);  // {laporan, action: 'approve'|'revisi'}
    const [catatan, setCatatan] = useState('');
    const [processing, setProcessing] = useState(false);

    const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

    // ---- Load data ----
    const loadData = useCallback(async () => {
        setLoading(true);
        const [{ data: sec }, { data: lap }] = await Promise.all([
            supabase.from('sections').select('id, name, urutan_penggabungan').order('urutan_penggabungan'),
            supabase.from('laporan_bulanan')
                .select('*')
                .eq('bulan', bulan)
                .eq('tahun', tahun)
        ]);
        setSections(dedupSections(sec || []));
        setLaporan(lap || []);
        setLoading(false);
    }, [bulan, tahun]);

    useEffect(() => { loadData(); }, [loadData]);

    // Gabungkan sections dengan status laporan
    const rows = sections.map(s => ({
        ...s,
        laporan: laporan.find(l => l.seksi_id === s.id) || null,
    }));

    // Cek apakah semua laporan sudah Disetujui
    const semuaDisetujui = sections.length > 0 &&
        sections.every(s => laporan.find(l => l.seksi_id === s.id && l.status === 'Disetujui'));

    // Cek apakah sudah difinalisasi
    const sudahFinal = laporan.length > 0 && laporan.every(l => l.status === 'Final');

    // ---- Review action ----
    const openReview = (l, action) => {
        setReviewModal({ laporan: l, action });
        setCatatan('');
    };

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
            await loadData();
        } catch (err) {
            showMsg('error', err.message);
        } finally {
            setProcessing(false);
        }
    };

    // ---- Paksa Submit (Draft → Dikirim) ----
    const handlePaksaSubmit = async (l) => {
        if (!window.confirm('Paksa status laporan ini menjadi "Dikirim" agar bisa di-review?')) return;
        setProcessing(true);
        try {
            const { error } = await supabase.from('laporan_bulanan')
                .update({ status: 'Dikirim', submitted_at: new Date().toISOString() })
                .eq('id', l.id);
            if (error) throw error;
            showMsg('success', 'Laporan berhasil dipindah ke status Dikirim.');
            await loadData();
        } catch (err) {
            showMsg('error', err.message);
        } finally {
            setProcessing(false);
        }
    };

    // ---- Render action buttons per status ----
    const renderActions = (l) => {
        if (!l || l.final_locked) {
            return <span style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 600 }}>🔒 Final</span>;
        }
        if (l.status === 'Draft') {
            return (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => openReview(l, 'approve')}
                        title="Setujui langsung meski masih Draft"
                        style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        ✅ Setujui
                    </button>
                    <button
                        onClick={() => handlePaksaSubmit(l)}
                        title="Ubah status menjadi Dikirim"
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        📤 Submit
                    </button>
                </div>
            );
        }
        if (l.status === 'Dikirim' || l.status === 'Perlu Revisi') {
            return (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => openReview(l, 'approve')}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        ✅ Setujui
                    </button>
                    <button
                        onClick={() => openReview(l, 'revisi')}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        🔄 Revisi
                    </button>
                </div>
            );
        }
        if (l.status === 'Disetujui') {
            return (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>✅ Disetujui</span>
                    <button
                        onClick={() => openReview(l, 'revisi')}
                        title="Batalkan persetujuan dan minta revisi"
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: '11px', cursor: 'pointer' }}>
                        ↩ Revisi
                    </button>
                </div>
            );
        }
        return <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>;
    };

    // ---- Finalisasi ----
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
            await loadData();
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

    return (
        <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    📊 Monitoring Laporan Bulanan
                </h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
                    Super Admin — Pantau dan review laporan dari semua seksi.
                </p>
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

            {/* Filter Bulan Tahun */}
            <div style={{
                display: 'flex', gap: '12px', marginBottom: '20px',
                alignItems: 'flex-end', flexWrap: 'wrap'
            }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Draft', val: summaryStats.draft, ...STATUS_COLOR['Draft'] },
                    { label: 'Dikirim', val: summaryStats.dikirim, ...STATUS_COLOR['Dikirim'] },
                    { label: 'Perlu Revisi', val: summaryStats.revisi, ...STATUS_COLOR['Perlu Revisi'] },
                    { label: 'Disetujui', val: summaryStats.setuju, ...STATUS_COLOR['Disetujui'] },
                    { label: 'Final', val: summaryStats.final, ...STATUS_COLOR['Final'] },
                ].map(s => (
                    <div key={s.label} style={{
                        padding: '16px', borderRadius: '10px', background: s.bg, textAlign: 'center',
                        border: `1px solid ${s.bg}`
                    }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: s.text }}>{s.val}</div>
                        <div style={{ fontSize: '12px', color: s.text, marginTop: '2px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabel Laporan */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    Status per Seksi — {BULAN_NAMES[bulan]} {tahun}
                </h2>

                {loading ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Memuat...</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['Seksi', 'File', 'Status', 'Dikirim', 'Catatan Revisi', 'Aksi'].map(h => (
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
                                            <td style={{ padding: '12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                                                {l?.file_url
                                                    ? <a href={l.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{l.file_name || 'Lihat'}</a>
                                                    : <span style={{ color: '#94a3b8' }}>Belum ada</span>
                                                }
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {l ? (
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: '99px', fontWeight: 600, fontSize: '12px',
                                                        background: STATUS_COLOR[l.status]?.bg, color: STATUS_COLOR[l.status]?.text
                                                    }}>{l.status}</span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Belum upload</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                                                {l?.submitted_at ? new Date(l.submitted_at).toLocaleDateString('id-ID') : '-'}
                                            </td>
                                            <td style={{ padding: '12px', maxWidth: '180px', fontSize: '12px', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {l?.catatan_revisi || '-'}
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => onNavigate('gabung-laporan', { bulan, tahun })}
                    disabled={!semuaDisetujui || sudahFinal || sections.length === 0}
                    style={{
                        padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px',
                        cursor: semuaDisetujui && !sudahFinal ? 'pointer' : 'not-allowed',
                        background: semuaDisetujui && !sudahFinal ? '#7c3aed' : '#e2e8f0',
                        color: semuaDisetujui && !sudahFinal ? '#fff' : '#94a3b8',
                    }}>
                    📎 Gabungkan Laporan {!semuaDisetujui && sections.length > 0 && '(Belum semua disetujui)'}
                </button>

                {semuaDisetujui && !sudahFinal && (
                    <button
                        onClick={handleFinalisasi}
                        disabled={processing}
                        style={{
                            padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px',
                            cursor: processing ? 'not-allowed' : 'pointer',
                            background: processing ? '#94a3b8' : '#dc2626',
                            color: '#fff',
                        }}>
                        {processing ? '⏳ Proses...' : '🔒 Finalisasi & Kunci Laporan'}
                    </button>
                )}
            </div>

            {/* Modal Review */}
            {reviewModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
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
                                marginLeft: '4px', padding: '1px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
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
                                        width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                        fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}

                        {reviewModal.action === 'approve' && (
                            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                                Laporan akan ditandai sebagai <strong>Disetujui</strong>. Tindakan ini dapat dibatalkan
                                dengan memilih <em>↩ Revisi</em> pada baris laporan jika diperlukan koreksi.
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setReviewModal(null)}
                                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                Batal
                            </button>
                            <button onClick={handleReview} disabled={processing}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer',
                                    background: reviewModal.action === 'approve' ? '#16a34a' : '#dc2626',
                                    color: '#fff'
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
