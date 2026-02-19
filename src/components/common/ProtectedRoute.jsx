/**
 * ProtectedRoute – komponen untuk membatasi akses berdasarkan role.
 *
 * Cara pakai:
 *   <ProtectedRoute allowedRoles={['super_admin']}>
 *     <MonitoringLaporan />
 *   </ProtectedRoute>
 *
 * Jika role tidak sesuai, tampilkan halaman "Akses Ditolak".
 */
import { useAuth } from '../../contexts/AuthContext';

const AccessDenied = () => (
    <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: '16px', color: '#64748b'
    }}>
        <span style={{ fontSize: '64px' }}>🔒</span>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Akses Ditolak
        </h2>
        <p style={{ fontSize: '15px', textAlign: 'center', maxWidth: '400px', margin: 0 }}>
            Anda tidak memiliki izin untuk mengakses halaman ini.
            Silakan hubungi Super Admin jika merasa ini adalah kesalahan.
        </p>
    </div>
);

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user } = useAuth();

    if (!user) return <AccessDenied />;
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <AccessDenied />;
    }

    return children;
};

export default ProtectedRoute;
