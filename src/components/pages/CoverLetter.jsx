import { useState, useEffect, useRef } from 'react';
import { useReport } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabaseClient';
import KopSurat from '../common/KopSurat';
import BsreBadge from '../common/BsreBadge';

const CoverLetter = () => {
    const { coverLetterData, updateCoverLetter } = useReport();
    const { showNotification } = useNotification();

    const [formData, setFormData] = useState({
        letterhead1: 'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA',
        letterhead2: 'DIREKTORAT JENDERAL IMIGRASI',
        letterhead3: 'KANTOR WILAYAH SUMATERA UTARA',
        letterhead4: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR',
        letterhead5: 'Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun',
        letterhead6: 'Laman: pematangsiantar.imigrasi.go.id, Pos-el: kanim_pematangsiantar@imigrasi.go.id',
        nomor: 'WIM.2.IMI.4-PR.04.01-3291',
        tanggal: '19 Agustus 2025',
        sifat: 'Penting',
        lampiran: '1 (satu) berkas',
        hal: 'Laporan Kegiatan Bulan Juli 2025\npada Kantor Imigrasi Kelas II TPI Pematang Siantar',
        tujuan: 'Yth. Kepala Kantor Wilayah Sumatera Utara\nDirektorat Jenderal Imigrasi\ndi tempat',
        isi: 'Menindaklanjuti surat Sekretaris Direktorat Jenderal Imigrasi No.IMI.1-TI.03-3178 tanggal 27 Agustus 2018 tentang Penggunaan Aplikasi Laporan Bulanan Online, bersama ini dengan hormat kami kirimkan Laporan Kegiatan Bulan Maret 2026 pada Kantor Imigrasi Kelas II TPI Pematang Siantar.\n\nDemikian kami sampaikan, atas perkenan dan petunjuk lebih lanjut kami ucapkan terima kasih.',
        penandatangan: 'Benyamin Kali Patembal Harahap',
        tembusan: '1  Sekretaris Direktorat Jenderal Imigrasi\n   Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia.',
        // Logo TTD — URL dari Supabase storage (diisi saat upload)
        esignLogoUrl: null,
    });

    const [isSaving, setIsSaving]       = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const hasLoadedRef = useRef(false);
    const logoInputRef = useRef(null);

    // Load data from context ONCE on mount
    useEffect(() => {
        if (hasLoadedRef.current) return;
        if (coverLetterData && Object.keys(coverLetterData).length > 0) {
            setFormData(prev => ({ ...prev, ...coverLetterData }));
            hasLoadedRef.current = true;
        }
    }, [coverLetterData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateCoverLetter(formData);
        setIsSaving(false);
        if (result?.error) {
            showNotification('Gagal menyimpan surat pengantar', 'error');
        } else {
            showNotification('Surat pengantar tersimpan', 'success');
        }
    };

    /* ── Logo TTD Upload ───────────────────────────────────── */
    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate
        if (!file.type.startsWith('image/')) {
            showNotification('File harus berupa gambar (PNG, JPG, dll)', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Ukuran gambar maksimal 5MB', 'error');
            return;
        }

        setLogoUploading(true);
        try {
            // Upload ke Supabase Storage (bucket: report-images)
            const ext      = file.name.split('.').pop();
            const filePath = `esign-logos/logo_ttd_${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('report-images')
                .upload(filePath, file, { upsert: true });
            if (upErr) throw upErr;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('report-images')
                .getPublicUrl(filePath);
            const publicUrl = urlData?.publicUrl;
            if (!publicUrl) throw new Error('Gagal mendapat URL gambar');

            // Save to formData and immediately persist
            const newData = { ...formData, esignLogoUrl: publicUrl };
            setFormData(newData);
            await updateCoverLetter(newData);
            showNotification('✅ Logo TTD berhasil diupload dan disimpan!', 'success');
        } catch (err) {
            console.error('Logo upload error:', err);
            showNotification('❌ Gagal upload logo: ' + err.message, 'error');
        } finally {
            setLogoUploading(false);
            if (logoInputRef.current) logoInputRef.current.value = '';
        }
    };

    const handleRemoveLogo = async () => {
        const newData = { ...formData, esignLogoUrl: null };
        setFormData(newData);
        await updateCoverLetter(newData);
        showNotification('Logo TTD dihapus, kembali ke logo default', 'info');
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-bold text-imigrasi-navy">SURAT PENGANTAR LAPORAN</h2>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-imigrasi-navy text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-900 disabled:opacity-50"
                    >
                        {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                        Simpan
                    </button>
                </div>

                {/* ── Logo TTD Upload Panel ─────────────────────────────── */}
                <div style={{
                    margin: '16px 24px',
                    padding: '16px 20px',
                    border: '2px dashed #94a3b8',
                    borderRadius: '12px',
                    background: '#f8fafc',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        {/* Preview area */}
                        <div style={{
                            width: '120px', height: '120px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            background: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}>
                            {formData.esignLogoUrl ? (
                                <img
                                    src={formData.esignLogoUrl}
                                    alt="Logo TTD"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <img
                                    src="/bsre_shield.png"
                                    alt="Logo TTD Default"
                                    style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                                />
                            )}
                        </div>

                        {/* Upload controls */}
                        <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e40af', marginBottom: '4px' }}>
                                🖼️ Logo Tanda Tangan Elektronik (BSrE)
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                                {formData.esignLogoUrl
                                    ? '✅ Logo kustom aktif — akan muncul di surat pengantar, penutup, dan ekspor Word.'
                                    : 'Menggunakan logo BSrE default. Upload logo Anda sendiri untuk tampilan yang persis sama dengan dokumen resmi.'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {/* Upload button */}
                                <label style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px',
                                    background: logoUploading ? '#94a3b8' : '#1e40af',
                                    color: '#fff', borderRadius: '8px',
                                    fontSize: '12px', fontWeight: 600,
                                    cursor: logoUploading ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.2s',
                                }}>
                                    {logoUploading
                                        ? <><span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full inline-block" /> Mengupload...</>
                                        : <>📤 Upload Logo TTD</>}
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleLogoUpload}
                                        disabled={logoUploading}
                                    />
                                </label>

                                {/* Remove button — only if custom logo exists */}
                                {formData.esignLogoUrl && (
                                    <button
                                        onClick={handleRemoveLogo}
                                        style={{
                                            padding: '8px 14px',
                                            background: '#fee2e2',
                                            color: '#dc2626',
                                            border: '1px solid #fca5a5',
                                            borderRadius: '8px',
                                            fontSize: '12px', fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        🗑️ Hapus, pakai default
                                    </button>
                                )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                                Format: PNG, JPG, WEBP • Maks 5MB • Disarankan rasio 1:1 atau landscape
                            </div>
                        </div>
                    </div>
                </div>

                {/* Konten Surat */}
                <div className="p-12 bg-white" style={{ fontFamily: 'Times New Roman, serif' }}>
                    <KopSurat
                        data={formData}
                        editable={true}
                        onChange={handleChange}
                    />

                    <div style={{ marginBottom: '16px' }} />

                    {/* Nomor, Sifat, Lampiran, Hal */}
                    <div className="grid grid-cols-[120px,1fr] gap-x-4 gap-y-2 mb-6 text-sm">
                        <div>Nomor</div>
                        <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 flex-1">
                                <span>:</span>
                                <input
                                    type="text"
                                    value={formData.nomor}
                                    onChange={(e) => handleChange('nomor', e.target.value)}
                                    className="w-[250px] px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                                />
                            </div>
                            <input
                                type="text"
                                value={formData.tanggal}
                                onChange={(e) => handleChange('tanggal', e.target.value)}
                                className="px-2 py-1 border border-transparent hover:border-gray-300 rounded focus:border-gray-300 focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none text-right font-medium"
                                style={{ width: '150px' }}
                            />
                        </div>

                        <div>Sifat</div>
                        <div className="flex items-center gap-2">
                            <span>:</span>
                            <input
                                type="text"
                                value={formData.sifat}
                                onChange={(e) => handleChange('sifat', e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                            />
                        </div>

                        <div>Lampiran</div>
                        <div className="flex items-center gap-2">
                            <span>:</span>
                            <input
                                type="text"
                                value={formData.lampiran}
                                onChange={(e) => handleChange('lampiran', e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                            />
                        </div>

                        <div>Hal</div>
                        <div className="flex items-center gap-2">
                            <span>:</span>
                            <textarea
                                value={formData.hal}
                                onChange={(e) => handleChange('hal', e.target.value)}
                                rows={2}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Tujuan */}
                    <div className="mb-8 text-sm whitespace-pre-line">
                        <textarea
                            value={formData.tujuan}
                            onChange={(e) => handleChange('tujuan', e.target.value)}
                            rows={3}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none resize-none"
                        />
                    </div>

                    {/* Isi Surat */}
                    <div className="mb-12 text-sm text-justify leading-relaxed whitespace-pre-line">
                        <textarea
                            value={formData.isi}
                            onChange={(e) => handleChange('isi', e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none resize-y"
                        />
                    </div>

                    {/* Tanda Tangan */}
                    <div className="flex justify-between text-sm mt-8">
                        <div className="flex items-end pb-[42px]">
                            <div className="font-bold text-gray-800 ml-12 px-2 py-1 bg-gray-100/50 rounded">${'{'}ttd_pengirim{'}'}</div>
                        </div>

                        <div className="text-center" style={{ width: '340px' }}>
                            <div className="mb-3" style={{ fontFamily: 'Times New Roman, serif', fontSize: '13px' }}>Kepala Kantor,</div>
                            {/* BSrE Badge — logo diupload user atau default */}
                            <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                                <BsreBadge
                                    width={300}
                                    logoSrc={formData.esignLogoUrl || null}
                                />
                            </div>
                            <div className="font-bold mt-3">
                                <input
                                    type="text"
                                    value={formData.penandatangan}
                                    onChange={(e) => handleChange('penandatangan', e.target.value)}
                                    className="text-center px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                                    style={{ width: '100%', fontFamily: 'Times New Roman, serif', fontWeight: 'bold', fontSize: '13px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tembusan */}
                    <div className="mt-8 text-sm">
                        <div className="font-bold mb-1">Tembusan :</div>
                        <textarea
                            value={formData.tembusan}
                            onChange={(e) => handleChange('tembusan', e.target.value)}
                            rows={3}
                            className="w-full pl-0 pr-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none resize-none whitespace-pre-wrap"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                    Surat pengantar ini akan muncul di awal laporan sebelum BAB I
                </div>
            </div>

            {/* Preview Hint */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <strong>Tip:</strong> Upload logo TTD Anda di panel di atas agar muncul persis seperti foto referensi. Logo yang diupload akan otomatis tampil di surat pengantar, BAB IV penutup, dan ekspor Word.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoverLetter;
