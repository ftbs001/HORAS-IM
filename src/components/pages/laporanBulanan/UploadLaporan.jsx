import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const STATUS_COLOR = {
    'Draft': { bg: '#dbeafe', text: '#1d4ed8' },
    'Dikirim': { bg: '#fef9c3', text: '#854d0e' },
    'Perlu Revisi': { bg: '#fee2e2', text: '#b91c1c' },
    'Disetujui': { bg: '#dcfce7', text: '#15803d' },
    'Final': { bg: '#f3e8ff', text: '#7e22ce' },
};

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

export default function UploadLaporan() {
    const { user } = useAuth();
    const [laporan, setLaporan] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState(null);
    const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth() + 1);
    const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
    const [selectedFile, setSelectedFile] = useState(null);
    const [resolvedSeksiId, setResolvedSeksiId] = useState(null);
    const [resolvedSeksiName, setResolvedSeksiName] = useState('');
    const fileRef = useRef();

    // ---- Resolve seksiId sekali saat mount ----
    // Prioritas: user.seksiId dari DB (string dgn angka) → query DB berdasarkan alias
    useEffect(() => {
        let cancelled = false;
        const resolve = async () => {
            // Cek apakah user.seksiId adalah angka valid
            const directId = parseInt(user?.seksiId);
            if (!isNaN(directId) && directId > 0) {
                // Verifikasi ID ini memang ada di DB
                const { data } = await supabase.from('sections').select('id, name').eq('id', directId).single();
                if (!cancelled && data) {
                    setResolvedSeksiId(data.id);
                    setResolvedSeksiName(data.name);
                    return;
                }
            }
            // Fallback: cari berdasarkan alias seksi
            const alias = user?.seksi?.alias || user?.seksi?.name || '';
            if (alias) {
                const { data } = await supabase
                    .from('sections')
                    .select('id, name')
                    .or(`name.ilike.%${alias}%,alias.ilike.%${alias}%`)
                    .limit(1);
                if (!cancelled && data?.length) {
                    setResolvedSeksiId(data[0].id);
                    setResolvedSeksiName(data[0].name);
                }
            }
        };
        if (user?.role === 'admin_seksi') resolve();
        else setLoading(false);
        return () => { cancelled = true; };
    }, [user]);

    // ---- Load laporan setelah resolvedSeksiId tersedia ----
    const loadLaporan = useCallback(async (sid) => {
        if (!sid) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('laporan_bulanan')
            .select('*')
            .eq('seksi_id', sid)
            .order('tahun', { ascending: false })
            .order('bulan', { ascending: false });
        if (!error) setLaporan(data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (resolvedSeksiId) loadLaporan(resolvedSeksiId);
    }, [resolvedSeksiId, loadLaporan]);

    const showMsg = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 6000);
    };

    const laporanBulanIni = laporan.find(
        l => l.bulan === selectedBulan && l.tahun === selectedTahun
    );
    const isLocked = laporanBulanIni?.final_locked;

    // ---- Pilih file ----
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) { setSelectedFile(null); return; }
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            showMsg('error', `Format tidak didukung. Gunakan: PDF, DOCX, atau DOC`);
            e.target.value = '';
            setSelectedFile(null);
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showMsg('error', 'Ukuran file maksimal 10 MB.');
            e.target.value = '';
            setSelectedFile(null);
            return;
        }
        setSelectedFile(file);
    };

    // ---- Upload (pakai UPSERT agar aman jika sudah ada record) ----
    const handleUpload = async () => {
        if (!selectedFile) return showMsg('error', 'Pilih file terlebih dahulu.');
        if (isLocked) return showMsg('error', 'Laporan ini sudah dikunci (Final).');
        if (!resolvedSeksiId) return showMsg('error', 'Seksi belum terdeteksi. Coba refresh halaman.');

        setUploading(true);
        try {
            const ext = selectedFile.name.split('.').pop().toLowerCase();
            const fileName = `seksi${resolvedSeksiId}_${selectedTahun}_${String(selectedBulan).padStart(2, '0')}_${Date.now()}.${ext}`;
            const filePath = `uploads/${fileName}`;

            // Hapus file lama jika ada
            if (laporanBulanIni?.file_path) {
                await supabase.storage.from('laporan-bulanan').remove([laporanBulanIni.file_path]);
            }

            // Upload ke Storage
            const { error: uploadErr } = await supabase.storage
                .from('laporan-bulanan')
                .upload(filePath, selectedFile, { upsert: true, contentType: selectedFile.type });

            if (uploadErr) {
                if (uploadErr.message?.toLowerCase().includes('bucket') || uploadErr.statusCode === '404') {
                    throw new Error('Storage bucket belum dibuat.\nJalankan supabase_complete_setup.sql di SQL Editor Supabase terlebih dahulu.');
                }
                throw uploadErr;
            }

            const { data: urlData } = supabase.storage.from('laporan-bulanan').getPublicUrl(filePath);

            // Status: jika sebelumnya Draft/Perlu Revisi/belum ada → jadi Draft
            // Jika sebelumnya Disetujui, pertahankan (tidak turunkan status)
            const prevStatus = laporanBulanIni?.status;
            const newStatus = (prevStatus === 'Disetujui' || prevStatus === 'Final') ? prevStatus : 'Draft';

            // *** UPSERT — tidak akan error duplicate key ***
            const { error: dbErr } = await supabase.from('laporan_bulanan').upsert(
                {
                    seksi_id: resolvedSeksiId,
                    bulan: selectedBulan,
                    tahun: selectedTahun,
                    file_name: selectedFile.name,
                    file_path: filePath,
                    file_url: urlData.publicUrl,
                    file_size: selectedFile.size,
                    file_type: ext,
                    status: newStatus,
                    catatan_revisi: newStatus === 'Draft' ? null : laporanBulanIni?.catatan_revisi,
                    submitted_by: user?.id || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'seksi_id,bulan,tahun' }  // conflict → UPDATE otomatis
            );
            if (dbErr) throw dbErr;

            supabase.from('activity_logs').insert({
                user_id: user?.id, user_name: user?.nama || resolvedSeksiName,
                action: 'upload', entity_type: 'laporan_bulanan',
                detail: `Upload laporan ${resolvedSeksiName || 'Seksi'} ${BULAN_NAMES[selectedBulan]} ${selectedTahun} (${ext.toUpperCase()})`,
            }).catch(() => { });

            showMsg('success', `File ${ext.toUpperCase()} berhasil di-upload!`);
            setSelectedFile(null);
            if (fileRef.current) fileRef.current.value = '';
            await loadLaporan(resolvedSeksiId);
        } catch (err) {
            showMsg('error', `Upload gagal: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // ---- Submit untuk review ----
    const handleSubmit = async () => {
        if (!laporanBulanIni) return showMsg('error', 'Upload file terlebih dahulu.');
        if (laporanBulanIni.status === 'Dikirim') return showMsg('error', 'Laporan sudah dikirim.');
        if (laporanBulanIni.status === 'Disetujui') return showMsg('error', 'Laporan sudah disetujui.');
        if (isLocked) return showMsg('error', 'Laporan dikunci, tidak dapat dikirim.');

        setSubmitting(true);
        try {
            const { error } = await supabase.from('laporan_bulanan')
                .update({ status: 'Dikirim', submitted_at: new Date().toISOString() })
                .eq('id', laporanBulanIni.id);
            if (error) throw error;

            supabase.from('activity_logs').insert({
                user_id: user?.id, user_name: user?.nama,
                action: 'submit', entity_type: 'laporan_bulanan', entity_id: laporanBulanIni.id,
                detail: `Submit laporan ${BULAN_NAMES[selectedBulan]} ${selectedTahun}`,
            }).catch(() => { });

            showMsg('success', 'Laporan berhasil dikirim untuk di-review!');
            await loadLaporan(resolvedSeksiId);
        } catch (err) {
            showMsg('error', `Gagal kirim: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const tahunOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const seksiNama = resolvedSeksiName || user?.seksi?.name || 'Seksi Anda';

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    📄 Upload Laporan Bulanan
                </h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
                    {seksiNama} — Hanya laporan seksi Anda yang dapat diakses dan diedit.
                </p>
            </div>

            {/* Notifikasi */}
            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
                    fontSize: '14px', whiteSpace: 'pre-line',
                    background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: msg.type === 'success' ? '#15803d' : '#b91c1c',
                    border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                }}>
                    {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
                </div>
            )}

            {/* Warning: seksi belum resolve */}
            {!resolvedSeksiId && !loading && (
                <div style={{
                    padding: '14px 16px', borderRadius: '8px', marginBottom: '20px',
                    background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '14px', color: '#9a3412'
                }}>
                    ⚠️ <strong>Seksi belum terdeteksi.</strong><br />
                    Pastikan SQL setup sudah dijalankan dan akun Anda sudah memiliki seksi_id yang valid.
                    Coba logout dan login ulang, atau hubungi Super Admin.
                </div>
            )}

            {/* Form Upload */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    Upload Laporan Baru
                </h2>

                {/* Bulan & Tahun */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Bulan</label>
                        <select value={selectedBulan} onChange={e => setSelectedBulan(+e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}>
                            {BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Tahun</label>
                        <select value={selectedTahun} onChange={e => setSelectedTahun(+e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}>
                            {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Status laporan saat ini */}
                {laporanBulanIni && (
                    <div style={{
                        padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                        background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
                    }}>
                        <span>Status:</span>
                        <span style={{
                            padding: '2px 10px', borderRadius: '99px', fontWeight: 600, fontSize: '13px',
                            background: STATUS_COLOR[laporanBulanIni.status]?.bg,
                            color: STATUS_COLOR[laporanBulanIni.status]?.text,
                        }}>
                            {laporanBulanIni.status}
                        </span>
                        {laporanBulanIni.file_name && (
                            <span style={{ color: '#64748b', fontSize: '13px' }}>
                                📎 {laporanBulanIni.file_name}
                                {laporanBulanIni.file_type && (
                                    <span style={{
                                        marginLeft: '6px', padding: '1px 6px', borderRadius: '4px',
                                        fontSize: '11px', fontWeight: 700,
                                        background: laporanBulanIni.file_type === 'pdf' ? '#fee2e2' : '#dbeafe',
                                        color: laporanBulanIni.file_type === 'pdf' ? '#b91c1c' : '#1d4ed8',
                                    }}>
                                        {laporanBulanIni.file_type.toUpperCase()}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                )}

                {/* Catatan revisi */}
                {laporanBulanIni?.status === 'Perlu Revisi' && laporanBulanIni.catatan_revisi && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                        background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '14px', color: '#9a3412'
                    }}>
                        <strong>📝 Catatan Revisi dari Super Admin:</strong>
                        <p style={{ margin: '6px 0 0', lineHeight: 1.6 }}>{laporanBulanIni.catatan_revisi}</p>
                    </div>
                )}

                {/* Input file */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        File Laporan
                        <span style={{ color: '#94a3b8', marginLeft: '6px' }}>(PDF, DOCX, DOC — maks. 10 MB)</span>
                    </label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                        disabled={isLocked || !resolvedSeksiId}
                        onChange={handleFileChange}
                        style={{
                            display: 'block', padding: '8px', border: '1px dashed #cbd5e1',
                            borderRadius: '8px', width: '100%', fontSize: '14px',
                            background: (isLocked || !resolvedSeksiId) ? '#f1f5f9' : '#fff',
                            boxSizing: 'border-box',
                        }}
                    />
                    {selectedFile && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#0369a1', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span>📎</span>
                            <span>{selectedFile.name}</span>
                            <span style={{ color: '#94a3b8' }}>({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                        </div>
                    )}
                    {isLocked && (
                        <p style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>
                            ⛔ Laporan ini sudah dikunci (Final). Tidak dapat diedit.
                        </p>
                    )}
                </div>

                {/* Tombol aksi */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleUpload}
                        disabled={uploading || isLocked || !selectedFile || !resolvedSeksiId}
                        style={{
                            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
                            fontSize: '14px',
                            background: (uploading || isLocked || !selectedFile || !resolvedSeksiId) ? '#94a3b8' : '#2563eb',
                            color: '#fff',
                            cursor: (uploading || isLocked || !selectedFile || !resolvedSeksiId) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {uploading ? '⏳ Mengupload...' : '⬆️ Upload File'}
                    </button>

                    {laporanBulanIni && ['Draft', 'Perlu Revisi'].includes(laporanBulanIni.status) && !isLocked && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
                                fontSize: '14px',
                                background: submitting ? '#94a3b8' : '#16a34a',
                                color: '#fff',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {submitting ? '⏳ Mengirim...' : '📨 Kirim untuk Review'}
                        </button>
                    )}

                    {laporanBulanIni?.file_url && (
                        <a
                            href={laporanBulanIni.file_url}
                            target="_blank" rel="noreferrer"
                            style={{
                                padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                background: '#fff', color: '#1e293b', fontWeight: 600, fontSize: '14px',
                                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            👁️ Lihat File
                        </a>
                    )}
                </div>
            </div>

            {/* Riwayat Laporan */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    📋 Riwayat Laporan — {seksiNama}
                </h2>

                {loading ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Memuat...</p>
                ) : laporan.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                        Belum ada laporan yang diupload.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['Bulan', 'Tahun', 'File', 'Tipe', 'Status', 'Catatan Revisi', 'Aksi'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {laporan.map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 12px' }}>{BULAN_NAMES[l.bulan]}</td>
                                        <td style={{ padding: '10px 12px' }}>{l.tahun}</td>
                                        <td style={{ padding: '10px 12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                                            {l.file_name || '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            {l.file_type ? (
                                                <span style={{
                                                    background: l.file_type === 'pdf' ? '#fee2e2' : '#dbeafe',
                                                    color: l.file_type === 'pdf' ? '#b91c1c' : '#1d4ed8',
                                                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700
                                                }}>
                                                    {l.file_type.toUpperCase()}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                padding: '2px 10px', borderRadius: '99px', fontWeight: 600, fontSize: '12px',
                                                background: STATUS_COLOR[l.status]?.bg, color: STATUS_COLOR[l.status]?.text,
                                            }}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', maxWidth: '160px', fontSize: '12px', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {l.catatan_revisi || '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {l.file_url && (
                                                <a href={l.file_url} target="_blank" rel="noreferrer"
                                                    style={{ color: '#2563eb', fontSize: '13px', textDecoration: 'none' }}>
                                                    👁️ Lihat
                                                </a>
                                            )}
                                            {/* Hanya bisa re-upload jika Draft/Perlu Revisi dan tidak terkunci */}
                                            {['Draft', 'Perlu Revisi'].includes(l.status) && !l.final_locked && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedBulan(l.bulan);
                                                        setSelectedTahun(l.tahun);
                                                        setTimeout(() => fileRef.current?.click(), 100);
                                                    }}
                                                    style={{
                                                        padding: '3px 10px', borderRadius: '6px', border: 'none',
                                                        background: '#f1f5f9', color: '#64748b', fontSize: '12px',
                                                        cursor: 'pointer', fontWeight: 600
                                                    }}
                                                >
                                                    🔄 Ganti
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
