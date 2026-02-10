import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const Profile = ({ onLogout }) => {
    const { user, updateUsername, updatePassword } = useAuth();
    const { showNotification } = useNotification();

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('pribadi');
    const fileInputRef = useRef(null);

    // Credential Management State
    const [credentialForm, setCredentialForm] = useState({
        username: user?.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Initial Default Data
    const defaultProfile = {
        name: 'Administrator',
        nip: '19850101 201001 1 001',
        position: 'Analisis Keimigrasian Ahli Muda',
        rank: 'Penata (III/c)',
        email: 'admin@imigrasi-pematangsiantar.go.id',
        phone: '0812-3456-7890',
        unit: 'Seksi Teknologi Informasi & Komunikasi',
        bio: 'Berdedikasi dalam pengembangan sistem informasi manajemen keimigrasian yang modern dan akuntabel.',
        photoUrl: null
    };

    // Load from LocalStorage or use Default
    const [profile, setProfile] = useState(() => {
        const saved = localStorage.getItem('userProfile');
        return saved ? JSON.parse(saved) : defaultProfile;
    });

    // Update form when user data changes
    useEffect(() => {
        if (user?.username) {
            setCredentialForm(prev => ({ ...prev, username: user.username }));
        }
    }, [user]);

    const handleSave = (e) => {
        e.preventDefault();
        localStorage.setItem('userProfile', JSON.stringify(profile));
        setIsEditing(false);
        showNotification('Profil dan Foto berhasil disimpan! 💾', 'success');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (limit to ~2MB for LocalStorage safety)
            if (file.size > 2000000) {
                showNotification('Ukuran file terlalu besar! Harap upload foto di bawah 2MB.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, photoUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    // Credential Handlers
    const handleChangeUsername = async () => {
        if (!credentialForm.username) {
            showNotification('Username tidak boleh kosong', 'warning');
            return;
        }

        const result = await updateUsername(credentialForm.username);
        if (result.success) {
            showNotification('Username berhasil diubah!', 'success');
        } else {
            showNotification('Gagal mengubah username: ' + result.message, 'error');
        }
    };

    const handleChangePassword = async () => {
        if (!credentialForm.currentPassword || !credentialForm.newPassword || !credentialForm.confirmPassword) {
            showNotification('Mohon lengkapi semua field password', 'warning');
            return;
        }

        if (credentialForm.newPassword !== credentialForm.confirmPassword) {
            showNotification('Konfirmasi password baru tidak cocok', 'error');
            return;
        }

        if (credentialForm.newPassword.length < 4) {
            showNotification('Password minimal 4 karakter', 'warning');
            return;
        }

        const result = await updatePassword(credentialForm.currentPassword, credentialForm.newPassword);
        if (result.success) {
            showNotification('Password berhasil diubah! Silakan login ulang.', 'success');
            setCredentialForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } else {
            showNotification('Gagal mengubah password: ' + result.message, 'error');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* 1. Artistic Header / Cover */}
            <div className="relative h-72 rounded-2xl overflow-hidden shadow-2xl group">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img
                        src="/profile_header.png"
                        alt="Profile Header"
                        className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-[2s]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-imigrasi-navy/90 via-imigrasi-navy/40 to-transparent"></div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col md:flex-row items-end gap-8 text-white z-10">
                    <div className="relative group/avatar">
                        <div className="w-36 h-36 rounded-2xl bg-white p-1.5 shadow-2xl transform translate-y-8 group-hover/avatar:-translate-y-2 transition-transform duration-500 relative z-20">
                            <div className="w-full h-full bg-gray-200 rounded-xl overflow-hidden relative border border-gray-100">
                                {profile.photoUrl ? (
                                    <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center text-gray-400 font-bold text-5xl">
                                        {profile.name.charAt(0)}
                                    </div>
                                )}

                                {/* Upload Overlay */}
                                <div
                                    onClick={triggerFileInput}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm"
                                >
                                    <svg className="w-8 h-8 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="text-white text-xs font-bold">Ganti Foto</span>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handlePhotoUpload}
                                    accept="image/png, image/jpeg, image/jpg"
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 mb-2">
                        <h1 className="text-4xl font-bold font-serif tracking-wide text-white drop-shadow-md">{profile.name}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-white/90 mt-2">
                            <span className="flex items-center gap-2 text-sm bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
                                <svg className="w-4 h-4 text-imigrasi-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                {profile.unit}
                            </span>
                            <span className="flex items-center gap-2 text-sm text-imigrasi-gold font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {profile.position}
                            </span>
                        </div>
                    </div>

                    <div className="mb-2 flex gap-3">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${isEditing ? 'bg-red-500 hover:bg-red-600 text-white border-none' : 'bg-white text-imigrasi-navy hover:bg-gray-100'}`}
                        >
                            {isEditing ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Batal Edit
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Edit Profil
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16 pt-4">

                {/* Left Column: Quick Stats or Bio */}
                <div className="space-y-6">
                    {/* Bio Card */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 relative overflow-hidden group hover:shadow-xl transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-imigrasi-gold"></div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 font-serif flex items-center gap-2">
                            <svg className="w-5 h-5 text-imigrasi-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Tentang Saya
                        </h3>
                        {isEditing ? (
                            <textarea
                                name="bio"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-imigrasi-gold/30 outline-none transition-all"
                                rows="5"
                                value={profile.bio}
                                onChange={handleChange}
                            />
                        ) : (
                            <p className="text-gray-600 text-sm leading-relaxed italic">
                                "{profile.bio}"
                            </p>
                        )}
                    </div>

                    {/* Account Stats */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 overflow-hidden">
                        <div className="bg-imigrasi-navy p-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest text-center">Statistik Aktivitas</h3>
                        </div>
                        <div className="p-4 grid grid-cols-2 divide-x divide-gray-100">
                            <div className="text-center p-2">
                                <span className="block text-2xl font-bold text-imigrasi-blue">12</span>
                                <span className="text-[10px] text-gray-400 uppercase">Laporan Dibuat</span>
                            </div>
                            <div className="text-center p-2">
                                <span className="block text-2xl font-bold text-imigrasi-gold">45</span>
                                <span className="text-[10px] text-gray-400 uppercase">Verifikasi</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Detailed Form */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Professional Info Card */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-h-[500px]">
                        <div className="flex border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab('pribadi')}
                                className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'pribadi' ? 'border-imigrasi-navy text-imigrasi-navy font-bold bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Data Lengkap
                            </button>
                            <button
                                onClick={() => setActiveTab('akun')}
                                className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'akun' ? 'border-imigrasi-navy text-imigrasi-navy font-bold bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Pengaturan Akun
                            </button>
                        </div>

                        <div className="p-8">
                            {activeTab === 'pribadi' ? (
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Lengkap</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={profile.name}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-2.5 rounded-lg border ${isEditing ? 'bg-white border-imigrasi-blue focus:ring-2' : 'bg-gray-50 border-gray-200 text-gray-800 font-medium'} transition-colors outline-none`}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">NIP</label>
                                            <input
                                                type="text"
                                                name="nip"
                                                value={profile.nip}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-2.5 rounded-lg border ${isEditing ? 'bg-white border-imigrasi-blue focus:ring-2' : 'bg-gray-50 border-gray-200 text-gray-600'} transition-colors outline-none`}
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Jabatan</label>
                                            <input
                                                type="text"
                                                name="position"
                                                value={profile.position}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                placeholder="Contoh: Kepala Seksi..."
                                                className={`w-full px-4 py-2.5 rounded-lg border ${isEditing ? 'bg-white border-imigrasi-blue focus:ring-2' : 'bg-gray-50 border-gray-200 text-gray-600'} transition-colors outline-none`}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pangkat / Golongan</label>
                                            <input
                                                type="text"
                                                name="rank"
                                                value={profile.rank}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                placeholder="Contoh: Penata (III/c)"
                                                className={`w-full px-4 py-2.5 rounded-lg border ${isEditing ? 'bg-white border-imigrasi-blue focus:ring-2' : 'bg-gray-50 border-gray-200 text-gray-600'} transition-colors outline-none`}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unit Kerja</label>
                                            <input
                                                type="text"
                                                name="unit"
                                                value={profile.unit}
                                                disabled={!isEditing}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-2.5 rounded-lg border ${isEditing ? 'bg-white border-imigrasi-blue focus:ring-2' : 'bg-gray-50 border-gray-200 text-gray-600'} transition-colors outline-none`}
                                            />
                                        </div>

                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nomor Telepon / WhatsApp</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="phone"
                                                    value={profile.phone}
                                                    disabled={!isEditing}
                                                    onChange={handleChange}
                                                    className={`w-full px-4 py-2.5 rounded-lg border ${isEditing ? 'bg-white border-imigrasi-blue focus:ring-2' : 'bg-gray-50 border-gray-200 text-gray-600'} transition-colors outline-none`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <div className="flex justify-end pt-6 border-t border-gray-100">
                                            <button
                                                type="submit"
                                                className="px-8 py-3 bg-imigrasi-navy text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg shadow-blue-900/20 transform hover:-translate-y-1 transition-all flex items-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Simpan Semua Perubahan
                                            </button>
                                        </div>
                                    )}
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-yellow-700">
                                                    Keamanan akun sangat penting. Disarankan mengganti password secara berkala minimal 3 bulan sekali.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 max-w-md">
                                        {/* Change Username Section */}
                                        <div className="pb-4 border-b border-gray-100">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Username Akun</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={credentialForm.username}
                                                    onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleChangeUsername}
                                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-bold shadow-md transition-colors"
                                                >
                                                    Ubah ID
                                                </button>
                                            </div>
                                        </div>

                                        {/* Change Password Section */}
                                        <div className="space-y-3 pt-2">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
                                                <input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={credentialForm.currentPassword}
                                                    onChange={(e) => setCredentialForm({ ...credentialForm, currentPassword: e.target.value })}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                                                <input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={credentialForm.newPassword}
                                                    onChange={(e) => setCredentialForm({ ...credentialForm, newPassword: e.target.value })}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                                                <input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={credentialForm.confirmPassword}
                                                    onChange={(e) => setCredentialForm({ ...credentialForm, confirmPassword: e.target.value })}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-imigrasi-blue/20 outline-none"
                                                />
                                            </div>
                                            <div className="text-right mt-2">
                                                <button
                                                    type="button"
                                                    onClick={handleChangePassword}
                                                    className="px-6 py-2.5 bg-imigrasi-gold text-[#051020] rounded-lg hover:bg-yellow-400 text-sm font-bold shadow-md transition-colors w-full"
                                                >
                                                    Ubah Password
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                                            <p className="text-xs text-gray-400">Versi Aplikasi v2.1.0 </p>
                                            <button
                                                type="button"
                                                onClick={onLogout}
                                                className="px-6 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                Keluar Aplikasi
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
    );
};

export default Profile;
