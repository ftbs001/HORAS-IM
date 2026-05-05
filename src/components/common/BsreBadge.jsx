/**
 * BsreBadge.jsx – Badge e-TTD KEMENIMIPAS
 *
 * Uses the real shield PNG image (/bsre_shield.png) placed in the
 * public folder. This guarantees the shield looks IDENTICAL to the
 * official reference image provided by the user.
 *
 * Layout:
 *   [shield image]  KEMENIMIPAS  (bold black, large)
 *                   Ditandatangani secara elektronik oleh:  (gray)
 *                   ──────────────────────────────────────
 *
 * Props:
 *   width – total badge width in px (default 300)
 */
import React from 'react';

export default function BsreBadge({ width = 300 }) {
    const shieldW = Math.round(width * 0.30);   // shield = 30% of badge width
    const shieldH = Math.round(shieldW * 1.05); // shield aspect ratio ≈ 1:1.05

    const titleSize  = Math.round(width * 0.092); // "KEMENIMIPAS" font-size
    const subtitleSz = Math.round(width * 0.038); // subtitle font-size

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                width: `${width}px`,
                gap: '10px',
                fontFamily: 'Arial, Helvetica, sans-serif',
            }}
        >
            {/* Real shield image */}
            <img
                src="/bsre_shield.png"
                alt="KEMENIMIPAS BSrE Shield"
                width={shieldW}
                height={shieldH}
                style={{ flexShrink: 0, display: 'block', objectFit: 'contain' }}
            />

            {/* Text section */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontFamily: "'Arial Black', 'Arial Bold', Arial, Helvetica, sans-serif",
                        fontWeight: 900,
                        fontSize: `${titleSize}px`,
                        color: '#0D0D0D',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.0,
                        whiteSpace: 'nowrap',
                    }}
                >
                    KEMENIMIPAS
                </div>
                <div
                    style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontWeight: 400,
                        fontSize: `${subtitleSz}px`,
                        color: '#666666',
                        marginTop: '6px',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Ditandatangani secara elektronik oleh:
                </div>
                <div
                    style={{
                        borderTop: '1px solid #CCCCCC',
                        marginTop: '6px',
                    }}
                />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   WORD / DOCX EXPORT HELPERS
   Composites the shield PNG + KEMENIMIPAS text + subtitle
   onto a canvas and returns a PNG ArrayBuffer for embedding.
═══════════════════════════════════════════════════════ */

/**
 * Fetches the shield PNG from /bsre_shield.png and loads it
 * into an HTMLImageElement.
 * @returns {Promise<HTMLImageElement>}
 */
function loadShieldImage() {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = reject;
        // Add cache-buster in development to avoid stale cache
        img.src = '/bsre_shield.png';
    });
}

/**
 * Renders the full BSrE badge (shield image + KEMENIMIPAS text
 * + subtitle + horizontal line) onto an off-screen canvas
 * and returns a PNG ArrayBuffer for embedding into DOCX/Word.
 *
 * @param {number} totalWidth – pixel width of the output image (default 340)
 * @returns {Promise<ArrayBuffer>}
 */
export async function getBsreBadgePngBuffer(totalWidth = 340) {
    const SCALE     = 3;    // 3× for crisp high-DPI output
    const SHIELD_W  = Math.round(totalWidth * 0.30);
    const SHIELD_H  = Math.round(SHIELD_W  * 1.05);
    const BADGE_H   = Math.max(SHIELD_H, Math.round(totalWidth * 0.33));
    const GAP       = 10;
    const TEXT_X    = SHIELD_W + GAP;
    const TITLE_SZ  = Math.round(totalWidth * 0.092);
    const SUB_SZ    = Math.round(totalWidth * 0.038);

    const canvas  = document.createElement('canvas');
    canvas.width  = totalWidth * SCALE;
    canvas.height = BADGE_H   * SCALE;
    const ctx     = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, BADGE_H);

    // Draw the real shield PNG
    try {
        const shieldImg = await loadShieldImage();
        const top = Math.round((BADGE_H - SHIELD_H) / 2);
        ctx.drawImage(shieldImg, 0, top, SHIELD_W, SHIELD_H);
    } catch (e) {
        console.warn('BSrE: shield image failed to load, skipping', e);
    }

    // --- KEMENIMIPAS title ---
    const titleY = Math.round(BADGE_H * 0.40);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle    = '#0D0D0D';
    ctx.font         = `900 ${TITLE_SZ}px "Arial Black", Arial, sans-serif`;
    ctx.fillText('KEMENIMIPAS', TEXT_X, titleY);

    // --- Subtitle ---
    const subY = titleY + Math.round(TITLE_SZ * 0.55) + 6;
    ctx.fillStyle = '#666666';
    ctx.font      = `400 ${SUB_SZ}px Arial, sans-serif`;
    ctx.fillText('Ditandatangani secara elektronik oleh:', TEXT_X, subY);

    // --- Horizontal line ---
    const lineY = subY + 8;
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(TEXT_X, lineY);
    ctx.lineTo(totalWidth - 4, lineY);
    ctx.stroke();

    // Export as PNG
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('canvas.toBlob failed')); return; }
            blob.arrayBuffer().then(resolve).catch(reject);
        }, 'image/png');
    });
}
