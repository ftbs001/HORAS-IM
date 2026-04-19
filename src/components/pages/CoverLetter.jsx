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
        letterhead6: 'Laman: pematangsiantar.imigrasi.go.id, Pos-el: kanim_pematangsiantar@imigrasi.go.id',
        // Cover letter fields
        nomor: 'WIM.2.IMI.4-PR.04.01-3291',
        tanggal: '19 Agustus 2025',
        sifat: 'Penting',
        lampiran: '1 (satu) berkas',
        hal: 'Laporan Kegiatan Bulan Juli 2025\npada Kantor Imigrasi Kelas II TPI Pematang Siantar',
        tujuan: 'Yth. Kepala Kantor Wilayah Sumatera Utara\nDirektorat Jenderal Imigrasi\ndi tempat',
        isi: 'Menindaklanjuti surat Sekretaris Direktorat Jenderal Imigrasi No.IMI.1-TI.03-3178 tanggal 27 Agustus 2018 tentang Penggunaan Aplikasi Laporan Bulanan Online, bersama ini dengan hormat kami kirimkan Laporan Kegiatan Bulan Maret 2026 pada Kantor Imigrasi Kelas II TPI Pematang Siantar.\n\nDemikian kami sampaikan, atas perkenan dan petunjuk lebih lanjut kami ucapkan terima kasih.',
        penandatangan: 'Benyamin Kali Patembal Harahap',
        tembusan: '1  Sekretaris Direktorat Jenderal Imigrasi\n   Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia.'
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

                    {/* Nomor, Sifat, Lampiran, Hal (and Tanggal inline) */}
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
                            {/* Date Field right aligned on the same row! */}
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
                        {/* Placeholder section left */}
                        <div className="flex items-end pb-[42px]">
                            <div className="font-bold text-gray-800 ml-12 px-2 py-1 bg-gray-100/50 rounded">${'{'}ttd_pengirim{'}'}</div>
                        </div>

                        {/* Signer section right */}
                        <div className="text-center w-[350px]">
                            <div className="mb-2">Kepala Kantor,</div>
                            
                            {/* BSrE Badge Mimic */}
                            <div className="flex items-center justify-center gap-3 my-2 px-3 py-2 w-max mx-auto translate-x-[-12px]">
                                <img src="/logo_kemenimipas.png" alt="Kemenimipas" className="w-[38px] h-[38px] object-contain" />
                                <div className="text-left leading-tight">
                                    <div className="font-bold text-[15px] tracking-wide text-gray-900 mb-[2px]">KEMENIMIPAS</div>
                                    <div className="text-[10px] text-gray-400 font-medium">Ditandatangani secara elektronik oleh:</div>
                                </div>
                            </div>

                            <div className="font-bold pt-2">
                                <input
                                    type="text"
                                    value={formData.penandatangan}
                                    onChange={(e) => handleChange('penandatangan', e.target.value)}
                                    className="text-center px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-imigrasi-blue/20 focus:outline-none"
                                    style={{ width: '100%' }}
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
