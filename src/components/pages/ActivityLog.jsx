const ActivityLog = () => {
    const activities = [
        { id: 1, user: 'Administrator', action: 'Membuat Laporan Bulanan Lalintalkim', time: '10 menit yang lalu', type: 'create' },
        { id: 2, user: 'Budi Santoso', action: 'Mengubah status laporan #REP-2026-001', time: '1 jam yang lalu', type: 'update' },
        { id: 3, user: 'Siti Aminah', action: 'Login ke sistem', time: '2 jam yang lalu', type: 'login' },
        { id: 4, user: 'Administrator', action: 'Menambah anggota baru: Joko Widodo', time: 'Kemarin, 14:30', type: 'create' },
        { id: 5, user: 'System', action: 'Automatic Backup Database', time: 'Kemarin, 00:00', type: 'system' },
    ];

    const getIcon = (type) => {
        switch (type) {
            case 'create': return <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></span>;
            case 'update': return <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></span>;
            case 'login': return <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg></span>;
            default: return <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-imigrasi-navy">Laporan Kegiatan (Activity Log)</h2>
                <button className="text-sm text-imigrasi-blue hover:underline">Lihat Semua</button>
            </div>
            <div className="p-6">
                <div className="flow-root">
                    <ul className="-mb-8">
                        {activities.map((activity, idx) => (
                            <li key={activity.id}>
                                <div className="relative pb-8">
                                    {idx !== activities.length - 1 && (
                                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                                    )}
                                    <div className="relative flex space-x-3">
                                        <div>
                                            {getIcon(activity.type)}
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    <span className="font-medium text-gray-900">{activity.user}</span> {activity.action}
                                                </p>
                                            </div>
                                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                <time>{activity.time}</time>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ActivityLog;
