import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

// --- SHA-256 hash menggunakan Web Crypto API (built-in browser, tanpa library) ---
const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

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
    // LOGIN: query ke app_users, bandingkan hash password
    // ----------------------------------------------------------------
    const login = async (email, password) => {
        try {
            const hash = await sha256(password);

            const { data, error } = await supabase
                .from('app_users')
                .select(`
                    id, nama, email, role, is_active,
                    seksi_id,
                    sections:seksi_id ( id, name, alias, urutan_penggabungan )
                `)
                .eq('email', email.trim().toLowerCase())
                .eq('password_hash', hash)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                return { success: false, message: 'Email atau password salah. Silakan coba lagi.' };
            }

            const userData = {
                id: data.id,
                nama: data.nama,
                email: data.email,
                role: data.role,           // 'super_admin' | 'admin_seksi'
                seksiId: data.seksi_id,
                seksi: data.sections,       // {id, name, alias, urutan_penggabungan}
            };

            setUser(userData);
            sessionStorage.setItem('horas_user', JSON.stringify(userData));

            // Log aktivitas login
            await supabase.from('activity_logs').insert({
                user_id: userData.id,
                user_name: userData.nama,
                action: 'login',
                detail: `Login berhasil sebagai ${userData.role}`,
            });

            // Update last_login
            await supabase
                .from('app_users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userData.id);

            return { success: true, user: userData };

        } catch (err) {
            console.error('Login error:', err);
            return { success: false, message: 'Terjadi kesalahan. Silakan coba lagi.' };
        }
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
