const StatsCard = ({ title, value, icon, gradient, footerText }) => {
    return (
        <div className={`relative overflow-hidden rounded-xl shadow-lg border border-white/20 ${gradient} text-white group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
            <div className="p-6 relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-blue-100 text-sm font-medium tracking-wide uppercase">{title}</p>
                        <h3 className="text-4xl font-bold mt-2">{value}</h3>
                    </div>
                    <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        {icon}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center text-xs text-blue-100">
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-white mr-2">Update</span>
                    {footerText || "Baru saja diperbarui"}
                </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
        </div>
    );
};

const StatsGrid = () => {
    const stats = [
        {
            title: 'Anggota Terdaftar',
            value: '12',
            gradient: 'bg-gradient-to-br from-imigrasi-navy to-blue-900',
            icon: (
                <svg className="w-8 h-8 text-imigrasi-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            title: 'Laporan Diterima',
            value: '24',
            gradient: 'bg-gradient-to-br from-emerald-600 to-teal-700',
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            title: 'Laporan Ditolak',
            value: '3',
            gradient: 'bg-gradient-to-br from-rose-600 to-red-700',
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        {
            title: 'Laporan Masuk',
            value: '8',
            gradient: 'bg-gradient-to-br from-cyan-600 to-blue-600',
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
                <StatsCard key={index} {...stat} />
            ))}
        </div>
    );
};

export { StatsCard, StatsGrid };
export default StatsGrid;
