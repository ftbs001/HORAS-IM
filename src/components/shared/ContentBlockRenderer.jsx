/**
 * ContentBlockRenderer.jsx
 * ──────────────────────────
 * UNIFIED rendering engine for HORAS-IM.
 *
 * WYSIWYG principle: This exact component is used BOTH for:
 *   1. Preview in the application UI
 *   2. As the source-of-truth structure for DOCX/PDF export
 *
 * Supports TWO input formats:
 *   A. pages[]  — structured JSON v3.0 from docxStructuredParser (primary)
 *   B. blocks[] — legacy content_json format from imageUploadService (fallback)
 *
 * All images rendered from base64 stored in content_json / structured_json —
 * no external URLs, no blob URLs.
 */

import React from 'react';

// ── Document constants (match DOCX export locked settings) ────────────────────
const FONT_FAMILY = '"Arial", "Arial Narrow", sans-serif';
const FONT_SIZE_BODY = '11pt';
const FONT_SIZE_SMALL = '10pt';
const LINE_HEIGHT = '1.5';
const COLOR_TEXT = '#000';

// ── A4 page frame ─────────────────────────────────────────────────────────────
const PAGE_STYLE = {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE_BODY,
    lineHeight: LINE_HEIGHT,
    color: COLOR_TEXT,
    background: '#fff',
    maxWidth: '21cm',
    margin: '0 auto',
    minHeight: '29.7cm',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    position: 'relative',
    pageBreakAfter: 'always',
};

const PREVIEW_WRAPPER_STYLE = {
    background: '#f1f5f9',
    padding: '2em',
    minHeight: '100%',
};

// ── Paragraph styles ──────────────────────────────────────────────────────────
const PARAGRAPH_STYLE = {
    margin: '0 0 0.5em 0',
    textIndent: '1.25cm',
    textAlign: 'justify',
    orphans: 3,
    widows: 3,
};

const PARAGRAPH_NO_INDENT = {
    ...PARAGRAPH_STYLE,
    textIndent: 0,
};

// ── Heading styles ─────────────────────────────────────────────────────────────
const HEADING_STYLES = {
    1: {
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '14pt',
        textTransform: 'uppercase',
        margin: '1.5em 0 0.5em',
        pageBreakBefore: 'always',
        textIndent: 0,
    },
    2: {
        fontWeight: 'bold',
        fontSize: '12pt',
        textAlign: 'left',
        margin: '1em 0 0.3em',
        textIndent: 0,
    },
    3: {
        fontWeight: 'bold',
        fontSize: '12pt',
        textAlign: 'left',
        margin: '0.8em 0 0.3em',
        textIndent: '1.25cm',
    },
    4: {
        fontWeight: 'bold',
        fontSize: '11pt',
        textAlign: 'left',
        margin: '0.6em 0 0.2em',
        textIndent: '1.25cm',
    },
};

// ── Image styles ──────────────────────────────────────────────────────────────
const IMAGE_WRAPPER_STYLE = {
    textAlign: 'center',
    margin: '1em 0',
    pageBreakInside: 'avoid',
};

const IMAGE_STYLE = {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    margin: '0 auto',
};

const CAPTION_STYLE = {
    fontSize: FONT_SIZE_SMALL,
    fontStyle: 'italic',
    color: '#555',
    textAlign: 'center',
    margin: '0.3em 0 0',
    textIndent: 0,
};

// ── Table styles ───────────────────────────────────────────────────────────────
const TABLE_WRAPPER_STYLE = {
    margin: '0.5em 0',
    overflowX: 'auto',
};

const TABLE_STYLE = {
    borderCollapse: 'collapse',
    width: '100%',
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE_BODY,
};

const TD_STYLE = {
    border: '1px solid #000',
    padding: '4px 8px',
    verticalAlign: 'top',
};

const TH_STYLE = {
    ...TD_STYLE,
    fontWeight: 'bold',
    background: '#f5f5f5',
    textAlign: 'center',
};

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render inline run-level rich text (bold/italic/underline per span).
 * Used for paragraphs and table cells that have per-run styling.
 */
