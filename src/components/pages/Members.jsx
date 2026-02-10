import { useState } from 'react';

const Members = () => {
    const [showAddForm, setShowAddForm] = useState(false);

    const members = [
        { id: 1, nip: '19850101 201001 1 001', name: 'Ari Dwiantoro', role: 'Administrator', section: 'Teknologi Informasi', status: 'Active' },
        { id: 2, nip: '19900202 201502 2 002', name: 'Siti Aminah', role: 'Staff', section: 'Lalintalkim', status: 'Active' },
        { id: 3, nip: '19880303 201403 1 003', name: 'Budi Santoso', role: 'Supervisor', section: 'Inteldakim', status: 'Active' },
    ];

    if (showAddForm) {
        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-w-3xl mx-auto">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-imigrasi-navy">Tambah Anggota Baru</h2>
                        <p className="text-sm text-gray-500">Daftarkan pegawai baru ke dalam sistem HORAS-IM.</p>
                    </div>
                    <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">NIP</label>
                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Dinas</label>
                            <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                            <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seksi / Bidang</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none bg-white">
                                <option>Lalintalkim</option>
                                <option>Inteldakim</option>
                                <option>Tikim</option>
                                <option>Tata Usaha</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Peran (Role)</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none bg-white">
                                <option>Staff</option>
                                <option>Supervisor</option>
                                <option>Administrator</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                        <button type="button" className="px-6 py-2.5 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 shadow-lg shadow-blue-900/20">Simpan Anggota</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-imigrasi-navy">Daftar Anggota</h2>
                    <p className="text-gray-500">Kelola data pegawai dan hak akses sistem.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-2.5 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Tambah Anggota
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">NIP</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Seksi</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {members.map((member) => (
                                <tr key={member.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{member.nip}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {member.name.charAt(0)}
                                        </div>
                                        {member.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{member.section}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${member.role === 'Administrator' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="flex items-center gap-1.5 text-green-600 font-medium text-xs">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        <button className="text-gray-400 hover:text-imigrasi-blue">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Members;
