import { useState, useEffect, useRef } from 'react';
import { useReport } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';

const TableOfContents = () => {
    const { reportData, updateSection } = useReport();
    const { showNotification } = useNotification();
    const contentRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);

    // Default TOC data structure matching the image exactly
    const defaultTocData = [
        { id: 'bab1', text: 'BAB I PENDAHULUAN', page: 5, level: 0, bold: true },
        { id: 'a_pengantar', text: 'A.PENGANTAR', page: 5, level: 1 },
        { id: 'a1', text: '1.Gambaran Umum Kantor Imigrasi Kelas II TPI Pematang Siantar', page: 5, level: 2 },
        { id: 'a2', text: '2.Wilayah Kerja Kantor Imigrasi Kelas II TPI Pematang Siantar', page: 5, level: 2 },
        { id: 'a3', text: '3.Pelaksanaan Tugas', page: 7, level: 2 },
        { id: 'b_dasar', text: 'B.DASAR HUKUM', page: 7, level: 1 },
        { id: 'c_ruang', text: 'C.RUANG LINGKUP', page: 8, level: 1 },
        { id: 'bab2', text: 'BAB II PELAKSANAAN TUGAS', page: 9, level: 0, bold: true },
        { id: 'a_substantif', text: 'A.BIDANG SUBSTANTIF', page: 9, level: 1 },
        { id: '1_penerbitan', text: '1.PENERBITAN DOKUMEN PERJALANAN REPUBLIK INDONESIA', page: 9, level: 2 },
        { id: '1a', text: 'a.Paspor 48 Hal pada Kantor Imigrasi Kelas II TPI Pematang Siantar', page: 9, level: 3 },
        { id: '1b', text: 'b.Paspor 48 Hal pada Unit Layanan Paspor (ULP) Tebing Tinggi', page: 9, level: 3 },
        { id: '1c', text: 'c.Paspor 48 Hal pada Unit Kerja Kantor (UKK) Dolok Sanggul', page: 10, level: 3 },
        { id: '1d', text: 'd.Paspor 24 hal pada Kantor Imigrasi Kelas II TPI Pematang Siantar', page: 10, level: 3 },
        { id: '1e', text: 'e.Paspor 24 hal pada Unit Layanan Paspor (ULP) Tebing Tinggi', page: 11, level: 3 },
        { id: '1f', text: 'f.Paspor 24 hal pada Unit Kerja Kantor (UKK) Dolok Sanggul', page: 11, level: 3 },
        { id: '1g', text: 'g.Pas Lintas Batas (PLB)', page: 12, level: 3 },
        { id: '1h', text: 'h.Surat Perjalanan Laksana Paspor (SPLP)', page: 12, level: 3 },
        { id: '2_izin', text: '2.PENERBITAN IZIN TINGGAL', page: 13, level: 2 },
        { id: '2a', text: 'a.Izin Kunjungan (ITK)', page: 13, level: 3 },
        { id: '2b', text: 'b.Izin Tinggal Terbatas (ITAS)', page: 13, level: 3 },
        { id: '2c', text: 'c.Izin Tinggal Tetap (ITAP)', page: 14, level: 3 },
        { id: '2d', text: 'd.Lain-lain', page: 14, level: 3 },
        { id: '3_rekap', text: '3.REKAPITULASI DATA PERLINTASAN', page: 15, level: 2 },
        { id: '4_intel', text: '4.INTELIJEN DAN PENINDAKAN KEIMIGRASIAN', page: 16, level: 2 },
        { id: '4a', text: 'a.Projustisia', page: 16, level: 3 },
        { id: '4b', text: 'b.Tindakan Administratif Keimigrasian', page: 16, level: 3 },
        { id: '4c', text: 'c.Timpora', page: 17, level: 3 },
        { id: '5_info', text: '5.INFORMASI DAN KOMUNIKASI', page: 18, level: 2 },
        { id: '6_pengaduan', text: '6.PENGADUAN MASYARAKAT', page: 18, level: 2 },
        { id: 'b_fasilitatif', text: 'B.BIDANG FASILITATIF', page: 19, level: 1 },
        { id: '1_keuangan', text: '1.URUSAN KEUANGAN', page: 19, level: 2 },
        { id: '1_realisasi', text: '1.Laporan Realisasi Penyerapan Anggaran (Berdasarkan Jenis Belanja)', page: 19, level: 3 },
        { id: '1_rm', text: 'a.Rupiah Murni (RM)', page: 19, level: 4 },
        { id: '1_pnp', text: 'b.Pendapatan Non Pajak (PNP)', page: 19, level: 4 },
        { id: '1_gabung', text: 'c.Rupiah Murni + PNBP', page: 19, level: 4 },
        { id: '2_pnbp', text: '2.Laporan Penerimaan Negara Bukan Pajak (PNBP)', page: 20, level: 3 },
        { id: '2_kepeg', text: '2.URUSAN KEPEGAWAIAN', page: 24, level: 2 },
        { id: '2k_1', text: '1.Laporan Bazetting Pegawai', page: 24, level: 3 },
        { id: '2k_2', text: '2.Rekapitulasi Pegawai', page: 29, level: 3 },
        { id: '2k_3', text: '3.Data Cuti Pegawai', page: 29, level: 3 },
        { id: '2k_4', text: '4.Pembinaan Pegawai', page: 29, level: 3 },
        { id: '2k_5', text: '5.Tata Usaha (Persuratan)', page: 29, level: 3 },
        { id: '3_umum', text: '3.URUSAN UMUM', page: 30, level: 2 },
        { id: '3u_a', text: 'a.Kendaraan Operasional', page: 30, level: 3 },
        { id: '3u_b', text: 'b.Sarana dan Prasarana', page: 30, level: 3 },
        { id: '3u_c', text: 'c.Gedung dan Bangunan', page: 31, level: 3 },
        { id: 'bab4', text: 'BAB IV PENUTUP', page: 33, level: 0, bold: true },
        { id: 'a_saran', text: 'A.Saran', page: 33, level: 1 },
        { id: 's1', text: '1.Urusan Kepegawaian', page: 33, level: 2 },
        { id: 's2', text: '2.Urusan keuangan', page: 33, level: 2 },
        { id: 'b_kesimpulan', text: 'B.Kesimpulan', page: 33, level: 1 },
        { id: 'bab5', text: 'BAB V LAMPIRAN STRUKTUR ORGANISASI KANTOR IMIGRASI KELAS II TPI PEMATAN SIANTAR', page: 34, level: 0, bold: true },
    ];

    const [tocData, setTocData] = useState(defaultTocData);

    // Load from context on mount
    useEffect(() => {
        if (reportData?.['toc_data']) {
            try {
                const parsed = JSON.parse(reportData['toc_data']);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTocData(parsed);
                }
            } catch (e) {
                // Use default if parse fails
            }
        }
    }, [reportData]);

    const handleSave = async () => {
        setIsSaving(true);
        // Save both JSON data and HTML representation
        await updateSection('toc_data', JSON.stringify(tocData));
        await updateSection('toc', generateHtmlContent());
        setIsSaving(false);
        showNotification('Daftar Isi tersimpan', 'success');
    };

    // Generate HTML content for preview/export
    const generateHtmlContent = () => {
        let html = '<div style="font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.15;">';
        html += '<p style="text-align: center; font-weight: bold; margin-bottom: 12pt;">DAFTAR ISI</p>';

        tocData.forEach(item => {
            const indent = item.level * 20;
            const dots = '.'.repeat(Math.max(5, 80 - item.text.length - indent / 4));
            const fontWeight = item.bold ? 'bold' : 'normal';
            html += `<p style="margin: 0; padding-left: ${indent}px; font-weight: ${fontWeight};">${item.text}${dots}${item.page}</p>`;
        });

        html += '</div>';
        return html;
    };

    const updateItem = (index, field, value) => {
        const newData = [...tocData];
        newData[index] = { ...newData[index], [field]: field === 'page' ? parseInt(value) || 0 : value };
        setTocData(newData);
    };

    const addItem = (afterIndex) => {
        const newData = [...tocData];
        const prevItem = newData[afterIndex];
        newData.splice(afterIndex + 1, 0, {
            id: `new_${Date.now()}`,
            text: 'Item Baru',
            page: prevItem?.page || 1,
            level: prevItem?.level || 0
        });
        setTocData(newData);
    };

    const removeItem = (index) => {
        if (tocData.length <= 1) return;
        const newData = tocData.filter((_, i) => i !== index);
        setTocData(newData);
    };

    const moveItem = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === tocData.length - 1)) return;
        const newData = [...tocData];
        const temp = newData[index];
        newData[index] = newData[index + direction];
        newData[index + direction] = temp;
        setTocData(newData);
    };

    const getIndentClass = (level) => {
        const indents = ['pl-0', 'pl-5', 'pl-10', 'pl-16', 'pl-20'];
        return indents[level] || 'pl-0';
    };

    return (
        <div className="h-full flex flex-col bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-bold text-imigrasi-navy">Editor Daftar Isi</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setTocData(defaultTocData)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                        Reset Default
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-imigrasi-navy text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-900 disabled:opacity-50"
                    >
                        {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div>}
                        Simpan
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Editor Panel */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                            <p className="text-sm text-gray-600">Klik teks atau nomor halaman untuk mengedit. Gunakan tombol untuk menambah, hapus, atau memindahkan item.</p>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {tocData.map((item, index) => (
                                <div key={item.id} className={`flex items-center gap-2 py-2 px-4 hover:bg-gray-50 group ${getIndentClass(item.level)}`}>
                                    {/* Level buttons */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => updateItem(index, 'level', Math.max(0, item.level - 1))}
                                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                            title="Kurangi indent"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <button
                                            onClick={() => updateItem(index, 'level', Math.min(4, item.level + 1))}
                                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                            title="Tambah indent"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>

                                    {/* Bold toggle */}
                                    <button
                                        onClick={() => updateItem(index, 'bold', !item.bold)}
                                        className={`p-1 rounded ${item.bold ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`}
                                        title="Bold"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg>
                                    </button>

                                    {/* Text input */}
                                    <input
                                        type="text"
                                        value={item.text}
                                        onChange={(e) => updateItem(index, 'text', e.target.value)}
                                        className={`flex-1 px-2 py-1 border-0 bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded text-sm ${item.bold ? 'font-bold' : ''}`}
                                        style={{ fontFamily: 'Times New Roman, serif' }}
                                    />

                                    {/* Dots visual */}
                                    <span className="text-gray-300 text-xs tracking-widest hidden md:inline">{'.'}</span>

                                    {/* Page number */}
                                    <input
                                        type="number"
                                        value={item.page}
                                        onChange={(e) => updateItem(index, 'page', e.target.value)}
                                        className="w-12 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-2 focus:ring-blue-500"
                                        min="1"
                                    />

                                    {/* Action buttons */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveItem(index, -1)} className="p-1 text-gray-400 hover:text-blue-600" title="Pindah ke atas">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                        </button>
                                        <button onClick={() => moveItem(index, 1)} className="p-1 text-gray-400 hover:text-blue-600" title="Pindah ke bawah">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        <button onClick={() => addItem(index)} className="p-1 text-gray-400 hover:text-green-600" title="Tambah item">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        </button>
                                        <button onClick={() => removeItem(index)} className="p-1 text-gray-400 hover:text-red-600" title="Hapus item">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="w-[400px] border-l border-gray-200 bg-gray-200 overflow-y-auto p-6 hidden lg:block">
                    <div className="bg-white shadow-lg p-8 min-h-[500px]" style={{ fontFamily: 'Times New Roman, serif', fontSize: '10pt', lineHeight: '1.15' }}>
                        <h3 className="text-center font-bold mb-4" style={{ fontSize: '12pt' }}>DAFTAR ISI</h3>
                        <div ref={contentRef}>
                            {tocData.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="flex items-baseline"
                                    style={{
                                        paddingLeft: `${item.level * 15}px`,
                                        fontWeight: item.bold ? 'bold' : 'normal',
                                        marginBottom: '0px',
                                        fontSize: '9pt'
                                    }}
                                >
                                    <span className="flex-shrink-0">{item.text}</span>
                                    <span className="flex-1 border-b border-dotted border-gray-400 mx-1" style={{ marginBottom: '3px' }}></span>
                                    <span className="flex-shrink-0">{item.page}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TableOfContents;
