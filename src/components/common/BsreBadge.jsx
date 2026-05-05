/**
 * BsreBadge.jsx – Badge e-TTD KEMENIMIPAS
 *
 * Prioritas tampilan:
 *   1. logoSrc prop (gambar yang diupload user) ← PRIORITAS UTAMA
 *   2. /bsre_shield.png (default fallback)
 *
 * Layout:  [shield/logo]  KEMENIMIPAS (bold black)
 *                          Ditandatangani secara elektronik oleh:
 *                          ──────────────────────────────────────
 *
 * Props:
 *   width    – total badge width px (default 300)
 *   logoSrc  – URL/data-URI gambar logo yang diupload user (optional)
 */
import React from 'react';

export default function BsreBadge({ width = 300, logoSrc = null }) {
    const shieldW    = Math.round(width * 0.30);
    const shieldH    = Math.round(shieldW * 1.05);
    const titleSize  = Math.round(width * 0.092);
    const subtitleSz = Math.round(width * 0.038);

    // Gunakan logo yang diupload user, atau fallback ke default shield
    const imgSrc = logoSrc || '/bsre_shield.png';

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                width: `${width}px`,
                gap: '10px',
            }}
        >
            {/* Logo — uploaded by user or default shield */}
            <img
                src={imgSrc}
                alt="Logo TTD"
                width={shieldW}
                height={shieldH}
                style={{ flexShrink: 0, display: 'block', objectFit: 'contain' }}
            />

            {/* Text section */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontFamily: "'Arial Black', 'Arial Bold', Arial, Helvetica, sans-serif",
                    fontWeight: 900,
                    fontSize: `${titleSize}px`,
                    color: '#0D0D0D',
                    letterSpacing: '-0.5px',
                    lineHeight: 1.0,
                    whiteSpace: 'nowrap',
                }}>
                    KEMENIMIPAS
                </div>
                <div style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontWeight: 400,
                    fontSize: `${subtitleSz}px`,
                    color: '#666666',
                    marginTop: '6px',
                    whiteSpace: 'nowrap',
                }}>
                    Ditandatangani secara elektronik oleh:
                </div>
                <div style={{ borderTop: '1px solid #CCCCCC', marginTop: '6px' }} />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   WORD / DOCX EXPORT HELPERS
═══════════════════════════════════════════════════════════════ */

/**
 * Composites the shield image (from logoSrc URL or /bsre_shield.png)
 * + KEMENIMIPAS text + subtitle + line onto an off-screen canvas.
 * Returns PNG ArrayBuffer for embedding into Word/DOCX.
 *
 * @param {number} totalWidth – output width in px (default 340)
 * @param {string|null} logoSrc – URL or data-URI of shield image (optional)
 * @returns {Promise<ArrayBuffer>}
 */
export async function getBsreBadgePngBuffer(totalWidth = 340, logoSrc = null) {
    const SCALE    = 3;
    const SHIELD_W = Math.round(totalWidth * 0.30);
    const SHIELD_H = Math.round(SHIELD_W * 1.05);
    const BADGE_H  = Math.max(SHIELD_H, Math.round(totalWidth * 0.33));
    const GAP      = 10;
    const TEXT_X   = SHIELD_W + GAP;
    const TITLE_SZ = Math.round(totalWidth * 0.092);
    const SUB_SZ   = Math.round(totalWidth * 0.038);

    const canvas  = document.createElement('canvas');
    canvas.width  = totalWidth * SCALE;
    canvas.height = BADGE_H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, BADGE_H);

    // Load and draw shield/logo image
    const shieldUrl = logoSrc || '/bsre_shield.png';
    try {
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const top = Math.round((BADGE_H - SHIELD_H) / 2);
                ctx.drawImage(img, 0, top, SHIELD_W, SHIELD_H);
                resolve();
            };
            img.onerror = reject;
            img.src = shieldUrl;
        });
    } catch (e) {
        console.warn('BSrE: shield image load failed:', e);
    }

    // Draw "KEMENIMIPAS" title
    const titleY = Math.round(BADGE_H * 0.40);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0D0D0D';
    ctx.font = `900 ${TITLE_SZ}px "Arial Black", Arial, sans-serif`;
    ctx.fillText('KEMENIMIPAS', TEXT_X, titleY);

    // Draw subtitle
    const subY = titleY + Math.round(TITLE_SZ * 0.55) + 6;
    ctx.fillStyle = '#666666';
    ctx.font = `400 ${SUB_SZ}px Arial, sans-serif`;
    ctx.fillText('Ditandatangani secara elektronik oleh:', TEXT_X, subY);

    // Draw horizontal line
    const lineY = subY + 8;
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(TEXT_X, lineY);
    ctx.lineTo(totalWidth - 4, lineY);
    ctx.stroke();

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('canvas.toBlob failed')); return; }
            blob.arrayBuffer().then(resolve).catch(reject);
        }, 'image/png');
    });
}
