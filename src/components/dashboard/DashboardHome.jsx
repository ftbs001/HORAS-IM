import { useState, useEffect } from 'react';
import StatsGrid from './StatsCard';
import DataTable from './DataTable';
import { useAuth } from '../../contexts/AuthContext';

const DashboardHome = ({ onNavigate }) => {
    const { user, isSuperAdmin, isAdminSeksi } = useAuth();

    // Welcome Message based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };

    const shortcuts = [
        {
            id: 'policy',
            title: 'Tulis Laporan',
            desc: 'Analisis & Policy Brief',
            icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
            color: 'bg-blue-500',
            nav: 'policy-brief'
        },
        {
            id: 'status',
            title: 'Status Template',
            desc: 'Pantau Pengisian Tiap Seksi',
            icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
            color: 'bg-green-500',
            nav: 'template-status'
        },
        {
            id: 'archive',
            title: 'Arsip Digital',
            desc: 'File & Dokumen Lama',
            icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
            color: 'bg-amber-500',
            nav: 'archive'
        },
        {
            id: 'team',
            title: 'Data Pegawai',
            desc: 'Manajemen Anggota',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
            color: 'bg-purple-500',
            nav: 'members'
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-12">

            {/* 1. Hero / Welcome Section with Branding */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-imigrasi-navy to-blue-900 shadow-2xl text-white">

                {/* Background Pattern & Logo Watermark */}
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <img
                        src="/horas_logo.png"
                        alt="Background Logo"
                        className="absolute -right-20 -bottom-32 w-96 h-96 object-contain transform rotate-12 opacity-50 contrast-150"
                    />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
                </div>

                <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Left: Welcome Text */}
                    <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-bold text-imigrasi-gold tracking-widest uppercase">
                                Dashboard Eksekutif
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">
                            {getGreeting()}, <span className="text-imigrasi-gold">Administrator</span>
                        </h1>
                        <p className="text-blue-100 leading-relaxed text-sm md:text-base">
                            Selamat datang di <strong className="text-white">HORAS-IM</strong> (Himpunan Operasional Laporan Aktivitas Imigrasi).
                            Pantau kinerja seksi dan status laporan terkini secara real-time.
                        </p>
                    </div>

                    {/* Right: Role-aware Laporan Shortcuts */}
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        {isSuperAdmin ? (
                            <>
                                <button
                                    onClick={() => onNavigate('monitoring-laporan')}
                                    className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm whitespace-nowrap"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Monitoring Laporan
                                </button>
                                <button
                                    onClick={() => onNavigate('gabung-laporan')}
                                    className="flex items-center gap-2 bg-imigrasi-gold hover:bg-yellow-400 text-imigrasi-navy font-bold px-4 py-2.5 rounded-xl transition-all text-sm whitespace-nowrap shadow-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Gabung & Export
                                </button>
                            </>
                        ) : isAdminSeksi ? (
                            <>
                                <button
                                    onClick={() => onNavigate('upload-laporan')}
                                    className="flex items-center gap-2 bg-imigrasi-gold hover:bg-yellow-400 text-imigrasi-navy font-bold px-4 py-2.5 rounded-xl transition-all text-sm whitespace-nowrap shadow-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Input Laporan
                                </button>
                                <button
                                    onClick={() => onNavigate('monthly-report')}
                                    className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm whitespace-nowrap"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Semua Laporan
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => onNavigate('monthly-report')}
                                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm whitespace-nowrap"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Laporan Bulanan
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Stats Overview */}
            <div className="relative z-10 -mt-6 mx-4 md:mx-0">
                <StatsGrid />
            </div>

            {/* 3. Quick Access / Menu Visual Cards */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-imigrasi-gold rounded-full"></span>
                        Akses Cepat
                    </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {shortcuts.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onNavigate(item.nav)}
                            className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 p-16 opacity-5 bg-gradient-to-br from-transparent to-${item.color.split('-')[1]}-900 rounded-bl-full transition-all group-hover:scale-110`}></div>

                            <div className={`${item.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                            </div>
                            <h4 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{item.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Latest Reports Table */}
            <div>
                <div className="flex items-center justify-between mb-4 mt-8">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-imigrasi-navy rounded-full"></span>
                        Aktivitas & Laporan Terbaru
                    </h3>
                    <button className="text-sm text-imigrasi-blue font-bold hover:underline" onClick={() => onNavigate('filter-all')}>Lihat Semua</button>
                </div>
                <DataTable />
            </div>

        </div>
    );
};

export default DashboardHome;
