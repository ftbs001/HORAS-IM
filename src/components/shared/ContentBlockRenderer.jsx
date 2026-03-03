/**
 * ContentBlockRenderer.jsx
 * ──────────────────────────
 * UNIFIED rendering engine for HORAS-IM.
 *
 * WYSIWYG principle: This exact component is used BOTH for:
 *   1. Preview in the application UI
 *   2. As the source-of-truth structure for DOCX/PDF export
 *
 * All gambar dirender dari base64 yang tersimpan di content_json —
 * tidak ada external URL, tidak ada blob URL.
 */

import React from 'react';

// Margin & font constants (matches DOCX export settings)
const PREVIEW_STYLE = {
    fontFamily: '"Times New Roman", serif',
    fontSize: '12pt',
    lineHeight: '1.5',
    color: '#000',
    textAlign: 'justify',
    padding: '3cm 3cm 3cm 4cm',     // top right bottom left (matches gov format)
    background: '#fff',
    maxWidth: '21cm',
    margin: '0 auto',
    minHeight: '29.7cm',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
};

const PARAGRAPH_STYLE = {
    margin: '0 0 0.5em 0',
    textIndent: '1.25cm',
    textAlign: 'justify',
    orphans: 3,
    widows: 3,
};

const HEADING1_STYLE = {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14pt',
    textTransform: 'uppercase',
    margin: '1.5em 0 0.5em',
    pageBreakBefore: 'always',
};

const HEADING2_STYLE = {
    fontWeight: 'bold',
    fontSize: '12pt',
    textAlign: 'left',
    margin: '1em 0 0.3em',
    textIndent: '0',
};

const HEADING3_STYLE = {
    fontWeight: 'bold',
    fontSize: '12pt',
    textAlign: 'left',
    margin: '0.8em 0 0.3em',
    textIndent: '1.25cm',
};

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
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
};

const CAPTION_STYLE = {
    fontSize: '10pt',
    fontStyle: 'italic',
    color: '#555',
    textAlign: 'center',
    margin: '0.3em 0 0',
    textIndent: '0',
};

const TABLE_STYLE = {
    borderCollapse: 'collapse',
    width: '100%',
    margin: '0.5em 0',
};

const TD_STYLE = {
    border: '1px solid #000',
    padding: '4px 8px',
    fontSize: '11pt',
};

/**
 * Render a single content block.
 * @param {Object} block - A block from content_json.blocks
 * @param {number} idx   - Block index (for React key)
 */
const renderBlock = (block, idx) => {
    if (!block) return null;

    switch (block.type) {
        case 'paragraph':
            return (
                <p key={idx} style={PARAGRAPH_STYLE}>
                    {block.text || ''}
                </p>
            );

        case 'heading':
            if (block.level === 1) return <h1 key={idx} style={HEADING1_STYLE}>{block.text}</h1>;
            if (block.level === 2) return <h2 key={idx} style={HEADING2_STYLE}>{block.text}</h2>;
            return <h3 key={idx} style={HEADING3_STYLE}>{block.text}</h3>;

        case 'image':
            if (!block.base64) {
                // Placeholder for missing images — visible in preview to alert author
                return (
                    <div key={idx} style={{ ...IMAGE_WRAPPER_STYLE, border: '2px dashed #ef4444', padding: '1em', borderRadius: '8px' }}>
                        <span style={{ color: '#ef4444', fontSize: '12pt', fontWeight: 'bold' }}>
                            ⚠️ Gambar tidak tersedia (ID: {block.id || 'unknown'})
                        </span>
                        {block.metadata?.filename && (
                            <p style={{ ...CAPTION_STYLE, color: '#ef4444' }}>File: {block.metadata.filename}</p>
                        )}
                    </div>
                );
            }
            return (
                <figure key={idx} style={IMAGE_WRAPPER_STYLE}>
                    <img
                        src={block.base64}
                        alt={block.caption || block.metadata?.filename || 'Gambar laporan'}
                        style={IMAGE_STYLE}
                        loading="lazy"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.style.border = '2px dashed #ef4444';
                        }}
                    />
                    {block.caption && (
                        <figcaption style={CAPTION_STYLE}>
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            );

        case 'table': {
            const { headers = [], rows = [] } = block;
            return (
                <table key={idx} style={TABLE_STYLE}>
                    {headers.length > 0 && (
                        <thead>
                            <tr>
                                {headers.map((h, hi) => (
                                    <th key={hi} style={{ ...TD_STYLE, fontWeight: 'bold', background: '#f8fafc', textAlign: 'center' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri}>
                                {row.map((cell, ci) => (
                                    <td key={ci} style={TD_STYLE}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
                <Tag key={idx} style={{ margin: '0.3em 0 0.3em 2cm', paddingLeft: '0.5cm' }}>
                    {(block.items || []).map((item, ii) => (
                        <li key={ii} style={{ marginBottom: '2px', fontSize: '12pt' }}>{item}</li>
                    ))}
                </Tag>
            );
        }

        case 'page_break':
            return <div key={idx} style={{ pageBreakAfter: 'always', height: 0 }} />;

        case 'divider':
            return <hr key={idx} style={{ border: 'none', borderTop: '1px solid #000', margin: '0.8em 0' }} />;

        default:
            return null;
    }
};

/**
 * ContentBlockRenderer — Main Component
 *
 * Props:
 *   blocks     {Array}   - content_json.blocks array
 *   preview    {boolean} - If true, shows A4 paper frame (default: true)
 *   id         {string}  - Optional DOM ID for html2canvas targeting
 */
const ContentBlockRenderer = ({ blocks = [], preview = true, id = 'content-block-renderer' }) => {
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

    return (
        <div style={{ background: '#f1f5f9', padding: '2em', minHeight: '100%' }}>
            <div style={PREVIEW_STYLE}>
                {content}
            </div>
        </div>
    );
};

export default ContentBlockRenderer;
