/**
 * BsreBadge.jsx – Badge e-TTD KEMENIMIPAS
 * Pure inline SVG – zero image loading dependency.
 * Pixel-perfect rendition matching the official BSrE reference image.
 *
 * Props:
 *   width  – total rendered width in px (default 300)
 */
import React from 'react';

export default function BsreBadge({ width = 300 }) {
    // ViewBox: 340 wide × 100 tall
    // Shield occupies left ~100px, text on right
    const h = Math.round(width * 100 / 340);
    return (
        <svg
            width={width}
            height={h}
            viewBox="0 0 340 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
        >
            {/* ════════════════════════════════
                SHIELD SHAPE
                Matches: wide top shoulders, narrowing to pointed bottom
            ════════════════════════════════ */}

            {/* Gold outer shield (border effect via slightly larger path) */}
            <path
                d="M50 4
                   C 50 4 20 11 8 20
                   L 8 48
                   C 8 70 28 85 50 95
                   C 72 85 92 70 92 48
                   L 92 20
                   C 80 11 50 4 50 4 Z"
                fill="#C9992A"
            />
            {/* Dark navy inner fill */}
            <path
                d="M50 10
                   C 50 10 22 17 12 25
                   L 12 48
                   C 12 68 30 82 50 91
                   C 70 82 88 68 88 48
                   L 88 25
                   C 78 17 50 10 50 10 Z"
                fill="#1B2A4A"
            />

            {/* ════════════════════════════════
                OPEN PADLOCK
                Left leg down, right leg raised/open
            ════════════════════════════════ */}

            {/* Left shackle leg — goes down into body */}
            <path
                d="M35 46 L35 33 Q35 21 50 21 Q60 21 64 29"
                stroke="#C9992A"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
            />
            {/* Right shackle — raised / open, curves up and right */}
            <path
                d="M64 29 Q66 23 66 15 Q66 13 68 12"
                stroke="#C9992A"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
            />

            {/* Padlock body */}
            <rect x="26" y="44" width="48" height="32" rx="4" fill="#C9992A" />

            {/* Keyhole – circle */}
            <circle cx="50" cy="55" r="5.5" fill="#1B2A4A" />
            {/* Keyhole – stem */}
            <rect x="47.5" y="55" width="5" height="8" rx="2" fill="#1B2A4A" />

            {/* ════════════════════════════════
                GARUDA SEAL
                Small circular emblem at bottom of padlock body
            ════════════════════════════════ */}

            {/* Outer circle background */}
            <circle cx="50" cy="69" r="10" fill="#1B2A4A" />
            {/* Gold ring border */}
            <circle cx="50" cy="69" r="9.5" fill="none" stroke="#C9992A" strokeWidth="1.2" />

            {/* Garuda – simplified but recognizable */}
            {/* Wings spread */}
            <path d="M41 70 Q44 64 50 66 Q56 64 59 70" stroke="#C9992A" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
            {/* Body */}
            <ellipse cx="50" cy="71" rx="2.8" ry="3.5" fill="#C9992A" />
            {/* Head */}
            <circle cx="50" cy="66.5" r="2.2" fill="#C9992A" />
            {/* Left wing feathers */}
            <path d="M44 69 Q41 65 40 62" stroke="#C9992A" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
            <path d="M43 71 Q40 68 39 65" stroke="#C9992A" strokeWidth="1" strokeLinecap="round" fill="none"/>
            {/* Right wing feathers */}
            <path d="M56 69 Q59 65 60 62" stroke="#C9992A" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
            <path d="M57 71 Q60 68 61 65" stroke="#C9992A" strokeWidth="1" strokeLinecap="round" fill="none"/>
            {/* Tail */}
            <path d="M49 74 L48 77 M50 74 L50 77 M51 74 L52 77" stroke="#C9992A" strokeWidth="0.9" strokeLinecap="round" fill="none"/>

            {/* ════════════════════════════════
                TEXT SECTION (right side)
            ════════════════════════════════ */}

            {/* "KEMENIMIPAS" — very bold, matching reference exactly */}
            <text
                x="108"
                y="50"
                fontFamily="'Arial Black', 'Arial', Helvetica, sans-serif"
                fontWeight="900"
                fontSize="30"
                letterSpacing="-0.5"
                fill="#111111"
                dominantBaseline="auto"
            >
                KEMENIMIPAS
            </text>

            {/* Subtitle */}
            <text
                x="108"
                y="67"
                fontFamily="'Arial', Helvetica, sans-serif"
                fontWeight="400"
                fontSize="11"
                fill="#666666"
                dominantBaseline="auto"
            >
                Ditandatangani secara elektronik oleh:
            </text>

            {/* Horizontal separator line — dark, matches reference */}
            <line x1="108" y1="74" x2="336" y2="74" stroke="#AAAAAA" strokeWidth="1" />
        </svg>
    );
}

