import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const STATUS_META = {
    Draft: { color: '#1d4ed8', bg: '#dbeafe', label: 'Draft', step: 0 },
    Dikirim: { color: '#854d0e', bg: '#fef9c3', label: 'Dikirim', step: 1 },
    'Perlu Revisi': { color: '#b91c1c', bg: '#fee2e2', label: 'Perlu Revisi', step: 1 },
    Disetujui: { color: '#15803d', bg: '#dcfce7', label: 'Disetujui', step: 2 },
    Final: { color: '#7e22ce', bg: '#f3e8ff', label: 'Final', step: 3 },
};

// Deduplicate sections by normalized name — same logic as SectionContext
// Keeps the row with the most "complete" data (highest score)
const normalizeName = (name) =>
    (name || '').toLowerCase().trim()
        .replace(/^seksi\s+/i, '')
        .replace(/^subbag(ian)?\s+/i, '');

const deduplicateSections = (data) => {
    const nameMap = new Map();
    const dataScore = (r) => (Number(r.staff) || 0) + (Number(r.programs) || 0) + (Number(r.performance) || 0);
    (data || []).forEach(row => {
        const key = normalizeName(row.name);
        const existing = nameMap.get(key);
        if (!existing || dataScore(row) > dataScore(existing)) {
            nameMap.set(key, row);
        }
    });
    return Array.from(nameMap.values());
};

