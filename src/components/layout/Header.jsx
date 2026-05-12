import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification, NOTIF_META } from '../../contexts/NotificationContext';
import { getMenuItems, getQuickSuggestions } from '../../utils/menuRegistry';

const Header = ({ onNavigate }) => {
    const today = new Date();
    const dateString = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const { user } = useAuth();
    const {
        laporanNotifs, unreadLaporanCount,
        fetchLaporanNotifs, markAllRead, loadingNotifs
    } = useNotification();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const searchRef = useRef(null);
    const notifRef = useRef(null);

    // ─── Fetch notifs on mount & when user changes ─────────────
    useEffect(() => {
        if (user) fetchLaporanNotifs(user);
    }, [user, fetchLaporanNotifs]);

    // ─── Refresh notifs every 60s ──────────────────────────────
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => fetchLaporanNotifs(user), 60000);
        return () => clearInterval(interval);
    }, [user, fetchLaporanNotifs]);

    // ─── Klik di luar tutup dropdown ──────────────────────────
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchFocused(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Smart Search (dynamic, role-aware, debounced) ────────
    const runSearch = useCallback((query) => {
        if (!query) { setSearchResults([]); return; }
        const q = query.toLowerCase();
        const allItems = getMenuItems(user);               // ambil dari registry
        const seen = new Set();
        const results = allItems.filter(item => {
            if (seen.has(item.nav)) return false;           // hilangkan duplikasi
            const match =
                item.title.toLowerCase().includes(q) ||
                item.caption.toLowerCase().includes(q);
            if (match) seen.add(item.nav);
            return match;
        });
        setSearchResults(results);
    }, [user]);

    useEffect(() => {
        if (!searchQuery) { setSearchResults([]); return; }
        const timer = setTimeout(() => runSearch(searchQuery), 250); // debounce 250ms
        return () => clearTimeout(timer);
    }, [searchQuery, runSearch]);

    const handleResultClick = (nav) => {
        onNavigate(nav);
        setIsSearchFocused(false);
        setSearchQuery('');
    };

    // ─── Format waktu relatif ──────────────────────────────────
    const relativeTime = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Baru saja';
        if (m < 60) return `${m} mnt lalu`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} jam lalu`;
        return `${Math.floor(h / 24)} hari lalu`;
    };

    // ─── Navigasi sesuai role saat klik notif ─────────────────
    const handleNotifClick = (notif) => {
        const isActionByAdmin = ['submit', 'upload'].includes(notif.action);
        if (user?.role === 'super_admin' && isActionByAdmin) {
            onNavigate('monitoring-laporan');
        } else {
            onNavigate('upload-laporan');
        }
        setShowNotifications(false);
    };

    // ─── Buka bell: fetch fresh + tandai posisi ────────────────
    const handleBellClick = () => {
        if (!showNotifications) {
            fetchLaporanNotifs(user);  // refresh on open
        }
        setShowNotifications(v => !v);
    };

    // ─── Nama & inisial user ───────────────────────────────────
    const displayName = user?.nama || 'Administrator';
    const roleLabel = user?.role === 'super_admin' ? 'Super Admin' : (user?.seksi?.name || 'Admin Seksi');
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <header className="bg-white px-8 py-5 shadow-sm relative z-20 border-b border-gray-100">
            <div className="flex items-center justify-between gap-8 animate-fade-in-down">

                {/* 1. Smart Search */}
                <div ref={searchRef} className="flex-1 max-w-2xl relative">
                    <div className={`relative group transition-all duration-300 ${isSearchFocused ? 'scale-105 shadow-xl rounded-2xl ring-2 ring-imigrasi-gold/20' : ''}`}>
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-imigrasi-blue transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Cari halaman, laporan, fitur..."
                            value={searchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-gray-700 text-sm focus:bg-white focus:ring-0 placeholder-gray-400 transition-all font-medium"
                        />
                        {!searchQuery && !isSearchFocused && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 opacity-50 pointer-events-none">
                                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-500 font-mono shadow-sm">CTRL</kbd>
                                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-500 font-mono shadow-sm">K</kbd>
                            </div>
                        )}
                    </div>

                    {isSearchFocused && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-sm animate-fade-in origin-top z-50">
                            {searchResults.length > 0 ? (
                                <div className="py-2">
                                    <div className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Hasil Pencarian</div>
                                    <ul>
                                        {searchResults.map(item => (
                                            <li key={item.id} onClick={() => handleResultClick(item.nav)}
                                                className="px-5 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-4 transition-colors group">
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
                                    <p className="text-2xl mb-2">🔍</p>
                                    <p className="font-semibold text-gray-600">Menu atau fitur tidak ditemukan.</p>
                                    <p className="text-xs text-gray-400 mt-1">Coba kata kunci lain atau periksa ejaan.</p>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <p className="px-2 mb-2 text-xs font-bold text-gray-400">SARAN CEPAT</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {getQuickSuggestions(user).map(s => (
                                            <button
                                                key={s.nav}
                                                onClick={() => handleResultClick(s.nav)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition"
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Actions Area */}
                <div className="flex items-center gap-4 md:gap-6">

                    {/* Quick Action Button */}
                    <button
                        onClick={() => onNavigate(user?.role === 'super_admin' ? 'monitoring-laporan' : 'upload-laporan')}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-imigrasi-navy to-blue-900 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm font-bold"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={user?.role === 'super_admin' ? 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' : 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'} /></svg>
                        <span className="hidden lg:inline">{user?.role === 'super_admin' ? 'Monitoring' : 'Upload Laporan'}</span>
                    </button>

                    <div className="h-8 w-[1px] bg-gray-200 hidden md:block"></div>

                    {/* Date */}
                    <div className="hidden lg:block text-right">
                        <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0.5">Hari ini</p>
                        <p className="text-sm font-bold text-gray-800 font-serif">{dateString}</p>
                    </div>

                    {/* ── Notification Bell ─────────────────────── */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={handleBellClick}
                            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-imigrasi-gold hover:border-imigrasi-gold transition-all relative"
                            title="Notifikasi Laporan"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {unreadLaporanCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[10px] font-bold items-center justify-center ring-2 ring-white">
                                        {unreadLaporanCount > 9 ? '9+' : unreadLaporanCount}
                                    </span>
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-fade-in origin-top-right overflow-hidden">
                                {/* Header */}
                                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-gray-800">Notifikasi Laporan</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {user?.role === 'super_admin' ? 'Laporan masuk dari admin seksi' : 'Update status laporan Anda'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {unreadLaporanCount > 0 && (
                                            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{unreadLaporanCount} baru</span>
                                        )}
                                        <button
                                            onClick={() => fetchLaporanNotifs(user)}
                                            className="text-gray-400 hover:text-imigrasi-blue transition-colors p-1 rounded"
                                            title="Refresh"
                                        >
                                            <svg className={`w-4 h-4 ${loadingNotifs ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                                    {loadingNotifs ? (
                                        <div className="p-8 text-center text-gray-400">
                                            <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            <span className="text-sm">Memuat notifikasi...</span>
                                        </div>
                                    ) : laporanNotifs.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400">
                                            <div className="text-4xl mb-2">🔔</div>
                                            <p className="text-sm font-medium">Belum ada notifikasi</p>
                                            <p className="text-xs mt-1">Aktivitas laporan akan muncul di sini</p>
                                        </div>
                                    ) : (
                                        laporanNotifs.map(notif => {
                                            const meta = NOTIF_META[notif.action] || { emoji: '📋', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: notif.action };
                                            const isUnread = new Date(notif.created_at).getTime() > (parseInt(localStorage.getItem('horas_notif_read_ts') || '0'));
                                            return (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => handleNotifClick(notif)}
                                                    className={`p-4 hover:bg-blue-50/30 cursor-pointer transition-colors ${isUnread ? 'bg-blue-50/20' : ''}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg"
                                                            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                                                            {meta.emoji}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 justify-between">
                                                                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                                                                    style={{ background: meta.bg, color: meta.color }}>
                                                                    {meta.label}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 flex-shrink-0">{relativeTime(notif.created_at)}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-700 mt-1 leading-relaxed line-clamp-2">
                                                                {notif.detail || `Aktivitas: ${notif.action}`}
                                                            </p>
                                                            {notif.user_name && (
                                                                <p className="text-[10px] text-gray-400 mt-0.5">oleh {notif.user_name}</p>
                                                            )}
                                                        </div>
                                                        {isUnread && (
                                                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                                    {unreadLaporanCount > 0 ? (
                                        <button
                                            onClick={markAllRead}
                                            className="text-xs font-bold text-imigrasi-blue hover:underline"
                                        >
                                            ✓ Tandai semua dibaca
                                        </button>
                                    ) : (
                                        <span className="text-xs text-gray-400">Semua sudah dibaca</span>
                                    )}
                                    <button
                                        onClick={() => {
                                            onNavigate(user?.role === 'super_admin' ? 'monitoring-laporan' : 'upload-laporan');
                                            setShowNotifications(false);
                                        }}
                                        className="text-xs font-bold text-gray-500 hover:text-imigrasi-blue"
                                    >
                                        Buka Laporan →
                                    </button>
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
                                <div className="w-full h-full bg-imigrasi-navy flex items-center justify-center rounded-full text-white font-bold text-base">
                                    {initials}
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="text-right hidden xl:block">
                            <p className="text-sm font-bold text-gray-800">{displayName}</p>
                            <p className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{roleLabel}</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
