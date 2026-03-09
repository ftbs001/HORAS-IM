import { useState } from 'react';
import { useSection } from '../../contexts/SectionContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

/* ── icon paths ─────────────────────────────────────────── */
const ICONS = {
    inteldakim: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    lalintalkim: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    tikim: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    tatausaha: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    default: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5',
};

const getSectionIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('intel')) return ICONS.inteldakim;
    if (n.includes('lalin')) return ICONS.lalintalkim;
    if (n.includes('tikim') || n.includes('ti ') || n === 'ti') return ICONS.tikim;
    if (n.includes('tata') || n.includes('tu')) return ICONS.tatausaha;
    return ICONS.default;
};

/* ── performance colour helper ─────────────────────────── */
const perfColor = (v) => {
    if (v >= 85) return 'text-green-600';
    if (v >= 60) return 'text-yellow-600';
    return 'text-red-500';
};
const perfBarColor = (v) => {
    if (v >= 85) return 'bg-green-500';
    if (v >= 60) return 'bg-yellow-400';
    return 'bg-red-400';
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
const SectionData = ({ initialSectionFilter = null }) => {
    const { sections: allSections, loading, updateSection } = useSection();
    const { showNotification } = useNotification();
    const { user } = useAuth();

    const isSuperAdmin = user?.role === 'super_admin';

    /* ── access check ─────────────────────────────────────── */
    const isMySeksi = (section) => {
        if (isSuperAdmin) return true;

        const secName = (section.name || '').toLowerCase();
        const secAlias = (section.alias || '').toLowerCase();

        // 1. Check via user's linked section
        const myAlias = (user?.seksi?.alias || user?.seksi?.name || '').toLowerCase();
        if (myAlias && (secName.includes(myAlias) || secAlias.includes(myAlias) || myAlias.includes(secAlias))) {
            return true;
        }

        // 2. Fallback check via user's email prefix (e.g. 'inteldakim@horas-im.local')
        const myEmailAlias = (user?.email || '').split('@')[0].toLowerCase();
        if (myEmailAlias && (secName.includes(myEmailAlias) || secAlias.includes(myEmailAlias))) {
            return true;
        }

        return false;
    };

    /* ── double-guard deduplication ───────────────────────── */
    // Context already dedupes by name, this adds a last-resort ID-based guard
    const seenIds = new Set();
    const sections = allSections
        .filter(s => {
            if (seenIds.has(s.id)) return false;
            seenIds.add(s.id);
            return true;
        })
        .filter(s => initialSectionFilter
            ? s.name.toLowerCase().includes(initialSectionFilter.toLowerCase())
            : true
        )
        .slice(0, initialSectionFilter ? 1 : allSections.length);

    /* ── modal / edit state ───────────────────────────────── */
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [selected, setSelected] = useState(null);
    const [draft, setDraft] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const openView = (section) => {
        setSelected(section);
        setDraft(null);
        setIsEditMode(false);
        setActiveTab(0);
        setShowConfirm(false);
        setModalOpen(true);
    };

    const openEdit = (section) => {
        if (!isMySeksi(section)) {
            showNotification('Anda hanya dapat mengedit data seksi Anda sendiri.', 'error');
            return;
        }
        setSelected(section);
        setDraft({
            name: section.name || '',
            alias: section.alias || '',
            description: section.description || '',
            vision: section.vision || '',
            head_name: section.head_name || '',
            head_nip: section.head_nip || '',
            staff: section.staff ?? 0,
            performance: section.performance ?? 0,
            perf_target: section.perf_target ?? 100,
            budget_real: section.budget_real ?? 0,
            programs: section.programs ?? 0,
            prog_planned: section.prog_planned ?? 0,
            prog_inprogress: section.prog_inprogress ?? 0,
            prog_completed: section.prog_completed ?? 0,
            notes: section.notes || '',
        });
        setIsEditMode(true);
        setActiveTab(0);
        setShowConfirm(false);
        setModalOpen(true);
    };

    const handleDraftChange = (e) => {
        const { name, value, type } = e.target;
        setDraft(prev => ({ ...prev, [name]: type === 'number' || type === 'range' ? Number(value) : value }));
    };

    const handleSaveClick = () => {
        if (!draft.name.trim()) {
            showNotification('Nama Seksi wajib diisi.', 'warning');
            return;
        }
        if (!draft.description.trim()) {
            showNotification('Deskripsi Tugas & Fungsi wajib diisi.', 'warning');
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirmSave = async () => {
        setIsSaving(true);
        setShowConfirm(false);
        const result = await updateSection(selected.id, draft);
        setIsSaving(false);
        if (result.success) {
            showNotification('Data Seksi berhasil diperbarui! ✅', 'success');
            setModalOpen(false);
        } else {
            const errDetail = result.error?.message || result.error?.details || 'Error tak dikenal';
            showNotification(`Gagal menyimpan data: ${errDetail}`, 'error');
        }
    };

    /* ── loading state ────────────────────────────────────── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-imigrasi-navy border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-500 text-sm">Memuat data seksi…</span>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════════════════ */
    return (
        <div className="space-y-8 animate-fade-in">

            {/* ── Page Header ── */}
            <div className="relative bg-gradient-to-r from-imigrasi-navy to-[#1a2d4d] rounded-2xl p-8 overflow-hidden shadow-xl text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-imigrasi-gold opacity-10 rounded-full translate-y-1/2 -translate-x-1/3"></div>
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold font-serif mb-2">Data Organisasi &amp; Seksi</h2>
                        <p className="text-blue-100 max-w-2xl text-sm leading-relaxed">
                            Informasi detail mengenai unit kerja di Kantor Imigrasi Kelas II TPI Pematang Siantar.
                            {!isSuperAdmin && (
                                <span className="block mt-1 text-imigrasi-gold font-semibold">
                                    ✏️ Anda hanya dapat mengedit data seksi Anda sendiri.
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <span className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg text-xs font-mono text-imigrasi-gold border border-white/20">
                            {sections.length} Unit Kerja
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Section Cards Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sections.map((section) => {
                    const canEdit = isMySeksi(section);
                    const iconPath = section.icon || getSectionIcon(section.name);
                    const perf = Number(section.performance) || 0;
                    return (
                        <div
                            key={section.id}
                            className={`group bg-white rounded-xl shadow-lg border transition-all duration-300 relative overflow-hidden
                                ${canEdit ? 'border-gray-100 hover:shadow-2xl' : 'border-gray-100 hover:shadow-md'}`}
                        >
                            {/* Hover accent top bar */}
                            <div className={`absolute top-0 left-0 w-full h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left
                                ${canEdit ? 'bg-gradient-to-r from-imigrasi-navy to-imigrasi-gold' : 'bg-gradient-to-r from-gray-300 to-gray-400'}`}></div>

                            {/* "Seksi Anda" badge */}
                            {canEdit && !isSuperAdmin && (
                                <div className="absolute top-3 right-3 z-10">
                                    <span className="bg-imigrasi-gold text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                        ✏️ Seksi Anda
                                    </span>
                                </div>
                            )}

                            <div className="p-7">
                                {/* Card header */}
                                <div className="flex justify-between items-start mb-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transform group-hover:rotate-6 transition-transform
                                            ${canEdit ? 'bg-blue-50 text-imigrasi-navy' : 'bg-gray-50 text-gray-400'}`}>
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold transition-colors ${canEdit ? 'text-gray-800 group-hover:text-imigrasi-navy' : 'text-gray-500'}`}>
                                                {section.name}
                                            </h3>
                                            <p className="text-xs text-imigrasi-gold font-bold uppercase tracking-wide">{section.alias}</p>
                                        </div>
                                    </div>
                                    {/* Performance ring */}
                                    <div className="text-right">
                                        <div className={`text-2xl font-black ${perfColor(perf)}`}>{perf}%</div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Kinerja</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-gray-600 text-sm leading-relaxed mb-5 border-l-2 border-gray-100 pl-4 line-clamp-2">
                                    {section.description || 'Deskripsi belum diisi.'}
                                </p>

                                {/* Performance bar */}
                                <div className="mb-5">
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full transition-all duration-700 ${perfBarColor(perf)}`}
                                            style={{ width: `${perf}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-4 mb-5 bg-gray-50 rounded-xl p-4">
                                    <div className="text-center border-r border-gray-200">
                                        <span className="block text-2xl font-black text-imigrasi-navy">{section.staff ?? 0}</span>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Personil</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-2xl font-black text-imigrasi-navy">{section.programs ?? 0}</span>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Program</span>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => openView(section)}
                                        className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Pratinjau
                                    </button>

                                    {canEdit ? (
                                        <button
                                            onClick={() => openEdit(section)}
                                            className="flex-1 py-2.5 rounded-lg bg-imigrasi-navy text-white hover:bg-blue-900 transition-colors shadow-sm flex items-center justify-center gap-2 font-bold text-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Edit
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                                            title="Anda tidak memiliki izin mengedit seksi ini"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Hanya Lihat
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ══════════════════════════════════════════════
                MODAL — Pratinjau & Edit
            ══════════════════════════════════════════════ */}
            {modalOpen && selected && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">

                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-imigrasi-navy to-blue-900 px-7 py-5 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_30%,_#fff,_transparent)]"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-imigrasi-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d={isEditMode
                                                    ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                                                    : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'} />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white font-serif">
                                            {isEditMode ? 'Edit Data Seksi' : selected.name}
                                        </h3>
                                        <p className="text-blue-200 text-xs mt-0.5">
                                            {isEditMode ? 'Perbarui informasi unit kerja' : selected.alias}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white transition-colors relative z-20 p-1 rounded-lg hover:bg-white/10">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* ── Tabs (Edit mode only) ── */}
                        {isEditMode && (
                            <div className="flex border-b border-gray-100 bg-gray-50">
                                {['Info Umum', 'Personil & Kinerja', 'Program Kerja'].map((tab, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveTab(i)}
                                        className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2
                                            ${activeTab === i
                                                ? 'text-imigrasi-navy border-imigrasi-navy bg-white'
                                                : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                                    >
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-2 font-bold
                                            ${activeTab === i ? 'bg-imigrasi-navy text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            {i + 1}
                                        </span>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Modal Body ── */}
                        <div className="p-7 max-h-[65vh] overflow-y-auto">

                            {/* ════ VIEW MODE ════ */}
                            {!isEditMode && (
                                <div className="space-y-6">
                                    {/* Description */}
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <h4 className="font-bold text-imigrasi-navy mb-2 flex items-center gap-2 text-sm">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Tugas &amp; Fungsi
                                        </h4>
                                        <p className="text-gray-700 leading-relaxed text-sm">{selected.description || '-'}</p>
                                    </div>

                                    {/* Head */}
                                    {(selected.head_name) && (
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="w-10 h-10 rounded-full bg-imigrasi-navy/10 flex items-center justify-center text-imigrasi-navy font-bold text-lg">
                                                {selected.head_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{selected.head_name}</p>
                                                {selected.head_nip && <p className="text-xs text-gray-500">NIP. {selected.head_nip}</p>}
                                            </div>
                                            <span className="ml-auto text-xs bg-imigrasi-navy/10 text-imigrasi-navy px-2 py-1 rounded-full font-semibold">Kepala Seksi</span>
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-3 text-sm">Statistik Kinerja</h4>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Capaian Kinerja', value: selected.performance || 0, color: perfBarColor(selected.performance) },
                                                { label: 'Realisasi Anggaran', value: selected.budget_real || 0, color: 'bg-blue-500' },
                                            ].map(({ label, value, color }) => (
                                                <div key={label}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">{label}</span>
                                                        <span className="font-bold text-gray-800">{value}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${value}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Programme counts */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Direncanakan', value: selected.prog_planned ?? '-', color: 'bg-gray-100 text-gray-700' },
                                            { label: 'Berjalan', value: selected.prog_inprogress ?? '-', color: 'bg-blue-50 text-blue-700' },
                                            { label: 'Selesai', value: selected.prog_completed ?? '-', color: 'bg-green-50 text-green-700' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className={`${color} rounded-xl p-3 text-center`}>
                                                <div className="text-2xl font-black">{value}</div>
                                                <div className="text-xs font-semibold mt-0.5 opacity-80">{label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {selected.vision && (
                                        <blockquote className="border-l-4 border-imigrasi-gold pl-4 italic text-gray-600 text-sm">
                                            "{selected.vision}"
                                        </blockquote>
                                    )}
                                </div>
                            )}

                            {/* ════ EDIT MODE ════ */}
                            {isEditMode && draft && (
                                <>
                                    {/* ── TAB 1: Info Umum ── */}
                                    {activeTab === 0 && (
                                        <div className="space-y-5">
                                            {/* Nama */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Nama Seksi <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={draft.name}
                                                    onChange={handleDraftChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 focus:border-imigrasi-navy outline-none text-sm transition"
                                                    placeholder="Contoh: Seksi Inteldakim"
                                                />
                                            </div>

                                            {/* Alias */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Alias / Fungsi
                                                </label>
                                                <input
                                                    type="text"
                                                    name="alias"
                                                    value={draft.alias}
                                                    onChange={handleDraftChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 focus:border-imigrasi-navy outline-none text-sm transition"
                                                    placeholder="Contoh: Intelijen & Penindakan Keimigrasian"
                                                />
                                            </div>

                                            {/* Deskripsi */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Deskripsi Tugas &amp; Fungsi <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    name="description"
                                                    value={draft.description}
                                                    onChange={handleDraftChange}
                                                    rows={3}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 focus:border-imigrasi-navy outline-none text-sm transition resize-none"
                                                    placeholder="Uraian tugas pokok dan fungsi seksi ini…"
                                                />
                                            </div>

                                            {/* Visi */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Motto / Visi Seksi
                                                </label>
                                                <input
                                                    type="text"
                                                    name="vision"
                                                    value={draft.vision}
                                                    onChange={handleDraftChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 focus:border-imigrasi-navy outline-none text-sm transition"
                                                    placeholder="Contoh: Pelayanan prima yang profesional dan akuntabel"
                                                />
                                            </div>

                                            {/* Pejabat */}
                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nama Kepala Seksi</label>
                                                    <input
                                                        type="text"
                                                        name="head_name"
                                                        value={draft.head_name}
                                                        onChange={handleDraftChange}
                                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 outline-none text-sm transition"
                                                        placeholder="Nama lengkap pejabat"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">NIP</label>
                                                    <input
                                                        type="text"
                                                        name="head_nip"
                                                        value={draft.head_nip}
                                                        onChange={handleDraftChange}
                                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 outline-none text-sm transition"
                                                        placeholder="19XXXXXXXXXX"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── TAB 2: Personil & Kinerja ── */}
                                    {activeTab === 1 && (
                                        <div className="space-y-6">
                                            {/* Jumlah Personil */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Jumlah Personil
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="range"
                                                        name="staff"
                                                        min={0} max={50}
                                                        value={draft.staff}
                                                        onChange={handleDraftChange}
                                                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-imigrasi-navy"
                                                    />
                                                    <input
                                                        type="number"
                                                        name="staff"
                                                        value={draft.staff}
                                                        onChange={handleDraftChange}
                                                        min={0} max={200}
                                                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center font-bold text-imigrasi-navy outline-none text-sm focus:ring-2 focus:ring-imigrasi-navy/20"
                                                    />
                                                </div>
                                            </div>

                                            {/* Capaian Kinerja */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        Capaian Kinerja (%)
                                                    </label>
                                                    <span className={`text-2xl font-black ${perfColor(draft.performance)}`}>
                                                        {draft.performance}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    name="performance"
                                                    min={0} max={100}
                                                    value={draft.performance}
                                                    onChange={handleDraftChange}
                                                    className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-imigrasi-navy"
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                                    <span>0%</span>
                                                    <span className="text-yellow-500 font-bold">60% — Cukup</span>
                                                    <span className="text-green-600 font-bold">85% — Baik</span>
                                                    <span>100%</span>
                                                </div>
                                                {/* Visual bar preview */}
                                                <div className="mt-3 w-full bg-gray-100 rounded-full h-2.5">
                                                    <div
                                                        className={`h-2.5 rounded-full transition-all duration-300 ${perfBarColor(draft.performance)}`}
                                                        style={{ width: `${draft.performance}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Target Kinerja */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Target Kinerja (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    name="perf_target"
                                                    value={draft.perf_target}
                                                    onChange={handleDraftChange}
                                                    min={0} max={100}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 outline-none text-sm"
                                                />
                                            </div>

                                            {/* Realisasi Anggaran */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        Realisasi Anggaran (%)
                                                    </label>
                                                    <span className="text-lg font-black text-blue-600">{draft.budget_real}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    name="budget_real"
                                                    min={0} max={100}
                                                    value={draft.budget_real}
                                                    onChange={handleDraftChange}
                                                    className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                />
                                                <div className="mt-3 w-full bg-gray-100 rounded-full h-2.5">
                                                    <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${draft.budget_real}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── TAB 3: Program Kerja ── */}
                                    {activeTab === 2 && (
                                        <div className="space-y-5">
                                            {/* Total Programs */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Total Program Kerja
                                                </label>
                                                <input
                                                    type="number"
                                                    name="programs"
                                                    value={draft.programs}
                                                    onChange={handleDraftChange}
                                                    min={0}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 outline-none text-sm font-bold text-imigrasi-navy text-center"
                                                />
                                            </div>

                                            {/* Status breakdown */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                                    Rincian Status Program
                                                </label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[
                                                        { name: 'prog_planned', label: 'Direncanakan', color: 'border-gray-300 focus:border-gray-500', badge: 'bg-gray-100 text-gray-700' },
                                                        { name: 'prog_inprogress', label: 'Berjalan', color: 'border-blue-300 focus:border-blue-500', badge: 'bg-blue-50 text-blue-700' },
                                                        { name: 'prog_completed', label: 'Selesai', color: 'border-green-300 focus:border-green-500', badge: 'bg-green-50 text-green-700' },
                                                    ].map(({ name, label, color, badge }) => (
                                                        <div key={name} className="text-center">
                                                            <div className={`${badge} rounded-lg px-2 py-1 text-xs font-bold mb-2`}>{label}</div>
                                                            <input
                                                                type="number"
                                                                name={name}
                                                                value={draft[name]}
                                                                onChange={handleDraftChange}
                                                                min={0}
                                                                className={`w-full px-3 py-2.5 border-2 ${color} rounded-lg outline-none text-sm font-black text-center transition`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Catatan Capaian
                                                </label>
                                                <textarea
                                                    name="notes"
                                                    value={draft.notes}
                                                    onChange={handleDraftChange}
                                                    rows={4}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imigrasi-navy/20 outline-none text-sm transition resize-none"
                                                    placeholder="Catatan perkembangan, hambatan, atau pencapaian penting…"
                                                />
                                            </div>

                                            {/* Preview summary */}
                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pratinjau Kartu</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-imigrasi-navy">{draft.name || selected.name}</span>
                                                    <span className={`text-lg font-black ${perfColor(draft.performance)}`}>{draft.performance}%</span>
                                                </div>
                                                <div className="mt-2 flex gap-4 text-center">
                                                    <div className="flex-1 text-xs">
                                                        <div className="text-xl font-black text-imigrasi-navy">{draft.staff}</div>
                                                        <div className="text-gray-400 uppercase tracking-wide">Personil</div>
                                                    </div>
                                                    <div className="flex-1 text-xs">
                                                        <div className="text-xl font-black text-imigrasi-navy">{draft.programs}</div>
                                                        <div className="text-gray-400 uppercase tracking-wide">Program</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── Modal Footer ── */}
                        <div className="px-7 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            {/* Tab navigation in edit mode */}
                            {isEditMode && (
                                <div className="flex gap-2">
                                    {activeTab > 0 && (
                                        <button
                                            onClick={() => setActiveTab(t => t - 1)}
                                            className="px-4 py-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-white text-sm font-medium flex items-center gap-1 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Sebelumnya
                                        </button>
                                    )}
                                    {activeTab < 2 && (
                                        <button
                                            onClick={() => setActiveTab(t => t + 1)}
                                            className="px-4 py-2 text-imigrasi-navy border border-imigrasi-navy rounded-lg hover:bg-blue-50 text-sm font-semibold flex items-center gap-1 transition"
                                        >
                                            Selanjutnya
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}
                            {!isEditMode && <div />}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                >
                                    Tutup
                                </button>
                                {isEditMode && isMySeksi(selected) && (
                                    <button
                                        onClick={handleSaveClick}
                                        disabled={isSaving}
                                        className="px-6 py-2 bg-imigrasi-navy text-white font-bold rounded-lg hover:bg-blue-900 shadow-md transition-all flex items-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Menyimpan…
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Simpan Perubahan
                                            </>
                                        )}
                                    </button>
                                )}
                                {!isEditMode && isMySeksi(selected) && (
                                    <button
                                        onClick={() => openEdit(selected)}
                                        className="px-5 py-2 bg-imigrasi-navy text-white font-bold rounded-lg hover:bg-blue-900 transition-all text-sm flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Edit Data
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Confirm Save Dialog ── */}
                    {showConfirm && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                            <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full mx-4 animate-scale-in">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-imigrasi-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 text-center mb-2">Konfirmasi Simpan</h4>
                                <p className="text-sm text-gray-500 text-center mb-6">
                                    Perubahan pada <span className="font-bold text-imigrasi-navy">{draft.name}</span> akan disimpan ke database. Lanjutkan?
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
                                        Batal
                                    </button>
                                    <button onClick={handleConfirmSave} className="flex-1 py-2.5 bg-imigrasi-navy text-white rounded-lg text-sm font-bold hover:bg-blue-900 transition shadow-md">
                                        Ya, Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SectionData;
