import DataTable from '../dashboard/DataTable';

const ReportHistory = () => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-imigrasi-navy">Riwayat Laporan</h2>
                    <p className="text-gray-500">Arsip lengkap semua laporan yang telah masuk ke sistem.</p>
                </div>
                <div className="flex gap-2">
                    <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-imigrasi-blue/20">
                        <option>Semua Tahun</option>
                        <option>2026</option>
                        <option>2025</option>
                    </select>
                    <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-imigrasi-blue/20">
                        <option>Semua Jenis</option>
                        <option>Bulanan</option>
                        <option>Tahunan</option>
                    </select>
                </div>
            </div>

            {/* Reusing the robust DataTable component */}
            <DataTable />
        </div>
    );
};

export default ReportHistory;
