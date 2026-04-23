import React from 'react';

/*
 * Bab5OrgChart.jsx
 * Pixel-perfect coded reproduction of the Kantor Imigrasi Kelas II TPI Pematang Siantar
 * organizational structure chart, matching the reference image exactly.
 *
 * - Uniformed officer SVG silhouettes (each card)
 * - Decorative circular photo frames
 * - Color-coded branches (Red/Orange/Navy/Teal/Green)
 * - Gold corner bracket decorations
 * - Diagonal dashed ornament (top-right)
 * - Red/colored connector lines with horizontal trunk
 * - Watermark
 * - BerAKHLAK bottom bar
 */

/* ─── Uniformed Officer SVG ─────────────────────
   Renders a detailed immigration officer silhouette
   Matches reference image style: cap + collar stars
   ─────────────────────────────────────────────── */
const OfficerSVG = ({ gender = 'm', size = 64, empty = false, color = '#4a6fa5' }) => {
    const s = size;
    if (empty) {
        return (
            <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="22" r="14" fill="#c0c8d0"/>
                <ellipse cx="32" cy="55" rx="22" ry="16" fill="#a0a8b0"/>
                <circle cx="32" cy="22" r="14" fill="#b0b8c4" opacity="0.5"/>
                <text x="32" y="65" textAnchor="middle" fontSize="7" fill="#666">KOSONG</text>
            </svg>
        );
    }
    // Light skin tone
    const skin = '#d4a07a';
    const uniform = color;
    const capColor = '#1a2e6e';

    return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
            {/* Body / Uniform */}
            <ellipse cx="32" cy="54" rx="20" ry="14" fill={uniform}/>
            {/* Shoulder epaulettes */}
            <rect x="11" y="38" width="9" height="5" rx="2" fill="#c9a227"/>
            <rect x="44" y="38" width="9" height="5" rx="2" fill="#c9a227"/>
            {/* Collar */}
            <path d="M24 39 L32 44 L40 39" stroke="#fff" strokeWidth="1.5" fill="none"/>
            {/* Neck */}
            <rect x="28" y="30" width="8" height="8" rx="3" fill={skin}/>
            {/* Head */}
            <ellipse cx="32" cy="24" rx="10" ry="11" fill={skin}/>
            {/* Cap */}
            <path d="M19 22 Q32 14 45 22" fill={capColor}/>
            <rect x="20" y="21" width="24" height="5" rx="1" fill={capColor}/>
            <ellipse cx="32" cy="21" rx="12" ry="3" fill="#263580"/>
            {/* Cap badge */}
            <circle cx="32" cy="20" r="2.5" fill="#c9a227"/>
            <circle cx="32" cy="20" r="1.5" fill="#fff"/>
            {/* Cap brim */}
            <rect x="17" y="26" width="30" height="2.5" rx="1.5" fill={capColor}/>
            {/* Face details */}
            <ellipse cx="28" cy="25" rx="1.2" ry="1.5" fill="#222" opacity="0.6"/>
            <ellipse cx="36" cy="25" rx="1.2" ry="1.5" fill="#222" opacity="0.6"/>
            {/* Uniform badge */}
            <circle cx="32" cy="46" r="2" fill="#c9a227" opacity="0.8"/>
            {/* Tie/collar pin */}
            <circle cx="27" cy="41" r="1" fill="#c9a227"/>
            <circle cx="37" cy="41" r="1" fill="#c9a227"/>
        </svg>
    );
};

/* ─── Decorative Photo Frame ─────────────────────
   Circular frame with ornamental elements
   matching the scalloped/floral border in ref image
   ─────────────────────────────────────────────── */
