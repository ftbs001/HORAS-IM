/**
 * DocxPreviewRenderer.jsx
 *
 * WYSIWYG preview of a parsed DOCX document.
 * Renders mammoth.js HTML output inside an A4-simulated frame with
 * full style preservation. Supports landscape and portrait orientation.
 *
 * Props:
 *   html           {string}  — HTML string from docxParser.parseDocxFile()
 *   styleMetadata  {object}  — metadata from parseDocxFile() (includes pageOrientation)
 *   preserveLayout {boolean} — toggle Preserve Original Layout (default true)
 *   maxHeight      {string}  — CSS max-height for scroll container (default '70vh')
 *   showToolbar    {boolean} — show info bar + toggle (default true)
 */
import { useState, useEffect, useRef } from 'react';
import { buildPreservedCss } from '../../utils/docxStylePreserver';

export default function DocxPreviewRenderer({
    html,
    styleMetadata = {},
    preserveLayout: initialPreserve = true,
    maxHeight = '70vh',
    showToolbar = true,
}) {
    const [preserveLayout, setPreserveLayout] = useState(initialPreserve);
    const containerRef = useRef(null);
    const styleTagId = useRef(`docx-style-${Math.random().toString(36).slice(2)}`);

    // Detect orientation from styleMetadata or from HTML data attribute
    const orientation = styleMetadata.pageOrientation || 'portrait';
    const isLandscape = orientation === 'landscape';

    // ── Inject scoped CSS whenever layout or orientation changes ─────────────
    useEffect(() => {
        const existing = document.getElementById(styleTagId.current);
        if (existing) existing.remove();

        const css = buildPreservedCss({
            preserveLayout,
            orientation,
            pageMargins: styleMetadata.pageMargins || {},
        });
        const style = document.createElement('style');
        style.id = styleTagId.current;
        style.textContent = css;
        document.head.appendChild(style);

        return () => {
            const el = document.getElementById(styleTagId.current);
            if (el) el.remove();
        };
    }, [preserveLayout, orientation, styleMetadata.pageMargins]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            const el = document.getElementById(styleTagId.current);
            if (el) el.remove();
        };
    }, []);

    if (!html) {
        return (
            <div style={{
                padding: '32px', textAlign: 'center', color: '#94a3b8',
                background: '#f8fafc', borderRadius: '8px',
                border: '2px dashed #e2e8f0',
            }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
                <p style={{ margin: 0, fontSize: '14px' }}>
                    Konten DOCX belum tersedia untuk ditampilkan.
                </p>
            </div>
        );
    }

    /* ── Metadata summary bar ─────────────────────────────────────────────── */
    const metaItems = [];
    if (styleMetadata.paragraphCount > 0)
        metaItems.push(`${styleMetadata.paragraphCount} paragraf`);
    if (styleMetadata.tableCount > 0)
        metaItems.push(`${styleMetadata.tableCount} tabel`);
    if (styleMetadata.imageCount > 0)
        metaItems.push(`${styleMetadata.imageCount} gambar`);
    if (styleMetadata.hasLists)
        metaItems.push('poin / nomor');

    // Page size info for toolbar
    const pageSizeLabel = styleMetadata.pageWidthCm && styleMetadata.pageHeightCm
        ? `${styleMetadata.pageWidthCm}×${styleMetadata.pageHeightCm} cm`
        : null;

    return (
        <div style={{ fontFamily: 'inherit' }}>
            {/* ── Toolbar ────────────────────────────────────────────────── */}
            {showToolbar && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: '#1e293b', borderRadius: '8px 8px 0 0',
                    flexWrap: 'wrap', gap: '8px',
                }}>
                    {/* Left: info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '12px', fontWeight: 700, color: '#fff',
                            padding: '3px 10px', background: '#2563eb',
                            borderRadius: '99px', letterSpacing: '0.5px',
                        }}>
                            📄 DOCX Preview
                        </span>

                        {/* Orientation badge */}
                        <span style={{
                            fontSize: '11px', fontWeight: 700,
                            padding: '2px 8px', borderRadius: '99px',
                            background: isLandscape ? '#f59e0b' : '#64748b',
                            color: '#fff', letterSpacing: '0.3px',
                        }}>
                            {isLandscape ? '🔄 Landscape' : '📄 Portrait'}
                            {pageSizeLabel && ` (${pageSizeLabel})`}
                        </span>

                        {metaItems.length > 0 && (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {metaItems.join(' · ')}
                            </span>
                        )}
                    </div>

                    {/* Right: Preserve Layout toggle */}
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        cursor: 'pointer', userSelect: 'none',
                    }}>
                        <div
                            onClick={() => setPreserveLayout(v => !v)}
                            style={{
                                width: '36px', height: '20px', borderRadius: '10px',
                                background: preserveLayout ? '#22c55e' : '#64748b',
                                position: 'relative', transition: 'background 0.2s',
                                cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            <div style={{
                                position: 'absolute', width: '14px', height: '14px',
                                borderRadius: '50%', background: '#fff',
                                top: '3px',
                                left: preserveLayout ? '19px' : '3px',
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
                            Preserve Original Layout
                        </span>
                    </label>
                </div>
            )}

            {/* ── Warnings bar ───────────────────────────────────────────── */}
            {styleMetadata.warnings?.length > 0 && (
                <div style={{
                    padding: '8px 14px', background: '#fef3c7',
                    borderLeft: '3px solid #f59e0b', fontSize: '12px', color: '#92400e',
                }}>
                    {styleMetadata.warnings.map((w, i) => (
                        <div key={i}>⚠️ {w}</div>
                    ))}
                </div>
            )}

            {/* ── Landscape info bar ─────────────────────────────────────── */}
            {isLandscape && (
                <div style={{
                    padding: '6px 14px', background: '#fffbeb',
                    borderLeft: '3px solid #f59e0b', fontSize: '12px', color: '#92400e',
                    display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    🔄 <strong>Orientasi Landscape</strong> — Kertas diputar horizontal (A4 Landscape).
                    Scroll horizontal tersedia jika diperlukan.
                </div>
            )}

            {/* ── A4 render area ─────────────────────────────────────────── */}
            <div
                ref={containerRef}
                className="docx-renderer-wrap"
                style={{
                    maxHeight,
                    overflowY: 'auto',
                    overflowX: isLandscape ? 'auto' : 'hidden',
                    borderRadius: showToolbar ? '0 0 8px 8px' : '8px',
                    border: '1px solid #e2e8f0',
                }}
                // STYLE LOCK: dangerouslySetInnerHTML preserves the exact HTML
                // structure from mammoth without React re-parsing / normalizing it
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
}
