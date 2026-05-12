/**
 * menuRegistry.js
 * ─────────────────────────────────────────────────────────────
 * Single source of truth untuk daftar menu aktif HORAS-IM.
 * Search bar di Header.jsx mengambil data dari sini agar selalu
 * sinkron dengan Sidebar. Tambah/hapus menu di sini cukup sekali.
 * ─────────────────────────────────────────────────────────────
 */

// ── SVG path icons (stroke-based, heroicons v1) ──────────────
const ICONS = {
  dashboard:      'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  report:         'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  gabung:         'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  templateStatus: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  archive:        'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  section:        'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  members:        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  profile:        'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

// ── Daftar seksi (harus sinkron dengan Sidebar.jsx SEKSI_MENU) ─
const SEKSI_MENU = [
  { label: 'Inteldakim',  view: 'report-input-inteldakim', aliases: ['inteldakim'] },
  { label: 'Lalintalkim', view: 'report-input-lalintalkim', aliases: ['lalintalkim'] },
  { label: 'Tikim',       view: 'report-input-tikim',       aliases: ['tikim'] },
  { label: 'Tata Usaha',  view: 'report-input-tu',          aliases: ['tu', 'tata usaha', 'tatausaha'] },
];

/**
 * getMenuItems(user)
 * Mengembalikan daftar menu yang aktif dan boleh diakses oleh user.
 * @param {object|null} user  - objek user dari AuthContext
 * @returns {Array}           - array item menu untuk search bar
 */
export const getMenuItems = (user) => {
  if (!user) return [];

  const isSuperAdmin = user.role === 'super_admin';
  const isAdminSeksi = user.role === 'admin_seksi';

  // Tentukan submenu laporan yang relevan untuk user ini
  const alias = (user?.seksi?.alias || user?.seksi?.name || '').toLowerCase();
  const myLaporanMenus = isAdminSeksi
    ? SEKSI_MENU.filter(m => m.aliases.some(a => alias.includes(a)))
    : SEKSI_MENU; // super_admin lihat semua

  const items = [];

  // ── UTAMA ────────────────────────────────────────────────────
  items.push({
    id: 'dashboard', type: 'page',
    title: 'Dashboard', caption: 'Halaman Utama Aplikasi',
    nav: 'dashboard', icon: ICONS.dashboard,
  });

  // ── LAPORAN BULANAN ──────────────────────────────────────────
  if (isSuperAdmin) {
    items.push({
      id: 'monthly-report', type: 'page',
      title: 'Semua Laporan (Master)', caption: 'Penyusunan Laporan – Semua Seksi',
      nav: 'monthly-report', icon: ICONS.report,
    });
    items.push({
      id: 'gabung-laporan', type: 'action',
      title: 'Gabung Laporan', caption: 'Kompilasi & Ekspor Laporan Bulanan',
      nav: 'gabung-laporan', icon: ICONS.gabung,
    });
  }

  // Submenu laporan per seksi (sesuai role)
  myLaporanMenus.forEach(m => {
    items.push({
      id: m.view, type: 'page',
      title: `Laporan ${m.label}`, caption: `Input Laporan Bulanan – ${m.label}`,
      nav: m.view, icon: ICONS.report,
    });
  });

  // ── PEMANTAUAN ───────────────────────────────────────────────
  items.push({
    id: 'template-status', type: 'page',
    title: 'Status Pengisian Template', caption: 'Pantau Status Pengisian Laporan Tiap Seksi',
    nav: 'template-status', icon: ICONS.templateStatus,
  });

  // ── ARSIP ────────────────────────────────────────────────────
  items.push({
    id: 'archive', type: 'page',
    title: 'Arsip & Dokumen', caption: 'Penyimpanan Dokumen & Laporan Lama',
    nav: 'archive', icon: ICONS.archive,
  });

  // ── DATA SEKSI (SuperAdmin only) ─────────────────────────────
  if (isSuperAdmin) {
    [
      { id: 'section-data',         title: 'Semua Seksi',              caption: 'Data Profil & Tusi Semua Seksi',   nav: 'section-data' },
      { id: 'section-inteldakim',   title: 'Data Seksi Inteldakim',    caption: 'Profil & Tusi – Inteldakim',       nav: 'section-inteldakim' },
      { id: 'section-lalintalkim',  title: 'Data Seksi Lalintalkim',   caption: 'Profil & Tusi – Lalintalkim',      nav: 'section-lalintalkim' },
      { id: 'section-tikim',        title: 'Data Seksi Tikim',         caption: 'Profil & Tusi – Tikim',            nav: 'section-tikim' },
      { id: 'section-tu',           title: 'Data Seksi Tata Usaha',    caption: 'Profil & Tusi – Tata Usaha',       nav: 'section-tu' },
    ].forEach(m => items.push({ ...m, type: 'page', icon: ICONS.section }));

    items.push({
      id: 'members', type: 'user',
      title: 'Anggota / Data Pegawai', caption: 'Daftar Anggota & Manajemen Pengguna',
      nav: 'members', icon: ICONS.members,
    });
  }

  // ── ADMINISTRASI (semua role) ────────────────────────────────
  items.push({
    id: 'profile', type: 'user',
    title: 'Profil Saya', caption: 'Pengaturan Akun & Biodata Pengguna',
    nav: 'profile', icon: ICONS.profile,
  });

  return items;
};

/**
 * getQuickSuggestions(user)
 * Mengembalikan maksimal 3 item saran cepat berdasarkan role.
 */
export const getQuickSuggestions = (user) => {
  if (!user) return [];
  if (user.role === 'super_admin') {
    return [
      { label: '📋 Status Template', nav: 'template-status' },
      { label: '🗂️ Arsip & Dokumen', nav: 'archive' },
      { label: '🏢 Semua Seksi',     nav: 'section-data'   },
    ];
  }
  // admin_seksi
  return [
    { label: '📋 Status Template', nav: 'template-status' },
    { label: '🗂️ Arsip & Dokumen', nav: 'archive'         },
    { label: '👤 Profil Saya',     nav: 'profile'         },
  ];
};