/**
 * Serialize this badge to an SVG string (for canvas/PNG export use)
 * @param {number} width
 * @returns {string} SVG markup string
 */
export function getBsreBadgeSvgString(width = 340) {
    const h = Math.round(width * 100 / 340);
    return `<svg width="${width}" height="${h}" viewBox="0 0 340 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Shield outer gold -->
  <path d="M50 4 C 50 4 20 11 8 20 L 8 48 C 8 70 28 85 50 95 C 72 85 92 70 92 48 L 92 20 C 80 11 50 4 50 4 Z" fill="#C9992A"/>
  <!-- Shield inner navy -->
  <path d="M50 10 C 50 10 22 17 12 25 L 12 48 C 12 68 30 82 50 91 C 70 82 88 68 88 48 L 88 25 C 78 17 50 10 50 10 Z" fill="#1B2A4A"/>
  <!-- Shackle left leg -->
  <path d="M35 46 L35 33 Q35 21 50 21 Q60 21 64 29" stroke="#C9992A" stroke-width="5" stroke-linecap="round" fill="none"/>
  <!-- Shackle right raised -->
  <path d="M64 29 Q66 23 66 15 Q66 13 68 12" stroke="#C9992A" stroke-width="5" stroke-linecap="round" fill="none"/>
  <!-- Padlock body -->
  <rect x="26" y="44" width="48" height="32" rx="4" fill="#C9992A"/>
  <!-- Keyhole circle -->
  <circle cx="50" cy="55" r="5.5" fill="#1B2A4A"/>
  <!-- Keyhole stem -->
  <rect x="47.5" y="55" width="5" height="8" rx="2" fill="#1B2A4A"/>
  <!-- Garuda seal bg -->
  <circle cx="50" cy="69" r="10" fill="#1B2A4A"/>
  <!-- Garuda seal ring -->
  <circle cx="50" cy="69" r="9.5" fill="none" stroke="#C9992A" stroke-width="1.2"/>
  <!-- Garuda wings top arc -->
  <path d="M41 70 Q44 64 50 66 Q56 64 59 70" stroke="#C9992A" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <!-- Garuda body -->
  <ellipse cx="50" cy="71" rx="2.8" ry="3.5" fill="#C9992A"/>
  <!-- Garuda head -->
  <circle cx="50" cy="66.5" r="2.2" fill="#C9992A"/>
  <!-- Garuda left wing -->
  <path d="M44 69 Q41 65 40 62" stroke="#C9992A" stroke-width="1.1" stroke-linecap="round" fill="none"/>
  <path d="M43 71 Q40 68 39 65" stroke="#C9992A" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Garuda right wing -->
  <path d="M56 69 Q59 65 60 62" stroke="#C9992A" stroke-width="1.1" stroke-linecap="round" fill="none"/>
  <path d="M57 71 Q60 68 61 65" stroke="#C9992A" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Garuda tail -->
  <path d="M49 74 L48 77 M50 74 L50 77 M51 74 L52 77" stroke="#C9992A" stroke-width="0.9" stroke-linecap="round" fill="none"/>
  <!-- KEMENIMIPAS text -->
  <text x="108" y="50" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="30" letter-spacing="-0.5" fill="#111111">KEMENIMIPAS</text>
  <!-- Subtitle text -->
  <text x="108" y="67" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="11" fill="#666666">Ditandatangani secara elektronik oleh:</text>
  <!-- Separator line -->
  <line x1="108" y1="74" x2="336" y2="74" stroke="#AAAAAA" stroke-width="1"/>
</svg>`;
}

/**
 * Convert BSrE badge SVG to a PNG ArrayBuffer (for DOCX embedding).
 * Uses an off-screen Canvas element.
 * @param {number} width – rendered width in px
 * @returns {Promise<ArrayBuffer>}
 */
export async function getBsreBadgePngBuffer(width = 340) {
    const h = Math.round(width * 100 / 340);
    const svgStr = getBsreBadgeSvgString(width);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = width * 2;   // 2× for retina sharpness
            canvas.height = h * 2;
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0, width, h);
            URL.revokeObjectURL(url);
            canvas.toBlob(blob2 => {
                blob2.arrayBuffer().then(resolve).catch(reject);
            }, 'image/png');
        };
        img.onerror = reject;
        img.src = url;
    });
}
