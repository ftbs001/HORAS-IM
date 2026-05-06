import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const BULAN = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const greeting = () => { const h = new Date().getHours(); return h<12?'Selamat Pagi':h<15?'Selamat Siang':h<18?'Selamat Sore':'Selamat Malam'; };
const initials = (n='') => n.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();

const StatusPill = ({ s }) => {
  const m = { Selesai:'bg-emerald-100 text-emerald-700', Lengkap:'bg-emerald-100 text-emerald-700', 'Belum Lengkap':'bg-amber-100 text-amber-700', Kosong:'bg-gray-100 text-gray-500', Draft:'bg-gray-100 text-gray-500' };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${m[s]||'bg-gray-100 text-gray-500'}`}>{s||'Belum Diisi'}</span>;
};

const KPI = ({ label, value, icon, from, to, sub }) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${from} ${to} group hover:-translate-y-1 transition-all duration-300`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-4xl font-bold">{value??'—'}</p>
        {sub&&<p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
      <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">{icon}</div>
    </div>
    <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-xl"/>
  </div>
);

const Btn = ({ icon, label, desc, color, onClick }) => (
  <button onClick={onClick} className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all text-left w-full">
    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center text-white text-lg mb-3 group-hover:scale-110 transition-transform shadow`}>{icon}</div>
    <p className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{label}</p>
    <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
  </button>
);

/* ─── SUPERADMIN ─────────────────────────────────────────── */
const SuperAdminDash = ({ nav, user }) => {
  const now = new Date();
  const bln = now.getMonth()+1, thn = now.getFullYear();
  const [kpi, setKpi]   = useState({ anggota:null, selesai:null, proses:null, kosong:null });
  const [secs, setSecs] = useState([]);
  const [act, setAct]   = useState([]);
  const [load, setLoad] = useState(true);

  useEffect(()=>{
    let ok=true;
    (async()=>{
      try {
        const [uRes, sRes, aRes, lRes] = await Promise.all([
          supabase.from('app_users').select('id',{count:'exact',head:true}),
          supabase.from('sections').select('id,name').order('urutan_penggabungan'),
          supabase.from('activity_logs').select('id,user_name,action,detail,created_at').order('created_at',{ascending:false}).limit(7),
          supabase.from('monthly_reports').select('seksi_id,status').eq('bulan',bln).eq('tahun',thn),
        ]);
        if(!ok) return;
        const lRows = lRes.data||[];
        const statusMap = {};
        lRows.forEach(r=>{ statusMap[r.seksi_id]=r.status; });
        const secList = (sRes.data||[]).map(s=>({...s, status: statusMap[s.id]||'Kosong'}));
        setSecs(secList);
        setKpi({
          anggota: uRes.count||0,
          selesai: lRows.filter(r=>r.status==='Selesai'||r.status==='Lengkap').length,
          proses:  lRows.filter(r=>r.status==='Draft'||r.status==='Belum Lengkap').length,
          kosong:  secList.filter(s=>s.status==='Kosong').length,
        });
        setAct(aRes.data||[]);
      } catch(e){ console.warn(e); }
      finally{ if(ok) setLoad(false); }
    })();
    return ()=>{ ok=false; };
  },[bln,thn]);

  const actions = [
    { icon:'📋', label:'Semua Laporan', desc:'Lihat master laporan', color:'bg-[#0D1B3E]', to:'monthly-report' },
    { icon:'📎', label:'Gabung & Ekspor', desc:'Susun laporan Word', color:'bg-amber-500', to:'gabung-laporan' },
    { icon:'✅', label:'Status Template', desc:'Progres pengisian seksi', color:'bg-emerald-600', to:'template-status' },
    { icon:'👥', label:'Anggota', desc:'Manajemen pengguna', color:'bg-purple-600', to:'members' },
    { icon:'🗄️', label:'Arsip & Dokumen', desc:'File & dokumen lama', color:'bg-rose-500', to:'archive' },
    { icon:'📊', label:'Data Seksi', desc:'Info organisasi seksi', color:'bg-cyan-600', to:'section-data' },
  ];

  const dot = s => ({ Selesai:'bg-emerald-400', Lengkap:'bg-emerald-400', 'Belum Lengkap':'bg-amber-400', Kosong:'bg-gray-300' }[s]||'bg-gray-300');

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D1B3E] via-[#1a2f6e] to-[#0D1B3E] text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"/>
        <img src="/horas_logo.png" alt="" className="absolute right-0 top-0 h-full w-auto opacity-5 object-contain pointer-events-none"/>
        <div className="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#C9992A] flex items-center justify-center text-2xl font-black shadow-lg flex-shrink-0">{initials(user?.nama)}</div>
            <div>
              <span className="bg-[#C9992A]/20 border border-[#C9992A]/40 text-[#C9992A] text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-widest">Super Admin</span>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">{greeting()}, <span className="text-[#C9992A]">{user?.nama}</span></h1>
              <p className="text-blue-200 text-sm mt-0.5">HORAS-IM · {BULAN[bln]} {thn} · Pantau penyusunan laporan bulanan</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>nav('monthly-report')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">📋 Semua Laporan</button>
            <button onClick={()=>nav('gabung-laporan')} className="flex items-center gap-2 bg-[#C9992A] hover:bg-yellow-400 text-[#0D1B3E] font-black px-4 py-2 rounded-xl text-sm transition-all shadow-lg">📎 Gabung &amp; Ekspor</button>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Anggota"      value={load?'..':kpi.anggota} icon="👥" from="from-[#0D1B3E]" to="to-blue-800"      sub="Pengguna aktif"/>
        <KPI label="Laporan Selesai"    value={load?'..':kpi.selesai} icon="✅" from="from-emerald-600" to="to-teal-700"   sub={`Bulan ${BULAN[bln]}`}/>
        <KPI label="Sedang Disusun"     value={load?'..':kpi.proses}  icon="✍️" from="from-blue-500"  to="to-indigo-600"  sub="Draft / belum lengkap"/>
        <KPI label="Seksi Belum Isi"    value={load?'..':kpi.kosong}  icon="⚠️" from="from-rose-600"  to="to-red-700"     sub="Perlu diingatkan"/>
      </div>

      {/* Status Seksi + Aktivitas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><span className="w-1.5 h-5 bg-[#C9992A] rounded-full"/>Status Template {BULAN[bln]} {thn}</h3>
            <button onClick={()=>nav('template-status')} className="text-xs text-blue-600 font-semibold hover:underline">Detail →</button>
          </div>
          {load ? <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
          : secs.length===0 ? <p className="text-gray-400 text-sm text-center py-8">Belum ada data seksi</p>
          : <div className="space-y-2">{secs.map(s=>(
            <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot(s.status)}`}/>
              <p className="flex-1 font-semibold text-gray-800 text-sm">{s.name}</p>
              <StatusPill s={s.status}/>
            </div>
          ))}</div>}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><span className="w-1.5 h-5 bg-[#0D1B3E] rounded-full"/>Aktivitas Terbaru</h3>
          </div>
          {load ? <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"/>)}</div>
          : act.length===0 ? <p className="text-gray-400 text-sm text-center py-8">Belum ada aktivitas</p>
          : <div className="space-y-3 max-h-72 overflow-y-auto pr-1">{act.map(a=>(
            <div key={a.id} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{initials(a.user_name)}</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{a.user_name}</p>
                <p className="text-xs text-gray-400 truncate">{a.detail||a.action}</p>
              </div>
            </div>
          ))}</div>}
        </div>
      </div>

      {/* Akses Cepat */}
      <div>
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="w-1.5 h-5 bg-[#C9992A] rounded-full"/>Akses Cepat</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {actions.map(a=><Btn key={a.to} icon={a.icon} label={a.label} desc={a.desc} color={a.color} onClick={()=>nav(a.to)}/>)}
        </div>
      </div>
    </div>
  );
};