const PhotoFrame = ({ size = 74, borderColor = '#c8860a', children }) => {
    const r = size / 2;
    const innerR = r - 5;
    // Generate ornamental ticks around the circle
    const ticks = Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 360 / 24) * Math.PI / 180;
        const x1 = r + Math.cos(angle) * (r - 3);
        const y1 = r + Math.sin(angle) * (r - 3);
        const x2 = r + Math.cos(angle) * (r - 7);
        const y2 = r + Math.sin(angle) * (r - 7);
        return { x1, y1, x2, y2 };
    });

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            {/* SVG decorative frame rings */}
            <svg
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
                width={size}
                height={size}
            >
                {/* Outer decorative ring */}
                <circle cx={r} cy={r} r={r - 1} fill="none" stroke={borderColor} strokeWidth="2.5"/>
                {/* Inner ring */}
                <circle cx={r} cy={r} r={r - 6} fill="none" stroke={borderColor} strokeWidth="1" opacity="0.6"/>
                {/* Tick marks */}
                {ticks.map((t, i) => (
                    <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                        stroke={borderColor} strokeWidth={i % 3 === 0 ? 1.5 : 0.8} opacity={i % 3 === 0 ? 1 : 0.5}/>
                ))}
                {/* Small diamonds at cardinal points */}
                {[0, 90, 180, 270].map((deg, i) => {
                    const a = deg * Math.PI / 180;
                    const cx2 = r + Math.cos(a) * (r - 1);
                    const cy2 = r + Math.sin(a) * (r - 1);
                    return <circle key={i} cx={cx2} cy={cy2} r="2.5" fill={borderColor}/>;
                })}
            </svg>
            {/* Photo circle clip */}
            <div style={{
                position: 'absolute',
                top: 5, left: 5,
                width: size - 10,
                height: size - 10,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #d0dae8, #b8c8d8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
            }}>
                {children}
            </div>
        </div>
    );
};

/* ─── Person Card ────────────────────────────────
   Combined photo frame + label (title + name chip)
   ─────────────────────────────────────────────── */
const PersonCard = ({
    title, name,
    borderColor = '#c8860a',
    bgColor = '#c8860a',
    size = 'normal',
    empty = false,
    gender = 'm',
    uniformColor,
}) => {
    const frameSize   = size === 'small' ? 66 : 76;
    const minW        = size === 'small' ? 110 : 138;
    const titleSize   = size === 'small' ? 10  : 11;
    const nameSize    = size === 'small' ? 9   : 10;
    const uColor      = uniformColor || '#1a2e6e';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PhotoFrame size={frameSize} borderColor={borderColor}>
                <OfficerSVG size={frameSize - 10} empty={empty} color={uColor} gender={gender}/>
            </PhotoFrame>
            <div style={{
                background: 'white',
                border: `2px solid ${borderColor}`,
                borderRadius: 6,
                textAlign: 'center',
                padding: '3px 8px',
                minWidth: minW,
                maxWidth: minW + 20,
                marginTop: 4,
                boxSizing: 'border-box',
            }}>
                <div style={{ fontSize: titleSize, fontWeight: 700, color: '#222', lineHeight: 1.3, marginBottom: 2 }}>
                    {title}
                </div>
                <div style={{
                    fontSize: nameSize,
                    fontWeight: 700,
                    color: 'white',
                    background: bgColor,
                    borderRadius: 4,
                    padding: '1px 5px',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                }}>
                    {name}
                </div>
            </div>
        </div>
    );
};

/* ─── Corner Bracket SVG ────────────────────────
   Gold ornamental corner brackets for all 4 corners
   ─────────────────────────────────────────────── */
