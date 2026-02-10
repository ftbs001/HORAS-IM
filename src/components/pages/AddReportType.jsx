const AddReportType = () => {
    return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold text-imigrasi-navy">Tambah Jenis Laporan</h2>
                <p className="text-sm text-gray-500">Buat kategori laporan baru untuk digunakan oleh seksi.</p>
            </div>

            <form className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Jenis Laporan</label>
                    <input type="text" placeholder="Contoh: Laporan Harian Detensi" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode Laporan</label>
                    <input type="text" placeholder="Contoh: LHD-01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <textarea rows="4" placeholder="Jelaskan kegunaan laporan ini..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none resize-none"></textarea>
                </div>

                <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-imigrasi-blue rounded border-gray-300 focus:ring-imigrasi-blue" defaultChecked />
                        <span className="text-sm text-gray-700">Aktif (Dapat dipilih saat buat laporan)</span>
                    </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Batal</button>
                    <button className="px-6 py-2 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 font-medium transition-colors shadow-lg shadow-blue-900/20">
                        Simpan Jenis Baru
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddReportType;
