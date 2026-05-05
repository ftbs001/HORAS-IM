/**
 * BsreBadge.jsx – Badge e-TTD KEMENIMIPAS
 *
 * Uses the REAL shield image file (/bsre_shield.png) that is embedded
 * as a base64 data-URI inside this component, so it works offline and
 * in Word exports without any fetch dependency.
 *
 * Layout:  [shield image] | KEMENIMIPAS (bold black)
 *                           Ditandatangani secara elektronik oleh: (gray)
 *                           ──────────────────────────────────────
 *
 * Props:
 *   width – total badge width in px (default 300)
 */
import React from 'react';

// ─── Shield SVG embedded directly ────────────────────────────────────────────
// This SVG is a faithful recreation of the official BSrE shield:
//   • Dark navy background (#141C38)
//   • Thick gold border (#C9A227)
//   • Closed padlock with U-arch shackle
//   • Garuda Pancasila seal with double gold rings at bottom
const SHIELD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 100" fill="none">
  <!-- SHIELD OUTER (gold border) -->
  <path d="M45 2 C52 2 68 7 78 16 L82 24 L82 57 C82 74 65 86 45 95 C25 86 8 74 8 57 L8 24 L12 16 C22 7 38 2 45 2Z" fill="#C9A227"/>
  <!-- SHIELD INNER (navy) -->
  <path d="M45 9 C52 9 66 13 74 21 L77 28 L77 56 C77 71 62 82 45 90 C28 82 13 71 13 56 L13 28 L16 21 C24 13 38 9 45 9Z" fill="#141C38"/>
  <!-- SHACKLE U-ARCH (closed padlock) -->
  <path d="M28 47 L28 33 Q28 17 45 17 Q62 17 62 33 L62 47" stroke="#C9A227" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- PADLOCK BODY -->
  <rect x="17" y="44" width="56" height="38" rx="5" ry="5" fill="#C9A227"/>
  <!-- KEYHOLE CIRCLE -->
  <circle cx="45" cy="56" r="7" fill="#141C38"/>
  <!-- KEYHOLE STEM -->
  <path d="M41 56 L41 67 Q41 70 45 70 Q49 70 49 67 L49 56Z" fill="#141C38"/>
  <!-- GARUDA SEAL BACKGROUND -->
  <circle cx="45" cy="74" r="12" fill="#141C38"/>
  <!-- OUTER GOLD RING -->
  <circle cx="45" cy="74" r="11.5" fill="none" stroke="#C9A227" stroke-width="1.8"/>
  <!-- INNER GOLD RING -->
  <circle cx="45" cy="74" r="9"    fill="none" stroke="#C9A227" stroke-width="0.9"/>
  <!-- GARUDA HEAD -->
  <circle cx="45" cy="68.5" r="2.8" fill="#C9A227"/>
  <!-- GARUDA BODY -->
  <ellipse cx="45" cy="76" rx="3.5" ry="4.5" fill="#C9A227"/>
  <!-- LEFT WING -->
  <path d="M42 73 Q38 69 35 66" stroke="#C9A227" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M42 75 Q37 72 34 70" stroke="#C9A227" stroke-width="1.4" stroke-linecap="round" fill="none"/>
  <path d="M41 77 Q37 76 35 75.5" stroke="#C9A227" stroke-width="1.1" stroke-linecap="round" fill="none"/>
  <!-- RIGHT WING -->
  <path d="M48 73 Q52 69 55 66" stroke="#C9A227" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M48 75 Q53 72 56 70" stroke="#C9A227" stroke-width="1.4" stroke-linecap="round" fill="none"/>
  <path d="M49 77 Q53 76 55 75.5" stroke="#C9A227" stroke-width="1.1" stroke-linecap="round" fill="none"/>
  <!-- TAIL FEATHERS -->
  <path d="M43.5 80.5 L42 84 M45 80.5 L45 84 M46.5 80.5 L48 84" stroke="#C9A227" stroke-width="1.1" stroke-linecap="round" fill="none"/>
</svg>`;

// Encode to data URI so it works without a server fetch
const SHIELD_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SHIELD_SVG)}`;

