import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotification } from '../../contexts/NotificationContext';

const DataTable = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const { showNotification } = useNotification();
    const itemsPerPage = 10;

    // Form state
    const initialFormState = {
        judul: '',
        jenis: 'Bulanan',
        lokasi: 'Pematangsiantar',
        tanggal: new Date().toISOString().split('T')[0]
    };
    const [formData, setFormData] = useState(initialFormState);

    // Fetch data from Supabase
    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        const { data: reports, error } = await supabase
            .from('master_reports')
            .select('*')
            .order('tanggal', { ascending: false });

        if (error) {
            console.error('Error fetching reports:', error);
            showNotification?.('Gagal memuat data', 'error');
        } else {
            setData(reports || []);
        }
        setLoading(false);
    };

    const handleAdd = async (e) => {
        e.preventDefault();

        const { error } = await supabase
            .from('master_reports')
            .insert([formData]);

        if (error) {
            console.error('Error adding report:', error);
            showNotification?.('Gagal menambah laporan', 'error');
        } else {
            showNotification?.('Laporan berhasil ditambahkan', 'success');
            setFormData(initialFormState);
            setShowAddModal(false);
            fetchReports();
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();

        const { error } = await supabase
            .from('master_reports')
            .update({
                judul: formData.judul,
                jenis: formData.jenis,
                lokasi: formData.lokasi,
                tanggal: formData.tanggal,
                updated_at: new Date().toISOString()
            })
            .eq('id', editingItem.id);

        if (error) {
            console.error('Error updating report:', error);
            showNotification?.('Gagal mengupdate laporan', 'error');
        } else {
            showNotification?.('Laporan berhasil diupdate', 'success');
            setShowEditModal(false);
            setEditingItem(null);
            setFormData(initialFormState);
            fetchReports();
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus laporan ini?')) return;

        const { error } = await supabase
            .from('master_reports')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting report:', error);
            showNotification?.('Gagal menghapus laporan', 'error');
        } else {
            showNotification?.('Laporan berhasil dihapus', 'success');
            fetchReports();
        }
    };

    const openEditModal = (item) => {
        console.log('Opening edit modal for item:', item);
        setEditingItem(item);
        setFormData({
            judul: item.judul,
            jenis: item.jenis,
            lokasi: item.lokasi,
            tanggal: item.tanggal
        });
        setShowEditModal(true);
        console.log('Edit modal should now be visible');
    };

    const filteredData = data.filter(item =>
        item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lokasi.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const convertToCSV = (objArray) => {
        const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
        let str = '';
        const header = Object.keys(array[0]).join(',');
        str += header + '\r\n';

        for (let i = 0; i < array.length; i++) {
            let line = '';
            for (const index in array[i]) {
                if (line !== '') line += ',';
                line += array[i][index];
            }
            str += line + '\r\n';
        }
        return str;
    };

    const handleExport = (type) => {
        if (type === 'Excel') {
            const csvData = convertToCSV(filteredData);
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "laporan_imigrasi.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showNotification?.('File CSV berhasil diunduh!', 'success');
        } else {
            showNotification?.(`Export to ${type} coming soon!`, 'info');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Modal Component
    const Modal = ({ show, onClose, title, children, onSubmit }) => {
        if (!show) return null;

        return (
            <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
                style={{ zIndex: 9999 }}
                onClick={(e) => {
                    // Close modal if clicking backdrop
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div
                    className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-imigrasi-navy">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            type="button"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <form onSubmit={onSubmit} className="p-6 space-y-4">
                        {children}
                    </form>
                </div>
            </div>
        );
    };

    const FormFields = () => (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Judul Laporan *</label>
                <input
                    type="text"
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Laporan *</label>
                <select
                    value={formData.jenis}
                    onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                    required
                >
                    <option value="Bulanan">Bulanan</option>
                    <option value="Pengawasan">Pengawasan</option>
                    <option value="Pelayanan">Pelayanan</option>
                    <option value="Izin Tinggal">Izin Tinggal</option>
                    <option value="Insidentil">Insidentil</option>
                    <option value="Harian">Harian</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi *</label>
                <input
                    type="text"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal *</label>
                <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                    required
                />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setFormData(initialFormState);
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    className="px-6 py-2 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 font-bold"
                >
                    Simpan
                </button>
            </div>
        </>
    );

    return (
        <>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Table Header */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-imigrasi-navy">Riwayat Laporan Terbaru</h3>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Add Button */}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-imigrasi-gold text-white rounded-lg hover:bg-yellow-600 font-medium text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Tambah Laporan
                        </button>

                        {/* Export Buttons */}
                        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                            <button
                                onClick={() => handleExport('Excel')}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Excel
                            </button>
                            <div className="w-px bg-gray-200 my-1"></div>
                            <button
                                onClick={() => handleExport('PDF')}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                PDF
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-imigrasi-blue/50 w-40 sm:w-60"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#f8fafc] border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">No</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Judul Laporan</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jenis</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lokasi</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">Memuat data...</td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">{startIndex + index + 1}</td>
                                        <td className="px-6 py-4 text-sm text-imigrasi-navy font-semibold group-hover:text-imigrasi-blue transition-colors">
                                            {item.judul}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                {item.jenis}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-1">
                                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            {item.lokasi}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(item.tanggal)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    className="p-1.5 text-imigrasi-blue hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title="Tinjau Laporan"
                                                    onClick={() => alert(`Meninjau laporan: ${item.judul}`)}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                <button
                                                    className="p-1.5 text-imigrasi-gold hover:text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                                                    title="Edit Laporan"
                                                    onClick={() => openEditModal(item)}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button
                                                    className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Hapus Laporan"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p>Tidak ada data yang ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <p className="text-xs text-gray-500">
                        Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredData.length)}</span> of <span className="font-medium">{filteredData.length}</span> entries
                    </p>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs font-medium border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Prev
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`px-3 py-1 text-xs font-medium border rounded transition-colors ${currentPage === i + 1
                                    ? 'bg-imigrasi-navy text-white border-imigrasi-navy'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-xs font-medium border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            <Modal
                show={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setFormData(initialFormState);
                }}
                title="Tambah Laporan Baru"
                onSubmit={handleAdd}
            >
                <FormFields />
            </Modal>

            {/* Edit Modal */}
            <Modal
                show={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                    setFormData(initialFormState);
                }}
                title="Edit Laporan"
                onSubmit={handleEdit}
            >
                <FormFields />
            </Modal>
        </>
    );
};

export default DataTable;
