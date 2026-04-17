import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

/* ─── Konfigurasi Seksi ─── */
const SEKSI_CONFIG = [
    {
        seksi_id: 4,
        name: 'Sub Bagian Tata Usaha',
        alias: 'tata_usaha',
        color: '#3b82f6',
        sections: [
            { key: 'kepegawaian', label: 'Urusan Kepegawaian' },
            { key: 'keuangan',    label: 'Urusan Keuangan' },
            { key: 'umum',       label: 'Urusan Umum' },
        ],
    },
    {
        seksi_id: 1,
        name: 'Seksi Inteldakim',
        alias: 'inteldakim',
        color: '#ef4444',
        sections: [
            { key: 'inteldakim', label: 'Intel & Penindakan' },
        ],
    },
    {
        seksi_id: 2,
        name: 'Seksi Lalintalkim',
        alias: 'lalintalkim',
        color: '#8b5cf6',
        sections: [
            { key: 'paspor', label: 'Penerbitan Dokumen Paspor' },
            { key: 'izintinggal', label: 'Penerbitan Izin Tinggal' },
        ],
    },
    {
        seksi_id: 3,
        name: 'Seksi Tikim',
        alias: 'tikim',
        color: '#f59e0b',
        sections: [
            { key: 'infokim',  label: 'Informasi & Komunikasi' },
            { key: 'pengaduan', label: 'Pengaduan Masyarakat' },
        ],
    },
];

const NOW = new Date();
const CUR_BULAN = NOW.getMonth() + 1;
const CUR_TAHUN = NOW.getFullYear();

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const TAHUN_OPTIONS = [CUR_TAHUN - 1, CUR_TAHUN, CUR_TAHUN + 1];

function StatusBadge({ filled }) {
    return filled
        ? <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>✅ Terisi</span>
        : <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>⚠️ Belum</span>;
}

function SeksiCard({ seksi, templateRow, bulan, tahun }) {
    const data = templateRow?.template_data || {};
    const total = seksi.sections.length;
    const filled = seksi.sections.filter(s => {
        const sectionData = data[s.key];
        if (!sectionData) return false;
        // If it's an object with at least one non-empty array/value, consider filled
        if (typeof sectionData === 'object') {
            const vals = Object.values(sectionData);
            return vals.some(v => Array.isArray(v) ? v.length > 0 : (v !== '' && v !== null && v !== undefined));
        }
        return !!sectionData;
    }).length;

    const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
    const statusColor = pct === 100 ? '#22c55e' : pct > 0 ? '#f59e0b' : '#ef4444';
    const statusLabel = pct === 100 ? '✅ Lengkap' : pct > 0 ? '⚡ Sebagian' : '❌ Belum Diisi';

    return (
        <div style={{
            background: '#fff', borderRadius: '12px', border: `2px solid ${statusColor}20`,
            padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: seksi.color }} />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{seksi.name}</span>
                </div>
                <span style={{
                    padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                    background: `${statusColor}20`, color: statusColor
                }}>{statusLabel}</span>
            </div>

            {/* Progress bar */}
            <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '8px', marginBottom: '14px', overflow: 'hidden' }}>
                <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: '999px',
                    background: statusColor, transition: 'width .4s ease'
                }} />
            </div>

            {/* Per-section rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {seksi.sections.map(s => {
                    const sectionData = data[s.key];
                    const isFilled = sectionData && (() => {
                        if (typeof sectionData === 'object') {
                            const vals = Object.values(sectionData);
                            return vals.some(v => Array.isArray(v) ? v.length > 0 : (v !== '' && v !== null));
                        }
                        return !!sectionData;
                    })();
                    return (
                        <div key={s.key} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px'
                        }}>
                            <span style={{ color: '#475569' }}>{s.label}</span>
                            <StatusBadge filled={isFilled} />
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                {templateRow
                    ? `Terakhir diperbarui: ${new Date(templateRow.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : `Belum ada data untuk ${BULAN_NAMES[bulan]} ${tahun}`}
            </div>
        </div>
    );
}

export default function TemplateStatusDashboard() {
    const { user } = useAuth();
    const [bulan, setBulan] = useState(CUR_BULAN);
    const [tahun, setTahun] = useState(CUR_TAHUN);
    const [rows, setRows] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('laporan_template')
                    .select('seksi_id, template_data, updated_at')
                    .eq('bulan', bulan)
                    .eq('tahun', tahun);
                if (error) throw error;
                const byId = {};
                (data || []).forEach(r => { byId[r.seksi_id] = r; });
                setRows(byId);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [bulan, tahun]);

    const allTotal = SEKSI_CONFIG.reduce((a, s) => a + s.sections.length, 0);
    const allFilled = SEKSI_CONFIG.reduce((a, s) => {
        const data = rows[s.seksi_id]?.template_data || {};
        return a + s.sections.filter(sec => {
            const sd = data[sec.key];
            if (!sd) return false;
            if (typeof sd === 'object') return Object.values(sd).some(v => Array.isArray(v) ? v.length > 0 : (v !== '' && v !== null));
            return !!sd;
        }).length;
    }, 0);
    const overallPct = allTotal === 0 ? 0 : Math.round((allFilled / allTotal) * 100);

    return (
        <div style={{ padding: '24px', fontFamily: 'Inter, Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>📋 Status Pengisian Template</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Pantau kelengkapan laporan bulanan setiap seksi secara real-time.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select value={bulan} onChange={e => setBulan(+e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', background: '#fff' }}>
                        {BULAN_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
                    </select>
                    <select value={tahun} onChange={e => setTahun(+e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', background: '#fff' }}>
                        {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* Overall progress */}
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f2440 100%)',
                borderRadius: '14px', padding: '20px 24px', marginBottom: '24px', color: '#fff'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Kelengkapan Keseluruhan — {BULAN_NAMES[bulan]} {tahun}</span>
                    <span style={{ fontSize: '28px', fontWeight: 900, color: overallPct === 100 ? '#4ade80' : overallPct > 50 ? '#fbbf24' : '#f87171' }}>{overallPct}%</span>
                </div>
                <div style={{ background: '#ffffff20', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${overallPct}%`, height: '100%', borderRadius: '999px',
                        background: overallPct === 100 ? '#4ade80' : overallPct > 50 ? '#fbbf24' : '#f87171',
                        transition: 'width .6s ease'
                    }} />
                </div>
                <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    {allFilled} dari {allTotal} bagian template telah diisi
                </p>
            </div>

            {/* Per-seksi cards */}
            {loading
                ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>⏳ Memuat data...</div>
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
                    {SEKSI_CONFIG.map(seksi => (
                        <SeksiCard key={seksi.seksi_id} seksi={seksi} templateRow={rows[seksi.seksi_id]} bulan={bulan} tahun={tahun} />
                    ))}
                </div>
            }
        </div>
    );
}
