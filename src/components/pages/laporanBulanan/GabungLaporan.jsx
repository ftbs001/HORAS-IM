import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useLaporan } from '../../../contexts/LaporanContext';

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
    'Draft':        { bg: '#dbeafe', text: '#1d4ed8' },
    'Dikirim':      { bg: '#fef9c3', text: '#854d0e' },
    'Perlu Revisi': { bg: '#fee2e2', text: '#b91c1c' },
    'Disetujui':    { bg: '#dcfce7', text: '#15803d' },
    'Final':        { bg: '#f3e8ff', text: '#7e22ce' },
};

export default function GabungLaporan({ initialBulan, initialTahun }) {
    const { user } = useAuth();
    const { loadLaporan, getLaporan } = useLaporan();

    const [bulan, setBulan] = useState(initialBulan || new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(initialTahun || new Date().getFullYear());
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [msg, setMsg] = useState(null);
    const [checkedIds, setCheckedIds] = useState(new Set());

    const showMsg = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 5000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: sec, error: secErr } = await supabase
                .from('sections')
                .select('id, name, urutan_penggabungan')
                .order('urutan_penggabungan');
            if (secErr) console.error('GabungLaporan: gagal load sections:', secErr);
            setSections(dedupSections(sec || []));
            await loadLaporan(bulan, tahun);
        } catch (err) {
            console.error('GabungLaporan loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, [bulan, tahun, loadLaporan]);

    useEffect(() => { loadData(); }, [loadData]);

    const laporan = getLaporan(bulan, tahun);

    const rows = sections.map(s => ({
        ...s,
        laporan: laporan.find(l => l.seksi_id === s.id) || null,
    }));

    const approvedRows = rows.filter(r => r.laporan && (r.laporan.status === 'Disetujui' || r.laporan.status === 'Final'));
    const allApprovedIds = new Set(approvedRows.map(r => r.laporan.id));

    // Auto-check all approved on load
    useEffect(() => {
        if (approvedRows.length > 0 && checkedIds.size === 0) {
            setCheckedIds(new Set(approvedRows.map(r => r.laporan.id)));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [approvedRows.length]);

    const toggleCheck = (id) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (checkedIds.size === allApprovedIds.size) {
            setCheckedIds(new Set());
        } else {
            setCheckedIds(new Set(allApprovedIds));
        }
    };

    const selectedLaporan = approvedRows
        .filter(r => checkedIds.has(r.laporan.id))
        .map(r => r.laporan);

    // ── Export gabungan sebagai HTML (Word-compatible)
    const handleExport = async () => {
        if (selectedLaporan.length === 0) {
            showMsg('error', 'Pilih minimal satu laporan untuk digabungkan.');
            return;
        }
        setExporting(true);
        try {
            await supabase.from('activity_logs').insert({
                user_id: user?.id,
                user_name: user?.nama,
                action: 'gabung_laporan',
                entity_type: 'laporan_bulanan',
                detail: `Gabungkan ${selectedLaporan.length} laporan — ${BULAN_NAMES[bulan]} ${tahun}`,
            });

            // Build combined HTML document
            const coverHtml = `
<div style="text-align:center;padding:80pt 0;font-family:Arial,sans-serif;">
  <div style="font-size:14pt;font-weight:bold;margin-bottom:12pt;">KANTOR IMIGRASI KELAS II TPI<br/>PEMATANG SIANTAR</div>
  <div style="font-size:20pt;font-weight:bold;margin-bottom:20pt;">LAPORAN BULANAN GABUNGAN</div>
  <div style="font-size:16pt;font-weight:bold;margin-bottom:60pt;">${BULAN_NAMES[bulan]} ${tahun}</div>
  <div style="font-size:12pt;font-weight:bold;margin-top:80pt;">
    KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN<br/>
    REPUBLIK INDONESIA<br/>
    DIREKTORAT JENDERAL IMIGRASI<br/>
    ${tahun}
  </div>
</div>`;

            let sectionsHtml = '';
            for (const l of selectedLaporan) {
                const sectionName = sections.find(s => s.id === l.seksi_id)?.name || `seksi_id=${l.seksi_id}`;
                sectionsHtml += `
<div style="page-break-before:always;font-family:Arial,sans-serif;">
  <h2 style="font-size:14pt;font-weight:bold;text-align:center;text-transform:uppercase;
             border-bottom:3px solid #000;padding-bottom:4pt;margin-bottom:18pt;">
    ${sectionName}
  </h2>
  <p style="font-size:11pt;color:#555;margin-bottom:16pt;">
    Judul: <strong>${l.judul_laporan || l.file_name || '-'}</strong><br/>
    Status: <strong>${l.status}</strong> &nbsp;|&nbsp;
    Dikirim: ${l.submitted_at ? new Date(l.submitted_at).toLocaleDateString('id-ID') : '-'}
    ${l.catatan_revisi ? `<br/>Catatan: ${l.catatan_revisi}` : ''}
  </p>`;

                if (l.docx_html) {
                    sectionsHtml += `<div>${l.docx_html}</div>`;
                } else if (l.file_url) {
                    sectionsHtml += `<p style="font-style:italic;color:#666;">
        File tersedia di: <a href="${l.file_url}">${l.file_url}</a>
      </p>`;
                } else {
                    sectionsHtml += `<p style="color:#999;font-style:italic;">Konten tidak tersedia untuk preview.</p>`;
                }
                sectionsHtml += `</div>`;
            }

            const fullHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<style>
@page { size: A4; margin: 2cm; }
* { font-family: Arial, sans-serif !important; }
body { font-size: 11pt; line-height: 1.5; color: #000; }
.page-break { page-break-after: always; clear: both; }
table { border-collapse: collapse; width: 100%; }
td, th { padding: 4pt 6pt; vertical-align: top; font-size: 11pt; }
</style>
</head>
<body>
${coverHtml}
${sectionsHtml}
</body></html>`;

            const blob = new Blob(['\ufeff', fullHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Laporan_Gabungan_${BULAN_NAMES[bulan]}_${tahun}.html`;
            a.click();
            URL.revokeObjectURL(url);

            showMsg('success', `✅ Berhasil mengekspor ${selectedLaporan.length} laporan sebagai dokumen gabungan.`);
        } catch (err) {
            showMsg('error', `Export gagal: ${err.message}`);
        } finally {
            setExporting(false);
        }
    };

    const tahunOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="page-scroll">
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                    📎 Gabungkan Laporan Bulanan
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                    Pilih laporan per seksi yang sudah disetujui, lalu ekspor sebagai dokumen gabungan.
                </p>
            </div>

            {/* Notifikasi */}
            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
                    background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: msg.type === 'success' ? '#15803d' : '#b91c1c',
                    border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                }}>
                    {msg.text}
                </div>
            )}

            {/* Filter bulan & tahun */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap',
            }}>
                <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                        Bulan
                    </label>
                    <select
                        value={bulan}
                        onChange={e => setBulan(+e.target.value)}
                        style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                    >
                        {BULAN_NAMES.slice(1).map((b, i) => (
                            <option key={i + 1} value={i + 1}>{b}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                        Tahun
                    </label>
                    <select
                        value={tahun}
                        onChange={e => setTahun(+e.target.value)}
                        style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                    >
                        {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    style={{
                        padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1',
                        background: '#f8fafc', color: '#475569', fontSize: '13px',
                        fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                    }}
                >
                    {loading ? '⏳' : '🔄'} Muat Ulang
                </button>
            </div>

            {/* Tabel seleksi */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                        Laporan Seksi — {BULAN_NAMES[bulan]} {tahun}
                    </h2>
                    {approvedRows.length > 0 && (
                        <button
                            onClick={toggleAll}
                            style={{
                                padding: '6px 14px', borderRadius: '8px',
                                border: '1px solid #7c3aed', background: '#faf5ff',
                                color: '#7c3aed', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            {checkedIds.size === allApprovedIds.size ? '☐ Batal Semua' : '☑ Pilih Semua'}
                        </button>
                    )}
                </div>

                {loading ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>Memuat data...</p>
                ) : rows.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>Tidak ada seksi ditemukan.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['☑', 'Seksi', 'Judul Laporan', 'Status', 'Dikirim'].map(h => (
                                        <th key={h} style={{
                                            padding: '10px 12px', textAlign: 'left',
                                            color: '#64748b', fontWeight: 600,
                                            borderBottom: '1px solid #e2e8f0',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => {
                                    const l = row.laporan;
                                    const isEligible = l && (l.status === 'Disetujui' || l.status === 'Final');
                                    const isChecked = l && checkedIds.has(l.id);
                                    return (
                                        <tr key={row.id} style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            background: isChecked ? '#faf5ff' : 'transparent',
                                            opacity: isEligible ? 1 : 0.5,
                                        }}>
                                            <td style={{ padding: '12px', width: '40px' }}>
                                                {isEligible ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={!!isChecked}
                                                        onChange={() => toggleCheck(l.id)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#7c3aed' }}
                                                    />
                                                ) : (
                                                    <span style={{ color: '#cbd5e1', fontSize: '16px' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{row.name}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#475569', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {l?.judul_laporan || l?.file_name || <span style={{ color: '#94a3b8' }}>Belum upload</span>}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {l ? (
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: '99px',
                                                        fontWeight: 600, fontSize: '12px',
                                                        background: STATUS_COLOR[l.status]?.bg,
                                                        color: STATUS_COLOR[l.status]?.text,
                                                    }}>{l.status}</span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                {l?.submitted_at ? new Date(l.submitted_at).toLocaleDateString('id-ID') : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && approvedRows.length === 0 && (
                    <div style={{
                        marginTop: '16px', padding: '14px 18px', borderRadius: '8px',
                        background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '13px', color: '#9a3412',
                    }}>
                        ⚠️ Belum ada laporan dengan status <strong>Disetujui</strong> atau <strong>Final</strong> untuk periode ini.
                        Kembali ke <strong>Monitoring Laporan</strong> untuk menyetujui laporan terlebih dahulu.
                    </div>
                )}
            </div>

            {/* Ringkasan & tombol ekspor */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '12px',
            }}>
                <div>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}>
                        {checkedIds.size} laporan dipilih dari {approvedRows.length} yang tersedia
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Periode: <strong>{BULAN_NAMES[bulan]} {tahun}</strong>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    disabled={exporting || selectedLaporan.length === 0}
                    style={{
                        padding: '12px 28px', borderRadius: '10px', border: 'none',
                        background: selectedLaporan.length > 0 && !exporting ? '#7c3aed' : '#e2e8f0',
                        color: selectedLaporan.length > 0 && !exporting ? '#fff' : '#94a3b8',
                        fontWeight: 700, fontSize: '15px',
                        cursor: selectedLaporan.length > 0 && !exporting ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                >
                    {exporting ? '⏳ Mengekspor...' : '📥 Ekspor Gabungan (.html)'}
                </button>
            </div>

        </div>
        </div>
    );
}
