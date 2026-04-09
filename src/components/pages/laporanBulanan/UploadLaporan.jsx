import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useLaporan } from '../../../contexts/LaporanContext';
import { processImageToBlock } from '../../../utils/imageUploadService';
import { parseDocxFile } from '../../../utils/docxParser';
import { validateDocxFile } from '../../../utils/docxValidator';
import { parseDocxStructured } from '../../../utils/docxStructuredParser';
import { parsePdfStructured } from '../../../utils/pdfStructuredParser';
import DocxPreviewRenderer from '../../common/DocxPreviewRenderer';
import PagedDocumentViewer from '../../common/PagedDocumentViewer';
import PagedDocumentEditor from '../../common/PagedDocumentEditor';

/* ── Constants ─────────────────────────────────────────────────────────────── */
const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const STATUS_COLOR = {
    'Draft': { bg: '#dbeafe', text: '#1d4ed8' },
    'Dikirim': { bg: '#fef9c3', text: '#854d0e' },
    'Perlu Revisi': { bg: '#fee2e2', text: '#b91c1c' },
    'Disetujui': { bg: '#dcfce7', text: '#15803d' },
    'Final': { bg: '#f3e8ff', text: '#7e22ce' },
};

/* ── Msg helper ─────────────────────────────────────────────────────────── */
const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 7000);
    }, []);
    return [msg, show];
};

