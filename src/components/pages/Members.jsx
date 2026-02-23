import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: SUPER ADMIN — Kelola semua anggota
// ─────────────────────────────────────────────────────────────
function SuperAdminMembers({ user }) {
    const [members, setMembers] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSeksi, setFilterSeksi] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState({ nama: '', email: '', nip: '', role: 'admin_seksi', seksi_id: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

    const loadData = useCallback(async () => {
        setLoading(true);
        const [{ data: users }, { data: sec }] = await Promise.all([
            supabase.from('app_users').select('*, sections(id, name, alias)').order('nama'),
            supabase.from('sections').select('id, name, alias').order('id', { ascending: true }),
        ]);
        setMembers(users || []);
        // Deduplikat berdasarkan nama (jaga-jaga jika DB masih ada duplikat)
        const secUnique = Array.from(
            new Map((sec || []).map(s => [s.name.toLowerCase().trim(), s])).values()
        );
        setSections(secUnique);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = members.filter(m => {
        const matchSeksi = !filterSeksi || m.seksi_id === filterSeksi;
        const matchRole = !filterRole || m.role === filterRole;
        const matchSearch = !search || m.nama?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()) || m.nip?.includes(search);
        return matchSeksi && matchRole && matchSearch;
    });

    const handleSave = async () => {
        if (!form.nama || !form.email) return showMsg('error', 'Nama dan email wajib diisi.');
        setSaving(true);
        try {
            const payload = {
                nama: form.nama, email: form.email, nip: form.nip,
                role: form.role, seksi_id: form.seksi_id || null, phone: form.phone,
                updated_at: new Date().toISOString(),
            };
            if (editTarget) {
                const { error } = await supabase.from('app_users').update(payload).eq('id', editTarget.id);
                if (error) throw error;
                showMsg('success', '✅ Data anggota berhasil diperbarui.');
            } else {
                const { error } = await supabase.from('app_users').insert({ ...payload, created_at: new Date().toISOString() });
                if (error) throw error;
                showMsg('success', '✅ Anggota baru berhasil ditambahkan.');
            }
            setShowForm(false);
            setEditTarget(null);
            setForm({ nama: '', email: '', nip: '', role: 'admin_seksi', seksi_id: '', phone: '' });
            await loadData();
        } catch (err) {
            showMsg('error', `Gagal: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (m) => {
        setEditTarget(m);
        setForm({ nama: m.nama || '', email: m.email || '', nip: m.nip || '', role: m.role || 'admin_seksi', seksi_id: m.seksi_id || '', phone: m.phone || '' });
        setShowForm(true);
    };

    const handleExport = () => {
        const csv = [
            ['NIP', 'Nama', 'Email', 'Seksi', 'Role'].join(','),
            ...filtered.map(m => [m.nip || '-', m.nama, m.email, m.sections?.name || '-', m.role].join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'daftar_anggota.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const roleColors = {
        super_admin: { bg: '#f3e8ff', color: '#7e22ce' },
        admin_seksi: { bg: '#dbeafe', color: '#1d4ed8' },
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0f2440 0%, #1a3a6b 100%)', borderRadius: '16px', padding: '26px 32px', color: '#fff', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>👥 Manajemen Anggota</h1>
                    <p style={{ color: '#93c5fd', marginTop: '4px', fontSize: '14px' }}>Kelola semua akun pengguna sistem HORAS-IM</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={handleExport} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                        ⬇️ Export CSV
                    </button>
                    <button onClick={() => { setEditTarget(null); setForm({ nama: '', email: '', nip: '', role: 'admin_seksi', seksi_id: '', phone: '' }); setShowForm(true); }}
                        style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                        ➕ Tambah Anggota
                    </button>
                </div>
            </div>

            {msg && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', color: msg.type === 'success' ? '#15803d' : '#b91c1c', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                    {msg.text}
                </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {[
                    { label: 'Total Pengguna', val: members.length, icon: '👥', bg: '#f8fafc', color: '#334155' },
                    { label: 'Super Admin', val: members.filter(m => m.role === 'super_admin').length, icon: '👑', bg: '#faf5ff', color: '#7e22ce' },
                    { label: 'Admin Seksi', val: members.filter(m => m.role === 'admin_seksi').length, icon: '🧑‍💼', bg: '#eff6ff', color: '#1d4ed8' },
                    { label: 'Total Seksi', val: sections.length, icon: '🏢', bg: '#f0fdf4', color: '#15803d' },
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '14px', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: s.color }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter & Search */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cari nama, email, NIP..."
                    style={{ flex: 1, minWidth: '200px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }} />
                <select value={filterSeksi} onChange={e => setFilterSeksi(e.target.value)}
                    style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: '#fff' }}>
                    <option value="">Semua Seksi</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                    style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: '#fff' }}>
                    <option value="">Semua Role</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin_seksi">Admin Seksi</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>⏳ Memuat data anggota...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>👤</div>
                        <p>Tidak ada anggota ditemukan.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    {['Anggota', 'NIP', 'Seksi', 'Role', 'Aksi'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((m, i) => {
                                    const rc = roleColors[m.role] || { bg: '#f1f5f9', color: '#64748b' };
                                    const initials = (m.nama || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                                    return (
                                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0f2440', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{m.nama}</p>
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{m.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{m.nip || '—'}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{m.sections?.name || '—'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ background: rc.bg, color: rc.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                                                    {m.role === 'super_admin' ? '👑 Super Admin' : '🧑‍💼 Admin Seksi'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => handleEdit(m)}
                                                        style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                                                        ✏️ Edit
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Form Tambah/Edit */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ background: '#0f2440', padding: '18px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 700 }}>{editTarget ? '✏️ Edit Anggota' : '➕ Tambah Anggota Baru'}</h3>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                {[
                                    { label: 'Nama Lengkap *', key: 'nama', type: 'text', placeholder: 'Nama lengkap' },
                                    { label: 'Email Dinas *', key: 'email', type: 'email', placeholder: 'email@imigrasi.go.id' },
                                    { label: 'NIP', key: 'nip', type: 'text', placeholder: '19XXXXXXXXXX' },
                                    { label: 'No. Telepon', key: 'phone', type: 'tel', placeholder: '08xx-xxxx-xxxx' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>{f.label}</label>
                                        <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                            placeholder={f.placeholder}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>Seksi / Bidang</label>
                                    <select value={form.seksi_id} onChange={e => setForm(p => ({ ...p, seksi_id: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: '#fff' }}>
                                        <option value="">— Pilih Seksi —</option>
                                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>Role</label>
                                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: '#fff' }}>
                                        <option value="admin_seksi">Admin Seksi</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: saving ? '#94a3b8' : '#0f2440', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                    {saving ? '⏳ Menyimpan...' : editTarget ? '💾 Simpan Perubahan' : '✅ Tambah Anggota'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: ADMIN SEKSI — Profil diri + Tim seksi
// ─────────────────────────────────────────────────────────────
function AdminSeksiMembers({ user, onNavigate }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msgProfile, setMsgProfile] = useState(null);

    const loadTeam = useCallback(async () => {
        if (!user?.seksiId) { setLoading(false); return; }
        setLoading(true);
        const { data } = await supabase
            .from('app_users')
            .select('id, nama, email, nip, role, last_login, phone, sections(name, alias)')
            .eq('seksi_id', user.seksiId)
            .neq('id', user.id)   // tidak tampilkan diri sendiri (sudah di kartu profil)
            .order('nama');
        setTeamMembers(data || []);
        setLoading(false);
    }, [user]);

    useEffect(() => { loadTeam(); }, [loadTeam]);

    const initials = (name) => (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const relTime = (d) => {
        if (!d) return 'Belum pernah login';
        const diff = Date.now() - new Date(d).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Baru saja';
        if (m < 60) return `${m} mnt lalu`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} jam lalu`;
        return `${Math.floor(h / 24)} hari lalu`;
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', borderRadius: '16px', padding: '24px 28px', color: '#fff', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>👤 Profil & Tim Seksi</h1>
                <p style={{ color: '#93c5fd', marginTop: '4px', fontSize: '14px' }}>{user?.seksi?.name || 'Seksi Anda'}</p>
            </div>

            {msgProfile && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                    {msgProfile}
                </div>
            )}

            {/* Kartu Profil Diri */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '2px solid #3b82f6', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 16px rgba(59,130,246,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#0f2440', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '22px', flexShrink: 0, boxShadow: '0 4px 12px rgba(15,36,64,0.3)' }}>
                        {initials(user?.nama)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800 }}>{user?.nama || '—'}</h2>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{user?.email}</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                                🧑‍💼 Admin Seksi
                            </span>
                            <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                                🏢 {user?.seksi?.name || user?.seksi?.alias || '—'}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    {[
                        { label: 'NIP', value: user?.nip || '—', icon: '🪪' },
                        { label: 'No. Telepon', value: user?.phone || '—', icon: '📱' },
                        { label: 'Seksi', value: user?.seksi?.name || '—', icon: '🏢' },
                    ].map(f => (
                        <div key={f.label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px' }}>
                            <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{f.icon} {f.label}</p>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{f.value}</p>
                        </div>
                    ))}
                </div>

                <button onClick={() => onNavigate && onNavigate('profile')}
                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                    ✏️ Edit Profil Saya
                </button>
            </div>

            {/* Tim Seksi */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                            👥 Rekan Tim — {user?.seksi?.name || 'Seksi Anda'}
                        </h2>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>Hanya bisa dilihat, tidak bisa diedit</p>
                    </div>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                        {teamMembers.length} anggota
                    </span>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>⏳ Memuat tim...</div>
                ) : teamMembers.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>👤</div>
                        <p style={{ margin: 0, fontSize: '14px' }}>Belum ada rekan terdaftar di seksi ini.</p>
                    </div>
                ) : (
                    <div style={{ padding: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                            {teamMembers.map(m => (
                                <div key={m.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#64748b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                                        {initials(m.nama)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nama}</p>
                                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</p>
                                        {m.nip && <p style={{ margin: '0 0 4px', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>{m.nip}</p>}
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700 }}>
                                                {m.role === 'super_admin' ? '👑 Super Admin' : '🧑‍💼 Admin Seksi'}
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#94a3b8' }}>🕐 {relTime(m.last_login)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info box */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#eff6ff', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px' }}>ℹ️</span>
                    <p style={{ margin: 0, fontSize: '12px', color: '#1d4ed8' }}>
                        Untuk menambah atau mengubah data anggota, hubungi <strong>Super Admin</strong> sistem HORAS-IM.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// EXPORT UTAMA — Router berdasarkan role
// ─────────────────────────────────────────────────────────────
const Members = ({ onNavigate }) => {
    const { user } = useAuth();

    if (!user) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>;

    if (user.role === 'super_admin') return <SuperAdminMembers user={user} />;

    return <AdminSeksiMembers user={user} onNavigate={onNavigate} />;
};

export default Members;
