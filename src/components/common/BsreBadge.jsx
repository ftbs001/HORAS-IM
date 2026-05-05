/**
 * BsreBadge.jsx – Badge e-TTD KEMENIMIPAS
 * Pixel-perfect SVG based on zoomed reference image.
 *
 * Shield anatomy (from zoomed image):
 *  - Top: gently arched center, shoulders curve outward
 *  - Sides: straight/slightly tapered
 *  - Bottom: sharp point
 *  - Gold border: thick (~6px in viewbox)
 *  - Interior: deep navy #1A2040
 *
 * Padlock:
 *  - CLOSED U-arch shackle, thick strokes
 *  - Large rounded-rect body (gold)
 *  - Keyhole: circle + wide stem
 *
 * Garuda seal:
 *  - Bottom-center of padlock body
 *  - Double concentric gold rings
 *  - Garuda emblem inside
 */
import React from 'react';

export default function BsreBadge({ width = 300 }) {
    // Viewbox: 300 × 95. Shield is ~90px wide on the left.
    const h = Math.round(width * 95 / 300);
    return (
        <svg
            width={width}
            height={h}
            viewBox="0 0 300 95"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
        >
            {/* ══════════════════════════════════════════
                SHIELD
                Reference: arched top, straight sides, sharp bottom point
                Gold outer → navy inner (thick border effect)
            ══════════════════════════════════════════ */}

            {/* Gold outer shield */}
            <path
                d="M45 2
                   C 52 2 67 6 77 14
                   L 82 22
                   L 82 55
                   C 82 72 65 84 45 93
                   C 25 84 8 72 8 55
                   L 8 22
                   L 13 14
                   C 23 6 38 2 45 2 Z"
                fill="#C9A227"
            />

            {/* Navy inner fill — inset ~6px to create gold border */}
            <path
                d="M45 9
                   C 52 9 65 13 73 19
                   L 76 26
                   L 76 54
                   C 76 69 62 80 45 88
                   C 28 80 14 69 14 54
                   L 14 26
                   L 17 19
                   C 25 13 38 9 45 9 Z"
                fill="#141C38"
            />

            {/* ══════════════════════════════════════════
                PADLOCK — CLOSED
                U-arch shackle: both legs symmetric, arch at top
                Body: large rounded rectangle
            ══════════════════════════════════════════ */}

            {/* Shackle — thick U-arch (CLOSED) */}
            <path
                d="M28 46
                   L 28 32
                   Q 28 17 45 17
                   Q 62 17 62 32
                   L 62 46"
                stroke="#C9A227"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* Padlock body */}
            <rect
                x="17"
                y="43"
                width="56"
                height="38"
                rx="5"
                ry="5"
                fill="#C9A227"
            />

            {/* Keyhole — circle */}
            <circle cx="45" cy="55" r="6.5" fill="#141C38" />

            {/* Keyhole — stem (wider, rounded) */}
            <path
                d="M41.5 55 L41.5 65 Q41.5 67 45 67 Q48.5 67 48.5 65 L48.5 55"
                fill="#141C38"
            />

            {/* ══════════════════════════════════════════
                GARUDA SEAL
                Bottom-center of padlock body
                Double gold rings, Garuda inside
            ══════════════════════════════════════════ */}

            {/* Seal dark background */}
            <circle cx="45" cy="72" r="11" fill="#141C38" />

            {/* Outer gold ring */}
            <circle cx="45" cy="72" r="10.5" fill="none" stroke="#C9A227" strokeWidth="1.5" />

            {/* Inner gold ring (double-ring effect, as in reference) */}
            <circle cx="45" cy="72" r="8.2"  fill="none" stroke="#C9A227" strokeWidth="0.8" />

            {/* Garuda head */}
            <circle cx="45" cy="67.5" r="2.5" fill="#C9A227" />

            {/* Garuda beak / crown */}
            <path d="M43.5 65.5 Q45 63 46.5 65.5" stroke="#C9A227" strokeWidth="0.9" fill="none" strokeLinecap="round" />

            {/* Garuda body */}
            <ellipse cx="45" cy="74.5" rx="3.2" ry="4" fill="#C9A227" />

            {/* Garuda left wing — upper + lower feathers */}
            <path d="M42 71 Q39 68 36 65.5" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M42 73 Q38 71 35 69.5" stroke="#C9A227" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M41 75 Q38 74.5 36 74" stroke="#C9A227" strokeWidth="1"   strokeLinecap="round" fill="none" />

            {/* Garuda right wing */}
            <path d="M48 71 Q51 68 54 65.5" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M48 73 Q52 71 55 69.5" stroke="#C9A227" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M49 75 Q52 74.5 54 74" stroke="#C9A227" strokeWidth="1"   strokeLinecap="round" fill="none" />

            {/* Garuda tail */}
            <path
                d="M43.5 78.5 L42.5 81.5
                   M45 78.5 L45 81.5
                   M46.5 78.5 L47.5 81.5"
                stroke="#C9A227"
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
            />

            {/* ══════════════════════════════════════════
                TEXT SECTION
            ══════════════════════════════════════════ */}

            {/* "KEMENIMIPAS" — very heavy black, matching reference */}
            <text
                x="102"
                y="50"
                fontFamily="'Arial Black', Arial, Helvetica, sans-serif"
                fontWeight="900"
                fontSize="27"
                letterSpacing="-0.2"
                fill="#0D0D0D"
            >
                KEMENIMIPAS
            </text>

            {/* Subtitle */}
            <text
                x="102"
                y="66"
                fontFamily="Arial, Helvetica, sans-serif"
                fontWeight="400"
                fontSize="11"
                fill="#666666"
            >
                Ditandatangani secara elektronik oleh:
            </text>

            {/* Horizontal separator */}
            <line x1="102" y1="73" x2="296" y2="73" stroke="#BBBBBB" strokeWidth="1" />
        </svg>
    );
}

