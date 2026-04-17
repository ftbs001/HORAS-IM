/**
 * PagedDocumentViewer.jsx
 *
 * Read-only renderer for the structured pages[] JSON format.
 * Renders each page as an A4 container with correct orientation,
 * margins, and all content types (paragraph, heading, table, image, list).
 *
 * Props:
 *   structuredJson  {object}  — { version, pages: [...] }
 *   maxHeight       {string}  — CSS max-height for scroll container
 *   showPageNumbers {boolean} — show page number bar (default true)
 *   compact         {boolean} — reduce padding for embedding in small areas
 */
import { useMemo } from 'react';

/* ── CSS constants ─────────────────────────────────────────────────────────── */
// A4 at 96 DPI: portrait = 794px wide, landscape = 1122px wide
const PAGE_W_PORTRAIT = 794;
const PAGE_W_LANDSCAPE = 1122;

/* ── Color palette ─────────────────────────────────────────────────────────── */
const COLORS = {
    bg: '#dde1e7',
    pageBg: '#ffffff',
    pageShadow: '0 4px 24px rgba(0,0,0,0.15)',
    border: '#e2e8f0',
    headerBg: '#f8fafc',
    orientBadge: { portrait: '#64748b', landscape: '#f59e0b' },
    margin: 'rgba(99,102,241,0.1)',    // subtle blue-purple margin guide
};

/* ── Style builders ────────────────────────────────────────────────────────── */

const pageContainerStyle = (page, compact) => {
    // Landscape only if explicitly set — table-count heuristic removed (was too aggressive)
    const isLandscape = page.orientation === 'landscape';
    const w = isLandscape ? PAGE_W_LANDSCAPE : PAGE_W_PORTRAIT;
    const m = page.margin || { top: 2.5, right: 2.5, bottom: 2.5, left: 3.0 };
    // cm → px @ 96dpi (1cm = 37.8px)
    const toPx = (cm) => `${(cm * 37.8).toFixed(0)}px`;
    return {
        background: COLORS.pageBg,
        width: `${w}px`,
        margin: compact ? '0 auto 16px' : '0 auto 32px',
        padding: `${toPx(m.top)} ${toPx(m.right)} ${toPx(m.bottom)} ${toPx(m.left)}`,
        boxShadow: COLORS.pageShadow,
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: '"Times New Roman", Calibri, Arial, sans-serif',
        fontSize: '12pt',
        lineHeight: '1.5',
        color: '#000',
        minHeight: isLandscape ? `${(PAGE_W_PORTRAIT).toFixed(0)}px` : `${(PAGE_W_LANDSCAPE * 0.71).toFixed(0)}px`,
    };
};

const headerStyle = {
    borderBottom: '1px solid #dee2e9',
    paddingBottom: '6px',
    marginBottom: '8px',
    fontSize: '10pt',
    color: '#64748b',
    fontStyle: 'italic',
};

const footerStyle = {
    borderTop: '1px solid #dee2e9',
    paddingTop: '6px',
    marginTop: '8px',
    fontSize: '10pt',
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
};

/* ── Block renderers ───────────────────────────────────────────────────────── */

function renderParagraph(block, idx) {
    const { text, style = {}, runs, isEmpty } = block;
    if (isEmpty && !text) {
        return <div key={idx} style={{ height: '1.2em', minHeight: '1.2em' }} aria-hidden />;
    }
    const align = style.align === 'justify' ? 'justify'
        : style.align === 'center' ? 'center'
            : style.align === 'right' ? 'right'
                : 'left';
    const baseStyle = {
        margin: '0',
        padding: '0',
        minHeight: '1.2em',
        textAlign: align,
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap',
    };
    if (!runs || runs.length === 0) {
        return <p key={idx} style={baseStyle}>{text}</p>;
    }
    return (
        <p key={idx} style={baseStyle}>
            {runs.map((r, ri) => (
                <span key={ri} style={{
                    fontWeight: r.style?.bold ? 'bold' : undefined,
                    fontStyle: r.style?.italic ? 'italic' : undefined,
                    textDecoration: r.style?.underline ? 'underline' : undefined,
                    fontSize: r.style?.fontSize ? `${r.style.fontSize}pt` : undefined,
                }}>
                    {r.text}
                </span>
            ))}
        </p>
    );
}

function renderHeading(block, idx) {
    const tags = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' };
    const Tag = tags[block.level] || 'h3';
    const sizes = { 1: '14pt', 2: '13pt', 3: '12pt' };
    return (
        <Tag key={idx} style={{
            fontSize: sizes[block.level] || '12pt',
            fontWeight: 'bold',
            textAlign: block.style?.align || 'left',
            margin: '0.5em 0 0.3em',
            lineHeight: '1.3',
        }}>
            {block.text}
        </Tag>
    );
}

