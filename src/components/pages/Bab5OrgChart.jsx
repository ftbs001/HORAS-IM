import React, { useRef } from 'react';
import { useReport } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Bab5OrgChart
 * ─────────────
 * Allows uploading a custom image for the BAB V org chart.
 * The image is stored as base64 in reportData['bab5'] via Supabase.
 * It is displayed here AND used by GabungLaporan during DOCX/PDF export.
 *
 * Props:
 *  - editMode: boolean — if true, shows the upload button/controls
 */
const Bab5OrgChart = ({ editMode = false }) => {
    const { reportData, updateSection } = useReport();
    const { showNotification } = useNotification();
    const fileInputRef = useRef(null);

    // Image stored as base64 string in reportData['bab5']
    const imageBase64 = reportData?.['bab5'] || null;

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('File harus berupa gambar (JPG, PNG, dll)', 'error');
            return;
        }

        // Validate size (max 8MB)
        if (file.size > 8 * 1024 * 1024) {
            showNotification('Ukuran file terlalu besar. Maksimum 8MB.', 'error');
            return;
        }

        showNotification('⏳ Memproses gambar...', 'info');

        try {
            // Convert to base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result); // data:image/...;base64,...
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Save to Supabase via updateSection
            await updateSection('bab5', base64);
            showNotification('✅ Gambar Struktur Organisasi berhasil disimpan!', 'success');
        } catch (err) {
            console.error('[Bab5OrgChart] Upload error:', err);
            showNotification('Gagal menyimpan gambar: ' + err.message, 'error');
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
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
            padding: editMode ? '20px' : '0',
            boxSizing: 'border-box',
            minHeight: editMode ? 200 : 0,
        }}>

            {/* ── Edit Controls ── */}
            {editMode && (
                <div style={{
                    width: '100%',
                    maxWidth: 700,
                    marginBottom: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a2e6e, #2a4a9e)',
                        borderRadius: 12,
                        padding: '18px 24px',
                        color: 'white',
                        boxShadow: '0 4px 16px rgba(26,46,110,0.2)',
                    }}>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                            📸 Struktur Organisasi — BAB V
                        </div>
                        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16, lineHeight: 1.5 }}>
                            Upload foto/gambar struktur organisasi Anda. Gambar akan tampil di preview dan ikut tersimpan saat ekspor ke Word/PDF.
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {/* Upload Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 20px',
                                    background: '#ffffff',
                                    color: '#1a2e6e',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                🖼️ {imageBase64 ? 'Ganti Gambar' : 'Pilih Gambar'}
                            </button>

                            {/* Remove Button */}
                            {imageBase64 && (
                                <button
                                    onClick={handleRemove}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'rgba(255,255,255,0.15)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.4)',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,80,80,0.4)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                >
                                    🗑️ Hapus Gambar
                                </button>
                            )}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 10 }}>
                            Format: JPG, PNG, WEBP · Maks: 8MB · Disarankan: format landscape
                        </div>
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
            {imageBase64 ? (
                <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <img
                        id="bab5-org-chart-render"
                        src={imageBase64}
                        alt="Struktur Organisasi Kantor Imigrasi Kelas II TPI Pematang Siantar"
                        style={{
                            width: '100%',
                            maxWidth: editMode ? 1000 : '100%',
                            height: 'auto',
                            objectFit: 'contain',
                            display: 'block',
                            borderRadius: editMode ? 8 : 0,
                            boxShadow: editMode ? '0 4px 24px rgba(0,0,0,0.12)' : 'none',
                        }}
                    />
                </div>
            ) : (
                /* Placeholder when no image */
                <div style={{
                    width: '100%',
                    maxWidth: 700,
                    minHeight: 260,
                    border: '2.5px dashed #c8d0e0',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 14,
                    background: '#f8f9fb',
                    color: '#94a3b8',
                    cursor: editMode ? 'pointer' : 'default',
                    padding: 32,
                }}
                onClick={editMode ? () => fileInputRef.current?.click() : undefined}
                >
                    <div style={{ fontSize: 52 }}>🗂️</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#64748b' }}>
                        Belum ada gambar Struktur Organisasi
                    </div>
                    {editMode && (
                        <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                            Klik area ini atau tombol "Pilih Gambar" di atas<br/>
                            untuk mengupload foto struktur organisasi Anda
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Bab5OrgChart;
