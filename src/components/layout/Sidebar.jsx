import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ onNavigate, currentView, onLogout }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdminSeksi = user?.role === 'admin_seksi';

  // Collapsible states
  const [dataSeksiOpen, setDataSeksiOpen] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Styling Classes
  const menuItemClass = "flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-imigrasi-gold hover:bg-white/5 transition-all duration-200 cursor-pointer border-l-4 border-transparent";
  const activeClass = "bg-white/10 text-imigrasi-gold border-imigrasi-gold font-medium";
  const subMenuItemClass = "flex items-center gap-3 px-4 py-2 pl-12 text-gray-500 hover:text-imigrasi-gold transition-colors cursor-pointer text-sm";
  const subMenuActive = "text-imigrasi-gold font-medium";
  const menuHeaderClass = "px-6 py-2 mt-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold";

  return (
    <aside className="w-64 bg-imigrasi-navy min-h-screen flex flex-col shadow-xl z-20 overflow-hidden">
      {/* Header with Logo */}
      <div
        className="px-6 py-6 border-b border-white/10 cursor-pointer bg-gradient-to-r from-imigrasi-navy to-[#112240]"
        onClick={() => onNavigate('dashboard')}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300 overflow-hidden">
            <img src="/horas_logo.png" alt="HORAS-IM Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-wider font-sans">HORAS-IM</h1>
            <p className="text-imigrasi-gold text-[10px] uppercase tracking-widest">Imigrasi Pematangsiantar</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar pb-10">

        {/* 1. Dashboard Utama */}
        <p className={menuHeaderClass}>Utama</p>
        <div
          className={`${menuItemClass} ${currentView === 'dashboard' ? activeClass : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          <span>Dashboard</span>
        </div>

        {/* 2. Data Seksi */}
        <p className={menuHeaderClass}>Organisasi</p>
        <div
          className={`${menuItemClass} justify-between ${currentView.startsWith('section-') ? activeClass : ''}`}
          onClick={() => setDataSeksiOpen(!dataSeksiOpen)}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <span>Data Seksi</span>
          </div>
          <svg className={`w-4 h-4 transition-transform ${dataSeksiOpen ? 'rotate-180 text-imigrasi-gold' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {dataSeksiOpen && (
          <div className="bg-[#0f2440] py-2">
            <div
              className={`${subMenuItemClass} ${currentView === 'section-data' ? subMenuActive : ''}`}
              onClick={() => onNavigate('section-data')}
            >
              <span>Semua Seksi</span>
            </div>
            <div
              className={`${subMenuItemClass} ${currentView === 'section-inteldakim' ? subMenuActive : ''}`}
              onClick={() => onNavigate('section-inteldakim')}
            >
              <span>Seksi Inteldakim</span>
            </div>
            <div
              className={`${subMenuItemClass} ${currentView === 'section-lalintalkim' ? subMenuActive : ''}`}
              onClick={() => onNavigate('section-lalintalkim')}
            >
              <span>Seksi Lalintalkim</span>
            </div>
            <div
              className={`${subMenuItemClass} ${currentView === 'section-tikim' ? subMenuActive : ''}`}
              onClick={() => onNavigate('section-tikim')}
            >
              <span>Seksi Tikim</span>
            </div>
            <div
              className={`${subMenuItemClass} ${currentView === 'section-tu' ? subMenuActive : ''}`}
              onClick={() => onNavigate('section-tu')}
            >
              <span>Subbag Tata Usaha</span>
            </div>
          </div>
        )}


        {/* 4. Laporan Bulanan (Detailed) */}
        <div
          className={`${menuItemClass} justify-between ${currentView.includes('report-input') || currentView === 'monthly-report' ? activeClass : ''}`}
          onClick={() => setReportOpen(!reportOpen)}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Laporan Bulanan</span>
          </div>
          <svg className={`w-4 h-4 transition-transform ${reportOpen ? 'rotate-180 text-imigrasi-gold' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {reportOpen && (
          <div className="bg-[#0f2440] py-2">
            <div
              className={`${subMenuItemClass} ${currentView === 'monthly-report' ? subMenuActive : ''}`}
              onClick={() => onNavigate('monthly-report')}
            >
              <span>Semua Laporan (Master)</span>
            </div>
            <div
              className={`${subMenuItemClass} ${currentView === 'report-input-inteldakim' ? subMenuActive : ''}`}
              onClick={() => onNavigate('report-input-inteldakim')}
            >
              <span>Input Inteldakim</span>
            </div>
            <div
              className={`${subMenuItemClass} ${currentView === 'report-input-lalintalkim' ? subMenuActive : ''}`}
              onClick={() => onNavigate('report-input-lalintalkim')}
            >
              <span>Input Lalintalkim</span>
            </div>
            <div
              className={`${subMenuItemClass} ${currentView === 'report-input-tikim' ? subMenuActive : ''}`}
              onClick={() => onNavigate('report-input-tikim')}
            >
              <span>Input Tikim</span>
            </div>
            <div
              className={`${subMenuItemClass} ${currentView === 'report-input-tu' ? subMenuActive : ''}`}
              onClick={() => onNavigate('report-input-tu')}
            >
              <span>Input Tata Usaha</span>
            </div>
          </div>
        )}

        {/* RBAC: Laporan Bulanan (BARU) */}
        <p className={menuHeaderClass}>Laporan Bulanan</p>

        {/* Admin Seksi: Upload Laporan */}
        {isAdminSeksi && (
          <div
            className={`${menuItemClass} ${currentView === 'upload-laporan' ? activeClass : ''}`}
            onClick={() => onNavigate('upload-laporan')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span>Upload Laporan Saya</span>
          </div>
        )}

        {/* Super Admin: Monitoring & Gabung */}
        {isSuperAdmin && (
          <>
            <div
              className={`${menuItemClass} ${currentView === 'monitoring-laporan' ? activeClass : ''}`}
              onClick={() => onNavigate('monitoring-laporan')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span>Monitoring Laporan</span>
            </div>
            <div
              className={`${menuItemClass} ${currentView === 'gabung-laporan' ? activeClass : ''}`}
              onClick={() => onNavigate('gabung-laporan')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              <span>Gabungkan Laporan</span>
            </div>
          </>
        )}

        {/* 5. Tulis Laporan Kegiatan (Policy Brief Editor) */}
        <div
          className={`${menuItemClass} ${currentView === 'write-report' ? activeClass : ''}`}
          onClick={() => onNavigate('write-report')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          <span>Tulis Laporan Kegiatan</span>
        </div>

        {/* 6. Verifikasi */}
        <p className={menuHeaderClass}>Persetujuan</p>
        <div
          className={`${menuItemClass} ${currentView === 'verification' ? activeClass : ''}`}
          onClick={() => onNavigate('verification')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Verifikasi & Review</span>
        </div>

        {/* 7. Cetak & Export (Archive) */}
        <div
          className={`${menuItemClass} ${currentView === 'archive' ? activeClass : ''}`}
          onClick={() => onNavigate('archive')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span>Cetak & Arsip</span>
        </div>

        {/* 8. Manajemen Pengguna */}
        <p className={menuHeaderClass}>Administrasi</p>
        <div
          className={`${menuItemClass} justify-between ${currentView === 'members' ? activeClass : ''}`}
          onClick={() => onNavigate('members')}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span>Anggota</span>
          </div>
        </div>

        <div
          className={`${menuItemClass} ${currentView === 'profile' ? activeClass : ''}`}
          onClick={() => onNavigate('profile')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span>Profile Saya</span>
        </div>

      </nav>

      {/* Logout Action */}
      <div
        className={`${menuItemClass} mt-auto mb-2 border-red-500/0 hover:border-red-500 hover:bg-red-500/10 text-gray-500 hover:text-red-500`}
        onClick={onLogout}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        <span>Keluar Aplikasi</span>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-[#051020] border-t border-white/5 mx-auto w-full text-center">
        <p className="text-[10px] text-gray-600">{user?.role === 'super_admin' ? '👑 Super Admin' : user?.role === 'admin_seksi' ? `📋 ${user?.seksi?.name || 'Admin Seksi'}` : 'v2.1.0'}</p>
      </div>
    </aside>
  );
};

export default Sidebar;
