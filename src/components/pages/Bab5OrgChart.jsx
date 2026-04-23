import React from 'react';

/* ─────────────────────────────────────────────────────────────
   PersonCard Component
   Each card shows a round photo placeholder + title + name box
   ───────────────────────────────────────────────────────────── */
const PersonCard = ({ title, name, borderColor = '#b8860b', bgColor = '#b8860b', size = 'normal', empty = false }) => {
    const isSmall = size === 'small';
    const photoSize = isSmall ? 64 : 72;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
        }}>
            {/* Round Photo */}
            <div style={{
                width: photoSize,
                height: photoSize,
                borderRadius: '50%',
                border: `3px solid ${borderColor}`,
                overflow: 'hidden',
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                backgroundColor: '#d8e4f0',
            }}>
                {empty ? (
                    <svg width={photoSize * 0.55} height={photoSize * 0.55} viewBox="0 0 24 24" fill="#999">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.7S14.7 2.5 12 2.5 7.2 4.6 7.2 7.3 9.3 12 12 12zm0 2.3c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                ) : (
                    <svg width={photoSize * 0.65} height={photoSize * 0.65} viewBox="0 0 100 100" fill="none">
                        {/* Uniform portrait silhouette */}
                        <ellipse cx="50" cy="30" rx="18" ry="22" fill="#778899"/>
                        <path d="M12 95 C12 68 88 68 88 95" fill="#556070"/>
                        <rect x="28" y="52" width="44" height="28" rx="4" fill="#3a4a5a"/>
                        {/* Collar / uniform stripe */}
                        <rect x="42" y="52" width="16" height="28" fill="#eee" opacity="0.15"/>
                        <path d="M42 52 L50 62 L58 52" stroke="#fff" strokeWidth="2" fill="none" opacity="0.5"/>
                    </svg>
                )}
            </div>
            {/* Label Box */}
            <div style={{
                background: 'white',
                border: `2px solid ${borderColor}`,
                borderRadius: 6,
                textAlign: 'center',
                padding: '4px 8px',
                minWidth: isSmall ? 110 : 130,
                maxWidth: isSmall ? 120 : 150,
            }}>
                <div style={{ fontSize: isSmall ? 10 : 11, fontWeight: 700, color: '#222', lineHeight: 1.3, marginBottom: 2 }}>{title}</div>
                <div style={{
                    fontSize: isSmall ? 9 : 10,
                    fontWeight: 700,
                    color: 'white',
                    background: bgColor,
                    borderRadius: 4,
                    padding: '2px 4px',
                    lineHeight: 1.3,
                }}>
                    {name}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Main OrgChart Component
   ───────────────────────────────────────────────────────────── */
