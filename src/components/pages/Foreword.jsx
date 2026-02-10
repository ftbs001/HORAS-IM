import { useState, useEffect } from 'react';
import { useReport } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';

const Foreword = () => {
    const { forewordData, updateForeword } = useReport();
    const { showNotification } = useNotification();

    // Default content from the image
    const defaultContent = `Puji Syukur kami panjatkan kepada Tuhan Yang Maha Esa sehingga Laporan bulanan ini dapat selesai tepat pada waktunya. Ucapan terima kasih juga kami sampaikan kepada semua pihak yang telah membantu dalam penyajian dan penyusunan laporan bulanan ini sehingga laporan bulanan ini dapat disajikan sesuai dengan lengkap dan benar.

Kantor Imigrasi Kelas II TPI Pematang Siantar adalah salah satu unit pelaksana teknis di bidang keimigrasian yang berada di bawah Kantor Wilayah Kementerian Hukum dan Hak Asasi Manusia Sumatera Utara yang memiliki kewajiban menyusun Laporan Bulanan yang berisi seluruh kegiatan yang telah dilaksanakan dan kendala yang dialami oleh seluruh seksi dan bagian yang ada selama satu periode. Sebagai bentuk pertanggung jawaban segala bentuk kegiatan yang telah dilaksanakan maka disusunlah Laporan bulanan ini sebagai laporan kepada Kepala Kantor Wilayah Kementerian Hukum dan HAM Sumatera Utara.

Laporan ini diharapkan dapat memberikan informasi yang berguna kepada para pemakai laporan khususnya sebagai sarana untuk meningkatkan kinerja, akuntabilitas / pertanggung jawaban dan transparansi pelaksanaan tugas pokok dan fungsi Kantor Imigrasi Kelas II TPI Pematang Siantar. Disamping itu, laporan bulanan ini juga dimaksudkan untuk memberikan informasi manajemen dalam pengambilan keputusan dalam usaha untuk mewujudkan tata kelola pemerintahan yang baik (good government).`;

    // Local state for editing
    const [content, setContent] = useState(defaultContent);
    const [isSaving, setIsSaving] = useState(false);

    // Load data from context when component mounts
    useEffect(() => {
        if (forewordData && forewordData.content) {
            setContent(forewordData.content);
        }
    }, [forewordData]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateForeword({ content });
        setIsSaving(false);

        if (result?.error) {
            showNotification('Gagal menyimpan kata pengantar', 'error');
        } else {
            showNotification('Kata pengantar tersimpan', 'success');
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header dengan tombol simpan */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-bold text-imigrasi-navy">KATA PENGANTAR</h2>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-imigrasi-navy text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-900 disabled:opacity-50"
                    >
                        {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div>}
                        Simpan
                    </button>
                </div>

                {/* Konten Kata Pengantar */}
                <div className="p-12 bg-white" style={{ fontFamily: 'Times New Roman, serif' }}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none resize-y leading-relaxed"
                        style={{
                            fontFamily: 'Times New Roman, serif',
                            fontSize: '12pt',
                            textAlign: 'justify',
                            lineHeight: '1.8'
                        }}
                    />
                </div>

                {/* Footer info */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                    Kata pengantar ini akan muncul setelah halaman judul
                </div>
            </div>

            {/* Preview Hint */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <strong>Tip:</strong> Gunakan tombol "Preview" untuk melihat bagaimana kata pengantar ini akan muncul di laporan lengkap.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Foreword;