/* ═══════════════════════════════════════════════════
   SVG STRING — for canvas/PNG rendering
═══════════════════════════════════════════════════ */
export function getBsreBadgeSvgString(width = 300) {
    const h = Math.round(width * 95 / 300);
    return `<svg width="${width}" height="${h}" viewBox="0 0 300 95" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Shield gold outer -->
  <path d="M45 2 C 52 2 67 6 77 14 L 82 22 L 82 55 C 82 72 65 84 45 93 C 25 84 8 72 8 55 L 8 22 L 13 14 C 23 6 38 2 45 2 Z" fill="#C9A227"/>
  <!-- Shield navy inner -->
  <path d="M45 9 C 52 9 65 13 73 19 L 76 26 L 76 54 C 76 69 62 80 45 88 C 28 80 14 69 14 54 L 14 26 L 17 19 C 25 13 38 9 45 9 Z" fill="#141C38"/>
  <!-- Shackle U-arch closed -->
  <path d="M28 46 L 28 32 Q 28 17 45 17 Q 62 17 62 32 L 62 46" stroke="#C9A227" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- Padlock body -->
  <rect x="17" y="43" width="56" height="38" rx="5" ry="5" fill="#C9A227"/>
  <!-- Keyhole circle -->
  <circle cx="45" cy="55" r="6.5" fill="#141C38"/>
  <!-- Keyhole stem -->
  <path d="M41.5 55 L41.5 65 Q41.5 67 45 67 Q48.5 67 48.5 65 L48.5 55" fill="#141C38"/>
  <!-- Garuda seal bg -->
  <circle cx="45" cy="72" r="11" fill="#141C38"/>
  <!-- Garuda outer ring -->
  <circle cx="45" cy="72" r="10.5" fill="none" stroke="#C9A227" stroke-width="1.5"/>
  <!-- Garuda inner ring -->
  <circle cx="45" cy="72" r="8.2" fill="none" stroke="#C9A227" stroke-width="0.8"/>
  <!-- Garuda head -->
  <circle cx="45" cy="67.5" r="2.5" fill="#C9A227"/>
  <!-- Garuda beak -->
  <path d="M43.5 65.5 Q45 63 46.5 65.5" stroke="#C9A227" stroke-width="0.9" fill="none" stroke-linecap="round"/>
  <!-- Garuda body -->
  <ellipse cx="45" cy="74.5" rx="3.2" ry="4" fill="#C9A227"/>
  <!-- Left wings -->
  <path d="M42 71 Q39 68 36 65.5" stroke="#C9A227" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M42 73 Q38 71 35 69.5" stroke="#C9A227" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <path d="M41 75 Q38 74.5 36 74" stroke="#C9A227" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Right wings -->
  <path d="M48 71 Q51 68 54 65.5" stroke="#C9A227" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M48 73 Q52 71 55 69.5" stroke="#C9A227" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <path d="M49 75 Q52 74.5 54 74" stroke="#C9A227" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Garuda tail -->
  <path d="M43.5 78.5 L42.5 81.5 M45 78.5 L45 81.5 M46.5 78.5 L47.5 81.5" stroke="#C9A227" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- KEMENIMIPAS text -->
  <text x="102" y="50" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="27" letter-spacing="-0.2" fill="#0D0D0D">KEMENIMIPAS</text>
  <!-- Subtitle -->
  <text x="102" y="66" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="11" fill="#666666">Ditandatangani secara elektronik oleh:</text>
  <!-- Separator line -->
  <line x1="102" y1="73" x2="296" y2="73" stroke="#BBBBBB" stroke-width="1"/>
</svg>`;
}

/**
 * Render BSrE badge SVG → PNG ArrayBuffer via off-screen Canvas.
 * Used to embed the badge as an image in DOCX/Word exports.
 * @param {number} width
 * @returns {Promise<ArrayBuffer>}
 */
export async function getBsreBadgePngBuffer(width = 300) {
    const h = Math.round(width * 95 / 300);
    const svgStr = getBsreBadgeSvgString(width);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const SCALE = 3; // 3× for crisp Word rendering
            const canvas = document.createElement('canvas');
            canvas.width  = width  * SCALE;
            canvas.height = h      * SCALE;
            const ctx = canvas.getContext('2d');
            ctx.scale(SCALE, SCALE);
            ctx.drawImage(img, 0, 0, width, h);
            URL.revokeObjectURL(url);
            canvas.toBlob((png) => {
                png.arrayBuffer().then(resolve).catch(reject);
            }, 'image/png');
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}