const Bab5OrgChart = () => {
    const ORANGE = '#c8860a';
    const NAVY   = '#1a2e6e';
    const TEAL   = '#1e88b4';
    const GREEN  = '#1a7a4a';
    const RED    = '#c0392b';

    return (
        <div
            id="bab5-org-chart-render"
            style={{
                width: 1122, // A4 landscape ~297mm at 96dpi
                height: 794,
                background: 'white',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Arial, sans-serif',
                overflow: 'hidden',
                boxSizing: 'border-box',
            }}
        >
            {/* ── Corner Decorations (gold bracket lines) ── */}
            {/* Top-left */}
            <svg style={{ position: 'absolute', top: 6, left: 6 }} width={80} height={80}>
                <path d="M 8 70 L 8 8 L 70 8" stroke="#b59000" strokeWidth="3" fill="none"/>
                <path d="M 16 70 L 16 16 L 70 16" stroke="#b59000" strokeWidth="1.5" fill="none" opacity="0.6"/>
            </svg>
            {/* Top-right */}
            <svg style={{ position: 'absolute', top: 6, right: 6 }} width={80} height={80}>
                <path d="M 10 8 L 72 8 L 72 70" stroke="#b59000" strokeWidth="3" fill="none"/>
                <path d="M 10 16 L 64 16 L 64 70" stroke="#b59000" strokeWidth="1.5" fill="none" opacity="0.6"/>
            </svg>
            {/* Bottom-left */}
            <svg style={{ position: 'absolute', bottom: 6, left: 6 }} width={80} height={80}>
                <path d="M 8 10 L 8 72 L 70 72" stroke="#b59000" strokeWidth="3" fill="none"/>
                <path d="M 16 10 L 16 64 L 70 64" stroke="#b59000" strokeWidth="1.5" fill="none" opacity="0.6"/>
            </svg>
            {/* Bottom-right */}
            <svg style={{ position: 'absolute', bottom: 6, right: 6 }} width={80} height={80}>
                <path d="M 10 72 L 72 72 L 72 10" stroke="#b59000" strokeWidth="3" fill="none"/>
                <path d="M 10 64 L 64 64 L 64 10" stroke="#b59000" strokeWidth="1.5" fill="none" opacity="0.6"/>
            </svg>

            {/* ── Faint Background Garuda Watermark ── */}
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.035,
                pointerEvents: 'none',
                zIndex: 0,
            }}>
                <img src="/logo_kemenimipas.png" alt="" style={{ width: 520, height: 520, objectFit: 'contain' }} />
            </div>

            {/* ── Right diagonal dash decoration ── */}
            <div style={{
                position: 'absolute',
                right: 80,
                top: 60,
                width: 90,
                height: 200,
                backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(180,160,80,0.3) 6px, rgba(180,160,80,0.3) 8px)',
                zIndex: 0,
                transform: 'skewX(-5deg)',
            }} />

            {/* ════════════════════════════════════════════════════
                Header: Logos + Title
                ════════════════════════════════════════════════════ */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                padding: '14px 90px 0',
            }}>
                <img
                    src="/logo_kemenimipas.png"
                    alt="Kemenimipas"
                    style={{ width: 52, height: 52, objectFit: 'contain' }}
                    onError={e => e.target.style.display = 'none'}
                />
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, color: '#111', lineHeight: 1.2 }}>
                        STRUKTUR ORGANISASI
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 2, color: '#111', lineHeight: 1.2, marginTop: 2 }}>
                        KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR
                    </div>
                </div>
                <img
                    src="/logo_imigrasi.jpg"
                    alt="Imigrasi"
                    style={{ width: 52, height: 52, objectFit: 'contain' }}
                    onError={e => e.target.style.display = 'none'}
                />
            </div>

            {/* ════════════════════════════════════════════════════
                CHART BODY (SVG lines + HTML nodes layered)
                ════════════════════════════════════════════════════ */}
            <div style={{ position: 'relative', flex: 1, zIndex: 1, margin: '0 20px' }}>

                {/* ── SVG connector lines layer ── */}
                <svg
                    style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}
                    width="100%"
                    height="100%"
                >
                    {/* Vertical from Kepala to horizontal trunk */}
                    <line x1="538" y1="125" x2="538" y2="155" stroke="#555" strokeWidth="2"/>

                    {/* Horizontal trunk spanning all 3 kasi + right */}
                    <line x1="80"  y1="155" x2="997" y2="155" stroke="#555" strokeWidth="2"/>

                    {/* Drops from trunk */}
                    {/* TU */}
                    <line x1="80"  y1="155" x2="80"  y2="185" stroke={ORANGE} strokeWidth="2"/>
                    {/* Lalintalkim */}
                    <line x1="360" y1="155" x2="360" y2="185" stroke={NAVY}   strokeWidth="2"/>
                    {/* Tikim */}
                    <line x1="538" y1="155" x2="538" y2="185" stroke={TEAL}   strokeWidth="2" strokeDasharray="5 2"/>
                    {/* Inteldakim */}
                    <line x1="840" y1="155" x2="840" y2="185" stroke={GREEN}  strokeWidth="2"/>

                    {/* ── TU sub-connections ── */}
                    <line x1="80" y1="270" x2="80" y2="680" stroke={ORANGE} strokeWidth="1.5" strokeDasharray="4 2"/>
                    <line x1="80" y1="345" x2="148" y2="345" stroke={ORANGE} strokeWidth="1.5"/>
                    <line x1="80" y1="455" x2="148" y2="455" stroke={ORANGE} strokeWidth="1.5"/>
                    <line x1="80" y1="565" x2="148" y2="565" stroke={ORANGE} strokeWidth="1.5"/>
                    <line x1="80" y1="660" x2="148" y2="660" stroke={ORANGE} strokeWidth="1.5"/>

                    {/* ── Lalintalkim navy box outline ── */}
                    {/* drawn as rect in HTML */}

                    {/* ── Lalintalkim internal lines ── */}
                    <line x1="360" y1="270" x2="360" y2="590" stroke={NAVY} strokeWidth="1.5"/>
                    <line x1="360" y1="430" x2="420" y2="430" stroke={NAVY} strokeWidth="1.5"/>
                    <line x1="360" y1="560" x2="420" y2="560" stroke={NAVY} strokeWidth="1.5"/>

                    {/* ── Tikim internal lines ── */}
                    <line x1="538" y1="270" x2="538" y2="620" stroke={TEAL} strokeWidth="1.5" strokeDasharray="5 2"/>
                    <line x1="538" y1="430" x2="598" y2="430" stroke={TEAL} strokeWidth="1.5"/>
                    <line x1="538" y1="560" x2="598" y2="560" stroke={TEAL} strokeWidth="1.5"/>

                    {/* ── Inteldakim internal lines ── */}
                    <line x1="840" y1="270" x2="840" y2="590" stroke={GREEN} strokeWidth="1.5"/>
                    <line x1="840" y1="430" x2="900" y2="430" stroke={GREEN} strokeWidth="1.5"/>
                    <line x1="840" y1="560" x2="900" y2="560" stroke={GREEN} strokeWidth="1.5"/>
                </svg>

                {/* ── NAVY box outline for Lalintalkim section ── */}
                <div style={{
                    position: 'absolute',
                    left: 264, top: 154,
                    width: 200, height: 490,
                    border: `2px solid ${NAVY}`,
                    borderRadius: 4,
                    zIndex: 2,
                    pointerEvents: 'none',
                }} />

                {/* ── TEAL box outline for Tikim section ── */}
                <div style={{
                    position: 'absolute',
                    left: 465, top: 154,
                    width: 200, height: 490,
                    border: `2px dashed ${TEAL}`,
                    borderRadius: 4,
                    zIndex: 2,
                    pointerEvents: 'none',
                }} />

                {/* ════ KEPALA KANTOR ════ */}
                <div style={{ position: 'absolute', left: 440, top: 10, zIndex: 5 }}>
                    <PersonCard
                        title="Kepala  Kantor"
                        name="Benyamin Kali Patembal Harahap"
                        borderColor={RED}
                        bgColor={RED}
                    />
                </div>

                {/* ════ KASUBBAG TU ════ */}
                <div style={{ position: 'absolute', left: 8, top: 185, zIndex: 5 }}>
                    <PersonCard title="Kasubbag TU" name="Timoris Damanik" borderColor={ORANGE} bgColor={ORANGE} size="small" />
                </div>

                {/* TU subordinates */}
                <div style={{ position: 'absolute', left: 8, top: 295, zIndex: 5 }}>
                    <PersonCard title="Kaur Keuangan" name="Sondang Bethesda Pasaribu" borderColor={ORANGE} bgColor={ORANGE} size="small" />
                </div>
                <div style={{ position: 'absolute', left: 8, top: 405, zIndex: 5 }}>
                    <PersonCard title="Kaur Umum" name="Sofyan Ansori Tandang" borderColor={ORANGE} bgColor={ORANGE} size="small" />
                </div>
                <div style={{ position: 'absolute', left: 8, top: 515, zIndex: 5 }}>
                    <PersonCard title="Kaur Kepegawaian" name="Vien Marisa Purba" borderColor={ORANGE} bgColor={ORANGE} size="small" />
                </div>

                {/* ════ KASI LALINTALKIM ════ */}
                <div style={{ position: 'absolute', left: 285, top: 185, zIndex: 5 }}>
                    <PersonCard title="Kasi Lalintalkim" name="Leonyta Rotua" borderColor={NAVY} bgColor={NAVY} size="small" />
                </div>

                {/* Lalintalkim subordinates */}
                <div style={{ position: 'absolute', left: 285, top: 360, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Izin Tinggal" name="Suswan Edy Patra" borderColor={NAVY} bgColor={NAVY} size="small" />
                </div>
                <div style={{ position: 'absolute', left: 285, top: 490, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Lalu Lintas" name="Imam Suroso" borderColor={NAVY} bgColor={NAVY} size="small" />
                </div>

                {/* ════ KASI TIKIM ════ */}
                <div style={{ position: 'absolute', left: 472, top: 185, zIndex: 5 }}>
                    <PersonCard title="Kasi Tikim" name="Ahmad Arif Hiya" borderColor={TEAL} bgColor={TEAL} size="small" />
                </div>

                {/* Tikim subordinates */}
                <div style={{ position: 'absolute', left: 472, top: 360, zIndex: 5 }}>
                    <PersonCard title="Kasubsi TIK" name="Arief Budi Prasetyo" borderColor={TEAL} bgColor={TEAL} size="small" />
                </div>
                <div style={{ position: 'absolute', left: 472, top: 490, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Infokim" name="Pemangku Jabatan Kosong" borderColor={TEAL} bgColor={TEAL} size="small" empty />
                </div>

                {/* ════ KASI INTELDAKIM ════ */}
                <div style={{ position: 'absolute', left: 760, top: 185, zIndex: 5 }}>
                    <PersonCard title="Kasi Inteldakim" name="Erwan Budiawan" borderColor={GREEN} bgColor={GREEN} size="small" />
                </div>

                {/* Inteldakim subordinates */}
                <div style={{ position: 'absolute', left: 760, top: 360, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Intel" name="Rio Erikson Sinurat" borderColor={GREEN} bgColor={GREEN} size="small" />
                </div>
                <div style={{ position: 'absolute', left: 760, top: 490, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Penindakan" name="Tengku Ezy Andika" borderColor={GREEN} bgColor={GREEN} size="small" />
                </div>

            </div>{/* end chart body */}

            {/* ════════════════════════════════════════════════════
                Bottom Logo Bar
                ════════════════════════════════════════════════════ */}
            <div style={{
                position: 'absolute',
                bottom: 14,
                right: 100,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                zIndex: 10,
            }}>
                {/* BerAKHLAK */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#c0392b', fontStyle: 'italic', lineHeight: 1 }}>Ber<span style={{ color: '#e74c3c' }}>AKHLAK</span></div>
                    <div style={{ fontSize: 7, color: '#555', maxWidth: 90, textAlign: 'center', lineHeight: 1.2 }}>berorientasi pelayanan · akuntabel · harmonis<br/>loyal · adaptif · kolaboratif</div>
                </div>
                {/* bangga melayani bangsa */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#e67e22' }}>#bangga</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#333' }}>melayani</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#333' }}>bangsa</div>
                </div>
                {/* WBK circle */}
                <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: '#222',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #555',
                }}>
                    <span style={{ color: 'white', fontSize: 8, fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>WBK<br/>WBBM</span>
                </div>
                {/* Shield icon */}
                <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: '#f5e6c8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #c8860a',
                }}>
                    <img src="/logo_imigrasi.jpg" alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} onError={e=>e.target.style.display='none'} />
                </div>
            </div>

            {/* Page number */}
            <div style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 11,
                color: '#555',
                zIndex: 10,
            }}>35</div>
        </div>
    );
};

export default Bab5OrgChart;
