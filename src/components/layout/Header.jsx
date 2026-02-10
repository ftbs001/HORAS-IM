import { useState, useRef, useEffect } from 'react';

const Header = ({ onNavigate }) => {
    // Get current date in Indonesian format
    const today = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateString = today.toLocaleDateString('id-ID', options);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Mock Search Data / "Smart Command" Suggestions
    const [searchResults, setSearchResults] = useState([]);
    const searchRef = useRef(null);

    // Mock Notifications
    const notifications = [
        { id: 1, title: 'Laporan Baru', desc: 'Seksi Inteldakim mengirimkan laporan bulanan.', time: '2 jam lalu', unread: true, nav: 'verification' },
        { id: 2, title: 'Verifikasi Berhasil', desc: 'Laporan Wasdakim telah disetujui.', time: '5 jam lalu', unread: false, nav: 'archive' },
        { id: 3, title: 'Revisi Diperlukan', desc: 'Laporan Keuangan dikembalikan oleh Ka. Kantor.', time: '1 hari lalu', unread: false, nav: 'verification' },
    ];
    const unreadCount = notifications.filter(n => n.unread).length;

    // Handle Click Outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Smart Search Logic
    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();

        // Define all searchable items
        const allItems = [
            { id: 'dash', type: 'page', title: 'Dashboard Utama', caption: 'Halaman Depan', nav: 'dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
            { id: 'pol', type: 'action', title: 'Buat Laporan Baru', caption: 'Tulis Analisis / Policy Brief', nav: 'policy-brief', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
            { id: 'ver', type: 'page', title: 'Verifikasi & Tinjauan', caption: 'Persetujuan Dokumen', nav: 'verification', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'sec', type: 'page', title: 'Data Seksi', caption: 'Profil Organisasi & Tusi', nav: 'section-data', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { id: 'prog', type: 'page', title: 'Input Program Kerja', caption: 'Manajemen Target Kinerja', nav: 'work-program-input', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { id: 'arc', type: 'page', title: 'Arsip Digital', caption: 'Penyimpanan Dokumen Lama', nav: 'archive', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
            { id: 'prof', type: 'user', title: 'Profil Saya', caption: 'Pengaturan Akun & Biodata', nav: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            { id: 'mem', type: 'user', title: 'Data Pegawai', caption: 'Daftar Anggota Tim', nav: 'members', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        ];

        const filtered = allItems.filter(item =>
            item.title.toLowerCase().includes(query) ||
            item.caption.toLowerCase().includes(query)
        );
        setSearchResults(filtered);
    }, [searchQuery]);

    const handleResultClick = (nav) => {
        onNavigate(nav);
        setIsSearchFocused(false);
        setSearchQuery('');
    };

    return (
        <header className="bg-white px-8 py-5 shadow-sm relative z-20 border-b border-gray-100">
            <div className="flex items-center justify-between gap-8 animate-fade-in-down">

                {/* 1. Global SMART Search Bar */}
                <div ref={searchRef} className="flex-1 max-w-2xl relative">
                    <div className={`relative group transition-all duration-300 ${isSearchFocused ? 'scale-105 shadow-xl rounded-2xl ring-2 ring-imigrasi-gold/20' : ''}`}>
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-imigrasi-blue transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Ketik untuk mencari (cth: 'Laporan', 'Arsip', 'Profil')..."
                            value={searchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-gray-700 text-sm focus:bg-white focus:ring-0 placeholder-gray-400 transition-all font-medium py-3.5"
                        />
                        {/* Shortcut Hint */}
                        {!searchQuery && !isSearchFocused && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 opacity-50 pointer-events-none">
                                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-500 font-mono shadow-sm">CTRL</kbd>
                                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-500 font-mono shadow-sm">K</kbd>
                            </div>
                        )}
                    </div>

                    {/* Dropdown Results (Spotlight Style) */}
                    {isSearchFocused && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-sm animate-fade-in origin-top">
                            {searchResults.length > 0 ? (
                                <div className="py-2">
                                    <div className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Hasil Pencarian Terbaik</div>
                                    <ul>
                                        {searchResults.map((item) => (
                                            <li
                                                key={item.id}
                                                onClick={() => handleResultClick(item.nav)}
                                                className="px-5 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-4 transition-colors group"
                                            >
                                                <div className={`p-2 rounded-lg ${item.type === 'action' ? 'bg-imigrasi-gold text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-imigrasi-blue group-hover:shadow-md transition-all'}`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 group-hover:text-imigrasi-blue">{item.title}</p>
                                                    <p className="text-xs text-gray-500">{item.caption}</p>
                                                </div>
                                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : searchQuery ? (
                                <div className="p-8 text-center text-gray-500">
                                    <p className="text-lg">😕</p>
                                    <p>Tidak ditemukan hasil untuk "{searchQuery}"</p>
                                </div>
                            ) : (
                                // Default suggestions when empty
                                <div className="p-4">
                                    <p className="px-2 mb-2 text-xs font-bold text-gray-400">SARAN CEPAT</p>
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => handleResultClick('policy-brief')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition">📝 Buat Laporan</button>
                                        <button onClick={() => handleResultClick('section-data')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition">🏢 Data Seksi</button>
                                        <button onClick={() => handleResultClick('verification')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition">✅ Verifikasi</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Notification & Actions Area */}
                <div className="flex items-center gap-4 md:gap-6">

                    {/* Quick Create Report Button */}
                    <button
                        onClick={() => onNavigate('policy-brief')}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-imigrasi-navy to-blue-900 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm font-bold"
                        title="Buat Laporan Baru"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="hidden lg:inline">Buat Laporan</span>
                    </button>

                    <div className="h-8 w-[1px] bg-gray-200 hidden md:block"></div>

                    {/* Date Display */}
                    <div className="hidden lg:block text-right">
                        <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0.5">Hari ini</p>
                        <p className="text-sm font-bold text-gray-800 font-serif">{dateString}</p>
                    </div>

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-imigrasi-gold hover:border-imigrasi-gold transition-all relative"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white"></span>
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-fade-in origin-top-right overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800">Notifikasi</h4>
                                    <span className="text-xs bg-imigrasi-blue text-white px-2 py-0.5 rounded-full">{unreadCount} baru</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => {
                                                if (notif.nav) onNavigate(notif.nav);
                                                setShowNotifications(false);
                                            }}
                                            className={`p-4 border-b border-gray-50 hover:bg-blue-50/50 transition-colors cursor-pointer ${notif.unread ? 'bg-blue-50/20' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h5 className={`text-sm ${notif.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>{notif.title}</h5>
                                                <span className="text-[10px] text-gray-400">{notif.time}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed">{notif.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 text-center border-t border-gray-100 bg-gray-50">
                                    <button className="text-xs font-bold text-imigrasi-blue hover:underline">Lihat Semua Link Aktivitas</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile */}
                    <div
                        className="flex items-center gap-3 cursor-pointer pl-4 border-l border-gray-200"
                        onClick={() => onNavigate && onNavigate('profile')}
                    >
                        <div className="relative group">
                            <div className="w-11 h-11 rounded-full bg-imigrasi-navy p-0.5 ring-2 ring-gray-100 group-hover:ring-imigrasi-gold transition-all overflow-hidden">
                                {/* Fallback to Initials if storage is empty, assumes parent might handle it, but for header standalone we show generic or saved */}
                                <div className="w-full h-full bg-imigrasi-navy flex items-center justify-center rounded-full text-white font-bold text-lg">A</div>
                            </div>
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="text-right hidden xl:block">
                            <p className="text-sm font-bold text-gray-800 group-hover:text-imigrasi-navy transition-colors">Administrator</p>
                            <p className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Super Admin</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
