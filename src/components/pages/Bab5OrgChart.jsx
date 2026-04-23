import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useReport } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Bab5OrgChart
 * ─────────────
 * Uploads the org chart image to Supabase Storage (report-images bucket)
 * and stores the public URL in monthly_reports section_key='bab5'.
 *
 * - URL (not base64) is stored in DB → no payload size issues
 * - Image loads from CDN → fast and reliable everywhere
 * - Same URL is used by GabungLaporan for DOCX/PDF export
 *
 * Props:
 *  - editMode: boolean — shows upload controls if true
 */
const Bab5OrgChart = ({ editMode = false }) => {
    const { reportData, updateSection } = useReport();
    const { showNotification } = useNotification();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    // Image URL stored in reportData['bab5']
    // Could be a public URL (from Storage) or legacy base64 — handle both
    const rawValue = reportData?.['bab5'] || '';
    const imageUrl = rawValue.startsWith('http') || rawValue.startsWith('data:image') ? rawValue : null;

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('File harus berupa gambar (JPG, PNG, WebP, dll)', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showNotification('Ukuran file terlalu besar. Maks 10MB.', 'error');
            return;
        }

        setUploading(true);
        showNotification('⏳ Mengupload gambar struktur organisasi...', 'info');

        try {
            // 1. Upload to Supabase Storage: report-images/bab5/
            const ext = file.name.split('.').pop().toLowerCase() || 'png';
            const filePath = `bab5/struktur_organisasi_${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('report-images')
                .upload(filePath, file, { upsert: true, cacheControl: '3600' });

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: urlData } = supabase.storage
                .from('report-images')
                .getPublicUrl(filePath);

            const publicUrl = urlData?.publicUrl;
            if (!publicUrl) throw new Error('Gagal mendapatkan URL gambar dari storage');

            // 3. Save URL to monthly_reports via updateSection
            await updateSection('bab5', publicUrl);

            showNotification('✅ Gambar Struktur Organisasi berhasil disimpan!', 'success');
        } catch (err) {
            console.error('[Bab5OrgChart] Upload error:', err);
            showNotification('Gagal upload gambar: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = async () => {
        if (!window.confirm('Hapus gambar struktur organisasi?')) return;
        await updateSection('bab5', '');
        showNotification('Gambar dihapus.', 'info');
    };

    return (
        <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#fff',
            boxSizing: 'border-box',
            padding: editMode ? '20px' : '0',
        }}>

            {/* ── Upload Controls (edit mode only) ── */}
            {editMode && (
                <div style={{
                    width: '100%',
                    maxWidth: 720,
                    marginBottom: 24,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #1a2e6e 0%, #2a4a9e 100%)',
                    padding: '20px 28px',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(26,46,110,0.25)',
                }}>
                    <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
                        📸 Upload Gambar — BAB V Struktur Organisasi
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 18, lineHeight: 1.6 }}>
                        Upload foto/gambar struktur organisasi. Gambar akan tampil di halaman preview dan saat ekspor ke Word/PDF.
                        Gunakan gambar resolusi tinggi dengan format landscape untuk hasil terbaik.
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 22px',
                                background: uploading ? '#aaa' : '#ffffff',
                                color: '#1a2e6e',
                                border: 'none', borderRadius: 8,
                                fontSize: 14, fontWeight: 700,
                                cursor: uploading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {uploading ? '⏳ Mengupload...' : imageUrl ? '🔄 Ganti Gambar' : '🖼️ Pilih Gambar'}
                        </button>
                        {imageUrl && !uploading && (
                            <button
                                onClick={handleRemove}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(255,80,80,0.18)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,120,120,0.5)',
                                    borderRadius: 8,
                                    fontSize: 14, fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                🗑️ Hapus
                            </button>
                        )}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.55, marginTop: 10 }}>
                        Format: JPG · PNG · WebP · Maks: 10MB · Disarankan: lanskap, resolusi tinggi
                    </div>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            {/* ── Image Display ── */}
            {imageUrl ? (
                <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                }}>
                    <img
                        src={imageUrl}
                        alt="Struktur Organisasi Kantor Imigrasi Kelas II TPI Pematang Siantar"
                        style={{
                            width: '100%',
                            height: 'auto',
                            objectFit: 'contain',
                            display: 'block',
                            borderRadius: editMode ? 6 : 0,
                            boxShadow: editMode ? '0 2px 16px rgba(0,0,0,0.10)' : 'none',
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            console.warn('[Bab5OrgChart] Image failed to load:', imageUrl);
                        }}
                    />
                </div>
            ) : (
                /* Placeholder */
                <div
                    style={{
                        width: '100%',
                        maxWidth: editMode ? 700 : '100%',
                        minHeight: editMode ? 280 : 320,
                        border: '2.5px dashed #c8d0e0',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 14,
                        background: '#f8f9fb',
                        cursor: editMode ? 'pointer' : 'default',
                        padding: 32,
                        textAlign: 'center',
                    }}
                    onClick={editMode && !uploading ? () => fileInputRef.current?.click() : undefined}
                >
                    <div style={{ fontSize: 56, lineHeight: 1 }}>🗂️</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>
                        Belum ada gambar Struktur Organisasi
                    </div>
                    {editMode && (
                        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                            Klik area ini atau tombol <strong>"🖼️ Pilih Gambar"</strong> di atas<br />
                            untuk mengunggah foto struktur organisasi Anda
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Bab5OrgChart;