function renderTable(block, idx) {
    const { rows = [] } = block;
    if (rows.length === 0) return null;

    // Check if any row has 5+ columns to decide landscape auto-detect per table (mirrors export rule)
    const maxCols = Math.max(...rows.map(r => r.filter(c => !c?.vContinue).length));
    const isWideTable = maxCols >= 5;

    return (
        <div key={idx} style={{ overflowX: isWideTable ? 'auto' : 'visible', margin: '0.6em 0' }}>
            <table style={{
                borderCollapse: 'collapse',
                width: '100%',
                minWidth: isWideTable ? '700px' : undefined,
                fontSize: '11pt',
                fontFamily: '"Times New Roman", Calibri, Arial, sans-serif',
                tableLayout: 'auto',
            }}>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} style={{ background: ri === 0 ? '#f5f5f5' : '#fff' }}>
                            {row.map((cell, ci) => {
                                // Skip continuation cells (rendered via rowspan on the start cell)
                                if (cell?.vContinue) return null;
                                const Tag = ri === 0 ? 'th' : 'td';
                                return (
                                    <Tag key={ci}
                                        colSpan={cell?.colspan || 1}
                                        rowSpan={cell?.rowspan || 1}
                                        style={{
                                            border: '1px solid #000',
                                            padding: '4px 7px',
                                            verticalAlign: 'top',
                                            fontWeight: ri === 0 || cell?.bold ? 'bold' : 'normal',
                                            textAlign: cell?.align || (ri === 0 ? 'center' : 'left'),
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: '1.4',
                                            fontSize: '11pt',
                                        }}
                                    >
                                        {/* Render rich-text runs if available, otherwise plain text */}
                                        {cell?.runs?.length > 0
                                            ? cell.runs.map((run, rIdx) => (
                                                <span key={rIdx} style={{
                                                    fontWeight: run.bold ? 'bold' : undefined,
                                                    fontStyle: run.italic ? 'italic' : undefined,
                                                    textDecoration: run.underline ? 'underline' : undefined,
                                                    fontSize: run.fontSize ? `${run.fontSize}pt` : undefined,
                                                }}>{run.text}</span>
                                            ))
                                            : (cell?.text || '')
                                        }
                                    </Tag>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderImage(block, idx) {
    const { base64, widthCm, heightCm, caption } = block;
    if (!base64) return null;

    // Convert cm → px at 96dpi and always cap at 100% of container width
    const toCssPx = (cm) => `${(cm * 37.8).toFixed(0)}px`;
    const imgStyle = {
        display: 'block',
        margin: '0 auto',
        maxWidth: '100%',    // never exceed container
        height: 'auto',
        imageRendering: 'crisp-edges',
    };
    if (widthCm) imgStyle.width = toCssPx(widthCm);
    if (heightCm) imgStyle.height = toCssPx(heightCm);

    return (
        <figure key={idx} style={{ margin: '0.6em 0', textAlign: 'center', overflow: 'hidden' }}>
            <img
                src={base64}
                alt={caption || `Gambar ${idx + 1}`}
                style={imgStyle}
                loading="lazy"
            />
            {caption && (
                <figcaption style={{
                    fontSize: '10pt',
                    fontStyle: 'italic',
                    color: '#555',
                    marginTop: '4px',
                }}>
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}

function renderList(block, idx) {
    const { ordered, items = [] } = block;
    const Tag = ordered ? 'ol' : 'ul';
    const style = {
        margin: '0.3em 0 0.3em 2em',
        padding: '0',
        lineHeight: '1.5',
        fontSize: '12pt',
    };
    return (
        <Tag key={idx} style={style}>
            {items.map((item, ii) => (
                <li key={ii} style={{
                    marginLeft: `${(item.level || 0) * 1.2}em`,
                    marginBottom: '0.1em',
                }}>
                    {item.text}
                </li>
            ))}
        </Tag>
    );
}

function renderPageBreak(idx) {
    return (
        <div key={idx} style={{
            borderTop: '2px dashed #bbb',
            margin: '1em 0',
            position: 'relative',
        }}>
            <span style={{
                position: 'absolute',
                left: '50%',
                top: '-0.7em',
                transform: 'translateX(-50%)',
                background: '#fff',
                padding: '0 8px',
                fontSize: '10px',
                color: '#bbb',
            }}>
                — halaman baru —
            </span>
        </div>
    );
}

function renderBlock(block, idx) {
    switch (block.type) {
        case 'paragraph': return renderParagraph(block, idx);
        case 'heading': return renderHeading(block, idx);
        case 'table': return renderTable(block, idx);
        case 'image': return renderImage(block, idx);
        case 'list': return renderList(block, idx);
        case 'page_break': return renderPageBreak(idx);
        default: return null;
    }
}

/* ── Page component ────────────────────────────────────────────────────────── */

function PageContainer({ page, index, showPageNumbers, compact }) {
    // No longer auto-landscape based on table presence — use orientation from page data
    const isLandscape = page.orientation === 'landscape';
    const w = isLandscape ? PAGE_W_LANDSCAPE : PAGE_W_PORTRAIT;
    // Build a page object with computed orientation for style builder
    const pageWithOrient = { ...page, orientation: isLandscape ? 'landscape' : 'portrait' };

    return (
                <div style={{ maxWidth: `${w + 48}px`, margin: '0 auto' }}>
                {/* Orientation label */}
                {showPageNumbers && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        fontSize: '11px',
                        color: '#94a3b8',
                        userSelect: 'none',
                    }}>
                        <span>Halaman {page.pageNumber}</span>
                        <span style={{
                            background: isLandscape ? COLORS.orientBadge.landscape : COLORS.orientBadge.portrait,
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            fontWeight: 700,
                            fontSize: '10px',
                        }}>
                            {isLandscape ? '🔄 Landscape' : '📄 Portrait'}
                            {page.widthCm ? ` · ${page.widthCm}×${page.heightCm} cm` : ''}
                        </span>
                    </div>
                )}

            {/* Page paper */}
            <div style={pageContainerStyle(page, compact)}>
                {/* Header */}
                {page.header?.text && (
                    <div style={headerStyle}>{page.header.text}</div>
                )}

                {/* Content */}
                <div>
                    {page.content.map((block, idx) => renderBlock(block, idx))}
                </div>

                {/* Footer */}
                {page.footer?.text && (
                    <div style={footerStyle}>{page.footer.text}</div>
                )}

                {/* Page number */}
                {showPageNumbers && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: '#94a3b8',
                        userSelect: 'none',
                    }}>
                        - {page.pageNumber} -
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Empty / Error states ──────────────────────────────────────────────────── */

function EmptyState() {
    return (
        <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#94a3b8',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '2px dashed #e2e8f0',
        }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
            <p style={{ margin: 0, fontSize: '14px' }}>
                Belum ada konten dokumen untuk ditampilkan.
            </p>
        </div>
    );
}

/* ── Main component ────────────────────────────────────────────────────────── */

export default function PagedDocumentViewer({
    structuredJson,
    maxHeight = '80vh',
    showPageNumbers = true,
    compact = false,
}) {
    const pages = useMemo(() => {
        if (!structuredJson?.pages?.length) return [];
        return structuredJson.pages;
    }, [structuredJson]);

    const metadata = structuredJson?.metadata;

    if (!pages.length) return <EmptyState />;

    // Determine if any page is landscape
    const hasLandscape = pages.some(p => p.orientation === 'landscape');

    return (
        <div style={{ fontFamily: 'inherit' }}>
            {/* ── Metadata bar ─────────────────────────────────────────── */}
            {metadata && !compact && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: '#1e293b',
                    borderRadius: '8px 8px 0 0',
                    flexWrap: 'wrap',
                }}>
                    <span style={{
                        fontSize: '12px', fontWeight: 700, color: '#fff',
                        padding: '3px 10px', background: '#2563eb',
                        borderRadius: '99px',
                    }}>
                        📄 {structuredJson.version === '3.0' ? 'Structured Preview' : 'Preview'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {metadata.pageCount} halaman
                        {metadata.hasTables ? ' · tabel ✓' : ''}
                        {metadata.hasImages ? ' · gambar ✓' : ''}
                        {metadata.hasHeaders ? ' · header ✓' : ''}
                    </span>
                    {hasLandscape && (
                        <span style={{
                            fontSize: '11px', fontWeight: 700,
                            padding: '2px 8px', borderRadius: '99px',
                            background: '#f59e0b', color: '#fff',
                        }}>
                            🔄 Ada halaman Landscape
                        </span>
                    )}
                </div>
            )}

            {/* ── Pages scroll area ────────────────────────────────────── */}
            <div style={{
                maxHeight,
                overflowY: 'auto',
                overflowX: hasLandscape ? 'auto' : 'hidden',
                background: COLORS.bg,
                padding: compact ? '16px 12px' : '28px 20px',
                borderRadius: compact ? '8px' : '0 0 8px 8px',
                border: compact ? 'none' : '1px solid #e2e8f0',
            }}>
                {pages.map((page, idx) => (
                    <PageContainer
                        key={page.pageNumber || idx}
                        page={page}
                        index={idx}
                        showPageNumbers={showPageNumbers}
                        compact={compact}
                    />
                ))}
            </div>
        </div>
    );
}