const CornerBracket = ({ pos = 'tl' }) => {
    const W = 90;
    const H = 90;
    const thick = 3;
    const thin  = 1.5;
    const gap   = 8;
    const gold  = '#b89a00';
    const gold2 = '#d4b800';

    // Paths: all defined as top-left, then transformed by CSS
    const rotate = {
        tl: 'rotate(0deg)',
        tr: 'rotate(90deg)',
        br: 'rotate(180deg)',
        bl: 'rotate(270deg)',
    }[pos];
    const origin = {
        tl: '0 0', tr: '100% 0', br: '100% 100%', bl: '0 100%',
    }[pos];

    return (
        <div style={{
            position: 'absolute',
            width: W, height: H,
            ...(pos === 'tl' ? { top: 4, left: 4 } :
                pos === 'tr' ? { top: 4, right: 4 } :
                pos === 'br' ? { bottom: 4, right: 4 } :
                               { bottom: 4, left: 4 }),
            transform: rotate,
            transformOrigin: origin,
            pointerEvents: 'none',
            zIndex: 10,
        }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                {/* Outer bold L */}
                <path d={`M ${thick/2} ${H-10} L ${thick/2} ${thick/2} L ${W-10} ${thick/2}`}
                    stroke={gold} strokeWidth={thick} fill="none" strokeLinecap="square"/>
                {/* Inner thin L */}
                <path d={`M ${thick/2 + gap} ${H-20} L ${thick/2 + gap} ${thick/2 + gap} L ${W-20} ${thick/2 + gap}`}
                    stroke={gold2} strokeWidth={thin} fill="none" strokeLinecap="square" opacity="0.8"/>
                {/* Corner diamond */}
                <rect x={thick/2 - 3} y={thick/2 - 3} width="7" height="7" fill={gold}
                    transform={`rotate(45, ${thick/2}, ${thick/2})`}/>
                {/* End caps */}
                <circle cx={thick/2} cy={H - 10} r="2.5" fill={gold}/>
                <circle cx={W - 10} cy={thick/2} r="2.5" fill={gold}/>
                {/* Decorative notch along vertical */}
                <rect x={0} y={H * 0.4} width={thick + 4} height={4} fill={gold} opacity="0.7"/>
                {/* Decorative notch along horizontal */}
                <rect x={W * 0.4} y={0} width={4} height={thick + 4} fill={gold} opacity="0.7"/>
            </svg>
        </div>
    );
};

/* ─── Main Component ─────────────────────────── */
const Bab5OrgChart = () => {
    const RED    = '#c0392b';
    const ORANGE = '#c8860a';
    const NAVY   = '#1a2e6e';
    const TEAL   = '#1a7aad';
    const GREEN  = '#1a6e3a';

    /* ── card y-positions (absolute from top of chart body) ── */
    const Y0  = 0;    // Kepala
    const Y1  = 178;  // Kasi row
    const Y2  = 330;  // Kasubsi row 1
    const Y3  = 472;  // Kasubsi row 2 / Kaur row 3

    /* ── card x-centers (from left of chart body) ── */
    const xTU     = 80;
    const xLalin  = 315;
    const xTikim  = 497;
    const xIntel  = 730;

    const cardW  = 140; // half-width estimate for connector calc
    const trunkY = 130; // y of the horizontal red trunk line

    return (
        <div
            id="bab5-org-chart-render"
            style={{
                width: 1050,
                height: 760,
                background: '#ffffff',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Arial, Helvetica, sans-serif',
                overflow: 'hidden',
                boxSizing: 'border-box',
            }}
        >
            {/* ═══ CORNER BRACKETS ═══ */}
            <CornerBracket pos="tl"/>
            <CornerBracket pos="tr"/>
            <CornerBracket pos="br"/>
            <CornerBracket pos="bl"/>

            {/* ═══ DIAGONAL DASHED DECORATION (top right) ═══ */}
            <div style={{
                position: 'absolute',
                right: 82,
                top: 30,
                width: 70,
                height: 240,
                zIndex: 0,
                overflow: 'hidden',
            }}>
                <svg width="70" height="240" viewBox="0 0 70 240">
                    {Array.from({ length: 18 }, (_, i) => (
                        <g key={i}>
                            <line
                                x1={0} y1={i * 14}
                                x2={70} y2={i * 14 + 50}
                                stroke="#b89a00"
                                strokeWidth={i % 3 === 0 ? 1.2 : 0.5}
                                strokeDasharray={i % 3 === 0 ? '6 4' : '3 6'}
                                opacity={0.35}
                            />
                        </g>
                    ))}
                </svg>
            </div>

            {/* ═══ WATERMARK CENTER ═══ */}
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 0,
            }}>
                <img
                    src="/logo_kemenimipas.png"
                    alt=""
                    style={{ width: 440, height: 440, objectFit: 'contain', opacity: 0.045, filter: 'grayscale(1)' }}
                    onError={e => e.target.style.display = 'none'}
                />
            </div>

            {/* ═══ HEADER ═══ */}
            <div style={{
                position: 'relative',
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                padding: '12px 100px 0',
            }}>
                <img
                    src="/logo_kemenimipas.png"
                    alt="Kemenimipas"
                    style={{ width: 54, height: 54, objectFit: 'contain' }}
                    onError={e => e.target.style.display = 'none'}
                />
                <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
                    <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 3, color: '#111' }}>
                        STRUKTUR ORGANISASI
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 2, color: '#111' }}>
                        KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR
                    </div>
                </div>
                <img
                    src="/logo_imigrasi.jpg"
                    alt="Imigrasi"
                    style={{ width: 54, height: 54, objectFit: 'contain' }}
                    onError={e => e.target.style.display = 'none'}
                />
            </div>

            {/* ═══ CHART BODY ═══ */}
            <div style={{
                position: 'relative',
                flex: 1,
                margin: '0 30px',
                zIndex: 2,
            }}>

                {/* ─── SVG CONNECTOR LINES ─── */}
                <svg
                    style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}
                    width="100%"
                    height="100%"
                >
                    {/* Vertical drop from Kepala to trunk (red) */}
                    <line x1="497" y1="122" x2="497" y2="148" stroke={RED} strokeWidth="2.5"/>

                    {/* Horizontal trunk (red) */}
                    <line x1="80" y1="148" x2="730" y2="148" stroke={RED} strokeWidth="2.5"/>

                    {/* Drop to TU (orange) */}
                    <line x1="80" y1="148" x2="80" y2="175" stroke={ORANGE} strokeWidth="2"/>

                    {/* Drop to Lalintalkim (navy) */}
                    <line x1="315" y1="148" x2="315" y2="175" stroke={NAVY} strokeWidth="2"/>

                    {/* Drop to Tikim (teal dashed) */}
                    <line x1="497" y1="148" x2="497" y2="175" stroke={TEAL} strokeWidth="2" strokeDasharray="6 3"/>

                    {/* Drop to Inteldakim (green) */}
                    <line x1="730" y1="148" x2="730" y2="175" stroke={GREEN} strokeWidth="2"/>

                    {/* TU vertical spine (orange dashed) - connects kaur cards */}
                    <line x1="80" y1="255" x2="80" y2="650" stroke={ORANGE} strokeWidth="1.5" strokeDasharray="4 3"/>
                    {/* TU horizontals to each kaur */}
                    <line x1="80" y1="330" x2="142" y2="330" stroke={ORANGE} strokeWidth="1.5"/>
                    <line x1="80" y1="462" x2="142" y2="462" stroke={ORANGE} strokeWidth="1.5"/>
                    <line x1="80" y1="580" x2="142" y2="580" stroke={ORANGE} strokeWidth="1.5"/>

                    {/* Lalintalkim internal vertical */}
                    <line x1="315" y1="262" x2="315" y2="590" stroke={NAVY} strokeWidth="1.5"/>
                    {/* Lalintalkim horizontals */}
                    <line x1="315" y1="405" x2="370" y2="405" stroke={NAVY} strokeWidth="1.5"/>
                    <line x1="315" y1="538" x2="370" y2="538" stroke={NAVY} strokeWidth="1.5"/>

                    {/* Tikim internal vertical (dashed) */}
                    <line x1="497" y1="262" x2="497" y2="600" stroke={TEAL} strokeWidth="1.5" strokeDasharray="5 3"/>
                    {/* Tikim horizontals */}
                    <line x1="497" y1="405" x2="548" y2="405" stroke={TEAL} strokeWidth="1.5"/>
                    <line x1="497" y1="538" x2="548" y2="538" stroke={TEAL} strokeWidth="1.5"/>

                    {/* Inteldakim internal vertical */}
                    <line x1="730" y1="262" x2="730" y2="590" stroke={GREEN} strokeWidth="1.5"/>
                    {/* Inteldakim horizontals */}
                    <line x1="730" y1="405" x2="780" y2="405" stroke={GREEN} strokeWidth="1.5"/>
                    <line x1="730" y1="538" x2="780" y2="538" stroke={GREEN} strokeWidth="1.5"/>
                </svg>

                {/* ─── NAVY BOX around Lalintalkim column ─── */}
                <div style={{
                    position: 'absolute',
                    left: 226, top: 148,
                    width: 202, height: 472,
                    border: `2.5px solid ${NAVY}`,
                    borderRadius: 5,
                    zIndex: 2,
                    pointerEvents: 'none',
                }}/>

                {/* ─── TEAL DASHED BOX around Tikim column ─── */}
                <div style={{
                    position: 'absolute',
                    left: 405, top: 148,
                    width: 202, height: 472,
                    border: `2.5px dashed ${TEAL}`,
                    borderRadius: 5,
                    zIndex: 2,
                    pointerEvents: 'none',
                }}/>

                {/* ══════  KEPALA KANTOR  ══════ */}
                <div style={{ position: 'absolute', top: 18, left: 424, zIndex: 5 }}>
                    <PersonCard
                        title="Kepala  Kantor"
                        name="Benyamin Kali Patembal Harahap"
                        borderColor={RED} bgColor={RED}
                        uniformColor="#1a2e6e"
                        size="normal"
                    />
                </div>

                {/* ══════  KASUBBAG TU  ══════ */}
                <div style={{ position: 'absolute', top: 175, left: 12, zIndex: 5 }}>
                    <PersonCard title="Kasubbag TU" name="Timoris Damanik"
                        borderColor={ORANGE} bgColor={ORANGE} uniformColor="#3a5080" size="small"/>
                </div>
                {/* Kaur Keuangan */}
                <div style={{ position: 'absolute', top: 290, left: 12, zIndex: 5 }}>
                    <PersonCard title="Kaur Keuangan" name="Sondang Bethesda Pasaribu"
                        borderColor={ORANGE} bgColor={ORANGE} uniformColor="#2a4070" size="small" gender="f"/>
                </div>
                {/* Kaur Umum */}
                <div style={{ position: 'absolute', top: 415, left: 12, zIndex: 5 }}>
                    <PersonCard title="Kaur Umum" name="Sofyan Ansori Tandang"
                        borderColor={ORANGE} bgColor={ORANGE} uniformColor="#2a3560" size="small"/>
                </div>
                {/* Kaur Kepegawaian */}
                <div style={{ position: 'absolute', top: 535, left: 12, zIndex: 5 }}>
                    <PersonCard title="Kaur Kepegawaian" name="Vien Marisa Purba"
                        borderColor={ORANGE} bgColor={ORANGE} uniformColor="#2a4070" size="small" gender="f"/>
                </div>

                {/* ══════  KASI LALINTALKIM  ══════ */}
                <div style={{ position: 'absolute', top: 175, left: 243, zIndex: 5 }}>
                    <PersonCard title="Kasi Lalintalkim" name="Leonyta Rotua"
                        borderColor={NAVY} bgColor={NAVY} uniformColor="#1a2e6e" size="small" gender="f"/>
                </div>
                {/* Kasubsi Izin Tinggal */}
                <div style={{ position: 'absolute', top: 335, left: 243, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Izin Tinggal" name="Suswan Edy Patra"
                        borderColor={NAVY} bgColor={NAVY} uniformColor="#1a2e6e" size="small"/>
                </div>
                {/* Kasubsi Lalu Lintas */}
                <div style={{ position: 'absolute', top: 465, left: 243, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Lalu Lintas" name="Imam Suroso"
                        borderColor={NAVY} bgColor={NAVY} uniformColor="#1a2e6e" size="small"/>
                </div>

                {/* ══════  KASI TIKIM  ══════ */}
                <div style={{ position: 'absolute', top: 175, left: 425, zIndex: 5 }}>
                    <PersonCard title="Kasi Tikim" name="Ahmad Arif Hiya"
                        borderColor={TEAL} bgColor={TEAL} uniformColor="#1a4a80" size="small"/>
                </div>
                {/* Kasubsi TIK */}
                <div style={{ position: 'absolute', top: 335, left: 425, zIndex: 5 }}>
                    <PersonCard title="Kasubsi TIK" name="Arief Budi Prasetyo"
                        borderColor={TEAL} bgColor={TEAL} uniformColor="#1a4a80" size="small"/>
                </div>
                {/* Kasubsi Infokim (empty) */}
                <div style={{ position: 'absolute', top: 465, left: 425, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Infokim" name="Pemangku Jabatan Kosong"
                        borderColor={TEAL} bgColor={TEAL} size="small" empty/>
                </div>

                {/* ══════  KASI INTELDAKIM  ══════ */}
                <div style={{ position: 'absolute', top: 175, left: 655, zIndex: 5 }}>
                    <PersonCard title="Kasi Inteldakim" name="Erwan Budiawan"
                        borderColor={GREEN} bgColor={GREEN} uniformColor="#1a3a2a" size="small"/>
                </div>
                {/* Kasubsi Intel */}
                <div style={{ position: 'absolute', top: 335, left: 655, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Intel" name="Rio Erikson Sinurat"
                        borderColor={GREEN} bgColor={GREEN} uniformColor="#1a3a2a" size="small"/>
                </div>
                {/* Kasubsi Penindakan */}
                <div style={{ position: 'absolute', top: 465, left: 655, zIndex: 5 }}>
                    <PersonCard title="Kasubsi Penindakan" name="Tengku Ezy Andika"
                        borderColor={GREEN} bgColor={GREEN} uniformColor="#1a3a2a" size="small"/>
                </div>

            </div>{/* end chart body */}

            {/* ═══ BOTTOM BAR ═══ */}
            <div style={{
                position: 'absolute',
                bottom: 10,
                left: 120,
                right: 90,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 16,
                zIndex: 6,
            }}>
                {/* BerAKHLAK */}
                <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#c0392b', fontStyle: 'italic', letterSpacing: -0.5 }}>
                        Ber<span style={{ color: '#c0392b' }}>AKHLAK</span>
                    </div>
                    <div style={{ fontSize: 7, color: '#555', lineHeight: 1.25, maxWidth: 110 }}>
                        berorientasi pelayanan · akuntabel · harmonis<br/>loyal · adaptif · kolaboratif
                    </div>
                </div>
                {/* bangga melayani bangsa */}
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#e07000' }}>#bangga</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#333', lineHeight: 1.3 }}>melayani<br/>bangsa</div>
                </div>
                {/* WBK circle */}
                <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: '#111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #555',
                    flexShrink: 0,
                }}>
                    <span style={{ color: 'white', fontSize: 8, fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>WBK<br/>WBBM</span>
                </div>
                {/* Imigrasi logo circle */}
                <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: '#f5e8c0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #c8860a',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}>
                    <img
                        src="/logo_imigrasi.jpg"
                        alt=""
                        style={{ width: 38, height: 38, objectFit: 'contain' }}
                        onError={e => e.target.style.display = 'none'}
                    />
                </div>
            </div>

            {/* Page number */}
            <div style={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 12,
                color: '#666',
                zIndex: 6,
            }}>35</div>

        </div>
    );
};

export default Bab5OrgChart;