/* ─── ADMIN SEKSI ────────────────────────────────────────── */
const AdminSeksiDash = ({ nav, user }) => {
  const now = new Date();
  const bln = now.getMonth()+1, thn = now.getFullYear();
  const seksiId = user?.seksiId;

  const SEKSI_NAV = { inteldakim:'report-input-inteldakim', lalintalkim:'report-input-lalintalkim', tikim:'report-input-tikim', tu:'report-input-tu', 'tata usaha':'report-input-tu', tatausaha:'report-input-tu' };
  const alias = (user?.seksi?.alias||'').toLowerCase();
  const myNav = SEKSI_NAV[alias] || 'monthly-report';

  const [status, setStatus] = useState(null);
  const [kpi, setKpi]       = useState({ total:null, selesai:null, proses:null });
  const [load, setLoad]     = useState(true);

  useEffect(()=>{
    if(!seksiId){ setLoad(false); return; }
    let ok=true;
    (async()=>{
      try {
        const [mRes, allRes] = await Promise.all([
          supabase.from('monthly_reports').select('*').eq('seksi_id',seksiId).eq('bulan',bln).eq('tahun',thn).maybeSingle(),
          supabase.from('monthly_reports').select('id,status').eq('seksi_id',seksiId),
        ]);
        if(!ok) return;
        setStatus(mRes.data||null);
        const rows = allRes.data||[];
        setKpi({ total:rows.length, selesai:rows.filter(r=>r.status==='Selesai'||r.status==='Lengkap').length, proses:rows.filter(r=>r.status==='Draft'||r.status==='Belum Lengkap').length });
      } catch(e){ console.warn(e); }
      finally{ if(ok) setLoad(false); }
    })();
    return ()=>{ ok=false; };
  },[seksiId,bln,thn]);

  const monthColor = { Selesai:'border-emerald-300 bg-emerald-50', Lengkap:'border-emerald-300 bg-emerald-50', 'Belum Lengkap':'border-amber-300 bg-amber-50', Kosong:'border-gray-200 bg-gray-50', Draft:'border-blue-200 bg-blue-50' };
  const curColor = monthColor[status?.status||'Kosong'];

  const actions = [
    { icon:'✍️', label:'Isi Template Laporan', desc:'Input data bulanan seksi', color:'bg-[#0D1B3E]', to: myNav },
    { icon:'📋', label:'Status Pengisian', desc:'Cek progres template', color:'bg-amber-500', to:'template-status' },
    { icon:'🗄️', label:'Arsip & Dokumen', desc:'File & dokumen lama', color:'bg-rose-500', to:'archive' },
    { icon:'👤', label:'Profil Saya', desc:'Edit data akun', color:'bg-purple-600', to:'profile' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D1B3E] via-[#1a2f6e] to-[#0D1B3E] text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"/>
        <img src="/horas_logo.png" alt="" className="absolute right-0 top-0 h-full w-auto opacity-5 object-contain pointer-events-none"/>
        <div className="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9992A] to-yellow-400 flex items-center justify-center text-2xl font-black shadow-lg flex-shrink-0">{initials(user?.nama)}</div>
            <div>
              <span className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-0.5 rounded-full">{user?.seksi?.name||'Admin Seksi'}</span>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">{greeting()}, <span className="text-[#C9992A]">{user?.nama?.split(' ')[0]}</span></h1>
              <p className="text-blue-200 text-sm mt-0.5">HORAS-IM · {BULAN[bln]} {thn} · Susun laporan seksi Anda</p>
            </div>
          </div>
          <button onClick={()=>nav(myNav)} className="flex items-center gap-2 bg-[#C9992A] hover:bg-yellow-400 text-[#0D1B3E] font-black px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg">
            ✍️ Isi Template Laporan
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <KPI label="Total Laporan" value={load?'..':kpi.total}   icon="📁" from="from-[#0D1B3E]" to="to-blue-800" sub="Semua periode"/>
        <KPI label="Selesai"       value={load?'..':kpi.selesai} icon="✅" from="from-emerald-600" to="to-teal-700" sub="Laporan lengkap"/>
        <KPI label="Dalam Proses"  value={load?'..':kpi.proses}  icon="✍️" from="from-blue-500" to="to-indigo-600" sub="Draft / belum lengkap"/>
      </div>

      {/* Status bulan ini + Akses */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`lg:col-span-2 rounded-2xl border-2 p-6 ${curColor}`}>
          <h3 className="font-bold text-sm mb-4">📅 Status Laporan {BULAN[bln]} {thn}</h3>
          {load ? <div className="h-20 bg-white/50 rounded-xl animate-pulse"/>
          : status ? (
            <div className="space-y-3">
              <StatusPill s={status.status}/>
              <p className="font-semibold text-sm text-gray-800">{user?.seksi?.name}</p>
              <p className="text-xs text-gray-500">Diperbarui: {new Date(status.updated_at).toLocaleDateString('id-ID')}</p>
              <button onClick={()=>nav(myNav)} className="w-full mt-2 bg-[#0D1B3E] text-white text-xs font-bold py-2 rounded-xl hover:opacity-90 transition-opacity">
                ✍️ Lanjutkan Pengisian
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm font-semibold text-gray-700 mb-3">Belum ada data bulan ini</p>
              <button onClick={()=>nav(myNav)} className="bg-[#0D1B3E] text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90">
                ✍️ Mulai Isi Template
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2"><span className="w-1.5 h-5 bg-[#C9992A] rounded-full"/>Akses Cepat</h3>
          <div className="grid grid-cols-2 gap-3">
            {actions.map(a=><Btn key={a.to} icon={a.icon} label={a.label} desc={a.desc} color={a.color} onClick={()=>nav(a.to)}/>)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── ROOT ────────────────────────────────────────────────── */
const DashboardHome = ({ onNavigate }) => {
  const { user, isSuperAdmin } = useAuth();
  return isSuperAdmin()
    ? <SuperAdminDash nav={onNavigate} user={user}/>
    : <AdminSeksiDash nav={onNavigate} user={user}/>;
};

export default DashboardHome;
