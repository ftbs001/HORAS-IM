/**
 * ArchiveContext.jsx
 * Manajemen state terpusat untuk sistem Arsip & Dokumen.
 * Mendukung: load, upload, hapus (soft), restore, rename, log aktivitas,
 *            dan auto-archive setelah export dari GabungLaporan.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const ArchiveContext = createContext(null);

export const useArchive = () => {
    const ctx = useContext(ArchiveContext);
    if (!ctx) throw new Error('useArchive must be used within ArchiveProvider');
    return ctx;
};

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const ArchiveProvider = ({ children }) => {
    const [archives, setArchives] = useState([]);
    const [deletedArchives, setDeletedArchives] = useState([]);
    const [activityLog, setActivityLog] = useState([]);
    const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0, thisMonth: 0, latest: null });
    const [loading, setLoading] = useState(false);

    // ── Log aktivitas arsip ───────────────────────────────────────────────────
    const logAktivitas = useCallback(async (archiveId, action, detail, userId, userName) => {
        try {
            await supabase.from('archive_activity_logs').insert({
                archive_id: archiveId || null,
                user_id: String(userId || ''),
                user_name: userName || 'Unknown',
                action,
                detail,
            });
        } catch (err) {
            console.warn('[ArchiveContext] logAktivitas error:', err.message);
        }
    }, []);

    // ── Load arsip aktif + trash ──────────────────────────────────────────────
    const loadArsip = useCallback(async (seksiFilter = null) => {
        setLoading(true);
        try {
            // Active archives
            let q = supabase
                .from('archived_reports')
                .select('*')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });
            if (seksiFilter) q = q.eq('seksi', seksiFilter);
            const { data: active, error } = await q;
            if (error) throw error;

            // Deleted / trash
            let dq = supabase
                .from('archived_reports')
                .select('*')
                .eq('is_deleted', true)
                .order('deleted_at', { ascending: false });
            if (seksiFilter) dq = dq.eq('seksi', seksiFilter);
            const { data: deleted } = await dq;

            setArchives(active || []);
            setDeletedArchives(deleted || []);

            // Stats
            const now = new Date();
            const totalSize = (active || []).reduce((s, r) => s + (r.file_size || 0), 0);
            const thisMonth = (active || []).filter(r => {
                const d = new Date(r.created_at);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length;
            setStats({
                totalFiles: (active || []).length,
                totalSize,
                thisMonth,
                latest: (active || [])[0] || null,
            });
        } catch (err) {
            console.error('[ArchiveContext] loadArsip error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Upload manual ke Supabase Storage ───────────────────────────────────
    const uploadArsip = useCallback(async ({ file, title, reportType, seksi, bulan, tahun, userId, userName }) => {
        try {
            const ext = file.name.split('.').pop().toLowerCase();
            const safeTitle = (title || file.name).replace(/[^a-zA-Z0-9_\-. ]/g, '_');
            const fileName = `${tahun || 'xxxx'}_${String(bulan || 0).padStart(2, '0')}_${Date.now()}_${safeTitle}.${ext}`;
            const filePath = `manual/${fileName}`;

            const { error: upErr } = await supabase.storage
                .from('archived-reports')
                .upload(filePath, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
            if (upErr) {
                if (upErr.message?.toLowerCase().includes('bucket')) {
                    throw new Error('Bucket "archived-reports" belum ada. Jalankan supabase_arsip_upgrade.sql terlebih dahulu.');
                }
                throw upErr;
            }

            const { data: urlData } = supabase.storage.from('archived-reports').getPublicUrl(filePath);

            const { data, error: dbErr } = await supabase
                .from('archived_reports')
                .insert({
                    report_title: title || file.name,
                    report_type: reportType || 'Monthly Report',
                    file_format: ext.toUpperCase(),
                    file_name: file.name,
                    file_path: filePath,
                    file_url: urlData.publicUrl,
                    file_size: file.size,
                    year: tahun || new Date().getFullYear(),
                    month: bulan || null,
                    bulan: bulan || null,
                    seksi: seksi || null,
                    archived_by: userName || 'Unknown',
                    archived_by_id: String(userId || ''),
                    source: 'manual',
                    is_deleted: false,
                    version: 1,
                })
                .select()
                .single();

            if (dbErr) throw dbErr;
            await logAktivitas(data.id, 'upload', `Upload manual: ${file.name} (${seksi || '-'})`, userId, userName);
            return { success: true, data };
        } catch (err) {
            console.error('[ArchiveContext] uploadArsip error:', err);
            return { error: err.message || 'Upload gagal.' };
        }
    }, [logAktivitas]);

    // ── Soft delete ──────────────────────────────────────────────────────────
    const hapusArsip = useCallback(async (id, userId, userName) => {
        try {
            const { error } = await supabase
                .from('archived_reports')
                .update({ is_deleted: true, deleted_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            await logAktivitas(id, 'delete', `Hapus arsip id=${id}`, userId, userName);
            return { success: true };
        } catch (err) {
            return { error: err.message };
        }
    }, [logAktivitas]);

    // ── Restore dari trash ───────────────────────────────────────────────────
    const restoreArsip = useCallback(async (id, userId, userName) => {
        try {
            const { error } = await supabase
                .from('archived_reports')
                .update({ is_deleted: false, deleted_at: null })
                .eq('id', id);
            if (error) throw error;
            await logAktivitas(id, 'restore', `Restore arsip id=${id}`, userId, userName);
            return { success: true };
        } catch (err) {
            return { error: err.message };
        }
    }, [logAktivitas]);

    // ── Rename ───────────────────────────────────────────────────────────────
    const renameArsip = useCallback(async (id, newTitle, userId, userName) => {
        try {
            const { error } = await supabase
                .from('archived_reports')
                .update({ report_title: newTitle, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            await logAktivitas(id, 'rename', `Rename → "${newTitle}"`, userId, userName);
            return { success: true };
        } catch (err) {
            return { error: err.message };
        }
    }, [logAktivitas]);

    // ── Load activity log ────────────────────────────────────────────────────
    const loadActivityLog = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('archive_activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            setActivityLog(data || []);
        } catch (err) {
            console.warn('[ArchiveContext] loadActivityLog error:', err.message);
        }
    }, []);

    // ── Auto-archive setelah export GabungLaporan ────────────────────────────
    const autoArchiveExport = useCallback(async ({
        format, bulan, tahun, seksi, fileUrl, filePath, fileSize, userId, userName,
    }) => {
        try {
            const bNama = BULAN_NAMES[bulan] || '';
            const title = `Laporan Bulanan ${bNama} ${tahun}`;
            const { data, error } = await supabase
                .from('archived_reports')
                .insert({
                    report_title: title,
                    report_type: 'Monthly Report',
                    file_format: format.toUpperCase(),
                    file_name: `Laporan_Bulanan_${bNama}_${tahun}.${format.toLowerCase()}`,
                    file_url: fileUrl || null,
                    file_path: filePath || null,
                    file_size: fileSize || null,
                    year: tahun,
                    month: bulan,
                    bulan: bulan,
                    seksi: seksi || 'Semua Seksi',
                    archived_by: userName || 'Super Admin',
                    archived_by_id: String(userId || ''),
                    source: 'auto_export',
                    is_deleted: false,
                    version: 1,
                })
                .select()
                .single();
            if (error) throw error;
            await logAktivitas(
                data.id, 'upload',
                `Auto-archive export ${format.toUpperCase()} — ${bNama} ${tahun}`,
                userId, userName,
            );
            return { success: true, data };
        } catch (err) {
            console.warn('[ArchiveContext] autoArchiveExport error:', err.message);
            return { error: err.message };
        }
    }, [logAktivitas]);

    return (
        <ArchiveContext.Provider value={{
            archives, deletedArchives, activityLog, stats, loading,
            loadArsip, uploadArsip, hapusArsip, restoreArsip, renameArsip,
            logAktivitas, loadActivityLog, autoArchiveExport,
        }}>
            {children}
        </ArchiveContext.Provider>
    );
};
