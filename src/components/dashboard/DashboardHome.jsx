import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const BULAN = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
};

const initials = (name = '') => name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

const StatusBadge = ({ status }) => {
    const map = {
        'Diterima': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Dikirim':  'bg-blue-100 text-blue-700 border-blue-200',
        'Ditolak':  'bg-red-100 text-red-700 border-red-200',
        'Draft':    'bg-gray-100 text-gray-600 border-gray-200',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status]||map.Draft}`}>{status}</span>;
};

// ── KPI Card ──────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon, color, sub }) => (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${color} group hover:-translate-y-1 transition-all duration-300`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-4xl font-bold">{value ?? '—'}</p>
                {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">{icon}</div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-xl" />
    </div>
);

// ── Quick Action Card ─────────────────────────────────────────────────
const ActionCard = ({ icon, label, desc, onClick, accent }) => (
    <button onClick={onClick}
        className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all text-left w-full">
        <div className={`w-12 h-12 rounded-xl ${accent} flex items-center justify-center text-white text-xl mb-3 group-hover:scale-110 transition-transform shadow`}>{icon}</div>
        <p className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{label}</p>
        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
    </button>
);

// ════════════════════════════════════════════════════════════════
// SUPER ADMIN DASHBOARD
// ════════════════════════════════════════════════════════════════
const SuperAdminDashboard = ({ onNavigate, user }) => {
    const now = new Date();
    const bulan = now.getMonth()+1, tahun = now.getFullYear();
    const [stats, setStats]   = useState({ anggota:0, diterima:0, ditolak:0, pending:0 });
    const [sections, setSections] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [u, l, s, a] = await Promise.all([
                    supabase.from('app_users').select('id', { count:'exact', head:true }),
                    supabase.from('laporan_bulanan').select('status').eq('bulan', bulan).eq('tahun', tahun),
                    supabase.from('sections').select('id,name').order('urutan_penggabungan'),
                    supabase.from('activity_logs').select('id,user_name,action,detail,created_at').order('created_at', { ascending:false }).limit(8),
                ]);
                if (!mounted) return;
                const rows = l.data || [];
                setStats({
                    anggota:  u.count || 0,
                    diterima: rows.filter(r=>r.status==='Diterima').length,
                    ditolak:  rows.filter(r=>r.status==='Ditolak').length,
                    pending:  rows.filter(r=>r.status==='Dikirim').length,
                });
                setSections((s.data||[]).map(sec=>{
                    const uploaded = rows.some(r=>true); // placeholder
                    const secLaporan = rows.filter(r=>r.seksi_id===sec.id||true);
                    return { ...sec, uploaded: rows.length > 0 };
                }));
                // get actual section laporan status
                const allRows = l.data||[];
                const sArr = (s.data||[]);
                const combined = await supabase.from('laporan_bulanan').select('seksi_id,status').eq('bulan',bulan).eq('tahun',tahun);
                const lMap = {};
                (combined.data||[]).forEach(r=>{ lMap[r.seksi_id]=r.status; });
                setSections(sArr.map(sec=>({ ...sec, status: lMap[sec.id]||null })));
                setActivity(a.data||[]);
            } catch(e) { console.warn(e); }
            finally { if(mounted) setLoading(false); }
        })();
        return () => { mounted=false; };
    }, [bulan, tahun]);

    const actions = [
        { icon:'📊', label:'Monitoring Laporan', desc:'Pantau semua seksi', accent:'bg-blue-600', nav:'monitoring-laporan' },
        { icon:'📎', label:'Gabung & Ekspor', desc:'Susun laporan master', accent:'bg-amber-500', nav:'gabung-laporan' },
        { icon:'✅', label:'Verifikasi', desc:'Tinjau kiriman seksi', accent:'bg-emerald-600', nav:'verification' },
        { icon:'👥', label:'Data Pegawai', desc:'Manajemen anggota', accent:'bg-purple-600', nav:'members' },
        { icon:'📋', label:'Status Template', desc:'Progres pengisian', accent:'bg-cyan-600', nav:'template-status' },
        { icon:'🗄️', label:'Arsip Digital', desc:'Dokumen & arsip lama', accent:'bg-rose-500', nav:'archive' },
    ];

    const statusColor = s => ({
        'Diterima':'bg-emerald-400','Dikirim':'bg-blue-400','Ditolak':'bg-red-400',null:'bg-gray-200'
    }[s]||'bg-gray-200');

    return (
        <div className="space-y-6 pb-12">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D1B3E] via-[#1a2f6e] to-[#0D1B3E] text-white shadow-2xl">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"/>
                <img src="/horas_logo.png" alt="" className="absolute right-0 top-0 h-full w-auto opacity-5 object-contain pointer-events-none"/>
                <div className="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-[#C9992A] flex items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0">
                            {initials(user?.nama)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#C9992A]/20 border border-[#C9992A]/40 text-[#C9992A] text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-widest">Super Admin</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold">{greeting()}, <span className="text-[#C9992A]">{user?.nama}</span></h1>
                            <p className="text-blue-200 text-sm mt-0.5">HORAS-IM · {BULAN[bulan]} {tahun} · Pantau laporan bulanan secara real-time</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                        <button onClick={()=>onNavigate('monitoring-laporan')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                            📊 Monitoring
                        </button>
                        <button onClick={()=>onNavigate('gabung-laporan')} className="flex items-center gap-2 bg-[#C9992A] hover:bg-yellow-400 text-[#0D1B3E] font-black px-4 py-2 rounded-xl text-sm transition-all shadow-lg">
                            📎 Gabung & Ekspor
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Anggota" value={loading?'..':stats.anggota} icon="👥" color="bg-gradient-to-br from-[#0D1B3E] to-blue-800" sub="Pengguna aktif"/>
                <KpiCard label="Laporan Diterima" value={loading?'..':stats.diterima} icon="✅" color="bg-gradient-to-br from-emerald-600 to-teal-700" sub={`Bulan ${BULAN[bulan]}`}/>
                <KpiCard label="Menunggu Review" value={loading?'..':stats.pending} icon="⏳" color="bg-gradient-to-br from-blue-500 to-indigo-600" sub="Perlu ditinjau"/>
                <KpiCard label="Laporan Ditolak" value={loading?'..':stats.ditolak} icon="❌" color="bg-gradient-to-br from-rose-600 to-red-700" sub="Butuh revisi"/>
            </div>

            {/* Status seksi + Aktivitas */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Kiri: Status Seksi */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-[#C9992A] rounded-full"/>
                            Status Laporan Seksi — {BULAN[bulan]} {tahun}
                        </h3>
                        <button onClick={()=>onNavigate('monitoring-laporan')} className="text-xs text-blue-600 font-semibold hover:underline">Lihat Semua →</button>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
                    ) : sections.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">Belum ada data seksi</p>
                    ) : (
                        <div className="space-y-3">
                            {sections.map(sec=>(
                                <div key={sec.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusColor(sec.status)}`}/>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{sec.name}</p>
                                    </div>
                                    <StatusBadge status={sec.status||'Belum Upload'}/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Kanan: Aktivitas */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-[#0D1B3E] rounded-full"/>
                            Aktivitas Terbaru
                        </h3>
                        <button onClick={()=>onNavigate('activity-log')} className="text-xs text-blue-600 font-semibold hover:underline">Semua →</button>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"/>)}</div>
                    ) : activity.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">Belum ada aktivitas</p>
                    ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            {activity.map(a=>(
                                <div key={a.id} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 mt-0.5">
                                        {initials(a.user_name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 truncate">{a.user_name}</p>
                                        <p className="text-xs text-gray-400 truncate">{a.detail||a.action}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Akses Cepat */}
            <div>
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#C9992A] rounded-full"/>Akses Cepat
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {actions.map(a=><ActionCard key={a.nav} {...a} onClick={()=>onNavigate(a.nav)}/>)}
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// ADMIN SEKSI DASHBOARD
// ════════════════════════════════════════════════════════════════
const AdminSeksiDashboard = ({ onNavigate, user }) => {
    const now = new Date();
    const bulan = now.getMonth()+1, tahun = now.getFullYear();
    const seksiId = user?.seksiId;
    const [stats, setStats] = useState({ total:0, diterima:0, ditolak:0, pending:0 });
    const [recent, setRecent] = useState([]);
    const [thisMonth, setThisMonth] = useState(null);
    const [loading, setLoading] = useState(true);

    const sectionNavMap = {
        'inteldakim': 'report-input-inteldakim',
        'lalintalkim': 'report-input-lalintalkim',
        'tikim': 'report-input-tikim',
        'tu': 'report-input-tu',
        'tata usaha': 'report-input-tu',
    };
    const sectionNav = sectionNavMap[user?.seksi?.alias?.toLowerCase()] || 'monthly-report';

    useEffect(()=>{
        if(!seksiId) { setLoading(false); return; }
        let mounted=true;
        (async()=>{
            try {
                const [all, month] = await Promise.all([
                    supabase.from('laporan_bulanan').select('id,status,bulan,tahun,judul_laporan,updated_at').eq('seksi_id',seksiId).order('updated_at',{ascending:false}).limit(10),
                    supabase.from('laporan_bulanan').select('*').eq('seksi_id',seksiId).eq('bulan',bulan).eq('tahun',tahun).single(),
                ]);
                if(!mounted) return;
                const rows = all.data||[];
                setStats({
                    total: rows.length,
                    diterima: rows.filter(r=>r.status==='Diterima').length,
                    ditolak: rows.filter(r=>r.status==='Ditolak').length,
                    pending: rows.filter(r=>r.status==='Dikirim').length,
                });
                setRecent(rows.slice(0,5));
                setThisMonth(month.data||null);
            } catch(e){ console.warn(e); }
            finally{ if(mounted) setLoading(false); }
        })();
        return()=>{ mounted=false; };
    },[seksiId,bulan,tahun]);

    const actions = [
        { icon:'⬆️', label:'Upload Laporan', desc:'Kirim file laporan', accent:'bg-[#0D1B3E]', nav:'upload-laporan' },
        { icon:'📝', label:'Input Template', desc:'Isi template seksi', accent:'bg-blue-600', nav: sectionNav },
        { icon:'📋', label:'Status Template', desc:'Cek progres pengisian', accent:'bg-amber-500', nav:'template-status' },
        { icon:'🗄️', label:'Arsip Digital', desc:'Dokumen & arsip', accent:'bg-rose-500', nav:'archive' },
    ];

    const monthStatus = thisMonth?.status || null;
    const monthStatusStyle = {
        'Diterima':'bg-emerald-50 border-emerald-200 text-emerald-700',
        'Dikirim':'bg-blue-50 border-blue-200 text-blue-700',
        'Ditolak':'bg-red-50 border-red-200 text-red-700',
        null:'bg-gray-50 border-gray-200 text-gray-500',
    }[monthStatus];

    return (
        <div className="space-y-6 pb-12">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D1B3E] via-[#1a2f6e] to-[#0D1B3E] text-white shadow-2xl">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"/>
                <img src="/horas_logo.png" alt="" className="absolute right-0 top-0 h-full w-auto opacity-5 object-contain pointer-events-none"/>
                <div className="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9992A] to-yellow-400 flex items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0">
                            {initials(user?.nama)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-0.5 rounded-full">{user?.seksi?.name || 'Admin Seksi'}</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold">{greeting()}, <span className="text-[#C9992A]">{user?.nama?.split(' ')[0]}</span></h1>
                            <p className="text-blue-200 text-sm mt-0.5">HORAS-IM · {BULAN[bulan]} {tahun} · Kelola laporan seksi Anda</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                        <button onClick={()=>onNavigate('upload-laporan')} className="flex items-center gap-2 bg-[#C9992A] hover:bg-yellow-400 text-[#0D1B3E] font-black px-4 py-2 rounded-xl text-sm transition-all shadow-lg">
                            ⬆️ Upload Laporan
                        </button>
                        <button onClick={()=>onNavigate(sectionNav)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                            📝 Input Template
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Upload" value={loading?'..':stats.total} icon="📁" color="bg-gradient-to-br from-[#0D1B3E] to-blue-800" sub="Semua periode"/>
                <KpiCard label="Diterima" value={loading?'..':stats.diterima} icon="✅" color="bg-gradient-to-br from-emerald-600 to-teal-700" sub="Laporan disetujui"/>
                <KpiCard label="Menunggu" value={loading?'..':stats.pending} icon="⏳" color="bg-gradient-to-br from-blue-500 to-indigo-600" sub="Dalam review"/>
                <KpiCard label="Ditolak" value={loading?'..':stats.ditolak} icon="❌" color="bg-gradient-to-br from-rose-600 to-red-700" sub="Perlu direvisi"/>
            </div>

            {/* Status bulan ini + Riwayat */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Status bulan ini */}
                <div className="lg:col-span-2">
                    <div className={`rounded-2xl border-2 p-6 ${monthStatusStyle||'bg-gray-50 border-gray-200'}`}>
                        <h3 className="font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                            📅 Status Laporan {BULAN[bulan]} {tahun}
                        </h3>
                        {loading ? <div className="h-20 bg-white/50 rounded-xl animate-pulse"/> :
                        thisMonth ? (
                            <div className="space-y-3">
                                <StatusBadge status={thisMonth.status}/>
                                <p className="font-semibold text-sm">{thisMonth.judul_laporan||'Laporan Bulanan'}</p>
                                <p className="text-xs opacity-70">Diperbarui: {new Date(thisMonth.updated_at).toLocaleDateString('id-ID')}</p>
                                {thisMonth.catatan_revisi&&<p className="text-xs bg-red-50 text-red-600 p-2 rounded-lg border border-red-100">📌 {thisMonth.catatan_revisi}</p>}
                                <button onClick={()=>onNavigate('upload-laporan')} className="w-full mt-2 bg-white border border-current rounded-xl py-2 text-xs font-bold hover:opacity-80 transition-opacity">
                                    {thisMonth.status==='Ditolak'?'⬆️ Upload Ulang':'👁️ Lihat Detail'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-4xl mb-2">📭</p>
                                <p className="text-sm font-semibold mb-3">Belum ada laporan bulan ini</p>
                                <button onClick={()=>onNavigate('upload-laporan')} className="bg-[#0D1B3E] text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
                                    ⬆️ Upload Sekarang
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Riwayat */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-[#0D1B3E] rounded-full"/>Riwayat Upload
                        </h3>
                        <button onClick={()=>onNavigate('upload-laporan')} className="text-xs text-blue-600 font-semibold hover:underline">Kelola →</button>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
                    ) : recent.length===0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">Belum ada laporan yang diupload</p>
                    ) : (
                        <div className="space-y-2">
                            {recent.map(r=>(
                                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{r.judul_laporan||'Laporan Bulanan'}</p>
                                        <p className="text-xs text-gray-400">{BULAN[r.bulan]} {r.tahun}</p>
                                    </div>
                                    <StatusBadge status={r.status}/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Akses Cepat */}
            <div>
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#C9992A] rounded-full"/>Akses Cepat
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {actions.map(a=><ActionCard key={a.nav} {...a} onClick={()=>onNavigate(a.nav)}/>)}
                </div>
            </div>
        </div>
    );
};

// ── Root Export ───────────────────────────────────────────────────────
const DashboardHome = ({ onNavigate }) => {
    const { user, isSuperAdmin } = useAuth();
    return isSuperAdmin()
        ? <SuperAdminDashboard onNavigate={onNavigate} user={user}/>
        : <AdminSeksiDashboard onNavigate={onNavigate} user={user}/>;
};

export default DashboardHome;
