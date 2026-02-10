import { useState, useEffect } from 'react';
import { useReport } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';

const CoverPage = () => {
    const { coverPageData, updateCoverPage } = useReport();
    const { showNotification } = useNotification();

    // Local state for editing
    const [formData, setFormData] = useState({
        reportTitle: 'LAPORAN BULANAN',
        month: 'DESEMBER',
        year: '2025'
    });

    const [isSaving, setIsSaving] = useState(false);

    // Load data from context when component mounts
    useEffect(() => {
        if (coverPageData && Object.keys(coverPageData).length > 0) {
            setFormData(coverPageData);
        }
    }, [coverPageData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateCoverPage(formData);
        setIsSaving(false);

        if (result?.error) {
            showNotification('Gagal menyimpan halaman judul', 'error');
        } else {
            showNotification('Halaman judul tersimpan', 'success');
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header dengan tombol simpan */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-bold text-imigrasi-navy">HALAMAN JUDUL LAPORAN</h2>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-imigrasi-navy text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-900 disabled:opacity-50"
                    >
                        {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div>}
                        Simpan
                    </button>
                </div>

                {/* Konten Cover Page */}
                <div className="p-12 min-h-[900px] bg-white flex flex-col items-center justify-between" style={{ fontFamily: 'Times New Roman, serif' }}>
                    {/* Header - Office Name */}
                    <div className="w-full text-center">
                        <h1 className="text-xl font-bold" style={{ letterSpacing: '0.5px' }}>
                            KANTOR IMIGRASI KELAS II TPI<br />
                            PEMATANG SIANTAR
                        </h1>
                    </div>

                    {/* Middle Section - Title, Month, Year */}
                    <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                        {/* Report Title */}
                        <div className="mb-6">
                            <label className="block text-xs text-gray-500 mb-2 text-center">Judul Laporan</label>
                            <input
                                type="text"
                                value={formData.reportTitle}
                                onChange={(e) => handleChange('reportTitle', e.target.value)}
                                className="text-center text-lg px-4 py-2 border-2 border-blue-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                                style={{ color: '#1a3a52', fontWeight: 'normal', width: '400px' }}
                            />
                        </div>

                        {/* Month */}
                        <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-2 text-center">Bulan</label>
                            <input
                                type="text"
                                value={formData.month}
                                onChange={(e) => handleChange('month', e.target.value.toUpperCase())}
                                className="text-center text-base font-bold px-4 py-2 border-2 border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                                style={{ width: '200px' }}
                            />
                        </div>

                        {/* Year */}
                        <div className="mb-12">
                            <label className="block text-xs text-gray-500 mb-2 text-center">Tahun</label>
                            <input
                                type="text"
                                value={formData.year}
                                onChange={(e) => handleChange('year', e.target.value)}
                                className="text-center text-base font-bold px-4 py-2 border-2 border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                                style={{ width: '150px' }}
                            />
                        </div>

                        {/* Logos */}
                        <div className="flex items-center justify-center mb-16">
                            <img
                                src="/src/assets/logos-combined.png"
                                alt="Logo Kementerian dan Direktorat Jenderal Imigrasi"
                                className="object-contain"
                                style={{ height: '120px' }}
                            />
                        </div>
                    </div>

                    {/* Footer - Ministry Info */}
                    <div className="w-full text-center" style={{ lineHeight: '1.6' }}>
                        <div className="text-sm font-bold">
                            KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN<br />
                            REPUBLIK INDONESIA<br />
                            DIREKTORAT JENDERAL IMIGRASI<br />
                            2025
                        </div>
                    </div>
                </div>

                {/* Footer info */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                    Halaman judul ini akan muncul setelah surat pengantar
                </div>
            </div>

            {/* Preview Hint */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <strong>Tip:</strong> Halaman judul akan muncul di antara surat pengantar dan BAB I. Gunakan tombol "Preview" untuk melihat hasilnya.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoverPage;
