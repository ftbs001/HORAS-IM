// Mapping dari view key ke nama yang user-friendly untuk notifikasi
export const viewNameMap = {
    'dashboard': 'Dashboard',
    'section-data': 'Data Seksi',
    'section-inteldakim': 'Data Seksi Inteldakim',
    'section-lalintalkim': 'Data Seksi Lalintalkim',
    'section-tikim': 'Data Seksi Tikim',
    'section-tu': 'Data Subbag Tata Usaha',
    'report-input-inteldakim': 'Input Laporan Inteldakim',
    'report-input-lalintalkim': 'Input Laporan Lalintalkim',
    'report-input-tikim': 'Input Laporan Tikim',
    'report-input-tu': 'Input Laporan Tata Usaha',
    'work-program-input': 'Input Program Kerja',
    'work-program-list': 'Daftar Program Kerja',
    'monthly-report': 'Modul Laporan Bulanan (Baru)', // Added
    'report-editor': 'Editor Laporan (Legacy)', // Added
    'verification': 'Verifikasi & Review',
    'archive': 'Cetak & Arsip',
    'members': 'Anggota',
    'profile': 'Profile Saya',

    // Legacy/other views
    // 'policy-brief': 'Laporan Bulanan (Naskah)', // Removed as per instruction's implied change
    'create-report': 'Buat Laporan',
    'activity-log': 'Log Aktivitas',
    'report-history': 'Riwayat Laporan',
    'add-report-type': 'Tambah Jenis Laporan',

    // RBAC Laporan Bulanan
    'upload-laporan': 'Upload Laporan',
    'monitoring-laporan': 'Monitoring Laporan',
    'gabung-laporan': 'Gabungkan Laporan',
    'template-laporan': 'Template Laporan Paspor',
};

export const getViewDisplayName = (viewKey) => {
    return viewNameMap[viewKey] || viewKey;
};
