import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ onNavigate, currentView, onLogout }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdminSeksi = user?.role === 'admin_seksi';

  const [laporanOpen, setLaporanOpen] = useState(true);

  const item  = "flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-imigrasi-gold hover:bg-white/5 transition-all duration-200 cursor-pointer border-l-4 border-transparent";
  const active = "bg-white/10 text-imigrasi-gold border-imigrasi-gold font-medium";
  const sub    = "flex items-center gap-3 px-4 py-2 pl-12 text-gray-500 hover:text-imigrasi-gold transition-colors cursor-pointer text-sm";
  const subAct = "text-imigrasi-gold font-medium";
  const hdr    = "px-6 py-2 mt-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold";

  // Laporan sub-menu per role
  const SEKSI_MENU = [
    { label: 'Inteldakim',  view: 'report-input-inteldakim', aliases: ['inteldakim'] },
    { label: 'Lalintalkim', view: 'report-input-lalintalkim', aliases: ['lalintalkim'] },
    { label: 'Tikim',       view: 'report-input-tikim',       aliases: ['tikim'] },
    { label: 'Tata Usaha',  view: 'report-input-tu',          aliases: ['tu','tata usaha','tatausaha'] },
  ];

  const alias = (user?.seksi?.alias || user?.seksi?.name || '').toLowerCase();
  const myMenus = isAdminSeksi
    ? SEKSI_MENU.filter(m => m.aliases.some(a => alias.includes(a)))
    : SEKSI_MENU;

  const isLaporanActive = currentView.startsWith('report-input') || currentView === 'monthly-report' || currentView === 'gabung-laporan';

  return (
    <aside className="w-64 bg-imigrasi-navy min-h-screen flex flex-col shadow-xl z-20 overflow-hidden">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 cursor-pointer bg-gradient-to-r from-imigrasi-navy to-[#112240]" onClick={() => onNavigate('dashboard')}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/horas_logo.png" alt="HORAS-IM" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-wider">HORAS-IM</h1>
            <p className="text-imigrasi-gold text-[10px] uppercase tracking-widest">Imigrasi Pematangsiantar</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto pb-10">

        {/* Dashboard */}
        <p className={hdr}>Utama</p>
        <div className={`${item} ${currentView === 'dashboard' ? active : ''}`} onClick={() => onNavigate('dashboard')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          <span>Dashboard</span>
        </div>

        {/* Laporan Bulanan */}
        <p className={hdr}>Laporan Bulanan</p>
        <div className={`${item} justify-between ${isLaporanActive ? active : ''}`} onClick={() => setLaporanOpen(!laporanOpen)}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Penyusunan Laporan</span>
          </div>
          <svg className={`w-4 h-4 transition-transform ${laporanOpen ? 'rotate-180 text-imigrasi-gold' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {laporanOpen && (
          <div className="bg-[#0f2440] py-2">
            {/* SuperAdmin: lihat semua + gabung */}
            {isSuperAdmin && (
              <>
                <div className={`${sub} ${currentView === 'monthly-report' ? subAct : ''}`} onClick={() => onNavigate('monthly-report')}>
                  <span>📋 Semua Laporan (Master)</span>
                </div>
                <div className={`${sub} ${currentView === 'gabung-laporan' ? subAct : ''}`} onClick={() => onNavigate('gabung-laporan')}>
                  <span>🗂️ Gabung Laporan (Word)</span>
                </div>

                <div className="border-t border-white/5 my-1"/>
                <div className="px-12 py-1 text-[10px] text-gray-600 uppercase tracking-widest">Tiap Seksi</div>
              </>
            )}
            {myMenus.map(m => (
              <div key={m.view} className={`${sub} ${currentView === m.view ? subAct : ''}`} onClick={() => onNavigate(m.view)}>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Status */}
        <p className={hdr}>Pemantauan</p>
        <div className={`${item} ${currentView === 'template-status' ? active : ''}`} onClick={() => onNavigate('template-status')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          <span>Status Pengisian Template</span>
        </div>

        {/* Arsip — semua role bisa */}
        <div className={`${item} ${currentView === 'archive' ? active : ''}`} onClick={() => onNavigate('archive')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          <span>Arsip &amp; Dokumen</span>
        </div>

        {/* Data Seksi — SuperAdmin only */}
        {isSuperAdmin && (
          <>
            <p className={hdr}>Data Seksi</p>
            {[
              { label: 'Semua Seksi',    view: 'section-data' },
              { label: 'Inteldakim',     view: 'section-inteldakim' },
              { label: 'Lalintalkim',    view: 'section-lalintalkim' },
              { label: 'Tikim',          view: 'section-tikim' },
              { label: 'Tata Usaha',     view: 'section-tu' },
            ].map(m => (
              <div key={m.view} className={`${item} pl-6 ${currentView === m.view ? active : ''}`} onClick={() => onNavigate(m.view)}>
                <span className="text-sm">{m.label}</span>
              </div>
            ))}
          </>
        )}

        {/* Administrasi */}
        <p className={hdr}>Administrasi</p>
        {isSuperAdmin && (
          <div className={`${item} ${currentView === 'members' ? active : ''}`} onClick={() => onNavigate('members')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span>Anggota</span>
          </div>
        )}
        <div className={`${item} ${currentView === 'profile' ? active : ''}`} onClick={() => onNavigate('profile')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span>Profil Saya</span>
        </div>
      </nav>

      {/* Logout */}
      <div className={`${item} mb-2 hover:border-red-500 hover:bg-red-500/10 text-gray-500 hover:text-red-400`} onClick={onLogout}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        <span>Keluar Aplikasi</span>
      </div>

      <div className="p-3 bg-[#051020] border-t border-white/5 text-center">
        <p className="text-[10px] text-gray-600">
          {isSuperAdmin ? '👑 Super Admin' : `📋 ${user?.seksi?.name || 'Admin Seksi'}`}
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