const renderRuns = (runs) => {
    if (!runs || runs.length === 0) return null;
    return runs.map((run, ri) => {
        // Support both docxStructuredParser v3 (direct props: run.bold, run.italic)
        // and legacy format (nested: run.style?.bold). Dual-check for resilience.
        const isBold = !!(run.bold || run.style?.bold);
        const isItalic = !!(run.italic || run.style?.italic);
        const isUnderline = !!(run.underline || run.style?.underline);
        const isStrike = !!(run.strike || run.style?.strike);
        const fontSize = run.fontSize || run.style?.fontSize;
        const color = run.color || run.style?.color;
        const style = {
            fontWeight: isBold ? 'bold' : undefined,
            fontStyle: isItalic ? 'italic' : undefined,
            textDecoration: isUnderline ? 'underline' : isStrike ? 'line-through' : undefined,
            fontSize: fontSize ? `${fontSize}pt` : undefined,
            color: color ? (color.startsWith('#') ? color : `#${color}`) : undefined,
        };
        return (
            <span key={ri} style={style}>
                {run.text}
            </span>
        );
    });
};


/**
 * Render a single content block.
 * Handles both pages[] blocks (from docxStructuredParser) and blocks[] items.
 */
const renderBlock = (block, idx) => {
    if (!block) return null;

    switch (block.type) {

        // ── Paragraph ──────────────────────────────────────────────────────────
        case 'paragraph': {
            if (!block.text && (!block.runs || block.runs.length === 0)) {
                return <div key={idx} style={{ height: '0.6em' }} />;
            }
            const alignMap = {
                center: 'center', right: 'right',
                justify: 'justify', both: 'justify',
                left: 'left',
            };
            const textAlign = alignMap[block.style?.align] || 'justify';
            const indentCm = block.style?.indentCm || 0;
            const style = {
                ...PARAGRAPH_STYLE,
                textAlign,
                marginLeft: indentCm > 0 ? `${indentCm}cm` : undefined,
            };
            return (
                <p key={idx} style={style}>
                    {block.runs ? renderRuns(block.runs) : (block.text || '')}
                </p>
            );
        }

        // ── Heading ────────────────────────────────────────────────────────────
        case 'heading': {
            const level = Math.min(Math.max(block.level || 2, 1), 4);
            const headStyle = HEADING_STYLES[level] || HEADING_STYLES[2];
            const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
            return (
                <Tag key={idx} style={headStyle}>
                    {block.text || ''}
                </Tag>
            );
        }

        // ── Image ──────────────────────────────────────────────────────────────
        case 'image': {
            // Normalize base64: handle strings with or without the data: prefix
            const rawB64 = block.base64 || '';
            const src = rawB64.startsWith('data:')
                ? rawB64
                : rawB64 ? `data:image/jpeg;base64,${rawB64}` : '';

            if (!src) {
                return (
                    <div key={idx} style={{
                        ...IMAGE_WRAPPER_STYLE,
                        border: '2px dashed #ef4444',
                        padding: '1em',
                        borderRadius: '8px',
                    }}>
                        <span style={{ color: '#ef4444', fontSize: '12pt', fontWeight: 'bold' }}>
                            ⚠️ Gambar tidak tersedia {block.rId ? `(${block.rId})` : ''}
                        </span>
                        {block.metadata?.filename && (
                            <p style={{ ...CAPTION_STYLE, color: '#ef4444' }}>
                                File: {block.metadata.filename}
                            </p>
                        )}
                    </div>
                );
            }
            // Respect original dimensions if available
            const imgStyle = {
                ...IMAGE_STYLE,
                maxWidth: block.widthCm ? `${block.widthCm}cm` : '100%',
            };
            return (
                <figure key={idx} style={IMAGE_WRAPPER_STYLE}>
                    <img
                        src={src}
                        alt={block.caption || 'Gambar laporan'}
                        style={imgStyle}
                        loading="lazy"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            const warn = document.createElement('span');
                            warn.style.color = '#ef4444';
                            warn.textContent = '⚠️ Gagal memuat gambar';
                            e.target.parentElement.appendChild(warn);
                        }}
                    />
                    {block.caption && (
                        <figcaption style={CAPTION_STYLE}>{block.caption}</figcaption>
                    )}
                </figure>
            );
        }


        // ── Table ──────────────────────────────────────────────────────────────
        case 'table': {
            // Support structured rows[] format (from docxStructuredParser)
            if (block.rows && block.rows.length > 0) {
                return (
                    <div key={idx} style={TABLE_WRAPPER_STYLE}>
                        <table style={TABLE_STYLE}>
                            <tbody>
                                {block.rows.map((row, ri) => (
                                    <tr key={ri}>
                                        {row.map((cell, ci) => {
                                            // Skip vContinue cells (rowspan continuation)
                                            if (cell.vContinue) return null;
                                            const isFirst = ri === 0;
                                            const cellStyle = isFirst ? TH_STYLE : {
                                                ...TD_STYLE,
                                                textAlign: cell.align === 'center' ? 'center'
                                                    : cell.align === 'right' ? 'right'
                                                        : 'left',
                                                fontWeight: cell.bold ? 'bold' : undefined,
                                            };
                                            return (
                                                <td
                                                    key={ci}
                                                    style={cellStyle}
                                                    colSpan={cell.colspan || undefined}
                                                    rowSpan={cell.rowspan || undefined}
                                                >
                                                    {cell.runs
                                                        ? renderRuns(cell.runs)
                                                        : (cell.text || '').split('\n').map((line, li) => (
                                                            <React.Fragment key={li}>
                                                                {line}
                                                                {li < cell.text.split('\n').length - 1 && <br />}
                                                            </React.Fragment>
                                                        ))
                                                    }
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }

            // Legacy blocks[] table format with headers[] + rows[]
            const { headers = [], rows = [] } = block;
            return (
                <div key={idx} style={TABLE_WRAPPER_STYLE}>
                    <table style={TABLE_STYLE}>
                        {headers.length > 0 && (
                            <thead>
                                <tr>
                                    {headers.map((h, hi) => (
                                        <th key={hi} style={TH_STYLE}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                        )}
                        <tbody>
                            {rows.map((row, ri) => (
                                <tr key={ri}>
                                    {row.map((cell, ci) => (
                                        <td key={ci} style={TD_STYLE}>
                                            {typeof cell === 'object' ? (cell.text || '') : cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // ── List ───────────────────────────────────────────────────────────────
        case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            const listItems = block.items || [];
            return (
                <Tag key={idx} style={{ margin: '0.3em 0 0.3em 2cm', paddingLeft: '0.5cm' }}>
                    {listItems.map((item, ii) => (
                        <li key={ii} style={{ marginBottom: '2px', fontSize: FONT_SIZE_BODY }}>
                            {typeof item === 'string' ? item : item.text || ''}
                        </li>
                    ))}
                </Tag>
            );
        }

        // ── Page break marker ─────────────────────────────────────────────────
        case 'page_break':
            return <div key={idx} style={{ pageBreakAfter: 'always', height: 0 }} />;

        // ── Divider ───────────────────────────────────────────────────────────
        case 'divider':
            return (
                <hr key={idx} style={{
                    border: 'none',
                    borderTop: '1px solid #000',
                    margin: '0.8em 0',
                }} />
            );

        default:
            return null;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE RENDERER — for pages[] format (docxStructuredParser v3.0 output)
// ═══════════════════════════════════════════════════════════════════════════════

const renderPage = (page, pageIdx, totalPages, showPageNumbers) => {
    const marginStyle = page.margin ? {
        paddingTop: `${page.margin.top || 2.54}cm`,
        paddingRight: `${page.margin.right || 3.18}cm`,
        paddingBottom: `${page.margin.bottom || 2.54}cm`,
        paddingLeft: `${page.margin.left || 3.18}cm`,
    } : {
        padding: '2.54cm 3.18cm',
    };

    const orientation = page.orientation || 'portrait';
    const pageWidth = orientation === 'landscape' ? '29.7cm' : '21cm';
    const pageHeight = orientation === 'landscape' ? '21cm' : '29.7cm';

    const pageStyle = {
        ...PAGE_STYLE,
        ...marginStyle,
        maxWidth: pageWidth,
        minHeight: pageHeight,
        width: pageWidth,
    };

    return (
        <div key={pageIdx} style={pageStyle}>
            {/* Page header text if present */}
            {page.header?.text && (
                <div style={{
                    fontSize: FONT_SIZE_SMALL,
                    fontStyle: 'italic',
                    color: '#888',
                    textAlign: 'right',
                    borderBottom: '1px solid #ddd',
                    paddingBottom: '4px',
                    marginBottom: '0.5em',
                }}>
                    {page.header.text}
                </div>
            )}

            {/* Page content blocks */}
            {(page.content || []).map((block, bi) => renderBlock(block, bi))}

            {/* Page number */}
            {showPageNumbers && (
                <div style={{
                    position: 'absolute',
                    bottom: '1cm',
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontSize: FONT_SIZE_SMALL,
                    color: '#aaa',
                }}>
                    — {pageIdx + 1} / {totalPages} —
                </div>
            )}

            {/* Page footer text if present */}
            {page.footer?.text && (
                <div style={{
                    fontSize: FONT_SIZE_SMALL,
                    color: '#888',
                    textAlign: 'center',
                    borderTop: '1px solid #ddd',
                    paddingTop: '4px',
                    marginTop: '0.5em',
                }}>
                    {page.footer.text}
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ContentBlockRenderer — Main Component
 *
 * Props:
 *   blocks         {Array}   - Legacy content_json.blocks array
 *   pages          {Array}   - Structured JSON pages[] array (takes priority)
 *   structuredJson {Object}  - Full structured_json object (pages[] extracted from here)
 *   preview        {boolean} - If true, shows A4 paper frame (default: true)
 *   showPageNumbers{boolean} - If true, shows page number footer (default: false)
 *   id             {string}  - Optional DOM ID for html2canvas targeting
 */
const ContentBlockRenderer = ({
    blocks = [],
    pages,
    structuredJson,
    preview = true,
    showPageNumbers = false,
    id = 'content-block-renderer',
}) => {
    // Resolve pages[] — structured JSON takes priority over legacy blocks[]
    const resolvedPages = pages || structuredJson?.pages || null;

    // ── Mode A: pages[] format (structured JSON v3.0) ─────────────────────────
    if (resolvedPages && resolvedPages.length > 0) {
        const content = (
            <div id={id}>
                {resolvedPages.map((page, pi) =>
                    renderPage(page, pi, resolvedPages.length, showPageNumbers)
                )}
            </div>
        );

        if (!preview) return content;

        return (
            <div style={PREVIEW_WRAPPER_STYLE}>
                {content}
            </div>
        );
    }

    // ── Mode B: legacy blocks[] format ────────────────────────────────────────
    if (!blocks || blocks.length === 0) {
        return (
            <div style={{ padding: '2em', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                Belum ada konten. Tambahkan teks atau gambar di editor.
            </div>
        );
    }

    const content = (
        <div id={id}>
            {blocks.map((block, idx) => renderBlock(block, idx))}
        </div>
    );

    if (!preview) return content;

    const pageStyle = {
        ...PAGE_STYLE,
        padding: '3cm 3cm 3cm 4cm', // gov left margin 4cm
    };

    return (
        <div style={PREVIEW_WRAPPER_STYLE}>
            <div style={pageStyle}>
                {content}
            </div>
        </div>
    );
};

export default ContentBlockRenderer;
