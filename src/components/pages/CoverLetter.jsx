import { useState, useEffect } from 'react';
import { useReport } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';
import KopSurat from '../common/KopSurat';

const CoverLetter = () => {
    const { coverLetterData, updateCoverLetter } = useReport();
    const { showNotification } = useNotification();

    // Local state for editing
    const [formData, setFormData] = useState({
        // Letterhead fields — harus selalu cocok dengan letterheadConfig.js dan KopSurat.jsx DEFAULT_TEXT
        letterhead1: 'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA',
        letterhead2: 'DIREKTORAT JENDERAL IMIGRASI',
        letterhead3: 'KANTOR WILAYAH SUMATERA UTARA',
        letterhead4: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR',
        letterhead5: 'Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun',
        letterhead6: 'Laman: imigrasipematangsiantar.kemenkumham.go.id, Pos-el: knm.pematangsiantar@kemenkumham.go.id',
        // Cover letter fields
        nomor: 'WIM.2.IMI.4-PR.04.01-3291',
        tanggal: '19 Agustus 2025',
        sifat: 'Penting',
        lampiran: '1 (satu) berkas',
        hal: 'Laporan Kegiatan Bulan Juli 2025\npada Kantor Imigrasi Kelas II TPI Pematang Siantar',
        tujuan: 'Yth. Kepala Kantor Wilayah Sumatera Utara\nDirektorat Jenderal Imigrasi\ndi tempat',
        isi: 'Menindaklanjuti surat Sekretaris Direktorat Jenderal Imigrasi No.IMI-1.T1.03-3178 tanggal 27 Agustus 2018 tentang Penggunaan Aplikasi Laporan Bulanan Online, bersama ini dengan hormat kami kirimkan Laporan Kegiatan Bulan Juli 2025 pada Kantor Imigrasi Kelas II TPI Pematang Siantar.\n\nDemikian kami sampaikan, atas perhatian dan petunjuk lebih lanjut  kami ucapkan terima kasih.',
        penandatangan: 'Benyamin Kali Patembai Harahap'
    });

    const [isSaving, setIsSaving] = useState(false);

    // Load data from context when component mounts
    useEffect(() => {
        if (coverLetterData && Object.keys(coverLetterData).length > 0) {
            setFormData(coverLetterData);
        }
    }, [coverLetterData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
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

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header dengan tombol simpan */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-bold text-imigrasi-navy">SURAT PENGANTAR LAPORAN</h2>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-imigrasi-navy text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-900 disabled:opacity-50"
                    >
                        {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div>}
                        Simpan
                    </button>
                </div>

                {/* Konten Surat */}
                <div className="p-12 bg-white" style={{ fontFamily: 'Times New Roman, serif' }}>
                    {/* KOP SURAT — komponen global */}
                    <KopSurat
                        data={formData}
                        editable={true}
                        onChange={handleChange}
                    />

                    {/* Spacer setelah kop surat */}
                    <div style={{ marginBottom: '16px' }}></div>

                    {/* Tanggal (di kanan atas, setelah kop surat) */}
                    <div className="text-right mb-6 text-sm">
                        <input
                            type="text"
                            value={formData.tanggal}
                            onChange={(e) => handleChange('tanggal', e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none text-right"
                            style={{ width: '200px' }}
                        />
                    </div>

                    {/* Nomor, Sifat, Lampiran, Hal */}
                    <div className="grid grid-cols-[120px,1fr] gap-x-4 gap-y-2 mb-6 text-sm">
                        <div>Nomor</div>
                        <div className="flex items-center gap-2">
                            <span>:</span>
                            <input
                                type="text"
                                value={formData.nomor}
                                onChange={(e) => handleChange('nomor', e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
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
                    <div className="text-center text-sm">
                        <div className="mb-16">Kepala Kantor,</div>
                        <div className="font-bold mb-1">
                            <input
                                type="text"
                                value={formData.penandatangan}
                                onChange={(e) => handleChange('penandatangan', e.target.value)}
                                className="text-center px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                                style={{ width: '300px' }}
                            />
                        </div>
                    </div>

                    {/* Tembusan */}
                    <div className="mt-12 text-xs">
                        <div className="font-bold mb-1">Tembusan :</div>
                        <div className="pl-4">
                            1. Sekretaris Direktorat Jenderal Imigrasi<br />
                            Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia.
                        </div>
                    </div>
                </div>

                {/* Footer info */}
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
                        <strong>Tip:</strong> Klik tombol "Preview" di header untuk melihat bagaimana surat pengantar ini akan muncul di laporan lengkap. Surat ini akan otomatis disertakan saat ekspor ke Word.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoverLetter;
