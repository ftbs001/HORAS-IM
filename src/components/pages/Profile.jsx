import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const Profile = ({ onLogout }) => {
    const { user, updateProfile, updateUsername, updatePassword } = useAuth();
    const { showNotification } = useNotification();

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('pribadi');
    const fileInputRef = useRef(null);

    // Profile form — diisi dari user context + localStorage photo
    const [profile, setProfile] = useState({
        nama: user?.nama || '',
        nip: user?.nip || '',
        phone: user?.phone || '',
        bio: '',
        position: '',
        rank: '',
        unit: user?.seksi?.name || '',
        photoUrl: null,
    });

    // Credential form
    const [credentialForm, setCredentialForm] = useState({
        username: user?.nama || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Load bio/photo/position dari localStorage (data lokal tambahan)
    useEffect(() => {
        const saved = localStorage.getItem(`userProfile_${user?.id || 'default'}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            setProfile(prev => ({
                ...prev,
                bio: parsed.bio || '',
                position: parsed.position || '',
                rank: parsed.rank || '',
                photoUrl: parsed.photoUrl || null,
            }));
        }
    }, [user?.id]);

    // Sync nama/nip/phone dari user jika user context berubah
    useEffect(() => {
        setProfile(prev => ({
            ...prev,
            nama: user?.nama || prev.nama,
            nip: user?.nip || prev.nip,
            phone: user?.phone || prev.phone,
            unit: user?.seksi?.name || prev.unit,
        }));
        setCredentialForm(prev => ({ ...prev, username: user?.nama || '' }));
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Simpan nama/nip/phone ke Supabase (atau sessionStorage utk fallback)
            const result = await updateProfile({
                nama: profile.nama,
                nip: profile.nip,
                phone: profile.phone,
            });

            // Simpan data lokal tambahan (bio, jabatan, foto) ke localStorage
            const localData = {
                bio: profile.bio,
                position: profile.position,
                rank: profile.rank,
                photoUrl: profile.photoUrl,
            };
            localStorage.setItem(`userProfile_${user?.id || 'default'}`, JSON.stringify(localData));

            if (result?.success) {
                const isLocal = result?.source === 'local';
                showNotification(
                    isLocal
                        ? 'Profil disimpan (lokal). Hubungkan ke Supabase untuk sinkronisasi penuh. 💾'
                        : 'Profil berhasil disimpan ke database! ✅',
                    isLocal ? 'warning' : 'success'
                );
            } else {
                showNotification('Gagal menyimpan: ' + (result?.message || 'Unknown error'), 'error');
            }
            setIsEditing(false);
        } catch (err) {
            showNotification('Error: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2000000) {
            showNotification('Ukuran foto maksimal 2MB.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfile(prev => ({ ...prev, photoUrl: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleChangeUsername = async () => {
        if (!credentialForm.username) return showNotification('Username tidak boleh kosong', 'warning');
        const result = await updateUsername(credentialForm.username);
        if (result?.success) {
            showNotification('Nama akun berhasil diubah!', 'success');
        } else {
            showNotification('Gagal: ' + result?.message, 'error');
        }
    };

    const handleChangePassword = async () => {
        if (!credentialForm.currentPassword || !credentialForm.newPassword || !credentialForm.confirmPassword) {
            return showNotification('Mohon lengkapi semua field password', 'warning');
        }
        if (credentialForm.newPassword !== credentialForm.confirmPassword) {
            return showNotification('Konfirmasi password baru tidak cocok', 'error');
        }
        if (credentialForm.newPassword.length < 4) {
            return showNotification('Password minimal 4 karakter', 'warning');
        }
        const result = await updatePassword(credentialForm.currentPassword, credentialForm.newPassword);
        if (result?.success) {
            showNotification('Password berhasil diubah! Silakan login ulang.', 'success');
            setCredentialForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } else {
            showNotification('Gagal mengubah password: ' + result?.message, 'error');
        }
    };

    const initials = (name) => (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const isSupabase = user?.source === 'supabase';

    return (
        <div className="page-scroll">
        <div className="space-y-8 animate-fade-in relative">
            {/* Header Banner */}
            <div className="relative h-56 rounded-2xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-imigrasi-navy via-blue-800 to-blue-600" />
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }} />

                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col md:flex-row items-end gap-6 text-white z-10">
                    {/* Avatar */}
                    <div className="relative group/avatar">
                        <div className="w-28 h-28 rounded-2xl bg-white p-1 shadow-2xl transform translate-y-6 relative z-20">
                            <div className="w-full h-full bg-gray-200 rounded-xl overflow-hidden relative">
                                {profile.photoUrl ? (
                                    <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-imigrasi-navy to-blue-700 flex items-center justify-center text-white font-bold text-4xl">
                                        {initials(profile.nama)}
                                    </div>
                                )}
                                {/* Upload overlay */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                                >
                                    <svg className="w-7 h-7 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-white text-xs font-bold">Ganti Foto</span>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 mb-1">
                        <h1 className="text-3xl font-bold font-serif text-white drop-shadow-md">{profile.nama || user?.nama}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-white/80 text-sm">
                            <span className="bg-white/15 backdrop-blur px-3 py-1 rounded-full border border-white/20">
                                {user?.role === 'super_admin' ? '👑 Super Admin' : '🧑‍💼 Admin Seksi'}
                            </span>
                            {user?.seksi?.name && (
                                <span className="bg-white/15 backdrop-blur px-3 py-1 rounded-full border border-white/20">
                                    🏢 {user.seksi.name}
                                </span>
                            )}
                            {isSupabase && (
                                <span className="bg-green-500/30 backdrop-blur px-3 py-1 rounded-full border border-green-400/40 text-green-200 text-xs">
                                    ✅ Terhubung Supabase
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mb-1">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${isEditing ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white text-imigrasi-navy hover:bg-gray-100'}`}
                        >
                            {isEditing ? (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Batal Edit</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Edit Profil</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10 pt-4">
                {/* Left: Bio */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-imigrasi-gold rounded-full" /> Tentang Saya
                        </h3>
                        {isEditing ? (
                            <textarea
                                name="bio"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                rows="4"
                                placeholder="Deskripsi singkat tentang Anda..."
                                value={profile.bio}
                                onChange={handleChange}
                            />
                        ) : (
                            <p className="text-gray-500 text-sm leading-relaxed italic">
                                {profile.bio || 'Belum ada deskripsi.'}
                            </p>
                        )}
                    </div>

                    {/* Info akun */}
                    <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-imigrasi-navy rounded-full" /> Info Akun
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Email</span>
                                <span className="font-medium text-gray-700 text-right text-xs">{user?.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Role</span>
                                <span className="font-medium text-gray-700">{user?.role === 'super_admin' ? 'Super Admin' : 'Admin Seksi'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Seksi</span>
                                <span className="font-medium text-gray-700">{user?.seksi?.name || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Data tersimpan</span>
                                <span className={`text-xs font-bold ${isSupabase ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {isSupabase ? '☁️ Supabase' : '💾 Lokal'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100">
                            {[{ id: 'pribadi', label: 'Data Lengkap' }, { id: 'akun', label: 'Pengaturan Akun' }].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-imigrasi-navy text-imigrasi-navy font-bold bg-blue-50/40' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {activeTab === 'pribadi' ? (
                                <form onSubmit={handleSave} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Nama */}
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Lengkap</label>
                                            <input
                                                type="text" name="nama"
                                                value={profile.nama}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${isEditing ? 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-200 text-gray-700'} outline-none transition`}
                                            />
                                        </div>

                                        {/* NIP */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">NIP</label>
                                            <input
                                                type="text" name="nip"
                                                value={profile.nip}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                placeholder="19XXXXXXXXXXX"
                                                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${isEditing ? 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-200 text-gray-600'} outline-none transition`}
                                            />
                                        </div>

                                        {/* No. Telepon */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">No. Telepon / WhatsApp</label>
                                            <input
                                                type="text" name="phone"
                                                value={profile.phone}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                placeholder="08xx-xxxx-xxxx"
                                                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${isEditing ? 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-200 text-gray-600'} outline-none transition`}
                                            />
                                        </div>

                                        {/* Jabatan */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Jabatan / Posisi</label>
                                            <input
                                                type="text" name="position"
                                                value={profile.position}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                placeholder="Contoh: Analis Keimigrasian..."
                                                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${isEditing ? 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-200 text-gray-600'} outline-none transition`}
                                            />
                                        </div>

                                        {/* Pangkat */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pangkat / Golongan</label>
                                            <input
                                                type="text" name="rank"
                                                value={profile.rank}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                placeholder="Contoh: Penata (III/c)"
                                                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${isEditing ? 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-200 text-gray-600'} outline-none transition`}
                                            />
                                        </div>
                                    </div>

                                    {!isEditing && (
                                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-600">
                                            💡 Klik <strong>Edit Profil</strong> di bagian atas untuk mengubah data Anda.
                                            {isSupabase ? ' Data akan disimpan ke database Supabase.' : ' (Mode offline: data tersimpan lokal)'}
                                        </div>
                                    )}

                                    {isEditing && (
                                        <div className="flex justify-end pt-4 border-t border-gray-100">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="px-8 py-2.5 bg-imigrasi-navy text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg shadow-blue-900/20 transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-60 disabled:transform-none"
                                            >
                                                {saving ? (
                                                    <><span className="animate-spin">⏳</span> Menyimpan...</>
                                                ) : (
                                                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Simpan Perubahan</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                        <p className="text-sm text-yellow-700">
                                            ⚠️ Keamanan akun sangat penting. Disarankan mengganti password secara berkala.
                                        </p>
                                    </div>

                                    <div className="space-y-4 max-w-md">
                                        {/* Ganti Nama Akun */}
                                        <div className="pb-4 border-b border-gray-100">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tampilan Akun</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={credentialForm.username}
                                                    onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleChangeUsername}
                                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-bold shadow transition"
                                                >
                                                    Ubah
                                                </button>
                                            </div>
                                        </div>

                                        {/* Ganti Password */}
                                        <div className="space-y-3 pt-2">
                                            {[
                                                { label: 'Password Saat Ini', key: 'currentPassword' },
                                                { label: 'Password Baru', key: 'newPassword' },
                                                { label: 'Konfirmasi Password Baru', key: 'confirmPassword' },
                                            ].map(f => (
                                                <div key={f.key}>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                                    <input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        value={credentialForm[f.key]}
                                                        onChange={(e) => setCredentialForm({ ...credentialForm, [f.key]: e.target.value })}
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                                    />
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={handleChangePassword}
                                                className="w-full px-4 py-2.5 bg-imigrasi-gold text-[#051020] rounded-lg hover:bg-yellow-400 text-sm font-bold shadow transition mt-1"
                                            >
                                                🔑 Ubah Password
                                            </button>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                                            <p className="text-xs text-gray-400">HORAS-IM v2.1.0</p>
                                            <button
                                                type="button"
                                                onClick={onLogout}
                                                className="px-5 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 border border-red-200 transition flex items-center gap-2 text-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Keluar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
};

export default Profile;