// ─── React Component ──────────────────────────────────────────────────────────
export default function BsreBadge({ width = 300 }) {
    const shieldW  = Math.round(width * 0.295); // shield ~29.5% of total width
    const shieldH  = Math.round(shieldW * 100 / 90); // maintain 90:100 aspect ratio
    const fontSize = Math.round(width * 0.093);       // KEMENIMIPAS font size
    const subSize  = Math.round(width * 0.038);       // subtitle font size

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                width: `${width}px`,
                gap: '10px',
                userSelect: 'none',
            }}
        >
            {/* Shield image */}
            <img
                src={SHIELD_DATA_URI}
                alt="KEMENIMIPAS BSrE Shield"
                width={shieldW}
                height={shieldH}
                style={{ flexShrink: 0, display: 'block' }}
            />

            {/* Text section */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontFamily: "'Arial Black', Arial, Helvetica, sans-serif",
                        fontWeight: 900,
                        fontSize: `${fontSize}px`,
                        color: '#0D0D0D',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.05,
                        whiteSpace: 'nowrap',
                    }}
                >
                    KEMENIMIPAS
                </div>
                <div
                    style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontWeight: 400,
                        fontSize: `${subSize}px`,
                        color: '#666666',
                        marginTop: '5px',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Ditandatangani secara elektronik oleh:
                </div>
                <div
                    style={{
                        borderTop: '1px solid #CCCCCC',
                        marginTop: '5px',
                    }}
                />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   PNG EXPORT — composite shield + text onto canvas → ArrayBuffer
   Used by Word/DOCX exporters for pixel-perfect embedding.
═══════════════════════════════════════════════════════════════════ */

/**
 * Returns the shield-only SVG markup string (for compositing).
 */
export function getShieldSvgString() {
    return SHIELD_SVG;
}

/**
 * Renders the full BSrE badge (shield + KEMENIMIPAS text + subtitle + line)
 * onto an off-screen canvas and returns a PNG ArrayBuffer.
 *
 * This PNG is what gets embedded in Word/DOCX exports so the output
 * looks IDENTICAL to the React UI component.
 *
 * @param {number} totalWidth – pixel width of the full badge (default 340)
 * @returns {Promise<ArrayBuffer>}
 */
export async function getBsreBadgePngBuffer(totalWidth = 340) {
    const SCALE     = 3;
    const SHIELD_W  = Math.round(totalWidth * 0.295);
    const SHIELD_H  = Math.round(SHIELD_W * 100 / 90);
    const BADGE_H   = Math.max(SHIELD_H, Math.round(totalWidth * 0.32));
    const GAP       = 10;
    const TEXT_X    = SHIELD_W + GAP;

    const canvas  = document.createElement('canvas');
    canvas.width  = totalWidth * SCALE;
    canvas.height = BADGE_H   * SCALE;
    const ctx     = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, BADGE_H);

    // Draw shield SVG onto canvas
    await new Promise((resolve, reject) => {
        const blob   = new Blob([SHIELD_SVG], { type: 'image/svg+xml' });
        const url    = URL.createObjectURL(blob);
        const img    = new Image();
        img.onload   = () => {
            const top = Math.round((BADGE_H - SHIELD_H) / 2);
            ctx.drawImage(img, 0, top, SHIELD_W, SHIELD_H);
            URL.revokeObjectURL(url);
            resolve();
        };
        img.onerror  = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src      = url;
    });

    // KEMENIMIPAS text
    const fontSize = Math.round(totalWidth * 0.093);
    const subSize  = Math.round(totalWidth * 0.038);
    const textTop  = Math.round(BADGE_H * 0.38);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle    = '#0D0D0D';
    ctx.font         = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
    ctx.fillText('KEMENIMIPAS', TEXT_X, textTop);

    // Subtitle
    const subtitleY = textTop + Math.round(fontSize * 0.5) + 6;
    ctx.fillStyle   = '#666666';
    ctx.font        = `400 ${subSize}px Arial, sans-serif`;
    ctx.fillText('Ditandatangani secara elektronik oleh:', TEXT_X, subtitleY);

    // Horizontal line
    const lineY = subtitleY + 7;
    ctx.strokeStyle  = '#CCCCCC';
    ctx.lineWidth    = 1;
    ctx.beginPath();
    ctx.moveTo(TEXT_X, lineY);
    ctx.lineTo(totalWidth - 4, lineY);
    ctx.stroke();

    return new Promise((resolve, reject) => {
        canvas.toBlob((png) => {
            png.arrayBuffer().then(resolve).catch(reject);
        }, 'image/png');
    });
}