const relTime = (d) => {
    if (!d) return '-';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Baru saja';
    if (m < 60) return `${m} mnt lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
};

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: SUPER ADMIN VIEW
// ─────────────────────────────────────────────────────────────
function SuperAdminVerification({ user, onNavigate }) {
    const { fetchLaporanNotifs } = useNotification();
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [rows, setRows] = useState([]);
    const [actLog, setActLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewModal, setReviewModal] = useState(null);
    const [catatan, setCatatan] = useState('');
    const [processing, setProcessing] = useState(false);
    const [msg, setMsg] = useState(null);
    const [activeTab, setActiveTab] = useState('semua');

    const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

    const loadData = useCallback(async () => {
        setLoading(true);
        const [{ data: sec }, { data: lap }, { data: logs }] = await Promise.all([
            supabase.from('sections').select('id, name, alias').order('urutan_penggabungan'),
            supabase.from('laporan_bulanan').select('*').eq('bulan', bulan).eq('tahun', tahun),
            supabase.from('activity_logs').select('*')
                .in('action', ['submit', 'approve', 'revisi', 'finalisasi'])
                .order('created_at', { ascending: false }).limit(20),
        ]);
        // Deduplicate sections before merging — prevents duplicate rows if DB has duplicate entries
        const uniqueSec = deduplicateSections(sec);
        const merged = uniqueSec.map(s => ({
            ...s, laporan: (lap || []).find(l => l.seksi_id === s.id) || null,
        }));
        setRows(merged);
        setActLog(logs || []);
        setLoading(false);
    }, [bulan, tahun]);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredRows = activeTab === 'semua' ? rows :
        activeTab === 'menunggu' ? rows.filter(r => r.laporan?.status === 'Dikirim') :
            activeTab === 'revisi' ? rows.filter(r => r.laporan?.status === 'Perlu Revisi') :
                activeTab === 'selesai' ? rows.filter(r => ['Disetujui', 'Final'].includes(r.laporan?.status)) :
                    rows.filter(r => !r.laporan);

    const handleAction = async (action) => {
        if (!reviewModal) return;
        setProcessing(true);
        try {
            const newStatus = action === 'approve' ? 'Disetujui' : 'Perlu Revisi';
            const { error } = await supabase.from('laporan_bulanan').update({
                status: newStatus,
                catatan_revisi: action === 'revisi' ? catatan : null,
                reviewed_by: user.id,
                approved_at: action === 'approve' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            }).eq('id', reviewModal.laporan.id);
            if (error) throw error;

            // Log aktivitas
            await supabase.from('activity_logs').insert({
                user_id: user.id, user_name: user.nama,
                action: action === 'approve' ? 'approve' : 'revisi',
                entity_type: 'laporan_bulanan',
                detail: `${newStatus} laporan ${reviewModal.name} — ${BULAN_NAMES[bulan]} ${tahun}${catatan ? ` | Catatan: ${catatan}` : ''}`,
            }).catch(() => { });

            showMsg('success', `✅ Laporan ${reviewModal.name} berhasil ${action === 'approve' ? 'disetujui' : 'dikembalikan untuk revisi'}.`);
            setReviewModal(null);
            setCatatan('');
            await loadData();
            fetchLaporanNotifs(user);
        } catch (err) {
            showMsg('error', `Gagal: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleFinalisasi = async () => {
        const approved = rows.filter(r => r.laporan?.status === 'Disetujui');
        if (approved.length === 0) return showMsg('error', 'Belum ada laporan yang disetujui.');
        setProcessing(true);
        try {
            for (const r of approved) {
                await supabase.from('laporan_bulanan').update({
                    status: 'Final', final_locked: true, updated_at: new Date().toISOString(),
                }).eq('id', r.laporan.id);
            }
            await supabase.from('activity_logs').insert({
                user_id: user.id, user_name: user.nama,
                action: 'finalisasi', entity_type: 'laporan_bulanan',
                detail: `Finalisasi ${approved.length} laporan — ${BULAN_NAMES[bulan]} ${tahun}`,
            }).catch(() => { });
            showMsg('success', `🔒 ${approved.length} laporan berhasil difinalisasi.`);
            await loadData();
        } catch (err) {
            showMsg('error', `Gagal finalisasi: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const stats = {
        total: rows.length,
        belum: rows.filter(r => !r.laporan).length,
        menunggu: rows.filter(r => r.laporan?.status === 'Dikirim').length,
        revisi: rows.filter(r => r.laporan?.status === 'Perlu Revisi').length,
        disetujui: rows.filter(r => r.laporan?.status === 'Disetujui').length,
        final: rows.filter(r => r.laporan?.status === 'Final').length,
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0f2440 0%, #1a3a6b 100%)', borderRadius: '16px', padding: '28px 32px', color: '#fff', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>⚖️ Verifikasi & Persetujuan Laporan</h1>
                    <p style={{ color: '#93c5fd', marginTop: '4px', fontSize: '14px' }}>Panel review Super Admin — semua seksi</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select value={bulan} onChange={e => setBulan(+e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px' }}>
                        {BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1} style={{ color: '#000' }}>{b}</option>)}
                    </select>
                    <select value={tahun} onChange={e => setTahun(+e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px' }}>
                        {[2026, 2025, 2024].map(t => <option key={t} value={t} style={{ color: '#000' }}>{t}</option>)}
                    </select>
                    <button onClick={handleFinalisasi} disabled={stats.disetujui === 0 || processing}
                        style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: stats.disetujui > 0 ? 'pointer' : 'not-allowed', background: stats.disetujui > 0 ? '#7c3aed' : 'rgba(255,255,255,0.1)', color: '#fff' }}>
                        🔒 Finalisasi ({stats.disetujui})
                    </button>
                </div>
            </div>

            {msg && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', color: msg.type === 'success' ? '#15803d' : '#b91c1c', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                    {msg.text}
                </div>
            )}

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {[
                    { label: 'Total Seksi', val: stats.total, color: '#1e293b', bg: '#f8fafc', icon: '🏢' },
                    { label: 'Belum Upload', val: stats.belum, color: '#6b7280', bg: '#f9fafb', icon: '📭' },
                    { label: 'Menunggu Review', val: stats.menunggu, color: '#92400e', bg: '#fff7ed', icon: '⏳' },
                    { label: 'Perlu Revisi', val: stats.revisi, color: '#b91c1c', bg: '#fef2f2', icon: '🔄' },
                    { label: 'Disetujui', val: stats.disetujui, color: '#15803d', bg: '#f0fdf4', icon: '✅' },
                    { label: 'Final', val: stats.final, color: '#7e22ce', bg: '#faf5ff', icon: '🔒' },
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: '11px', color: s.color, fontWeight: 600 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[['semua', '🗂 Semua'], ['belum', '📭 Belum Upload'], ['menunggu', '⏳ Menunggu'], ['revisi', '🔄 Perlu Revisi'], ['selesai', '✅ Selesai']].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', background: activeTab === key ? '#0f2440' : '#f1f5f9', color: activeTab === key ? '#fff' : '#64748b' }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>⏳ Memuat data...</div>
                ) : filteredRows.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
                        <p>Tidak ada laporan pada kategori ini</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['Seksi', 'File Laporan', 'Tgl Upload', 'Status', 'Aksi'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row, i) => {
                                const l = row.laporan;
                                const meta = l ? (STATUS_META[l.status] || STATUS_META.Draft) : null;
                                return (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{row.name}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{row.alias}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', maxWidth: '200px' }}>
                                            {l ? (
                                                <>
                                                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.file_name || '—'}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{l.file_type?.toUpperCase()} • {l.file_size ? `${(l.file_size / 1024).toFixed(0)} KB` : '—'}</div>
                                                </>
                                            ) : <span style={{ color: '#cbd5e1' }}>Belum upload</span>}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                                            {l?.updated_at ? new Date(l.updated_at).toLocaleDateString('id-ID') : '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {meta ? (
                                                <span style={{ background: meta.bg, color: meta.color, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                                                    {meta.label}
                                                </span>
                                            ) : <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {l?.status === 'Dikirim' && (
                                                    <button onClick={() => { setReviewModal(row); setCatatan(''); }}
                                                        style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: '#0f2440', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                                                        ⚖️ Review
                                                    </button>
                                                )}
                                                {l?.file_url && (
                                                    <a href={l.file_url} target="_blank" rel="noreferrer"
                                                        style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '12px', textDecoration: 'none' }}>
                                                        👁 Lihat
                                                    </a>
                                                )}
                                                {['Disetujui', 'Final'].includes(l?.status) && (
                                                    <span style={{ fontSize: '18px' }}>{l.status === 'Final' ? '🔒' : '✅'}</span>
                                                )}
                                                {!l && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Belum ada</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Riwayat Aktivitas */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '14px' }}>🕐 Riwayat Aktivitas Review</h3>
                {actLog.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>Belum ada aktivitas.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {actLog.slice(0, 10).map(log => {
                            const iconMap = { approve: '✅', revisi: '🔄', submit: '📨', finalisasi: '🔒' };
                            return (
                                <div key={log.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{iconMap[log.action] || '📋'}</span>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>{log.detail}</p>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>oleh {log.user_name} • {relTime(log.created_at)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '560px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        {/* Modal Header */}
                        <div style={{ background: '#0f2440', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 700 }}>⚖️ Review Laporan</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#93c5fd' }}>{reviewModal.name} — {BULAN_NAMES[bulan]} {tahun}</p>
                            </div>
                            <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {/* File info */}
                            {reviewModal.laporan?.file_url && (
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                                    <span style={{ fontSize: '32px' }}>📄</span>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{reviewModal.laporan.file_name}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{reviewModal.laporan.file_type?.toUpperCase()} • {reviewModal.laporan.file_size ? `${(reviewModal.laporan.file_size / 1024).toFixed(0)} KB` : ''}</p>
                                    </div>
                                    <a href={reviewModal.laporan.file_url} target="_blank" rel="noreferrer"
                                        style={{ padding: '8px 14px', borderRadius: '8px', background: '#0f2440', color: '#fff', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
                                        👁 Buka
                                    </a>
                                </div>
                            )}

                            {/* Checklist */}
                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>✅ Checklist Verifikasi</p>
                                {['Format file sesuai (PDF/DOCX)', 'Periode laporan benar', 'Konten laporan lengkap', 'Tanda tangan/cap tersedia'].map((item, i) => (
                                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '14px', cursor: 'pointer', padding: '6px', borderRadius: '6px', background: '#f8fafc' }}>
                                        <input type="checkbox" style={{ width: '16px', height: '16px' }} />
                                        {item}
                                    </label>
                                ))}
                            </div>

                            {/* Catatan */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>📝 Catatan (Wajib diisi jika meminta revisi)</label>
                                <textarea value={catatan} onChange={e => setCatatan(e.target.value)}
                                    placeholder="Tuliskan catatan untuk admin seksi..."
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', resize: 'vertical', minHeight: '100px', boxSizing: 'border-box' }} />
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => handleAction('approve')} disabled={processing}
                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: processing ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
                                    {processing ? '⏳ Memproses...' : '✅ Setujui Laporan'}
                                </button>
                                <button onClick={() => { if (!catatan.trim()) { alert('Isi catatan revisi terlebih dahulu!'); return; } handleAction('revisi'); }} disabled={processing}
                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: processing ? 'not-allowed' : 'pointer' }}>
                                    🔄 Minta Revisi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: ADMIN SEKSI VIEW
// ─────────────────────────────────────────────────────────────
function AdminSeksiVerification({ user, onNavigate }) {
    const [laporan, setLaporan] = useState([]);
    const [laporanBulanIni, setLaporanBulanIni] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bulan] = useState(new Date().getMonth() + 1);
    const [tahun] = useState(new Date().getFullYear());
    const [checklist, setChecklist] = useState({ format: false, periode: false, konten: false, ttd: false });
    const [stats, setStats] = useState({ disetujui: 0, revisi: 0, avgDays: 0 });

    const loadData = useCallback(async () => {
        if (!user?.seksiId) { setLoading(false); return; }
        setLoading(true);
        const { data: allLap } = await supabase
            .from('laporan_bulanan')
            .select('*')
            .eq('seksi_id', user.seksiId)
            .order('tahun', { ascending: false })
            .order('bulan', { ascending: false })
            .limit(12);

        setLaporan(allLap || []);

        const thisMonth = (allLap || []).find(l => l.bulan === bulan && l.tahun === tahun);
        setLaporanBulanIni(thisMonth || null);

        // Hitung statistik
        const approved = (allLap || []).filter(l => ['Disetujui', 'Final'].includes(l.status));
        const revisi = (allLap || []).filter(l => l.status === 'Perlu Revisi');
        const avgDays = approved.length > 0
            ? Math.round(approved.filter(l => l.approved_at && l.submitted_at)
                .reduce((acc, l) => {
                    const diff = new Date(l.approved_at) - new Date(l.submitted_at);
                    return acc + diff / (1000 * 60 * 60 * 24);
                }, 0) / (approved.filter(l => l.approved_at && l.submitted_at).length || 1))
            : 0;

        setStats({ disetujui: approved.length, revisi: revisi.length, avgDays });
        setLoading(false);
    }, [user, bulan, tahun]);

    useEffect(() => { loadData(); }, [loadData]);

    const allChecked = Object.values(checklist).every(Boolean);

    // Timeline steps
    const timelineSteps = [
        { key: 'upload', label: 'Upload File', done: !!laporanBulanIni, icon: '⬆️' },
        { key: 'submit', label: 'Dikirim ke Super Admin', done: laporanBulanIni && !['Draft'].includes(laporanBulanIni.status), icon: '📨' },
        { key: 'review', label: 'Dalam Proses Review', done: laporanBulanIni && ['Disetujui', 'Final', 'Perlu Revisi'].includes(laporanBulanIni.status), icon: '⚖️' },
        { key: 'done', label: 'Disetujui / Final', done: laporanBulanIni && ['Disetujui', 'Final'].includes(laporanBulanIni.status), icon: '✅' },
    ];

    const currentStatus = laporanBulanIni?.status;
    const isRevisi = currentStatus === 'Perlu Revisi';

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', borderRadius: '16px', padding: '24px 28px', color: '#fff', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>📋 Status Laporan Saya</h1>
                <p style={{ color: '#93c5fd', marginTop: '4px', fontSize: '14px' }}>
                    {user?.seksi?.name || 'Seksi Anda'} — {BULAN_NAMES[bulan]} {tahun}
                </p>
            </div>

            {loading && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>⏳ Memuat...</div>}

            {!loading && (
                <>
                    {/* Banner Revisi */}
                    {isRevisi && laporanBulanIni?.catatan_revisi && (
                        <div style={{ padding: '18px 22px', borderRadius: '12px', marginBottom: '20px', background: 'linear-gradient(135deg, #fff1f2, #fff7ed)', border: '2px solid #f87171', boxShadow: '0 4px 12px rgba(239,68,68,0.15)' }}>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '28px' }}>🔄</span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 800, fontSize: '15px', color: '#b91c1c', margin: '0 0 8px' }}>Laporan Anda Memerlukan Revisi</p>
                                    <div style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#9a3412', margin: '0 0 4px' }}>📝 Catatan dari Super Admin:</p>
                                        <p style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: 1.7, margin: 0 }}>{laporanBulanIni.catatan_revisi}</p>
                                    </div>
                                    <button onClick={() => onNavigate && onNavigate('upload-laporan')}
                                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}>
                                        ⬆️ Upload Revisi Sekarang
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Timeline Status */}
                    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '22px', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>📍 Progress Laporan Bulan Ini</h2>
                        <div style={{ display: 'flex', gap: '0', position: 'relative' }}>
                            {timelineSteps.map((step, i) => (
                                <div key={step.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                                    {/* Connector line */}
                                    {i < timelineSteps.length - 1 && (
                                        <div style={{ position: 'absolute', top: '20px', left: '50%', width: '100%', height: '3px', background: timelineSteps[i + 1].done ? '#16a34a' : '#e2e8f0', zIndex: 0 }} />
                                    )}
                                    <div style={{
                                        width: '42px', height: '42px', borderRadius: '50%', margin: '0 auto 8px',
                                        background: isRevisi && i === 2 ? '#fee2e2' : step.done ? '#16a34a' : '#f1f5f9',
                                        border: `3px solid ${isRevisi && i === 2 ? '#f87171' : step.done ? '#16a34a' : '#e2e8f0'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '18px', position: 'relative', zIndex: 1,
                                    }}>
                                        {isRevisi && i === 2 ? '🔄' : step.done ? '✅' : step.icon}
                                    </div>
                                    <p style={{ fontSize: '12px', fontWeight: 600, color: step.done ? '#15803d' : '#94a3b8', margin: 0 }}>{step.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Status badge */}
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            {currentStatus ? (
                                <span style={{
                                    padding: '8px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 700,
                                    background: STATUS_META[currentStatus]?.bg || '#f1f5f9',
                                    color: STATUS_META[currentStatus]?.color || '#64748b'
                                }}>
                                    Status: {currentStatus}
                                </span>
                            ) : (
                                <span style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 700, background: '#f1f5f9', color: '#94a3b8' }}>
                                    Belum ada laporan bulan ini
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Checklist Pra-Submit */}
                    {(!laporanBulanIni || ['Draft'].includes(laporanBulanIni.status)) && (
                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '22px', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: '#1e293b' }}>
                                ✅ Checklist Sebelum Mengirim Laporan
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                {[
                                    ['format', '📄 Format file PDF atau DOCX'],
                                    ['periode', '📅 Periode laporan sesuai bulan ini'],
                                    ['konten', '📝 Konten laporan sudah lengkap'],
                                    ['ttd', '🖊️ Tanda tangan/cap sudah tersedia'],
                                ].map(([key, label]) => (
                                    <label key={key} onClick={() => setChecklist(c => ({ ...c, [key]: !c[key] }))}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: checklist[key] ? '#f0fdf4' : '#f8fafc', border: `1px solid ${checklist[key] ? '#bbf7d0' : '#e2e8f0'}`, userSelect: 'none' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${checklist[key] ? '#16a34a' : '#e2e8f0'}`, background: checklist[key] ? '#16a34a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {checklist[key] && <span style={{ color: '#fff', fontSize: '13px' }}>✓</span>}
                                        </div>
                                        <span style={{ fontSize: '13px', color: checklist[key] ? '#15803d' : '#475569', fontWeight: 500 }}>{label}</span>
                                    </label>
                                ))}
                            </div>
                            {allChecked && (
                                <button onClick={() => onNavigate && onNavigate('upload-laporan')}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
                                    ⬆️ Lanjut ke Upload Laporan
                                </button>
                            )}
                            {!allChecked && <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>Centang semua item untuk lanjut mengirim laporan</p>}
                        </div>
                    )}

                    {/* Statistik Pribadi */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {[
                            { label: 'Total Disetujui', val: stats.disetujui, icon: '✅', color: '#15803d', bg: '#f0fdf4' },
                            { label: 'Total Revisi', val: stats.revisi, icon: '🔄', color: '#b91c1c', bg: '#fef2f2' },
                            { label: 'Rata-rata Hari Approval', val: stats.avgDays ? `${stats.avgDays} hr` : '-', icon: '⏱️', color: '#6d28d9', bg: '#faf5ff' },
                        ].map(s => (
                            <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '16px', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
                                <div style={{ fontSize: '26px', fontWeight: 800, color: s.color }}>{s.val}</div>
                                <div style={{ fontSize: '11px', color: s.color, fontWeight: 600 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Riwayat Laporan */}
                    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>🗂 Riwayat Pengiriman Laporan</h2>
                        </div>
                        {laporan.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Belum ada riwayat laporan.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Periode', 'File', 'Dikirim', 'Status', 'Catatan'].map(h => (
                                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {laporan.map((l, i) => {
                                        const meta = STATUS_META[l.status] || STATUS_META.Draft;
                                        return (
                                            <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600 }}>{BULAN_NAMES[l.bulan]} {l.tahun}</td>
                                                <td style={{ padding: '11px 14px', fontSize: '12px', color: '#64748b', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {l.file_url ? <a href={l.file_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>📄 {l.file_name || 'Lihat file'}</a> : '—'}
                                                </td>
                                                <td style={{ padding: '11px 14px', fontSize: '12px', color: '#94a3b8' }}>{l.submitted_at ? new Date(l.submitted_at).toLocaleDateString('id-ID') : '—'}</td>
                                                <td style={{ padding: '11px 14px' }}>
                                                    <span style={{ background: meta.bg, color: meta.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{meta.label}</span>
                                                </td>
                                                <td style={{ padding: '11px 14px', fontSize: '12px', color: '#b91c1c', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {l.catatan_revisi || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// EXPORT UTAMA — Router berdasarkan role
// ─────────────────────────────────────────────────────────────
const VerificationDashboard = ({ onNavigate }) => {
    const { user } = useAuth();

    if (!user) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>;

    if (user.role === 'super_admin') {
        return <SuperAdminVerification user={user} onNavigate={onNavigate} />;
    }

    return <AdminSeksiVerification user={user} onNavigate={onNavigate} />;
};

export default VerificationDashboard;
