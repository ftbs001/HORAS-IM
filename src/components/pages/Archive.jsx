const Archive = () => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Arsip Laporan & Export Center</h3>
                <p className="text-gray-500 max-w-md mb-6">Pusat penyimpanan laporan tahunan dan tempat untuk mengekspor data dalam format PDF atau Word.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                    <button className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-imigrasi-blue hover:bg-blue-50 transition-all group">
                        <svg className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        <div className="text-left">
                            <span className="block font-bold text-gray-700">Laporan Tahun 2025</span>
                            <span className="text-xs text-gray-500">PDF Document (2.4 MB)</span>
                        </div>
                    </button>
                    <button className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-imigrasi-blue hover:bg-blue-50 transition-all group">
                        <svg className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <div className="text-left">
                            <span className="block font-bold text-gray-700">Laporan Tahun 2025</span>
                            <span className="text-xs text-gray-500">Word Document (1.8 MB)</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Archive;
