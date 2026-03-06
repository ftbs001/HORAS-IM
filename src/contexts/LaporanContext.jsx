/**
 * LaporanContext.jsx
 * State management terpusat untuk laporan_bulanan.
 * Upload → auto-sync ke MonitoringLaporan & GabungLaporan.
 * Semua operasi CRUD (upload, edit, hapus, submit) tersedia di sini.
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from './NotificationContext';

const LaporanContext = createContext(null);

export const useLaporan = () => {
    const ctx = useContext(LaporanContext);
    if (!ctx) throw new Error('useLaporan must be used within LaporanProvider');
    return ctx;
};

const ALLOWED_MIME = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
];
const ALLOWED_EXT = ['.pdf', '.docx', '.doc'];
const MAX_SIZE_MB = 10;

// ── Validate file ──────────────────────────────────────────────────────────────
const validateFile = (file) => {
    if (!file) return 'File tidak dipilih.';
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return `Format tidak didukung: ${ext}. Gunakan PDF / DOCX / DOC.`;
    if (!ALLOWED_MIME.includes(file.type) && file.size > 0) {
        // Allow if MIME is empty (some OS return '' for docx)
        if (file.type !== '' && file.type !== 'application/octet-stream') {
            console.warn('MIME mismatch:', file.type);
        }
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `Ukuran file maksimal ${MAX_SIZE_MB} MB.`;
    return null; // valid
};

export const LaporanProvider = ({ children }) => {
    const { showNotification } = useNotification();

    // ── Shared state accessible by all menus ──────────────────────────────────
    const [sections, setSections] = useState([]);
    const [laporanMap, setLaporanMap] = useState({}); // key: `${bulan}_${tahun}` → array
    const [activeBulan, setActiveBulan] = useState(new Date().getMonth() + 1);
    const [activeTahun, setActiveTahun] = useState(new Date().getFullYear());
    const [loadingMap, setLoadingMap] = useState({});
    const subscribers = useRef(new Set());

    // ── Internal: notify all subscribers (for cross-component refresh) ─────────
    const notifySubscribers = useCallback((bulan, tahun) => {
        subscribers.current.forEach(fn => fn(bulan, tahun));
    }, []);

    // ── Register / unregister subscriber ──────────────────────────────────────
    const subscribe = useCallback((fn) => {
        subscribers.current.add(fn);
        return () => subscribers.current.delete(fn);
    }, []);

    // ── Load sections (once, cached) ───────────────────────────────────────────
    const loadSections = useCallback(async () => {
        if (sections.length > 0) return sections;
        const { data, error } = await supabase
            .from('sections')
            .select('id, name, alias, urutan_penggabungan')
            .order('urutan_penggabungan');
        if (!error && data) {
            const unique = dedup(data);
            setSections(unique);
            return unique;
        }
        return [];
    }, [sections]);

    // ── Load laporan for a given bulan/tahun ───────────────────────────────────
    const loadLaporan = useCallback(async (bulan, tahun) => {
        const key = `${bulan}_${tahun}`;
        setLoadingMap(p => ({ ...p, [key]: true }));
        try {
            const { data, error } = await supabase
                .from('laporan_bulanan')
                .select('*')
                .eq('bulan', bulan)
                .eq('tahun', tahun);
            if (error) {
                console.error('loadLaporan error — kemungkinan RLS memblokir akses:', {
                    message: error.message,
                    code: error.code,
                    hint: error.hint,
                    details: error.details,
                    bulan,
                    tahun,
                });
                throw error;
            }
            setLaporanMap(p => ({ ...p, [key]: data || [] }));
            return data || [];
        } catch (err) {
            console.error('loadLaporan catch:', err);
            return [];
        } finally {
            setLoadingMap(p => ({ ...p, [key]: false }));
        }
    }, []);

    // ── Load laporan for a specific seksi (for UploadLaporan page) ─────────────
    const loadLaporanBySeksi = useCallback(async (seksiId) => {
        if (!seksiId) return [];
        try {
            const { data, error } = await supabase
                .from('laporan_bulanan')
                .select('*')
                .eq('seksi_id', seksiId)
                .order('tahun', { ascending: false })
                .order('bulan', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('loadLaporanBySeksi error:', err);
            return [];
        }
    }, []);

    // ── UPLOAD (or re-upload/replace) laporan ──────────────────────────────────
    const uploadLaporan = useCallback(async ({
        seksiId, bulan, tahun, file, contentJson, judul, userId, userName, existingFilePath,
        docxHtml, docxMeta, structuredJson,
    }) => {
        const fileErr = validateFile(file);
        if (fileErr) return { error: fileErr };
        if (!seksiId) return { error: 'seksiId tidak valid.' };

        try {
            const ext = file.name.split('.').pop().toLowerCase();
            const fileName = `seksi${seksiId}_${tahun}_${String(bulan).padStart(2, '0')}_${Date.now()}.${ext}`;
            const filePath = `uploads/${fileName}`;

            // Hapus file lama dari storage (jika ada)
            if (existingFilePath) {
                await supabase.storage.from('laporan-bulanan').remove([existingFilePath]).catch(() => { });
            }

            // Upload ke Storage
            const { error: uploadErr } = await supabase.storage
                .from('laporan-bulanan')
                .upload(filePath, file, { upsert: true, contentType: file.type || 'application/octet-stream' });

            if (uploadErr) {
                if (uploadErr.message?.toLowerCase().includes('bucket') || uploadErr.statusCode === '404') {
                    throw new Error('Storage bucket belum dibuat. Jalankan supabase_integration_fix.sql terlebih dahulu.');
                }
                throw uploadErr;
            }

            const { data: urlData } = supabase.storage.from('laporan-bulanan').getPublicUrl(filePath);

            // Upsert ke DB — tidak error jika sudah ada (conflict seksi_id,bulan,tahun)
            const { data: dbData, error: dbErr } = await supabase
                .from('laporan_bulanan')
                .upsert({
                    seksi_id: seksiId,
                    bulan,
                    tahun,
                    judul_laporan: judul || file.name,
                    file_name: file.name,
                    file_path: filePath,
                    file_url: urlData.publicUrl,
                    file_size: file.size,
                    file_type: ext,
                    status: 'Draft',
                    content_json: contentJson || { version: '2.0', blocks: [] },
                    catatan_revisi: null,
                    submitted_by: userId || null,
                    updated_at: new Date().toISOString(),
                    // DOCX Fidelity Engine fields
                    docx_html: docxHtml || null,
                    docx_meta: docxMeta || null,
                    preserve_layout: true,
                    // Structured JSON pages[] — new single source of truth
                    structured_json: structuredJson || null,
                }, { onConflict: 'seksi_id,bulan,tahun' })
                .select()
                .single();

            if (dbErr) throw dbErr;

            // Log aktivitas
            void supabase.from('activity_logs').insert({
                user_id: userId, user_name: userName,
                action: 'upload', entity_type: 'laporan_bulanan', entity_id: dbData?.id,
                detail: `Upload laporan seksi_id=${seksiId} ${bulan}/${tahun} (${ext.toUpperCase()})`,
            }).catch(() => { });

            // Sync state
            await loadLaporan(bulan, tahun);
            notifySubscribers(bulan, tahun);

            return { success: true, data: dbData };
        } catch (err) {
            console.error('uploadLaporan error:', err);
            return { error: err.message || 'Upload gagal.' };
        }
    }, [loadLaporan, notifySubscribers]);

    // ── EDIT laporan (judul + optional file replacement) ──────────────────────
    const editLaporan = useCallback(async ({
        id, seksiId, bulan, tahun, judul, file, contentJson, userId, userName,
        docxHtml, docxMeta,
    }) => {
        try {
            let updates = { judul_laporan: judul, updated_at: new Date().toISOString() };

            if (file) {
                const fileErr = validateFile(file);
                if (fileErr) return { error: fileErr };

                // Fetch existing record for old file_path
                const { data: existing } = await supabase
                    .from('laporan_bulanan').select('file_path').eq('id', id).single();

                const ext = file.name.split('.').pop().toLowerCase();
                const fileName = `seksi${seksiId}_${tahun}_${String(bulan).padStart(2, '0')}_${Date.now()}.${ext}`;
                const filePath = `uploads/${fileName}`;

                if (existing?.file_path) {
                    await supabase.storage.from('laporan-bulanan').remove([existing.file_path]).catch(() => { });
                }

                const { error: uploadErr } = await supabase.storage
                    .from('laporan-bulanan')
                    .upload(filePath, file, { upsert: true });
                if (uploadErr) throw uploadErr;

                const { data: urlData } = supabase.storage.from('laporan-bulanan').getPublicUrl(filePath);

                updates = {
                    ...updates,
                    file_name: file.name,
                    file_path: filePath,
                    file_url: urlData.publicUrl,
                    file_size: file.size,
                    file_type: ext,
                };
            }

            if (contentJson !== undefined) {
                updates.content_json = contentJson;
            }
            // DOCX Fidelity Engine: update HTML and metadata if file replaced
            if (docxHtml !== undefined) updates.docx_html = docxHtml;
            if (docxMeta !== undefined) updates.docx_meta = docxMeta;

            const { data, error } = await supabase
                .from('laporan_bulanan')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            void supabase.from('activity_logs').insert({
                user_id: userId, user_name: userName,
                action: 'edit', entity_type: 'laporan_bulanan', entity_id: id,
                detail: `Edit laporan id=${id} ${judul ? `judul="${judul}"` : ''} ${file ? '+ file baru' : ''}`,
            }).catch(() => { });

            await loadLaporan(bulan, tahun);
            notifySubscribers(bulan, tahun);

            return { success: true, data };
        } catch (err) {
            console.error('editLaporan error:', err);
            return { error: err.message || 'Edit gagal.' };
        }
    }, [loadLaporan, notifySubscribers]);

    // ── HAPUS laporan (storage + DB) ──────────────────────────────────────────
    const hapusLaporan = useCallback(async ({ id, filePath, bulan, tahun, userId, userName }) => {
        try {
            // 1. Hapus file dari storage
            if (filePath) {
                const { error: storErr } = await supabase.storage
                    .from('laporan-bulanan').remove([filePath]);
                if (storErr) console.warn('Storage delete warn:', storErr.message);
            }

            // 2. Hapus record (trigger DB akan log ke activity_logs)
            const { error: dbErr } = await supabase
                .from('laporan_bulanan').delete().eq('id', id);
            if (dbErr) throw dbErr;

            // 3. Tambah log manual (trigger sudah insert, ini untuk user context)
            void supabase.from('activity_logs').insert({
                user_id: userId, user_name: userName,
                action: 'delete', entity_type: 'laporan_bulanan', entity_id: id,
                detail: `Hapus laporan id=${id} file=${filePath || '-'}`,
            }).catch(() => { });

            // 4. Sync state
            await loadLaporan(bulan, tahun);
            notifySubscribers(bulan, tahun);

            return { success: true };
        } catch (err) {
            console.error('hapusLaporan error:', err);
            return { error: err.message || 'Hapus gagal.' };
        }
    }, [loadLaporan, notifySubscribers]);

    // ── SUBMIT untuk review ───────────────────────────────────────────────────
    const submitLaporan = useCallback(async ({ id, bulan, tahun, userId, userName }) => {
        try {
            const { error } = await supabase
                .from('laporan_bulanan')
                .update({ status: 'Dikirim', submitted_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;

            void supabase.from('activity_logs').insert({
                user_id: userId, user_name: userName,
                action: 'submit', entity_type: 'laporan_bulanan', entity_id: id,
                detail: `Submit laporan id=${id} ${bulan}/${tahun}`,
            }).catch(() => { });

            await loadLaporan(bulan, tahun);
            notifySubscribers(bulan, tahun);

            return { success: true };
        } catch (err) {
            return { error: err.message };
        }
    }, [loadLaporan, notifySubscribers]);

    // ── Get laporan for bulan/tahun (from cache or fetch) ─────────────────────
    const getLaporan = useCallback((bulan, tahun) => {
        return laporanMap[`${bulan}_${tahun}`] || [];
    }, [laporanMap]);

    const isLoading = useCallback((bulan, tahun) => {
        return !!loadingMap[`${bulan}_${tahun}`];
    }, [loadingMap]);

    return (
        <LaporanContext.Provider value={{
            sections, loadSections,
            loadLaporan, getLaporan, isLoading,
            loadLaporanBySeksi,
            uploadLaporan,
            editLaporan,
            hapusLaporan,
            submitLaporan,
            activeBulan, setActiveBulan,
            activeTahun, setActiveTahun,
            subscribe,
            notifySubscribers,
        }}>
            {children}
        </LaporanContext.Provider>
    );
};

// ── Deduplicate sections by normalized name ────────────────────────────────────
const normalizeName = (name = '') =>
    name.toLowerCase().trim()
        .replace(/^seksi\s+/i, '')
        .replace(/^subbag(ian)?\s+/i, '');

const sectionScore = (r) =>
    (Number(r.staff) || 0) + (Number(r.programs) || 0) + (Number(r.performance) || 0);

const dedup = (rows = []) => {
    const map = new Map();
    rows.forEach(r => {
        const key = normalizeName(r.name);
        const prev = map.get(key);
        if (!prev || sectionScore(r) > sectionScore(prev)) map.set(key, r);
    });
    return Array.from(map.values());
};
