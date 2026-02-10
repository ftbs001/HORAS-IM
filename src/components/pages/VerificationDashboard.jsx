import { useState } from 'react';

const VerificationDashboard = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reviewNote, setReviewNote] = useState('');

    // Mock Data State
    const [documents, setDocuments] = useState([
        { id: 1, type: 'Laporan Bulanan', title: 'Laporan Kinerja Januari 2026', author: 'Seksi Lalintalkim', date: '08 Jan 2026', status: 'pending', priority: 'High', targetView: 'policy-brief' },
        { id: 2, type: 'Program Kerja', title: 'Operasi Gabungan TPI 2026', author: 'Seksi Inteldakim', date: '09 Jan 2026', status: 'pending', priority: 'Medium', targetView: 'work-program-input' },
        { id: 3, type: 'Anggaran', title: 'Revisi Pagu DIPA 2026', author: 'Subbag Tata Usaha', date: '10 Jan 2026', status: 'approved', priority: 'High', targetView: 'section-data' },
        { id: 4, type: 'Program Kerja', title: 'Pemeliharaan Server Simkim', author: 'Seksi Tikim', date: '09 Jan 2026', status: 'revision', priority: 'Low', targetView: 'work-program-input' },
    ]);

    const handleOpenReview = (doc) => {
        setSelectedDocument(doc);
        setReviewNote('');
        setIsModalOpen(true);
    };

    const handleOpenDocument = (viewName) => {
        // If onNavigate is provided, use it. Default to policy-brief if viewName is generic
        if (onNavigate) {
            onNavigate(viewName || 'policy-brief');
        } else {
            alert("Navigasi tidak tersedia di mode preview.");
        }
    };

    const handleAction = (status, note = '') => {
        if (!selectedDocument) return;

        const updatedDocs = documents.map(doc =>
            doc.id === selectedDocument.id
                ? { ...doc, status: status, note: note, lastUpdated: new Date().toLocaleDateString('id-ID') }
                : doc
        );

        setDocuments(updatedDocs);
        setIsModalOpen(false);
        // Optional: Show toast notification here
        alert(`Dokumen berhasil di-${status === 'approved' ? 'setujui' : status === 'revision' ? 'kembalikan untuk revisi' : 'tolak'}.`);
    };

    const filteredDocs = documents.filter(doc => doc.status === activeTab);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-200">Menunggu Review</span>;
            case 'approved': return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold border border-green-200">Disetujui</span>;
            case 'revision': return <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold border border-orange-200">Perlu Revisi</span>;
            case 'rejected': return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold border border-red-200">Ditolak</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-imigrasi-navy font-serif">Verifikasi & Persetujuan</h2>
                    <p className="text-gray-500 mt-1">Pusat kendali validasi dokumen dan program kerja.</p>
                </div>
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    {['pending', 'revision', 'approved', 'rejected'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 capitalize ${activeTab === tab ? 'bg-imigrasi-navy text-white shadow-md' : 'text-gray-500 hover:text-imigrasi-navy hover:bg-gray-50'}`}
                        >
                            {tab === 'pending' ? 'Perlu Tinjauan' : tab === 'revision' ? 'Revisi' : tab === 'approved' ? 'Selesai' : 'Ditolak'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Smart Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[#f8fafc] border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dokumen</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pengaju</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Prioritas</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Aksi Profesional</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredDocs.length > 0 ? (
                            filteredDocs.map((doc) => (
                                <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-imigrasi-blue group-hover:shadow-sm transition-all">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 group-hover:text-imigrasi-navy transition-colors">{doc.title}</p>
                                                <p className="text-xs text-gray-500">{doc.type} • {doc.date}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-imigrasi-gold/20 flex items-center justify-center text-xs font-bold text-imigrasi-gold">
                                                {doc.author.charAt(0)}
                                            </div>
                                            <span className="text-sm text-gray-600 font-medium">{doc.author}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${doc.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : doc.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                            {doc.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(doc.status)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Action Buttons - Context aware */}
                                            {doc.status === 'pending' || doc.status === 'revision' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenReview(doc)}
                                                        className="p-2 text-white bg-imigrasi-navy rounded-lg hover:bg-blue-900 shadow-sm hover:shadow-md transition-all transform hover:scale-105 tooltip-trigger"
                                                        title="Tinjau & Verifikasi"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleOpenDocument(doc.targetView)}
                                                    className="p-2 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                    title="Lihat Detail Dokumen"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                        </div>
                                        <p className="font-medium">Tidak ada dokumen pada status ini</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Smart Review Modal */}
            {isModalOpen && selectedDocument && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-imigrasi-navy">Tinjauan Dokumen</h3>
                                <p className="text-sm text-gray-500">ID: #{selectedDocument.id} • {selectedDocument.title}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Content - Split View */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Left: Document Actions */}
                            <div className="flex-1 bg-gray-100 p-8 overflow-y-auto border-r border-gray-200 flex flex-col items-center justify-center">
                                <div className="bg-white shadow-xl border border-gray-200 p-8 rounded-2xl max-w-sm w-full text-center">
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-imigrasi-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 mb-2">{selectedDocument.title}</h4>
                                    <p className="text-sm text-gray-500 mb-6">Dokumen ini siap untuk ditinjau. Silakan buka editor lengkap untuk membaca isi secara mendetail.</p>

                                    <button
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            handleOpenDocument(selectedDocument.targetView);
                                        }}
                                        className="w-full py-3 bg-white border-2 border-imigrasi-blue text-imigrasi-blue font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 group"
                                    >
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        Buka Naskah Asli
                                    </button>
                                </div>
                            </div>

                            {/* Right: Validation Controls */}
                            <div className="w-full md:w-96 bg-white p-6 flex flex-col justify-between overflow-y-auto">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-2">Checklist Verifikasi</h4>
                                        <div className="space-y-2">
                                            {['Kelengkapan Data', 'Format Standar', 'Validasi Konten'].map((item, idx) => (
                                                <label key={idx} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                                                    <input type="checkbox" className="w-4 h-4 text-imigrasi-blue rounded border-gray-300 focus:ring-imigrasi-blue" />
                                                    {item}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-2">Catatan Reviewer</h4>
                                        <textarea
                                            value={reviewNote}
                                            onChange={(e) => setReviewNote(e.target.value)}
                                            placeholder="Tuliskan catatan revisi atau persetujuan di sini..."
                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-imigrasi-blue/20 outline-none h-32 resize-none"
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-gray-100 mt-auto">
                                    <button
                                        onClick={() => handleAction('approved', reviewNote)}
                                        className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Setujui & Tanda Tangan
                                    </button>
                                    <button
                                        onClick={() => handleAction('revision', reviewNote)}
                                        className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Minta Revisi
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerificationDashboard;
