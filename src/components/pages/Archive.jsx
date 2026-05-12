import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useArchive } from '../../contexts/ArchiveContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const Archive = () => {
    const { user, isSuperAdmin, isAdminSeksi } = useAuth();
    const {
        archives, deletedArchives, activityLog, stats, loading,
        loadArsip, uploadArsip, hapusArsip, restoreArsip, renameArsip,
        loadActivityLog
    } = useArchive();

    const [activeTab, setActiveTab] = useState('Semua');
    const [selectedYear, setSelectedYear] = useState('Semua');
    const [selectedMonth, setSelectedMonth] = useState('Semua');
    const [selectedSeksi, setSelectedSeksi] = useState('Semua');
    const [previewFile, setPreviewFile] = useState(null);

    // Upload form state
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadType, setUploadType] = useState('Monthly Report');
    const [uploadSeksi, setUploadSeksi] = useState(user?.seksi?.alias || '');
    const [uploadBulan, setUploadBulan] = useState(new Date().getMonth() + 1);
    const [uploadTahun, setUploadTahun] = useState(new Date().getFullYear());
    const [uploading, setUploading] = useState(false);
    
    // UI state
    const [msg, setMsg] = useState(null);
    const fileInputRef = useRef(null);

    const BULAN_NAMES = [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    const showMsg = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 5000);
    };

    // Determine role restrictions
    const canSeeAll = isSuperAdmin();
    const seksiFilter = canSeeAll ? null : user?.seksi?.alias;

    useEffect(() => {
        loadArsip(seksiFilter);
        if (canSeeAll) loadActivityLog();
    }, [loadArsip, loadActivityLog, seksiFilter, canSeeAll]);

    useEffect(() => {
        if (!canSeeAll) {
            setUploadSeksi(user?.seksi?.name || '');
        }
    }, [user, canSeeAll]);

    // Tree generation
    const treeData = useMemo(() => {
        const tree = { Semua: { Semua: new Set() } };
        archives.forEach(item => {
            const y = item.year || 'Unknown';
            const m = item.month ? BULAN_NAMES[item.month] : 'Unknown';
            const s = item.seksi || 'Umum';

            if (!tree[y]) tree[y] = { Semua: new Set() };
            if (!tree[y][m]) tree[y][m] = new Set();
            
            tree[y][m].add(s);
            tree.Semua.Semua.add(s);
            if (tree[y]) tree[y].Semua.add(s);
        });
        return tree;
    }, [archives]);

    // Filter logic
    const filteredArchives = useMemo(() => {
        return archives.filter(item => {
            if (selectedYear !== 'Semua' && item.year !== parseInt(selectedYear)) return false;
            if (selectedMonth !== 'Semua' && item.month !== BULAN_NAMES.indexOf(selectedMonth)) return false;
            if (selectedSeksi !== 'Semua' && item.seksi !== selectedSeksi) return false;
            return true;
        });
    }, [archives, selectedYear, selectedMonth, selectedSeksi]);

    // Format size
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) return showMsg('error', 'Pilih file terlebih dahulu.');
        
        setUploading(true);
        const res = await uploadArsip({
            file: uploadFile,
            title: uploadTitle,
            reportType: uploadType,
            seksi: uploadSeksi,
            bulan: uploadBulan,
            tahun: uploadTahun,
            userId: user?.id,
            userName: user?.nama
        });
        
        if (res.error) {
            showMsg('error', res.error);
        } else {
            showMsg('success', 'File berhasil diunggah.');
            setUploadFile(null);
            setUploadTitle('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadArsip(seksiFilter);
        }
        setUploading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin memindahkan file ini ke sampah?')) return;
        const res = await hapusArsip(id, user?.id, user?.nama);
        if (res.error) showMsg('error', res.error);
        else {
            showMsg('success', 'File dipindahkan ke sampah.');
            loadArsip(seksiFilter);
        }
    };

    const handleRestore = async (id) => {
        const res = await restoreArsip(id, user?.id, user?.nama);
        if (res.error) showMsg('error', res.error);
        else {
            showMsg('success', 'File berhasil direstore.');
            loadArsip(seksiFilter);
        }
    };

    const handlePermanentDelete = async (id, filePath) => {
        if (!window.confirm('PERINGATAN: File akan dihapus permanen dan tidak bisa dikembalikan. Lanjut?')) return;
        try {
            if (filePath) {
                await supabase.storage.from('archived-reports').remove([filePath]);
            }
            const { error } = await supabase.from('archived_reports').delete().eq('id', id);
            if (error) throw error;
            showMsg('success', 'File dihapus permanen.');
            loadArsip(seksiFilter);
        } catch (err) {
            showMsg('error', err.message);
        }
    };

    const handleRename = async (id, currentTitle) => {
        const newTitle = window.prompt('Masukkan nama baru:', currentTitle);
        if (!newTitle || newTitle === currentTitle) return;
        
        const res = await renameArsip(id, newTitle, user?.id, user?.nama);
        if (res.error) showMsg('error', res.error);
        else {
            showMsg('success', 'File berhasil direname.');
            loadArsip(seksiFilter);
        }
    };

    // Components
    const StatsCard = ({ title, value, icon, desc }) => (
        <div className="bg-[#0D1B3E] rounded-xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110">
                <span className="text-8xl">{icon}</span>
            </div>
            <div className="relative z-10">
                <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
                {desc && <p className="text-xs text-[#C9992A]">{desc}</p>}
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl relative z-10 text-[#C9992A]">
                {icon}
            </div>
        </div>
    );

    const FileCard = ({ file, isTrash }) => {
        const isPdf = file.file_format === 'PDF';
        return (
            <div className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-xl hover:border-[#C9992A]/30 transition-all group flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        {isPdf ? '📄' : '📝'}
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {file.seksi || 'Umum'}
                    </span>
                </div>
                <h4 className="font-bold text-[#0D1B3E] text-lg mb-1 line-clamp-2" title={file.report_title}>
                    {file.report_title}
                </h4>
                <div className="text-sm text-gray-500 space-y-1 mb-4 flex-grow">
                    <p className="flex items-center gap-2"><span>📅</span> {BULAN_NAMES[file.month]} {file.year}</p>
                    <p className="flex items-center gap-2"><span>💾</span> {formatBytes(file.file_size)}</p>
                    <p className="flex items-center gap-2">
                        <span>🏷️</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${file.source === 'auto_export' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {file.source === 'auto_export' ? 'Auto Export' : 'Manual'}
                        </span>
                    </p>
                </div>
                
                <div className="flex gap-2 mt-auto pt-4 border-t border-gray-50">
                    {isTrash ? (
                        <>
                            <button onClick={() => handleRestore(file.id)} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 rounded-lg text-sm transition-colors">
                                Restore
                            </button>
                            {canSeeAll && (
                                <button onClick={() => handlePermanentDelete(file.id, file.file_path)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 rounded-lg text-sm transition-colors">
                                    Hapus
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            {isPdf && (
                                <button onClick={() => setPreviewFile(file)} className="flex-1 bg-[#0D1B3E] hover:bg-[#1a2d5c] text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm">
                                    Preview
                                </button>
                            )}
                            {file.file_url && (
                                <a href={file.file_url} target="_blank" rel="noreferrer" download 
                                   className={`flex-1 text-center font-medium py-2 rounded-lg text-sm transition-colors shadow-sm ${!isPdf ? 'bg-[#0D1B3E] hover:bg-[#1a2d5c] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                                    Download
                                </a>
                            )}
                            {canSeeAll && (
                                <div className="flex gap-1">
                                    <button onClick={() => handleRename(file.id, file.report_title)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors" title="Rename">✏️</button>
                                    <button onClick={() => handleDelete(file.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Hapus">🗑️</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-[#0D1B3E]">Cloud Archive</h1>
                    <p className="text-gray-500 mt-1">Pusat penyimpanan laporan bulanan dan dokumen ekspor.</p>
                </div>
            </div>

            {msg && (
                <div className={`p-4 rounded-xl border ${msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    {msg.text}
                </div>
            )}

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Total Arsip" value={stats.totalFiles} icon="📁" desc="Dokumen tersimpan" />
                <StatsCard title="Total Storage" value={formatBytes(stats.totalSize)} icon="💾" desc="Kapasitas terpakai" />
                <StatsCard title="Bulan Ini" value={stats.thisMonth} icon="📅" desc="Arsip baru bulan ini" />
                <StatsCard title="File Terbaru" value={stats.latest?.report_title || '-'} icon="🕐" desc={formatDate(stats.latest?.created_at)} />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex overflow-x-auto">
                {['Semua', 'Upload', ...(canSeeAll ? ['Log Aktivitas'] : []), 'Sampah'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 min-w-[120px] py-3 px-4 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === tab 
                                ? 'bg-[#0D1B3E] text-white shadow-md' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-[#0D1B3E]'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
                {activeTab === 'Semua' && (
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Tree Sidebar */}
                        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-100 p-6 flex-shrink-0">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Navigasi</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Tahun</label>
                                    <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth('Semua'); setSelectedSeksi('Semua'); }}
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#C9992A] outline-none">
                                        <option value="Semua">Semua Tahun</option>
                                        {Object.keys(treeData).filter(k => k !== 'Semua').sort().reverse().map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Bulan</label>
                                    <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setSelectedSeksi('Semua'); }}
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#C9992A] outline-none">
                                        <option value="Semua">Semua Bulan</option>
                                        {treeData[selectedYear] && Object.keys(treeData[selectedYear]).filter(k => k !== 'Semua').map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Seksi</label>
                                    <select value={selectedSeksi} onChange={(e) => setSelectedSeksi(e.target.value)}
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#C9992A] outline-none">
                                        <option value="Semua">Semua Seksi</option>
                                        {treeData[selectedYear] && treeData[selectedYear][selectedMonth] && 
                                            Array.from(treeData[selectedYear][selectedMonth]).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <button onClick={() => { setSelectedYear('Semua'); setSelectedMonth('Semua'); setSelectedSeksi('Semua'); }}
                                    className="w-full py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                                    Reset Filter
                                </button>
                            </div>
                        </div>
                        
                        {/* Grid Content */}
                        <div className="flex-1 p-6 bg-gray-50/50 rounded-r-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-[#0D1B3E] text-lg">Daftar Dokumen</h3>
                                <span className="text-sm font-medium bg-[#C9992A]/10 text-[#C9992A] px-3 py-1 rounded-full">
                                    {filteredArchives.length} File
                                </span>
                            </div>
                            
                            {loading ? (
                                <div className="flex justify-center items-center h-64 text-gray-400">Memuat arsip...</div>
                            ) : filteredArchives.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-50">📂</div>
                                    <h4 className="text-gray-500 font-medium">Tidak ada dokumen ditemukan</h4>
                                    <p className="text-sm text-gray-400 mt-1">Coba ubah filter atau upload dokumen baru</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredArchives.map(file => (
                                        <FileCard key={file.id} file={file} isTrash={false} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'Upload' && (
                    <div className="p-8 max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold text-[#0D1B3E] mb-6 text-center">Upload Dokumen Arsip</h2>
                        
                        <form onSubmit={handleUpload} className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                                <div className="text-5xl mb-4">☁️</div>
                                <h4 className="font-bold text-gray-700 mb-2">Pilih File PDF atau DOCX</h4>
                                <p className="text-sm text-gray-500 mb-6">Maksimal 50MB per file</p>
                                <input type="file" ref={fileInputRef} onChange={e => setUploadFile(e.target.files[0])} accept=".pdf,.docx,.doc"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                                <button type="button" className="bg-[#0D1B3E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#1a2d5c] pointer-events-none">
                                    {uploadFile ? uploadFile.name : 'Browse File'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Judul Dokumen</label>
                                    <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Contoh: Laporan Bulanan Januari 2026"
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9992A] focus:border-[#C9992A] outline-none" required />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                                        <select value={uploadBulan} onChange={e => setUploadBulan(+e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9992A] outline-none">
                                            {BULAN_NAMES.slice(1).map((b, i) => <option key={i+1} value={i+1}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                                        <select value={uploadTahun} onChange={e => setUploadTahun(+e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9992A] outline-none">
                                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Seksi</label>
                                        <input type="text" value={uploadSeksi} onChange={e => setUploadSeksi(e.target.value)} disabled={!canSeeAll}
                                            className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#C9992A] outline-none" placeholder="Semua Seksi" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Laporan</label>
                                        <select value={uploadType} onChange={e => setUploadType(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9992A] outline-none">
                                            <option value="Monthly Report">Laporan Bulanan</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={uploading}
                                className="w-full py-4 bg-gradient-to-r from-[#0D1B3E] to-[#1a2d5c] hover:from-[#1a2d5c] hover:to-[#0D1B3E] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                                {uploading ? 'Mengunggah...' : 'Upload Dokumen'}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'Log Aktivitas' && canSeeAll && (
                    <div className="p-6">
                        <h3 className="font-bold text-[#0D1B3E] text-lg mb-6">Riwayat Aktivitas Arsip</h3>
                        {activityLog.length === 0 ? (
                            <p className="text-center text-gray-500 py-10">Belum ada aktivitas terekam.</p>
                        ) : (
                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                {activityLog.map((log) => (
                                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#0D1B3E] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-sm z-10">
                                            {log.action === 'upload' ? '📤' : log.action === 'delete' ? '🗑️' : log.action === 'restore' ? '♻️' : log.action === 'rename' ? '✏️' : '👁️'}
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-bold text-[#0D1B3E] capitalize">{log.action}</div>
                                                <div className="text-xs font-medium text-[#C9992A]">{formatDate(log.created_at)}</div>
                                            </div>
                                            <div className="text-sm text-gray-600">{log.detail}</div>
                                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                                <span>👤</span> {log.user_name}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'Sampah' && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-[#0D1B3E] text-lg flex items-center gap-2">
                                <span>🗑️</span> Keranjang Sampah
                            </h3>
                            <span className="text-sm text-gray-500">File di sini bisa direstore kembali.</span>
                        </div>
                        {deletedArchives.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4">✨</div>
                                <h4 className="text-gray-500 font-medium">Keranjang Sampah Kosong</h4>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {deletedArchives.map(file => (
                                    <FileCard key={file.id} file={file} isTrash={true} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="flex items-center justify-between px-6 py-4 bg-[#0D1B3E] text-white">
                            <div>
                                <h3 className="font-bold text-lg">{previewFile.report_title}</h3>
                                <p className="text-xs text-gray-300">{previewFile.seksi || 'Umum'} • {BULAN_NAMES[previewFile.month]} {previewFile.year}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <a href={previewFile.file_url} target="_blank" rel="noreferrer" download className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">
                                    Download
                                </a>
                                <button onClick={() => setPreviewFile(null)} className="text-white hover:text-red-400 p-2">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-100 p-4">
                            <iframe 
                                src={`${previewFile.file_url}#toolbar=0`} 
                                className="w-full h-full rounded-xl shadow-inner border border-gray-200"
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Archive;
