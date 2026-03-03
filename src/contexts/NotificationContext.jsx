import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within NotificationProvider');
    return context;
};

// ─── Key localStorage untuk timestamp terakhir "dibaca" ───────
const READ_TS_KEY = 'horas_notif_read_ts';

// ─── Ikon & warna per aksi ────────────────────────────────────
export const NOTIF_META = {
    approve: { emoji: '✅', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', label: 'Disetujui' },
    revisi: { emoji: '🔄', color: '#92400e', bg: '#fff7ed', border: '#fed7aa', label: 'Perlu Revisi' },
    finalisasi: { emoji: '🔒', color: '#7e22ce', bg: '#f3e8ff', border: '#e9d5ff', label: 'Difinalisasi' },
    submit: { emoji: '📨', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', label: 'Dikirim' },
    upload: { emoji: '⬆️', color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd', label: 'Upload Baru' },
    gabung_laporan: { emoji: '📎', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe', label: 'Laporan Digabung' },
    login: { emoji: '🔑', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Login' },
};

export const NotificationProvider = ({ children }) => {
    // ── Toast notifications (transient) ───────────────────────
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeNotification(id), 4000);
        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // ── Laporan notifications (persistent, from Supabase) ─────
    const [laporanNotifs, setLaporanNotifs] = useState([]);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const [readTs, setReadTs] = useState(() => {
        return parseInt(localStorage.getItem(READ_TS_KEY) || '0', 10);
    });

    // Fetch notifs berdasarkan user role & seksi
    const fetchLaporanNotifs = useCallback(async (user) => {
        if (!user) return;
        setLoadingNotifs(true);
        try {
            let query = supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(30);

            if (user.role === 'admin_seksi') {
                // Admin seksi: hanya aksi dari superadmin yang menyangkut seksinya (approve, revisi, finalisasi)
                // + aksi diri sendiri (submit, upload) untuk riwayat
                query = query.or(
                    `action.in.(approve,revisi,finalisasi),and(action.in.(submit,upload),user_id.eq.${user.id})`
                );
            } else if (user.role === 'super_admin') {
                // Super admin: semua submit dan upload (laporan masuk dari admin seksi)
                query = query.in('action', ['submit', 'upload', 'gabung_laporan', 'finalisasi']);
            }

            const { data, error } = await query;
            if (!error && data) {
                // Untuk admin_seksi: filter lebih lanjut — hanya notif terkait seksinya
                let filtered = data;
                if (user.role === 'admin_seksi' && user.seksiId) {
                    filtered = data.filter(item => {
                        // Aksi approve/revisi/finalisasi dari superadmin — filter by seksi_id di detail
                        if (['approve', 'revisi', 'finalisasi'].includes(item.action)) {
                            return item.detail?.includes(`seksi_id=${user.seksiId}`) ||
                                item.detail?.includes(`seksi${user.seksiId}`) ||
                                item.user_id === user.id;
                        }
                        // Submit/upload oleh admin itu sendiri
                        return item.user_id === user.id;
                    });
                }
                setLaporanNotifs(filtered);
            }
        } catch (err) {
            console.warn('Gagal memuat notifikasi laporan:', err.message);
        } finally {
            setLoadingNotifs(false);
        }
    }, []);

    // Hitung unread: notifikasi yang created_at lebih baru dari readTs
    const unreadLaporanCount = laporanNotifs.filter(n => {
        const ts = new Date(n.created_at).getTime();
        return ts > readTs;
    }).length;

    // Tandai semua sudah dibaca
    const markAllRead = useCallback(() => {
        const now = Date.now();
        localStorage.setItem(READ_TS_KEY, String(now));
        setReadTs(now);
    }, []);

    return (
        <NotificationContext.Provider value={{
            // Toast
            notifications,
            showNotification,
            removeNotification,
            // Laporan notifs
            laporanNotifs,
            loadingNotifs,
            unreadLaporanCount,
            fetchLaporanNotifs,
            markAllRead,
            NOTIF_META,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