/* ── Modal Preview ───────────────────────────────────────────────────────── */
function PreviewModal({ laporan, onClose }) {
    const [tab, setTab] = useState('structured');
    const isPdf = laporan?.file_type === 'pdf';
    const isDocx = ['docx', 'doc'].includes(laporan?.file_type || '');
    const hasStructured = !!laporan?.structured_json?.pages?.length;
    const hasDocxHtml = !!laporan?.docx_html;

    const tabBtn = (id, label, active) => (
        <button
            key={id}
            onClick={() => setTab(id)}
            style={{
                padding: '6px 14px',
                borderRadius: '6px 6px 0 0',
                border: 'none',
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                background: active ? '#eff6ff' : 'transparent',
                color: active ? '#1d4ed8' : '#64748b',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13px',
            }}
        >
            {label}
        </button>
    );

    const tabs = [];
    if (hasStructured) tabs.push({ id: 'structured', label: '🖥 Halaman' });
    if (hasDocxHtml && isDocx) tabs.push({ id: 'html', label: '📄 HTML Preview' });
    if (isPdf) tabs.push({ id: 'pdf', label: '📑 PDF' });
    if (!tabs.length) tabs.push({ id: 'fallback', label: '⬇ Download' });

    const activeTab = tabs.find(t => t.id === tab)?.id || tabs[0]?.id;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '16px',
        }}>
            <div style={{
                background: '#fff', borderRadius: '16px', width: '100%',
                maxWidth: '1200px', maxHeight: '94vh', display: 'flex',
                flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '8px',
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                            👁️ Preview — {laporan?.judul_laporan || laporan?.file_name}
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                            {BULAN_NAMES[laporan?.bulan]} {laporan?.tahun} ·{' '}
                            {laporan?.file_type?.toUpperCase()} ·{' '}
                            {laporan?.file_size ? `${(laporan.file_size / 1024).toFixed(0)} KB` : ''}
                            {hasStructured && ` · ${laporan.structured_json.pages.length} halaman`}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e2e8f0',
                        background: '#f8fafc', cursor: 'pointer', fontSize: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                </div>

                {/* Tabs */}
                {tabs.length > 1 && (
                    <div style={{
                        display: 'flex', gap: '4px', padding: '0 16px',
                        borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                    }}>
                        {tabs.map(t => tabBtn(t.id, t.label, activeTab === t.id))}
                    </div>
                )}

                {/* Body */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {activeTab === 'structured' && hasStructured && (
                        <div style={{ padding: '16px' }}>
                            <PagedDocumentViewer
                                structuredJson={laporan.structured_json}
                                maxHeight="76vh"
                                showPageNumbers={true}
                            />
                        </div>
                    )}
                    {activeTab === 'html' && hasDocxHtml && (
                        <div style={{ padding: '16px' }}>
                            <DocxPreviewRenderer
                                html={laporan.docx_html}
                                styleMetadata={laporan.docx_meta || {}}
                                preserveLayout={laporan.preserve_layout !== false}
                                maxHeight="76vh"
                                showToolbar={true}
                            />
                        </div>
                    )}
                    {activeTab === 'pdf' && isPdf && (
                        <iframe
                            src={laporan.file_url}
                            style={{ width: '100%', height: '78vh', border: 'none' }}
                            title="Preview PDF"
                        />
                    )}
                    {activeTab === 'fallback' && (
                        <div style={{
                            padding: '40px', textAlign: 'center',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                        }}>
                            <div style={{ fontSize: '64px' }}>📄</div>
                            <p style={{ fontSize: '15px', color: '#475569', margin: 0 }}>
                                File <strong>{laporan?.file_type?.toUpperCase()}</strong>
                                {isDocx ? ' belum diparse untuk preview inline.' : ' tidak dapat di-preview langsung.'}
                            </p>
                            <a
                                href={laporan?.file_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    padding: '12px 24px', borderRadius: '10px', border: 'none',
                                    background: '#2563eb', color: '#fff', fontWeight: 700,
                                    fontSize: '14px', textDecoration: 'none', cursor: 'pointer',
                                }}
                            >
                                ⬇️ Download &amp; Buka File
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


/* ── Modal Hapus Konfirmasi ───────────────────────────────────────────────── */
function HapusModal({ laporan, onConfirm, onCancel, loading }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
            <div style={{
                background: '#fff', borderRadius: '16px', padding: '28px',
                maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
                <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>🗑️</div>
                <h3 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                    Hapus Laporan?
                </h3>
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                    Laporan <strong>{laporan?.judul_laporan || laporan?.file_name}</strong><br />
                    ({BULAN_NAMES[laporan?.bulan]} {laporan?.tahun}) akan dihapus permanent.<br />
                    File di storage juga akan dihapus.
                </p>
                <div style={{
                    background: '#fff7ed', border: '1px solid #fed7aa',
                    borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
                    fontSize: '13px', color: '#9a3412',
                }}>
                    ⚠️ Tindakan ini tidak dapat dibatalkan.
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel} style={{
                        padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                        background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                    }}>
                        Batal
                    </button>
                    <button onClick={onConfirm} disabled={loading} style={{
                        padding: '10px 20px', borderRadius: '8px', border: 'none',
                        background: loading ? '#94a3b8' : '#dc2626', color: '#fff',
                        fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px',
                    }}>
                        {loading ? '⏳ Menghapus...' : '🗑️ Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function UploadLaporan() {
    const { user } = useAuth();
    const { fetchLaporanNotifs } = useNotification();
    const {
        uploadLaporan: ctxUpload,
        editLaporan: ctxEdit,
        hapusLaporan: ctxHapus,
        submitLaporan: ctxSubmit,
        loadLaporanBySeksi,
        subscribe,
    } = useLaporan();

    /* ── Local state ─────────────────────────────────────────────────────── */
    const [laporan, setLaporan] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resolvedSeksiId, setResolvedSeksiId] = useState(null);
    const [resolvedSeksiName, setResolvedSeksiName] = useState('');
    const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth() + 1);
    const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
    const [selectedFile, setSelectedFile] = useState(null);
    const [judulLaporan, setJudulLaporan] = useState('');
    const [contentJson, setContentJson] = useState({ version: '2.0', blocks: [] });
    const [imageCaption, setImageCaption] = useState('');
    const [addingImage, setAddingImage] = useState(false);

    // Edit mode
    const [editMode, setEditMode] = useState(false);  // id of laporan being edited
    const [editFile, setEditFile] = useState(null);
    const [editJudul, setEditJudul] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // Modals
    const [previewTarget, setPreviewTarget] = useState(null);
    const [hapusTarget, setHapusTarget] = useState(null);
    const [hapusLoading, setHapusLoading] = useState(false);

    const [msg, showMsg] = useMsg();
    const fileRef = useRef();
    const editFileRef = useRef();
    const [parsedDocx, setParsedDocx] = useState(null);
    const [docxValidation, setDocxValidation] = useState(null);
    const [parsingDocx, setParsingDocx] = useState(false);
    const [showDocxPreview, setShowDocxPreview] = useState(false);
    // Structured JSON — new single source of truth (pages[] format)
    const [structuredJson, setStructuredJson] = useState(null);
    const [docViewTab, setDocViewTab] = useState('preview'); // 'preview' | 'edit'
    const imageRef = useRef();
    const uploadSectionRef = useRef();


    /* ── Resolve seksiId ─────────────────────────────────────────────────── */
    useEffect(() => {
        let cancelled = false;
        const resolve = async () => {
            try {
                const directId = parseInt(user?.seksiId);

                // --- Coba resolve dari Supabase ---
                if (!isNaN(directId) && directId > 0) {
                    const { data, error } = await supabase
                        .from('sections').select('id, name').eq('id', directId).single();
                    if (!error && data && !cancelled) {
                        setResolvedSeksiId(data.id);
                        setResolvedSeksiName(data.name);
                        return;
                    }
                    // Jika query gagal (misal RLS), gunakan langsung dari user data
                    if (!cancelled && !isNaN(directId) && directId > 0) {
                        console.warn('Supabase sections query gagal, pakai seksiId dari user:', directId, error?.message);
                        setResolvedSeksiId(directId);
                        setResolvedSeksiName(user?.seksi?.name || `Seksi ${directId}`);
                        return;
                    }
                }

                // --- Fallback by alias ---
                const alias = user?.seksi?.alias || user?.seksi?.name || '';
                if (alias) {
                    const { data, error } = await supabase
                        .from('sections').select('id, name')
                        .or(`name.ilike.%${alias}%,alias.ilike.%${alias}%`).limit(1);
                    if (!error && data?.length && !cancelled) {
                        setResolvedSeksiId(data[0].id);
                        setResolvedSeksiName(data[0].name);
                        return;
                    }
                }

                // --- Fallback terakhir: pakai user.seksiId apa adanya ---
                const fallbackId = parseInt(user?.seksiId);
                if (!cancelled && !isNaN(fallbackId) && fallbackId > 0) {
                    console.warn('Semua resolve gagal, fallback ke user.seksiId:', fallbackId);
                    setResolvedSeksiId(fallbackId);
                    setResolvedSeksiName(user?.seksi?.name || user?.seksi?.alias || `Seksi ${fallbackId}`);
                }
            } catch (err) {
                console.error('resolve seksi error:', err);
                // Bahkan jika terjadi exception, tetap coba pakai seksiId dari user
                const fallbackId = parseInt(user?.seksiId);
                if (!isNaN(fallbackId) && fallbackId > 0) {
                    setResolvedSeksiId(fallbackId);
                    setResolvedSeksiName(user?.seksi?.name || `Seksi ${fallbackId}`);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        if (user?.role === 'admin_seksi') resolve();
        else setLoading(false);
        return () => { cancelled = true; };
    }, [user]);

    /* ── Load laporan ────────────────────────────────────────────────────── */
    const reloadLaporan = useCallback(async (sid) => {
        if (!sid) return;
        setLoading(true);
        const data = await loadLaporanBySeksi(sid);
        setLaporan(data);
        setLoading(false);
    }, [loadLaporanBySeksi]);

    useEffect(() => {
        if (resolvedSeksiId) reloadLaporan(resolvedSeksiId);
    }, [resolvedSeksiId, reloadLaporan]);

    // Subscribe to cross-component refresh
    useEffect(() => {
        const unsub = subscribe(() => {
            if (resolvedSeksiId) reloadLaporan(resolvedSeksiId);
        });
        return unsub;
    }, [subscribe, resolvedSeksiId, reloadLaporan]);

    /* ── Derived ─────────────────────────────────────────────────────────── */
    const laporanBulanIni = laporan.find(
        l => l.bulan === selectedBulan && l.tahun === selectedTahun
    );
    const isLocked = laporanBulanIni?.final_locked;

    /* ── File validation + DOCX parse ───────────────────────────────── */
    const handleFileChange = async (e, setter) => {
        const file = e.target.files?.[0];
        if (!file) { setter(null); return; }
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!['.pdf', '.docx', '.doc'].includes(ext)) {
            showMsg('error', `Format tidak didukung: ${ext}. Gunakan PDF / DOCX / DOC.`);
            e.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showMsg('error', 'Ukuran file maksimal 10 MB.');
            e.target.value = '';
            return;
        }
        setter(file);

        // DOCX Fidelity Engine: validate & parse .docx files
        if (ext === '.docx' || ext === '.doc') {
            setParsedDocx(null);
            setDocxValidation(null);
            setShowDocxPreview(false);
            setStructuredJson(null);
            setParsingDocx(true);
            try {
                // Step 1: Validate file structure
                const validation = await validateDocxFile(file);
                setDocxValidation(validation);
                if (!validation.valid) {
                    showMsg('error', `❌ File tidak valid: ${validation.errors[0]}`);
                    setParsingDocx(false);
                    return;
                }
                // Step 2a: Parse to fidelity-preserved HTML (mammoth — for docx_html fallback)
                const parsed = await parseDocxFile(file, { preserveLayout: true });
                if (!parsed.error) {
                    setParsedDocx(parsed);
                    if ((validation.warnings.length > 0 || parsed.warnings.length > 0)) {
                        setDocxValidation(prev => ({
                            ...prev,
                            warnings: [...(prev?.warnings || []), ...parsed.warnings],
                        }));
                    }
                }
                // Step 2b: Parse to structured pages[] JSON (new)
                const structured = await parseDocxStructured(file);
                if (!structured.error && structured.pages.length > 0) {
                    setStructuredJson(structured);
                    setShowDocxPreview(true);
                    const pgCount = structured.pages.length;
                    const orient = structured.metadata?.orientation || 'portrait';
                    showMsg('success', `✅ DOCX berhasil diparse — ${pgCount} halaman, ${orient}.`);
                } else if (parsed.error && structured.error) {
                    showMsg('error', `❌ Parse DOCX gagal: ${structured.error}`);
                }
            } catch (err) {
                showMsg('error', `❌ Gagal memproses DOCX: ${err.message}`);
            } finally {
                setParsingDocx(false);
            }
        } else if (ext === '.pdf') {
            // PDF: run layout-aware parser
            setParsedDocx(null);
            setDocxValidation(null);
            setShowDocxPreview(false);
            setStructuredJson(null);
            setParsingDocx(true);
            try {
                const structured = await parsePdfStructured(file);
                if (!structured.error && structured.pages.length > 0) {
                    setStructuredJson(structured);
                    setShowDocxPreview(true);
                    showMsg('success', `✅ PDF diparse — ${structured.pages.length} halaman.`);
                } else {
                    // PDF parse failed — just show file name, upload still works
                    showMsg('info', 'ℹ️ PDF akan diupload tanpa structured preview.');
                }
            } catch (err) {
                showMsg('info', 'ℹ️ PDF parser tidak tersedia, upload tetap berjalan.');
            } finally {
                setParsingDocx(false);
            }
        } else {
            setParsedDocx(null);
            setDocxValidation(null);
            setShowDocxPreview(false);
            setStructuredJson(null);
        }
    };

    /* ── Add image to content_json ───────────────────────────────────────── */
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAddingImage(true);
        const { block, error } = await processImageToBlock(file, resolvedSeksiName, imageCaption);
        if (error) showMsg('error', `❌ Gambar gagal: ${error}`);
        else {
            setContentJson(prev => ({ ...prev, blocks: [...prev.blocks, block] }));
            setImageCaption('');
            showMsg('success', `✅ Gambar "${file.name}" ditambahkan.`);
        }
        e.target.value = '';
        setAddingImage(false);
    };

    const handleRemoveImage = (idx) => {
        setContentJson(prev => ({
            ...prev,
            blocks: prev.blocks.filter((_, i) => i !== idx),
        }));
    };

    /* ── UPLOAD ────────────────────────────────────────────────── */
    const handleUpload = async () => {
        if (!selectedFile) return showMsg('error', 'Pilih file terlebih dahulu.');
        if (isLocked) return showMsg('error', 'Laporan ini sudah dikunci (Final).');
        if (!resolvedSeksiId) return showMsg('error', 'Seksi belum terdeteksi. Coba refresh.');

        // Block if DOCX validation failed
        if (docxValidation && !docxValidation.valid) {
            return showMsg('error', '❌ File tidak dapat diupload karena validasi gagal.');
        }

        setUploading(true);
        try {
            const result = await ctxUpload({
                seksiId: resolvedSeksiId,
                bulan: selectedBulan,
                tahun: selectedTahun,
                file: selectedFile,
                contentJson,
                judul: judulLaporan || selectedFile.name,
                userId: user?.id,
                userName: user?.nama || resolvedSeksiName,
                existingFilePath: laporanBulanIni?.file_path || null,
                // DOCX Fidelity Engine data (HTML for backward compat)
                docxHtml: parsedDocx?.html || null,
                docxMeta: parsedDocx ? {
                    ...parsedDocx.styleMetadata,
                    ...(docxValidation?.info || {}),
                    parsedAt: new Date().toISOString(),
                    // Include orientation detected from structured parser for export
                    orientation: structuredJson?.metadata?.orientation || 'portrait',
                } : null,
                // NEW: Structured JSON pages[]
                structuredJson: structuredJson || null,
            });

            if (result.error) throw new Error(result.error);

            showMsg('success', `✅ File berhasil di-upload!${parsedDocx ? ' Preview DOCX tersedia.' : ''}`);
            setSelectedFile(null);
            setJudulLaporan('');
            setContentJson({ version: '2.0', blocks: [] });
            setParsedDocx(null);
            setDocxValidation(null);
            setShowDocxPreview(false);
            if (fileRef.current) fileRef.current.value = '';
            await reloadLaporan(resolvedSeksiId);
            if (user) fetchLaporanNotifs(user);
        } catch (err) {
            showMsg('error', `Upload gagal: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    /* ── SUBMIT untuk review ─────────────────────────────────────────────── */
    const handleSubmit = async () => {
        if (!laporanBulanIni) return showMsg('error', 'Upload file terlebih dahulu.');
        if (laporanBulanIni.status === 'Dikirim') return showMsg('error', 'Laporan sudah dikirim.');
        if (laporanBulanIni.status === 'Disetujui') return showMsg('error', 'Laporan sudah disetujui.');
        if (isLocked) return showMsg('error', 'Laporan dikunci.');

        setSubmitting(true);
        try {
            const result = await ctxSubmit({
                id: laporanBulanIni.id,
                bulan: selectedBulan,
                tahun: selectedTahun,
                userId: user?.id,
                userName: user?.nama,
            });
            if (result.error) throw new Error(result.error);
            showMsg('success', 'Laporan berhasil dikirim untuk di-review!');
            await reloadLaporan(resolvedSeksiId);
            if (user) fetchLaporanNotifs(user);
        } catch (err) {
            showMsg('error', `Gagal kirim: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── EDIT — open edit mode ────────────────────────────────────────────── */
    const openEdit = (l) => {
        setEditMode(l.id);
        setEditJudul(l.judul_laporan || l.file_name || '');
        setEditFile(null);
        if (editFileRef.current) editFileRef.current.value = '';
    };

    const cancelEdit = () => {
        setEditMode(false);
        setEditFile(null);
        setEditJudul('');
    };

    /* ── SIMPAN edit ──────────────────────────────────────────────────────── */
    const handleSimpanEdit = async (l) => {
        setSavingEdit(true);
        try {
            const result = await ctxEdit({
                id: l.id,
                seksiId: resolvedSeksiId,
                bulan: l.bulan,
                tahun: l.tahun,
                judul: editJudul || l.file_name,
                file: editFile || null,
                userId: user?.id,
                userName: user?.nama,
            });
            if (result.error) throw new Error(result.error);
            showMsg('success', '✅ Laporan berhasil diperbarui!');
            cancelEdit();
            await reloadLaporan(resolvedSeksiId);
        } catch (err) {
            showMsg('error', `Gagal simpan: ${err.message}`);
        } finally {
            setSavingEdit(false);
        }
    };

    /* ── HAPUS ────────────────────────────────────────────────────────────── */
    const handleHapus = async () => {
        if (!hapusTarget) return;
        setHapusLoading(true);
        try {
            const result = await ctxHapus({
                id: hapusTarget.id,
                filePath: hapusTarget.file_path,
                bulan: hapusTarget.bulan,
                tahun: hapusTarget.tahun,
                userId: user?.id,
                userName: user?.nama,
            });
            if (result.error) throw new Error(result.error);
            showMsg('success', '🗑️ Laporan berhasil dihapus.');
            setHapusTarget(null);
            await reloadLaporan(resolvedSeksiId);
            if (user) fetchLaporanNotifs(user);
        } catch (err) {
            showMsg('error', `Hapus gagal: ${err.message}`);
        } finally {
            setHapusLoading(false);
        }
    };

    /* ── Scroll to upload ─────────────────────────────────────────────────── */
    const handleRevisiSekarang = () => {
        uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => fileRef.current?.click(), 400);
    };

    const tahunOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const seksiNama = resolvedSeksiName || user?.seksi?.name || 'Seksi Anda';
    const canUpload = !isLocked && !!resolvedSeksiId && !!selectedFile && !uploading;

    /* ── RENDER ──────────────────────────────────────────────────────────── */
    return (
        <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    📄 Upload Laporan Bulanan
                </h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
                    {seksiNama} — Hanya laporan seksi Anda yang dapat diakses.
                </p>
            </div>

            {/* Notifikasi */}
            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
                    fontSize: '14px', whiteSpace: 'pre-line',
                    background: msg.type === 'success' ? '#dcfce7' : msg.type === 'info' ? '#eff6ff' : '#fee2e2',
                    color: msg.type === 'success' ? '#15803d' : msg.type === 'info' ? '#1d4ed8' : '#b91c1c',
                    border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : msg.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
                }}>
                    {msg.text}
                </div>
            )}

            {/* Warning: seksi belum resolve */}
            {!resolvedSeksiId && !loading && (
                <div style={{
                    padding: '14px 16px', borderRadius: '8px', marginBottom: '20px',
                    background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '14px', color: '#9a3412'
                }}>
                    ⚠️ <strong>Seksi belum terdeteksi.</strong><br />
                    Pastikan setup SQL sudah dijalankan dan akun Anda sudah memiliki seksi_id valid.
                    Coba logout &amp; login ulang atau hubungi Super Admin.
                </div>
            )}

            {/* Banner Revisi */}
            {laporanBulanIni?.status === 'Perlu Revisi' && laporanBulanIni.catatan_revisi && (
                <div style={{
                    padding: '20px 24px', borderRadius: '12px', marginBottom: '20px',
                    background: 'linear-gradient(135deg,#fff1f2 0%,#fff7ed 100%)',
                    border: '2px solid #f87171', boxShadow: '0 4px 12px rgba(239,68,68,.12)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                            background: '#fee2e2', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '22px',
                        }}>🔄</div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: '15px', color: '#b91c1c', margin: '0 0 6px' }}>
                                Laporan Memerlukan Revisi
                            </p>
                            <div style={{
                                background: '#fff', border: '1px solid #fca5a5',
                                borderRadius: '8px', padding: '12px 14px', marginBottom: '14px',
                            }}>
                                <p style={{ fontSize: '12px', color: '#9a3412', fontWeight: 600, margin: '0 0 4px' }}>
                                    📝 Catatan dari Super Admin:
                                </p>
                                <p style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: 1.65, margin: 0 }}>
                                    {laporanBulanIni.catatan_revisi}
                                </p>
                            </div>
                            <button
                                onClick={handleRevisiSekarang}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                                    background: '#dc2626', color: '#fff', fontWeight: 700,
                                    fontSize: '14px', cursor: 'pointer',
                                }}
                            >
                                ⬆️ Upload Revisi Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Upload Form ─────────────────────────────────────────────── */}
            <div ref={uploadSectionRef} style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '28px', boxShadow: '0 1px 4px rgba(0,0,0,.05)'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    {laporanBulanIni?.status === 'Perlu Revisi' ? '⬆️ Upload Revisi Laporan' : '⬆️ Upload Laporan Baru'}
                </h2>

                {/* Bulan & Tahun */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Bulan</label>
                        <select value={selectedBulan} onChange={e => setSelectedBulan(+e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                            {BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Tahun</label>
                        <select value={selectedTahun} onChange={e => setSelectedTahun(+e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                            {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Status saat ini */}
                {laporanBulanIni && (
                    <div style={{
                        padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
                        background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
                    }}>
                        <span>Status:</span>
                        <span style={{
                            padding: '2px 10px', borderRadius: '99px', fontWeight: 600, fontSize: '13px',
                            background: STATUS_COLOR[laporanBulanIni.status]?.bg,
                            color: STATUS_COLOR[laporanBulanIni.status]?.text,
                        }}>
                            {laporanBulanIni.status}
                        </span>
                        {laporanBulanIni.file_name && (
                            <span style={{ color: '#64748b', fontSize: '13px' }}>
                                📎 {laporanBulanIni.judul_laporan || laporanBulanIni.file_name}
                                {laporanBulanIni.file_type && (
                                    <span style={{
                                        marginLeft: '6px', padding: '1px 6px', borderRadius: '4px',
                                        fontSize: '11px', fontWeight: 700,
                                        background: laporanBulanIni.file_type === 'pdf' ? '#fee2e2' : '#dbeafe',
                                        color: laporanBulanIni.file_type === 'pdf' ? '#b91c1c' : '#1d4ed8',
                                    }}>
                                        {laporanBulanIni.file_type.toUpperCase()}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                )}

                {/* Judul laporan */}
                <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        Judul Laporan <span style={{ color: '#94a3b8' }}>(opsional — default: nama file)</span>
                    </label>
                    <input
                        type="text"
                        value={judulLaporan}
                        onChange={e => setJudulLaporan(e.target.value)}
                        placeholder={`Laporan Bulanan ${seksiNama} ${BULAN_NAMES[selectedBulan]} ${selectedTahun}`}
                        disabled={isLocked || !resolvedSeksiId}
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: '8px',
                            border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box',
                            background: (isLocked || !resolvedSeksiId) ? '#f1f5f9' : '#fff',
                        }}
                    />
                </div>

                {/* File input */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        File Laporan
                        <span style={{ color: '#94a3b8', marginLeft: '6px' }}>(PDF, DOCX, DOC — maks. 10 MB)</span>
                    </label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.docx,.doc"
                        disabled={isLocked || !resolvedSeksiId}
                        onChange={e => handleFileChange(e, setSelectedFile)}
                        style={{
                            display: 'block', padding: '8px', border: '1px dashed #cbd5e1',
                            borderRadius: '8px', width: '100%', fontSize: '14px',
                            background: (isLocked || !resolvedSeksiId) ? '#f1f5f9' : '#fff',
                            boxSizing: 'border-box',
                        }}
                    />
                    {selectedFile && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#0369a1', display: 'flex', gap: '6px' }}>
                            <span>📎</span>
                            <span>{selectedFile.name}</span>
                            <span style={{ color: '#94a3b8' }}>({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                        </div>
                    )}
                    {isLocked && (
                        <p style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>
                            ⛔ Laporan sudah dikunci (Final). Tidak dapat diedit.
                        </p>
                    )}
                </div>

                {/* ── DOCX Fidelity Engine: Parsing Indicator ─────────────── */}
                {parsingDocx && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 16px', borderRadius: '8px', marginBottom: '14px',
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        fontSize: '13px', color: '#1d4ed8',
                    }}>
                        <span style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>⏳</span>
                        <span>🔍 Menganalisis struktur DOCX — memvalidasi & mem-parse konten...</span>
                    </div>
                )}

                {/* ── DOCX Fidelity Engine: Validation Result Panel ──────── */}
                {!parsingDocx && docxValidation && (
                    <div style={{ marginBottom: '14px' }}>
                        {/* Valid banner */}
                        {docxValidation.valid && parsedDocx && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '8px',
                                background: '#dcfce7', border: '1px solid #bbf7d0',
                                fontSize: '13px', color: '#15803d', marginBottom: '8px',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                                    ✅ File DOCX valid — siap diupload dengan fidelity penuh
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    {parsedDocx.styleMetadata?.paragraphCount > 0 && (
                                        <span>📝 {parsedDocx.styleMetadata.paragraphCount} paragraf</span>
                                    )}
                                    {parsedDocx.styleMetadata?.tableCount > 0 && (
                                        <span>📊 {parsedDocx.styleMetadata.tableCount} tabel</span>
                                    )}
                                    {parsedDocx.styleMetadata?.imageCount > 0 && (
                                        <span>🖼️ {parsedDocx.styleMetadata.imageCount} gambar</span>
                                    )}
                                    {parsedDocx.styleMetadata?.hasLists && (
                                        <span>📋 daftar / bullet</span>
                                    )}
                                    {parsedDocx.styleMetadata?.headingLevels?.length > 0 && (
                                        <span>🔤 heading H{parsedDocx.styleMetadata.headingLevels.join('/H')}</span>
                                    )}
                                    {docxValidation.info?.sizeMb && (
                                        <span style={{ color: '#166534' }}>💾 {docxValidation.info.sizeMb} MB</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Errors */}
                        {docxValidation.errors?.length > 0 && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '8px',
                                background: '#fee2e2', border: '1px solid #fecaca',
                                fontSize: '13px', color: '#b91c1c', marginBottom: '8px',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: '6px' }}>❌ File tidak valid:</div>
                                {docxValidation.errors.map((err, i) => (
                                    <div key={i} style={{ marginBottom: '2px' }}>• {err}</div>
                                ))}
                            </div>
                        )}

                        {/* Warnings */}
                        {docxValidation.warnings?.length > 0 && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '8px',
                                background: '#fef3c7', border: '1px solid #fde68a',
                                fontSize: '13px', color: '#92400e',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: '6px' }}>⚠️ Catatan:</div>
                                {docxValidation.warnings.map((w, i) => (
                                    <div key={i} style={{ marginBottom: '2px' }}>• {w}</div>
                                ))}
                            </div>
                        )}

                        {/* Preview toggle button */}
                        {parsedDocx?.html && (
                            <button
                                onClick={() => setShowDocxPreview(v => !v)}
                                style={{
                                    marginTop: '10px', padding: '8px 16px',
                                    borderRadius: '8px', border: '1px solid #2563eb',
                                    background: showDocxPreview ? '#2563eb' : '#fff',
                                    color: showDocxPreview ? '#fff' : '#2563eb',
                                    fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}
                            >
                                {showDocxPreview ? '🙈 Tutup Preview' : '👁️ Preview Dokumen (WYSIWYG)'}
                            </button>
                        )}
                    </div>
                )}

                {/* ── DOCX Fidelity Engine: Inline Preview ───────────────── */}
                {showDocxPreview && parsedDocx?.html && (
                    <div style={{ marginBottom: '16px' }}>
                        <DocxPreviewRenderer
                            html={parsedDocx.html}
                            styleMetadata={parsedDocx.styleMetadata || {}}
                            preserveLayout={true}
                            maxHeight="60vh"
                            showToolbar={true}
                        />
                    </div>
                )}

                {/* Tombol aksi */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleUpload}
                        disabled={!canUpload}
                        style={{
                            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
                            fontSize: '14px',
                            background: canUpload ? '#2563eb' : '#94a3b8',
                            color: '#fff',
                            cursor: canUpload ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {uploading ? '⏳ Mengupload...' : '⬆️ Upload File'}
                    </button>

                    {laporanBulanIni && ['Draft', 'Perlu Revisi'].includes(laporanBulanIni.status) && !isLocked && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
                                fontSize: '14px',
                                background: submitting ? '#94a3b8' : laporanBulanIni.status === 'Perlu Revisi' ? '#dc2626' : '#16a34a',
                                color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {submitting ? '⏳ Mengirim...' : laporanBulanIni.status === 'Perlu Revisi' ? '📨 Kirim Ulang Revisi' : '📨 Kirim untuk Review'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Lampiran Foto ───────────────────────────────────────────── */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '28px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                        🖼️ Lampiran Foto &amp; Gambar
                        {contentJson.blocks.length > 0 && (
                            <span style={{
                                marginLeft: '10px', padding: '2px 10px', borderRadius: '99px',
                                background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: 700,
                            }}>
                                {contentJson.blocks.length} gambar
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => imageRef.current?.click()}
                        disabled={addingImage || !resolvedSeksiId}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none',
                            background: addingImage || !resolvedSeksiId ? '#e2e8f0' : '#2563eb',
                            color: addingImage || !resolvedSeksiId ? '#94a3b8' : '#fff',
                            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                    >
                        {addingImage ? '⏳ Memproses...' : '➕ Tambah Gambar'}
                    </button>
                </div>

                <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

                <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        Keterangan gambar (opsional — isi sebelum klik Tambah Gambar)
                    </label>
                    <input
                        type="text" value={imageCaption} onChange={e => setImageCaption(e.target.value)}
                        placeholder="Contoh: Kegiatan razia WNA di Simalungun"
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: '8px',
                            border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box',
                        }}
                    />
                </div>

                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                    Format: PNG, JPG, WEBP · Maks. 5 MB per gambar · Gambar disimpan permanen (base64).
                </p>

                {contentJson.blocks.length === 0 ? (
                    <div style={{
                        border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '28px',
                        textAlign: 'center', color: '#94a3b8', fontSize: '13px',
                    }}>
                        📷 Belum ada gambar. Klik <strong>Tambah Gambar</strong> untuk menambahkan foto.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '14px' }}>
                        {contentJson.blocks.map((block, idx) => (
                            <div key={block.id || idx} style={{
                                border: '1px solid #e2e8f0', borderRadius: '10px',
                                overflow: 'hidden', position: 'relative',
                                boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                            }}>
                                <img
                                    src={block.base64}
                                    alt={block.caption || 'Gambar'}
                                    style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                                />
                                <div style={{ padding: '8px' }}>
                                    {block.caption && (
                                        <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 4px', fontStyle: 'italic' }}>
                                            {block.caption}
                                        </p>
                                    )}
                                    <button onClick={() => handleRemoveImage(idx)} style={{
                                        width: '100%', padding: '4px', borderRadius: '6px',
                                        border: '1px solid #fca5a5', background: '#fff1f2',
                                        color: '#b91c1c', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                    }}>
                                        🗑️ Hapus
                                    </button>
                                </div>
                                <div style={{
                                    position: 'absolute', top: '6px', right: '6px',
                                    background: '#16a34a', color: '#fff', borderRadius: '99px',
                                    fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                                }}>✅ Tersimpan</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Riwayat Laporan ─────────────────────────────────────────── */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,.05)'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    📋 Riwayat Laporan — {seksiNama}
                </h2>

                {loading ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Memuat...</p>
                ) : laporan.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                        Belum ada laporan yang diupload.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['Bulan', 'Tahun', 'Judul / File', 'Tipe', 'Status', 'Aksi'].map(h => (
                                        <th key={h} style={{
                                            padding: '10px 12px', textAlign: 'left',
                                            color: '#64748b', fontWeight: 600,
                                            borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap'
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {laporan.map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                            {BULAN_NAMES[l.bulan]}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>{l.tahun}</td>
                                        <td style={{
                                            padding: '10px 12px', maxWidth: '200px',
                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap', fontSize: '13px'
                                        }}>
                                            {editMode === l.id ? (
                                                <input
                                                    value={editJudul}
                                                    onChange={e => setEditJudul(e.target.value)}
                                                    style={{
                                                        padding: '4px 8px', borderRadius: '6px',
                                                        border: '1px solid #2563eb', fontSize: '13px',
                                                        width: '100%', boxSizing: 'border-box',
                                                    }}
                                                />
                                            ) : (
                                                l.judul_laporan || l.file_name || '-'
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            {l.file_type ? (
                                                <span style={{
                                                    background: l.file_type === 'pdf' ? '#fee2e2' : '#dbeafe',
                                                    color: l.file_type === 'pdf' ? '#b91c1c' : '#1d4ed8',
                                                    padding: '2px 8px', borderRadius: '4px',
                                                    fontSize: '11px', fontWeight: 700,
                                                }}>{l.file_type.toUpperCase()}</span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                padding: '2px 10px', borderRadius: '99px',
                                                fontWeight: 600, fontSize: '12px',
                                                background: STATUS_COLOR[l.status]?.bg,
                                                color: STATUS_COLOR[l.status]?.text,
                                            }}>{l.status}</span>
                                        </td>

                                        {/* ── Action Buttons ──────────────────────────────── */}
                                        <td style={{ padding: '10px 12px' }}>
                                            {editMode === l.id ? (
                                                /* Edit mode row */
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
                                                    {/* Ganti file (optional) */}
                                                    <input
                                                        ref={editFileRef}
                                                        type="file"
                                                        accept=".pdf,.docx,.doc"
                                                        onChange={e => handleFileChange(e, setEditFile)}
                                                        style={{ fontSize: '12px' }}
                                                    />
                                                    {editFile && (
                                                        <span style={{ fontSize: '11px', color: '#0369a1' }}>
                                                            📎 {editFile.name}
                                                        </span>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button
                                                            onClick={() => handleSimpanEdit(l)}
                                                            disabled={savingEdit}
                                                            style={{
                                                                padding: '5px 14px', borderRadius: '6px', border: 'none',
                                                                background: savingEdit ? '#94a3b8' : '#16a34a', color: '#fff',
                                                                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                                            }}
                                                        >
                                                            {savingEdit ? '⏳' : '🟢 Simpan'}
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            style={{
                                                                padding: '5px 12px', borderRadius: '6px',
                                                                border: '1px solid #e2e8f0', background: '#fff',
                                                                fontSize: '12px', cursor: 'pointer', fontWeight: 600,
                                                            }}
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Normal action buttons */
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {/* 🔵 Edit */}
                                                    {!l.final_locked && (
                                                        <button
                                                            onClick={() => openEdit(l)}
                                                            title="Edit judul / ganti file"
                                                            style={{
                                                                padding: '5px 10px', borderRadius: '6px', border: 'none',
                                                                background: '#dbeafe', color: '#1d4ed8',
                                                                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                                            }}
                                                        >
                                                            🔵 Edit
                                                        </button>
                                                    )}

                                                    {/* 🟡 Tinjau */}
                                                    {l.file_url && (
                                                        <button
                                                            onClick={() => setPreviewTarget(l)}
                                                            title="Preview file"
                                                            style={{
                                                                padding: '5px 10px', borderRadius: '6px', border: 'none',
                                                                background: '#fef9c3', color: '#854d0e',
                                                                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                                            }}
                                                        >
                                                            🟡 Tinjau
                                                        </button>
                                                    )}

                                                    {/* 🔴 Hapus — selalu tersedia */}
                                                    <button
                                                        onClick={() => setHapusTarget(l)}
                                                        title="Hapus laporan"
                                                        style={{
                                                            padding: '5px 10px', borderRadius: '6px', border: 'none',
                                                            background: '#fee2e2', color: '#b91c1c',
                                                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                                        }}
                                                    >
                                                        🔴 Hapus
                                                    </button>

                                                    {/* Re-upload */}
                                                    {['Draft', 'Perlu Revisi'].includes(l.status) && !l.final_locked && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedBulan(l.bulan);
                                                                setSelectedTahun(l.tahun);
                                                                uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                setTimeout(() => fileRef.current?.click(), 400);
                                                            }}
                                                            title="Upload ulang file"
                                                            style={{
                                                                padding: '5px 10px', borderRadius: '6px', border: 'none',
                                                                background: l.status === 'Perlu Revisi' ? '#fee2e2' : '#f1f5f9',
                                                                color: l.status === 'Perlu Revisi' ? '#b91c1c' : '#64748b',
                                                                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                                            }}
                                                        >
                                                            🔄 {l.status === 'Perlu Revisi' ? 'Revisi' : 'Ganti'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modals ────────────────────────────────────────────────────── */}
            {previewTarget && (
                <PreviewModal laporan={previewTarget} onClose={() => setPreviewTarget(null)} />
            )}
            {hapusTarget && (
                <HapusModal
                    laporan={hapusTarget}
                    loading={hapusLoading}
                    onConfirm={handleHapus}
                    onCancel={() => setHapusTarget(null)}
                />
            )}
        </div>
    );
}
