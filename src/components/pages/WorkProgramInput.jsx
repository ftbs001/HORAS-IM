import { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useProgram } from '../../contexts/ProgramContext';

const WorkProgramInput = ({ initialMode = 'list' }) => {
    const { showNotification } = useNotification();
    const { programs, addProgram, updateProgram, deleteProgram } = useProgram();

    // State
    const [viewMode, setViewMode] = useState(initialMode); // 'list' or 'form'

    // ACTION STATES
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [progressModalOpen, setProgressModalOpen] = useState(false);
    const [progressUpdateData, setProgressUpdateData] = useState({ progress: 0, realization: 0 });

    // Form State
    const initialFormState = {
        year: '2026',
        section: 'Seksi Inteldakim',
        title: '',
        output: '',
        iku: '',
        target: '',
        date: '',
        budget: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    // Update view if prop changes
    useEffect(() => {
        if (initialMode) setViewMode(initialMode);
    }, [initialMode]);

    const handleViewChange = (mode) => {
        const modeName = mode === 'list' ? 'Daftar Program' : 'Input Program Baru';

        if (viewMode === mode && !isEditing) {
            showNotification(`Anda sudah berada di ${modeName}`, 'warning');
            return;
        }

        // Reset editing state if switching to list or fresh form
        if (mode === 'list') {
            setIsEditing(false);
            setFormData(initialFormState);
        } else if (mode === 'form' && !isEditing) {
            setFormData(initialFormState);
        }

        setViewMode(mode);
        showNotification(`Membuka ${modeName}`, 'info');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.title || !formData.budget) {
            showNotification('Mohon lengkapi Nama Program dan Anggaran', 'warning');
            return;
        }

        try {
            if (isEditing && selectedProgram) {
                // UPDATE EXISTING
                await updateProgram(selectedProgram.id, {
                    year: formData.year,
                    section: formData.section,
                    title: formData.title,
                    output: formData.output,
                    deadline: formData.date,
                    budget: parseInt(formData.budget),
                    iku: formData.iku,
                    target: formData.target
                });
                showNotification('Program berhasil diperbarui!', 'success');
            } else {
                // CREATE NEW
                await addProgram({
                    year: formData.year,
                    section: formData.section,
                    title: formData.title,
                    output: formData.output,
                    deadline: formData.date,
                    budget: parseInt(formData.budget),
                    iku: formData.iku,
                    target: formData.target,
                    status: 'Planned',
                    progress: 0,
                    realization: 0
                });
                showNotification('Program berhasil disimpan ke database!', 'success');
            }

            // Reset and Switch View
            setFormData(initialFormState);
            setIsEditing(false);
            setSelectedProgram(null);
            setViewMode('list');
        } catch (error) {
            showNotification('Gagal menyimpan program.', 'error');
            console.error(error);
        }
    };

    // --- ACTION HANDLERS ---

    const handleEdit = (program) => {
        setSelectedProgram(program);
        setFormData({
            year: program.year || '2026',
            section: program.section || 'Seksi Inteldakim',
            title: program.title || '',
            output: program.output || '',
            iku: program.iku || '',
            target: program.target || '',
            date: program.deadline || '',
            budget: program.budget || ''
        });
        setIsEditing(true);
        setViewMode('form');
        showNotification('Mode Edit diaktifkan', 'info');
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus program ini? Data yang dihapus tidak dapat dikembalikan.')) {
            try {
                await deleteProgram(id);
                showNotification('Program berhasil dihapus', 'success');
            } catch (error) {
                showNotification('Gagal menghapus program', 'error');
            }
        }
    };

    const handleDetail = (program) => {
        setSelectedProgram(program);
        setDetailModalOpen(true);
    };

    const handlePreview = (program) => {
        setSelectedProgram(program);
        setPreviewModalOpen(true);
    };

    const handleOpenProgressModal = (program) => {
        setSelectedProgram(program);
        setProgressUpdateData({
            progress: program.progress || 0,
            realization: program.realization || 0
        });
        setProgressModalOpen(true);
    };

    const handleUpdateProgress = async () => {
        try {
            await updateProgram(selectedProgram.id, {
                ...selectedProgram,
                progress: parseInt(progressUpdateData.progress),
                realization: parseInt(progressUpdateData.realization),
                status: parseInt(progressUpdateData.progress) === 100 ? 'Completed' : 'On Progress'
            });
            setProgressModalOpen(false);
            showNotification('Progres berhasil diperbarui', 'success');
        } catch (error) {
            showNotification('Gagal memperbarui progres', 'error');
        }
    };

    // Stats Logic (Using data from Context)
    const totalBudget = programs.reduce((acc, curr) => acc + curr.budget, 0);
    const totalRealization = programs.reduce((acc, curr) => acc + curr.realization, 0);
    const avgProgress = programs.reduce((acc, curr) => acc + curr.progress, 0) / (programs.length || 1);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'On Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* 1. Header & Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Intro Card */}
                <div className="md:col-span-4 bg-gradient-to-r from-imigrasi-navy to-blue-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h2 className="text-3xl font-bold font-serif mb-2">Manajemen Program Kerja</h2>
                            <p className="text-blue-100">Monitoring realisasi kinerja, anggaran, dan target operasional Kantor Imigrasi Pematang Siantar TA 2026.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleViewChange('list')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'list' ? 'bg-white text-imigrasi-navy shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            >
                                Daftar Program
                            </button>
                            <button
                                onClick={() => handleViewChange('form')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${viewMode === 'form' ? 'bg-imigrasi-gold text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                {isEditing ? 'Mode Edit' : 'Tambah Baru'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Simplified for brevity in Edit Mode, full in List Mode */}
                {viewMode === 'list' && (
                    <>
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Pagu Anggaran</div>
                            <div className="text-2xl font-bold text-imigrasi-navy">{formatCurrency(totalBudget)}</div>
                            <div className="text-xs text-gray-400 mt-1">Tahun Anggaran 2026</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Realisasi Penyerapan</div>
                            <div className="text-2xl font-bold text-imigrasi-gold">{formatCurrency(totalRealization)}</div>
                            <div className="text-xs text-green-600 mt-1 font-bold">{(totalRealization / (totalBudget || 1) * 100).toFixed(1)}% Terserap</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Rata-rata Progres</div>
                            <div className="flex items-center gap-4">
                                <div className="text-2xl font-bold text-blue-600">{avgProgress.toFixed(1)}%</div>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${avgProgress}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Kegiatan</div>
                            <div className="text-2xl font-bold text-gray-800">{programs.length} <span className="text-sm font-normal text-gray-500">Program</span></div>
                            <div className="flex gap-1 mt-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                <span className="text-[10px] text-gray-500">{programs.filter(p => p.status === 'Completed').length} Selesai</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 ml-2"></span>
                                <span className="text-[10px] text-gray-500">{programs.filter(p => p.status === 'On Progress').length} Berjalan</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 2. Content Area */}
            {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    {programs.map((program) => (
                        <div key={program.id} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 md:col-span-1 group flex flex-col">
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(program.status)}`}>
                                        {program.status}
                                    </span>
                                    {/* Action Buttons (Top Right) */}
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handlePreview(program)}
                                            className="p-1.5 text-gray-400 hover:text-imigrasi-blue hover:bg-blue-50 rounded-lg" title="Pratinjau"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleEdit(program)}
                                            className="p-1.5 text-gray-400 hover:text-imigrasi-gold hover:bg-yellow-50 rounded-lg" title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(program.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Hapus"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <span className="text-xs font-mono text-gray-400 flex items-center gap-1 mb-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Deadline: {program.deadline ? new Date(program.deadline).toLocaleDateString('id-ID') : '-'}
                                    </span>
                                    <h3
                                        className="text-lg font-bold text-gray-800 mb-2 group-hover:text-imigrasi-blue transition-colors cursor-pointer"
                                        onClick={() => handleDetail(program)}
                                    >
                                        {program.title}
                                    </h3>
                                    <p className="text-sm text-imigrasi-navy font-semibold flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        {program.section}
                                    </p>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs mb-1 font-medium">
                                        <span>Progress Fisik</span>
                                        <span className={program.progress === 100 ? 'text-green-600 font-bold' : 'text-blue-600'}>{program.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-1000 ${program.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${program.progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg mt-auto">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Target (IKU)</p>
                                        <p className="font-semibold text-gray-800 truncate" title={program.target}>{program.target || '-'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 font-bold uppercase">Anggaran</p>
                                        <p className="font-semibold text-imigrasi-navy">{formatCurrency(program.budget)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between gap-2 rounded-b-xl">
                                <button
                                    onClick={() => handleDetail(program)}
                                    className="text-gray-500 hover:text-imigrasi-blue text-sm font-medium px-3 py-1 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Detail
                                </button>
                                <button
                                    onClick={() => handleOpenProgressModal(program)}
                                    className="text-imigrasi-navy hover:text-blue-700 text-sm font-bold px-3 py-1 border border-imigrasi-navy rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    Update Progress
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // FORM INPUT VIEW (Connected to Context)
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in-up">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-imigrasi-navy">
                                {isEditing ? 'Mode Edit Program Kerja' : 'Input Rencana Program Kerja'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {isEditing ? 'Silakan perbarui data program yang dipilih.' : 'Silakan isi data rencana kegiatan untuk Tahun Anggaran berjalan.'}
                            </p>
                        </div>
                        <button onClick={() => handleViewChange('list')} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <form className="p-8 space-y-8" onSubmit={handleSubmit}>
                        {/* Section 1: Informasi Dasar */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <span className="bg-imigrasi-navy text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                Informasi Kegiatan
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Anggaran</label>
                                    <select
                                        name="year"
                                        value={formData.year}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none bg-white"
                                    >
                                        <option>2026</option>
                                        <option>2027</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Pelaksana (Seksi)</label>
                                    <select
                                        name="section"
                                        value={formData.section}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none bg-white"
                                    >
                                        <option value="Seksi Inteldakim">Seksi Inteldakim</option>
                                        <option value="Seksi Lalintalkim">Seksi Lalintalkim</option>
                                        <option value="Seksi Tikim">Seksi Tikim</option>
                                        <option value="Subbag Tata Usaha">Subbag Tata Usaha</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Program / Kegiatan <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: Optimalisasi Sistem Jaringan Imigrasi"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Detail Perencanaan */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <span className="bg-imigrasi-navy text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                Detail Perencanaan
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan / Output</label>
                                <textarea
                                    name="output"
                                    value={formData.output}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Apa hasil yang diharapkan dari kegiatan ini?"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none resize-none"
                                ></textarea>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Indikator Kinerja Utama (IKU)</label>
                                    <input
                                        type="text"
                                        name="iku"
                                        value={formData.iku}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: Jumlah pemohon terlayani"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Capaian</label>
                                    <input
                                        type="text"
                                        name="target"
                                        value={formData.target}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: 100%"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Waktu & Anggaran */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <span className="bg-imigrasi-navy text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                Waktu & Anggaran
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Pelaksanaan</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimasi Pagu Anggaran (Rp) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        name="budget"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-6 border-t border-gray-100 bg-gray-50/50 p-4 -mx-8 -mb-8">
                            <button type="button" onClick={() => handleViewChange('list')} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal / Kembali</button>
                            <div className="flex gap-3">
                                {!isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(initialFormState)}
                                        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Reset Form
                                    </button>
                                )}
                                <button type="submit" className="px-6 py-2.5 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 shadow-lg shadow-blue-900/20 font-bold">
                                    {isEditing ? 'Simpan Perubahan' : 'Simpan & Kirim'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* --- DETAIL MODAL --- */}
            {detailModalOpen && selectedProgram && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="bg-imigrasi-navy p-6 flex justify-between items-center text-white">
                            <h3 className="text-lg font-bold">Detail Program Kerja</h3>
                            <button onClick={() => setDetailModalOpen(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 mb-1">{selectedProgram.title}</h4>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(selectedProgram.status)}`}>
                                    {selectedProgram.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Seksi</p>
                                    <p className="font-medium text-imigrasi-navy">{selectedProgram.section}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Tahun</p>
                                    <p className="font-medium text-gray-800">{selectedProgram.year}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tujuan / Output</p>
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{selectedProgram.output || '-'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">IKU</p>
                                    <p className="text-sm font-semibold text-gray-800">{selectedProgram.iku || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Target</p>
                                    <p className="text-sm font-semibold text-gray-800">{selectedProgram.target || '-'}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Jadwal Pelaksanaan</p>
                                        <p className="font-medium text-gray-800">{selectedProgram.deadline ? new Date(selectedProgram.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Belum ditentukan'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Anggaran</p>
                                        <p className="text-xl font-bold text-imigrasi-gold">{formatCurrency(selectedProgram.budget)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 text-right">
                            <button
                                onClick={() => {
                                    setDetailModalOpen(false);
                                    handleEdit(selectedProgram);
                                }}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-bold text-sm mr-2"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setDetailModalOpen(false)}
                                className="px-4 py-2 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 font-bold text-sm"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PREVIEW MODAL (Document Look) --- */}
            {previewModalOpen && selectedProgram && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in h-[85vh] flex flex-col">
                        <div className="bg-gray-800 p-4 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <h3 className="text-sm font-bold uppercase tracking-wider">Pratinjau Dokumen</h3>
                            </div>
                            <button onClick={() => setPreviewModalOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors text-gray-300 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
                            {/* A4 Paper Simulation */}
                            <div className="bg-white shadow-lg mx-auto w-full max-w-[210mm] min-h-[297mm] p-[20mm] text-black">
                                <div className="border-b-4 border-black pb-4 mb-8 text-center">
                                    <h1 className="text-2xl font-bold font-serif uppercase mb-2">Lembar Rencana Program Kerja</h1>
                                    <h2 className="text-xl font-bold font-serif uppercase">Kantor Imigrasi Kelas II TPI Pematang Siantar</h2>
                                    <p className="text-sm mt-1">Tahun Anggaran {selectedProgram.year}</p>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">A. Identitas Program</h3>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-2 w-1/3 font-bold text-gray-600">Unit Pelaksana</td>
                                                <td className="py-2 w-2/3">: {selectedProgram.section}</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-2 font-bold text-gray-600">Judul Kegiatan</td>
                                                <td className="py-2">: {selectedProgram.title}</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-2 font-bold text-gray-600">Status Saat Ini</td>
                                                <td className="py-2">: {selectedProgram.status} (Progress: {selectedProgram.progress}%)</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">B. Detail Perencanaan</h3>
                                    <div className="mb-4">
                                        <p className="text-sm font-bold text-gray-600 mb-1">Tujuan / Output:</p>
                                        <p className="text-sm text-justify leading-relaxed">{selectedProgram.output || '-'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-sm font-bold text-gray-600 mb-1">Indikator Kinerja Utama:</p>
                                            <p className="text-sm">{selectedProgram.iku || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-600 mb-1">Target Capaian:</p>
                                            <p className="text-sm">{selectedProgram.target || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">C. Alokasi Anggaran & Waktu</h3>
                                    <table className="w-full text-sm border-collapse border border-gray-300">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 p-2 text-left">Komponen</th>
                                                <th className="border border-gray-300 p-2 text-left">Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border border-gray-300 p-2 font-bold">Pagu Anggaran</td>
                                                <td className="border border-gray-300 p-2 font-mono">{formatCurrency(selectedProgram.budget)}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-300 p-2 font-bold">Realisasi (Sementara)</td>
                                                <td className="border border-gray-300 p-2 font-mono">{formatCurrency(selectedProgram.realization)}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-300 p-2 font-bold">Target Penyelesaian</td>
                                                <td className="border border-gray-300 p-2">{selectedProgram.deadline ? new Date(selectedProgram.deadline).toLocaleDateString('id-ID', { dateStyle: 'full' }) : 'Belum ditentukan'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-12 flex justify-end">
                                    <div className="text-center w-1/3">
                                        <p className="text-sm mb-16">Pematangsiantar, {new Date().toLocaleDateString('id-ID')}</p>
                                        <div className="border-b border-black w-full mb-1"></div>
                                        <p className="text-xs font-bold uppercase">Kepala Seksi</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setPreviewModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold text-sm"
                            >
                                Tutup
                            </button>
                            <button
                                className="px-4 py-2 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 font-bold text-sm flex items-center gap-2"
                                onClick={() => window.print()}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Cetak PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- UPDATE PROGRESS MODAL --- */}
            {progressModalOpen && selectedProgram && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="bg-imigrasi-navy p-6 flex justify-between items-center text-white">
                            <h3 className="text-lg font-bold">Update Progres & Realisasi</h3>
                            <button onClick={() => setProgressModalOpen(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Progres Fisik (%)</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={progressUpdateData.progress}
                                    onChange={(e) => setProgressUpdateData(prev => ({ ...prev, progress: e.target.value }))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-imigrasi-navy"
                                />
                                <div className="flex justify-between text-xs mt-2 text-gray-500 font-bold">
                                    <span>0%</span>
                                    <span className="text-imigrasi-navy text-lg">{progressUpdateData.progress}%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Realisasi Anggaran (Rp)</label>
                                <input
                                    type="number"
                                    value={progressUpdateData.realization}
                                    onChange={(e) => setProgressUpdateData(prev => ({ ...prev, realization: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none font-mono"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Maksimal: {formatCurrency(selectedProgram.budget)}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-3 px-8 pb-8">
                            <button
                                onClick={() => setProgressModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold text-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleUpdateProgress}
                                className="px-6 py-2 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 font-bold text-sm shadow-lg shadow-blue-900/20"
                            >
                                Simpan Progres
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkProgramInput;
