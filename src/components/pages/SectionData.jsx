import { useState } from 'react';
import { useSection } from '../../contexts/SectionContext';
import { useNotification } from '../../contexts/NotificationContext';

const SectionData = ({ initialSectionFilter = null, onNavigate }) => {
    // State management
    const [selectedSection, setSelectedSection] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { sections: allSections, loading, updateSection } = useSection();
    const { showNotification } = useNotification();

    // Filter displayed sections - ensure ABSOLUTELY no duplicates using Map
    // Map guarantees unique keys (IDs)
    const uniqueSectionsMap = new Map();
    allSections.forEach(section => {
        if (!uniqueSectionsMap.has(section.id)) {
            uniqueSectionsMap.set(section.id, section);
        }
    });
    const uniqueSections = Array.from(uniqueSectionsMap.values());

    const sections = initialSectionFilter
        ? uniqueSections.filter(s => s.name.toLowerCase().includes(initialSectionFilter.toLowerCase())).slice(0, 1)
        : uniqueSections;



    const handleViewDetail = (section) => {
        setSelectedSection({ ...section }); // Clone to avoid direct ref mutation
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (section) => {
        setSelectedSection({ ...section });
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const result = await updateSection(selectedSection.id, selectedSection);
        if (result.success) {
            setIsModalOpen(false);
            showNotification('Data Seksi berhasil diperbarui! ✅', 'success');
        } else {
            showNotification('Gagal menyimpan data. Silakan coba lagi.', 'error');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSelectedSection(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header with Siantar/Batak Theme Accent */}
            <div className="relative bg-gradient-to-r from-imigrasi-navy to-[#1a2d4d] rounded-2xl p-8 overflow-hidden shadow-xl text-white">
                {/* Decorative Pattern (Gorga inspired simple shapes) */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-imigrasi-gold opacity-10 rounded-full translate-y-1/2 -translate-x-1/3"></div>

                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold font-serif mb-2">Data Organisasi & Seksi</h2>
                        <p className="text-blue-100 max-w-2xl text-sm leading-relaxed">
                            Informasi detail mengenai unit kerja di Kantor Imigrasi Kelas II TPI Pematang Siantar.
                            Pantau kinerja, jumlah personil, dan program kerja unggulan.
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <span className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg text-xs font-mono text-imigrasi-gold border border-white/20">
                            HORAS: Handal • Optimis • Responsif • Akuntabel • Sinergis
                        </span>
                    </div>
                </div>
            </div>

            {/* Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sections.map((section) => (
                    <div key={section.id} className="group bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                        {/* Hover Accent Top */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-imigrasi-navy to-imigrasi-gold transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>

                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-imigrasi-navy flex items-center justify-center transform group-hover:rotate-6 transition-transform">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={section.icon} /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-imigrasi-navy transition-colors">{section.name}</h3>
                                        <p className="text-xs text-imigrasi-gold font-bold uppercase tracking-wide">{section.alias}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="radial-progress text-imigrasi-blue text-xs font-bold" style={{ "--value": section.performance, "--size": "3rem" }}>{section.performance}%</div>
                                    <p className="text-[10px] text-gray-400 mt-1">Kinerja</p>
                                </div>
                            </div>

                            <p className="text-gray-600 text-sm leading-relaxed mb-6 border-l-2 border-gray-100 pl-4">
                                {section.description}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
                                <div className="text-center border-r border-gray-200">
                                    <span className="block text-2xl font-bold text-imigrasi-navy">{section.staff}</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">Personil</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-imigrasi-navy">{section.programs}</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">Program</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleViewDetail(section)}
                                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Pratinjau
                                </button>
                                <button
                                    onClick={() => handleEdit(section)}
                                    className="flex-1 py-2.5 rounded-lg bg-imigrasi-navy text-white hover:bg-blue-900 transition-colors shadow-sm flex items-center justify-center gap-2 font-bold text-sm"
                                    title="Edit Data Seksi"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Detail / Edit */}
            {isModalOpen && selectedSection && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-imigrasi-navy to-blue-900 px-8 py-6 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('/horas_logo.png')] bg-no-repeat bg-right-bottom opacity-10 bg-contain -mr-10 -mb-10"></div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold text-white font-serif">{isEditMode ? 'Edit Data Seksi' : selectedSection.name}</h3>
                                <p className="text-blue-200 text-sm mt-1">{isEditMode ? 'Perbarui informasi organisasi' : selectedSection.alias}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors z-20">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            {isEditMode ? (
                                // Edit Form
                                <form className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi Tugas & Fungsi</label>
                                        <textarea
                                            name="description"
                                            value={selectedSection.description}
                                            onChange={handleChange}
                                            rows="3"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                        ></textarea>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Personil</label>
                                            <input
                                                type="number"
                                                name="staff"
                                                value={selectedSection.staff}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Total Program Kerja</label>
                                            <input
                                                type="number"
                                                name="programs"
                                                value={selectedSection.programs}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Skor Kinerja (%)</label>
                                        <input
                                            type="range"
                                            name="performance"
                                            min="0" max="100"
                                            value={selectedSection.performance}
                                            onChange={handleChange}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="text-right text-sm font-bold text-imigrasi-blue mt-1">{selectedSection.performance}%</div>
                                    </div>
                                </form>
                            ) : (
                                // View Detail
                                <div className="space-y-6">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <h4 className="font-bold text-imigrasi-navy mb-2 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Tentang Seksi
                                        </h4>
                                        <p className="text-gray-700 leading-relaxed text-sm">{selectedSection.description}</p>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-4">Statistik Kinerja</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Realisasi Anggaran</span>
                                                    <span className="font-bold text-green-600">92%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Kepuasan Masyarakat</span>
                                                    <span className="font-bold text-blue-600">4.8/5.0</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <h4 className="font-bold text-gray-800 mb-2">Pejabat Struktural</h4>
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Nama Pejabat (Kasi)</p>
                                                <p className="text-xs text-gray-500">NIP. 198XXXXXXXXXXX</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Tutup
                            </button>
                            {isEditMode && (
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-imigrasi-navy text-white font-bold rounded-lg hover:bg-blue-900 shadow-md transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Simpan Perubahan
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionData;
