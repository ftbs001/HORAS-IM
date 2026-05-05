/**
 * BsreBadge.jsx – Badge e-TTD KEMENIMIPAS
 *
 * Props:
 *   width    – total badge width px (default 320)
 *   logoSrc  – URL/data-URI gambar logo yang diupload user (optional)
 *              Jika tidak ada, pakai /bsre_shield.png
 */
import React from 'react';

export default function BsreBadge({ width = 320, logoSrc = null }) {
    // Shield = 36% of total width, aspect ratio ~1:1.05
    const shieldW    = Math.round(width * 0.36);
    const shieldH    = Math.round(shieldW * 1.05);
    const titleSize  = Math.round(width * 0.096);   // KEMENIMIPAS
    const subtitleSz = Math.round(width * 0.040);   // subtitle
    const imgSrc     = logoSrc || '/bsre_shield.png';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            width: `${width}px`,
            gap: '12px',
        }}>
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
                    color: '#555555',
                    marginTop: '7px',
                    whiteSpace: 'nowrap',
                }}>
                    Ditandatangani secara elektronik oleh:
                </div>
                <div style={{ borderTop: '1.5px solid #BBBBBB', marginTop: '7px' }} />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   WORD / DOCX EXPORT — composite shield + text → PNG ArrayBuffer
═══════════════════════════════════════════════════════════════ */
export async function getBsreBadgePngBuffer(totalWidth = 380, logoSrc = null) {
    const SCALE    = 3;
    const SHIELD_W = Math.round(totalWidth * 0.36);
    const SHIELD_H = Math.round(SHIELD_W * 1.05);
    const BADGE_H  = Math.max(SHIELD_H, Math.round(totalWidth * 0.35));
    const GAP      = 12;
    const TEXT_X   = SHIELD_W + GAP;
    const TITLE_SZ = Math.round(totalWidth * 0.096);
    const SUB_SZ   = Math.round(totalWidth * 0.040);

    const canvas  = document.createElement('canvas');
    canvas.width  = totalWidth * SCALE;
    canvas.height = BADGE_H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, BADGE_H);

    // Draw shield/logo
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
        console.warn('BSrE: shield load failed:', e);
    }

    // KEMENIMIPAS title
    const titleY = Math.round(BADGE_H * 0.40);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0D0D0D';
    ctx.font = `900 ${TITLE_SZ}px "Arial Black", Arial, sans-serif`;
    ctx.fillText('KEMENIMIPAS', TEXT_X, titleY);

    // Subtitle
    const subY = titleY + Math.round(TITLE_SZ * 0.55) + 7;
    ctx.fillStyle = '#555555';
    ctx.font = `400 ${SUB_SZ}px Arial, sans-serif`;
    ctx.fillText('Ditandatangani secara elektronik oleh:', TEXT_X, subY);

    // Horizontal line
    const lineY = subY + 9;
    ctx.strokeStyle = '#BBBBBB';
    ctx.lineWidth = 1.5;
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
