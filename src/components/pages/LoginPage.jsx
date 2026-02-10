import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
    const { login, resetPassword } = useAuth();

    // Login State
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Forgot Password State
    const [showForgot, setShowForgot] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState(1); // 1: Info, 2: New Password, 3: Success
    const [recoveryData, setRecoveryData] = useState({ username: '', answer: '', newPassword: '' });
    const [recoveryError, setRecoveryError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!credentials.username || !credentials.password) {
                throw new Error('Silakan isi Username dan Password.');
            }

            const result = await login(credentials.username, credentials.password);

            if (!result.success) {
                throw new Error(result.message);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setRecoveryError('');
        setIsLoading(true);

        try {
            if (!recoveryData.username || !recoveryData.answer || !recoveryData.newPassword) {
                throw new Error('Mohon lengkapi semua data.');
            }

            const result = await resetPassword(recoveryData.username, recoveryData.answer, recoveryData.newPassword);

            if (result.success) {
                setRecoveryStep(3); // Success
            } else {
                throw new Error(result.message);
            }
        } catch (err) {
            setRecoveryError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#051020] relative overflow-hidden font-sans">
            {/* Background Ornaments */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute -top-64 -left-64 w-[800px] h-[800px] bg-imigrasi-blue rounded-full blur-[120px] mix-blend-screen opacity-30"></div>
                <div className="absolute -bottom-64 -right-64 w-[800px] h-[800px] bg-imigrasi-gold rounded-full blur-[120px] mix-blend-screen opacity-20"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo Section */}
                <div className="text-center mb-8 animate-fade-in-down">
                    <div className="inline-block p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl mb-6 ring-1 ring-white/20">
                        <img src="/horas_logo.png" alt="HORAS-IM" className="w-20 h-20 object-contain drop-shadow-lg" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">HORAS-IM</h1>
                    <p className="text-imigrasi-gold uppercase tracking-[0.2em] text-xs font-bold">Imigrasi Pematangsiantar</p>
                </div>

                {/* Login Card */}
                {!showForgot ? (
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in-up">
                        <form onSubmit={handleLogin} className="space-y-6">
                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center font-medium animate-pulse">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-blue-200 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Username / NIP</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 group-focus-within:text-imigrasi-gold transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={credentials.username}
                                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#0a1a30]/50 border border-white/10 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-imigrasi-gold/50 focus:bg-[#0a1a30]/80 transition-all font-medium"
                                        placeholder="Masukkan Username"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-blue-200 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 group-focus-within:text-imigrasi-gold transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <input
                                        type="password"
                                        value={credentials.password}
                                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#0a1a30]/50 border border-white/10 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-imigrasi-gold/50 focus:bg-[#0a1a30]/80 transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="text-right mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgot(true)}
                                        className="text-xs text-blue-300 hover:text-white transition-colors"
                                    >
                                        Lupa Password?
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-4 rounded-xl font-bold text-lg text-[#051020] shadow-lg transform transition-all flex items-center justify-center gap-2 mt-4
                                ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-imigrasi-gold to-yellow-400 hover:scale-[1.02] hover:shadow-yellow-500/20 active:scale-[0.98]'}`}
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <>
                                        Masuk Dashboard
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center border-t border-white/10 pt-6">
                            <p className="text-blue-300/60 text-xs">
                                KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR
                                <br />Jalan Medan Km. 11,5 Pematang Siantar
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in-up">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                            <p className="text-blue-200 text-xs">Ikuti langkah berikut untuk mengatur ulang kata sandi Anda</p>
                        </div>

                        {recoveryStep === 3 ? (
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <p className="text-white font-medium">Password berhasil diubah!<br />Silakan login dengan password baru.</p>
                                <button
                                    onClick={() => {
                                        setShowForgot(false);
                                        setRecoveryStep(1);
                                        setRecoveryData({ username: '', answer: '', newPassword: '' });
                                        setError('');
                                    }}
                                    className="w-full py-3 bg-white text-[#051020] rounded-xl font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Kembali ke Login
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                {recoveryError && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center font-medium animate-pulse">
                                        {recoveryError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-blue-200 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Username / NIP</label>
                                    <input
                                        type="text"
                                        value={recoveryData.username}
                                        onChange={(e) => setRecoveryData({ ...recoveryData, username: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a1a30]/50 border border-white/10 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-imigrasi-gold/50 transition-all text-sm"
                                        placeholder="Masukkan Username Akun"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-blue-200 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Pertanyaan Keamanan</label>
                                    <p className="text-xs text-blue-300/70 mb-2 italic">"Di kota mana kantor ini berada?" (default: pematangsiantar)</p>
                                    <input
                                        type="text"
                                        value={recoveryData.answer}
                                        onChange={(e) => setRecoveryData({ ...recoveryData, answer: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a1a30]/50 border border-white/10 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-imigrasi-gold/50 transition-all text-sm"
                                        placeholder="Jawaban..."
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-blue-200 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Password Baru</label>
                                    <input
                                        type="password"
                                        value={recoveryData.newPassword}
                                        onChange={(e) => setRecoveryData({ ...recoveryData, newPassword: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a1a30]/50 border border-white/10 rounded-xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-imigrasi-gold/50 transition-all text-sm"
                                        placeholder="Password baru..."
                                        required
                                        minLength={4}
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgot(false)}
                                        className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-colors text-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 py-3 bg-imigrasi-gold text-[#051020] rounded-xl font-bold hover:bg-yellow-400 transition-colors text-sm flex justify-center items-center"
                                    >
                                        {isLoading ? 'Memproses...' : 'Reset Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
