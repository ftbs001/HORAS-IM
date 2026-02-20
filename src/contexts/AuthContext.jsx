import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

// --- SHA-256 hash menggunakan Web Crypto API ---
const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ----------------------------------------------------------------
// AKUN FALLBACK — aktif jika tabel app_users belum dibuat di Supabase
// Setelah menjalankan supabase_rbac_schema.sql, akun Supabase yang dipakai
// ----------------------------------------------------------------
const FALLBACK_ACCOUNTS = [
    {
        id: 1, nama: 'Super Administrator', email: 'superadmin@horas-im.local',
        password: 'Admin@2026', role: 'super_admin', seksiId: null, seksi: null,
    },
    {
        id: 2, nama: 'Admin Inteldakim', email: 'inteldakim@horas-im.local',
        password: 'Seksi@2026', role: 'admin_seksi', seksiId: 1,
        seksi: { id: 1, name: 'Seksi Inteldakim', alias: 'inteldakim' },
    },
    {
        id: 3, nama: 'Admin Lalintalkim', email: 'lalintalkim@horas-im.local',
        password: 'Seksi@2026', role: 'admin_seksi', seksiId: 2,
        seksi: { id: 2, name: 'Seksi Lalintalkim', alias: 'lalintalkim' },
    },
    {
        id: 4, nama: 'Admin Tikim', email: 'tikim@horas-im.local',
        password: 'Seksi@2026', role: 'admin_seksi', seksiId: 3,
        seksi: { id: 3, name: 'Seksi Tikim', alias: 'tikim' },
    },
    {
        id: 5, nama: 'Admin Tata Usaha', email: 'tu@horas-im.local',
        password: 'Seksi@2026', role: 'admin_seksi', seksiId: 4,
        seksi: { id: 4, name: 'Subbag Tata Usaha', alias: 'tu' },
    },
];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session dari sessionStorage saat app dibuka
    useEffect(() => {
        const stored = sessionStorage.getItem('horas_user');
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
        }
        setIsLoading(false);
    }, []);

    // ----------------------------------------------------------------
    // LOGIN
    // Prioritas 1: Supabase (jika tabel app_users sudah dibuat)
    // Prioritas 2: Fallback hardcoded (sebelum setup DB)
    // ----------------------------------------------------------------
    const login = async (email, password) => {
        const emailNorm = email.trim().toLowerCase();

        // --- Coba login via Supabase ---
        try {
            const hash = await sha256(password);

            const { data, error } = await supabase
                .from('app_users')
                .select(`
                    id, nama, email, role, is_active,
                    seksi_id,
                    sections:seksi_id ( id, name, alias, urutan_penggabungan )
                `)
                .eq('email', emailNorm)
                .eq('password_hash', hash)
                .eq('is_active', true)
                .single();

            // Jika berhasil dari Supabase
            if (data && !error) {
                const userData = {
                    id: data.id, nama: data.nama, email: data.email,
                    role: data.role, seksiId: data.seksi_id, seksi: data.sections,
                    source: 'supabase',
                };
                setUser(userData);
                sessionStorage.setItem('horas_user', JSON.stringify(userData));

                // Log & update last_login (tidak blocking)
                supabase.from('activity_logs').insert({
                    user_id: userData.id, user_name: userData.nama,
                    action: 'login', detail: `Login via Supabase sebagai ${userData.role}`,
                }).catch(() => { });
                supabase.from('app_users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', userData.id).catch(() => { });

                return { success: true, user: userData };
            }

            // Supabase query berhasil tapi tidak ada data → password salah
            // (error code PGRST116 = no rows found → coba fallback tetap)
            const isTableMissing = error?.code === '42P01' || error?.message?.includes('does not exist');

            if (!isTableMissing) {
                // Tabel ada, tapi email/password salah → coba fallback dulu
            }

        } catch (networkErr) {
            console.warn('Supabase tidak tersedia, mencoba fallback:', networkErr.message);
        }

        // --- Fallback: akun hardcoded (sebelum DB di-setup) ---
        const found = FALLBACK_ACCOUNTS.find(
            a => a.email === emailNorm && a.password === password
        );

        if (found) {
            const userData = {
                id: found.id, nama: found.nama, email: found.email,
                role: found.role, seksiId: found.seksiId, seksi: found.seksi,
                source: 'fallback',  // penanda: belum pakai DB
            };
            setUser(userData);
            sessionStorage.setItem('horas_user', JSON.stringify(userData));
            return { success: true, user: userData };
        }

        return {
            success: false,
            message: 'Email atau password salah.\n\nAkun yang tersedia:\n• superadmin@horas-im.local (Admin@2026)\n• inteldakim@horas-im.local (Seksi@2026)',
        };
    };

    // ----------------------------------------------------------------
    // LOGOUT
    // ----------------------------------------------------------------
    const logout = async () => {
        if (user) {
            await supabase.from('activity_logs').insert({
                user_id: user.id,
                user_name: user.nama,
                action: 'logout',
                detail: 'User logout',
            });
        }
        setUser(null);
        sessionStorage.removeItem('horas_user');
    };

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------
    const isSuperAdmin = () => user?.role === 'super_admin';
    const isAdminSeksi = () => user?.role === 'admin_seksi';
    const getSeksiId = () => user?.seksiId ?? null;

    // ----------------------------------------------------------------
    // Ganti password
    // ----------------------------------------------------------------
    const updatePassword = async (currentPassword, newPassword) => {
        try {
            const currentHash = await sha256(currentPassword);
            const { data } = await supabase
                .from('app_users')
                .select('id')
                .eq('id', user.id)
                .eq('password_hash', currentHash)
                .single();

            if (!data) return { success: false, message: 'Password saat ini salah.' };

            const newHash = await sha256(newPassword);
            await supabase
                .from('app_users')
                .update({ password_hash: newHash, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    };

    const value = {
        user,
        isLoading,
        login,
        logout,
        updatePassword,
        isSuperAdmin,
        isAdminSeksi,
        getSeksiId,
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
