import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function GabungLaporan() {
    const { user } = useAuth();
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [laporan, setLaporan] = useState([]);   // sorted by urutan
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [msg, setMsg] = useState(null);

    const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000); };

    const loadData = useCallback(async () => {
        setLoading(true);
        const { data: sec } = await supabase.from('sections').select('id, name, alias, urutan_penggabungan').order('urutan_penggabungan');
        const { data: lap } = await supabase.from('laporan_bulanan').select('*').eq('bulan', bulan).eq('tahun', tahun);

        // Gabungkan: hanya seksi yang laporannya Disetujui/Final
        const merged = (sec || []).map(s => {
            const l = (lap || []).find(x => x.seksi_id === s.id);
            return { ...s, laporan: l };
        });
        setLaporan(merged);
        setLoading(false);
    }, [bulan, tahun]);

    useEffect(() => { loadData(); }, [loadData]);

    const approved = laporan.filter(r => r.laporan && ['Disetujui', 'Final'].includes(r.laporan.status));
    const semuaDisetujui = approved.length === laporan.length && laporan.length > 0;

    // ---- Gabung & download menggunakan docx library ----
    const handleGabung = async () => {
        if (!semuaDisetujui) return showMsg('error', 'Belum semua laporan disetujui.');

        setGenerating(true);
        showMsg('info', '⏳ Memproses penggabungan laporan...');

        try {
            // Dynamic import docx
            const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
                PageBreak, TableOfContents, PageNumber, Footer, NumberFormat,
                SectionType, convertInchesToTwip } = await import('docx');

            const margin = convertInchesToTwip(0.79);  // ~2cm = 0.787 inch

            const children = [];

            // ---- Cover/Judul ----
            children.push(
                new Paragraph({
                    text: 'LAPORAN BULANAN',
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 200 },
                }),
                new Paragraph({
                    children: [new TextRun({
                        text: `${BULAN_NAMES[bulan]} ${tahun}`,
                        size: 28, bold: true
                    })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR', size: 24 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 2000 },
                }),
            );

            // ---- Per Seksi ----
            approved.forEach((row, idx) => {
                // Page break sebelum BAB (kecuali pertama)
                if (idx > 0) {
                    children.push(new Paragraph({ children: [new PageBreak()] }));
                }

                // BAB heading
                children.push(
                    new Paragraph({
                        text: `BAB ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][idx] || idx + 1}`,
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    new Paragraph({
                        text: row.name.toUpperCase(),
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 200 },
                    }),
                    new Paragraph({
                        children: [new TextRun({
                            text: `[Laporan ${row.laporan.file_name || 'file'} — silakan gabungkan isi dokumen Word secara manual atau upgrade ke parsing .docx]`,
                            size: 24, italics: true, color: '888888'
                        })],
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [new TextRun({
                            text: `Download file asli: `,
                            size: 24,
                        }), new TextRun({
                            text: row.laporan.file_url,
                            size: 24, color: '2563eb',
                        })],
                        spacing: { after: 400 },
                    }),
                );
            });

            // ---- Buat dokumen ----
            const doc = new Document({
                creator: user.nama,
                title: `Laporan Bulanan ${BULAN_NAMES[bulan]} ${tahun}`,
                description: `Laporan Bulanan HORAS-IM ${BULAN_NAMES[bulan]} ${tahun}`,
                styles: {
                    default: {
                        document: {
                            run: { font: 'Arial', size: 24 },  // 12pt
                        },
                    },
                },
                sections: [{
                    properties: {
                        type: SectionType.CONTINUOUS,
                        page: {
                            margin: { top: margin, bottom: margin, left: margin, right: margin },
                        },
                    },
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [
                                        new TextRun({ children: [PageNumber.CURRENT] }),
                                        new TextRun(' / '),
                                        new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                                    ],
                                }),
                            ],
                        }),
                    },
                    children,
                }],
                numbering: { config: [] },
            });

            const buffer = await Packer.toBlob(doc);
            const url = URL.createObjectURL(buffer);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Laporan_Bulanan_${BULAN_NAMES[bulan]}_${tahun}.docx`;
            a.click();
            URL.revokeObjectURL(url);

            await supabase.from('activity_logs').insert({
                user_id: user.id, user_name: user.nama, action: 'gabung_laporan',
                entity_type: 'laporan_bulanan',
                detail: `Gabung laporan ${BULAN_NAMES[bulan]} ${tahun} (${approved.length} seksi)`,
            });

            showMsg('success', `✅ Laporan ${approved.length} seksi berhasil digabung dan didownload!`);
        } catch (err) {
            console.error(err);
            showMsg('error', `Gagal membuat dokumen: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const tahunOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    📎 Gabungkan Laporan Bulanan
                </h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
                    Gabungkan semua laporan seksi yang telah disetujui menjadi satu dokumen Word.
                </p>
            </div>

            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
                    background: msg.type === 'success' ? '#dcfce7' : msg.type === 'info' ? '#eff6ff' : '#fee2e2',
                    color: msg.type === 'success' ? '#15803d' : msg.type === 'info' ? '#1d4ed8' : '#b91c1c',
                    border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : msg.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
                }}>
                    {msg.text}
                </div>
            )}

            {/* Filter */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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

            {/* Daftar urutan seksi */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    Urutan Penggabungan
                </h2>

                {loading ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Memuat...</p>
                ) : laporan.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Tidak ada seksi ditemukan.</p>
                ) : (
                    laporan.map((row, idx) => {
                        const ok = row.laporan && ['Disetujui', 'Final'].includes(row.laporan.status);
                        return (
                            <div key={row.id} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px', borderRadius: '8px', marginBottom: '8px',
                                background: ok ? '#f0fdf4' : '#fef2f2',
                                border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
                            }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                                    background: ok ? '#16a34a' : '#dc2626', color: '#fff', flexShrink: 0,
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{row.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{row.alias || ''}</div>
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: ok ? '#15803d' : '#dc2626' }}>
                                    {ok ? `✅ ${row.laporan.status}` : row.laporan ? `⚠️ ${row.laporan.status}` : '❌ Belum Upload'}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Info format */}
            <div style={{
                background: '#eff6ff', borderRadius: '10px', padding: '16px', marginBottom: '24px',
                border: '1px solid #bfdbfe', fontSize: '13px', color: '#1d4ed8'
            }}>
                <strong>📐 Format Dokumen Gabungan:</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: '20px', lineHeight: 1.8 }}>
                    <li>Font: Arial 12pt</li>
                    <li>Margin: 2 cm (atas, kiri, kanan, bawah)</li>
                    <li>Heading otomatis: BAB (Heading 1), Nama Seksi (Heading 2)</li>
                    <li>Nomor halaman otomatis di footer</li>
                    <li>Page break antar seksi</li>
                </ul>
            </div>

            {/* Tombol Gabung */}
            <button
                onClick={handleGabung}
                disabled={!semuaDisetujui || generating || loading}
                style={{
                    padding: '14px 32px', borderRadius: '10px', border: 'none',
                    fontWeight: 700, fontSize: '16px',
                    cursor: semuaDisetujui && !generating ? 'pointer' : 'not-allowed',
                    background: semuaDisetujui && !generating ? '#7c3aed' : '#e2e8f0',
                    color: semuaDisetujui && !generating ? '#fff' : '#94a3b8',
                    transition: 'all 0.2s',
                }}>
                {generating ? '⏳ Membuat Dokumen...' : semuaDisetujui ? '⬇️ Download Laporan Gabungan (.docx)' : '⚠️ Belum Semua Laporan Disetujui'}
            </button>
        </div>
    );
}
