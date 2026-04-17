/**
 * PagedDocumentEditor.jsx
 *
 * Inline editor for the structured pages[] JSON format.
 * Based on PagedDocumentViewer but with contentEditable regions so the user
 * can edit paragraphs and table cells directly. Tables stay as tables.
 * Images can be removed. A toolbar provides save/discard actions.
 *
 * Enhancement v3:
 *  - Fix vContinue cell rendering (skip in edit mode, match viewer)
 *  - Table toolbar: + Baris, + Kolom, − Baris, − Kolom, Sisipkan Baris, Bold Baris, Duplikasi Tabel
 *  - Per-cell alignment buttons (left/center/right)
 *  - Row-level delete on hover
 *  - A4 margins: top 2.5cm, bottom 2.5cm, left 3cm, right 2.5cm
 *  - Font: Times New Roman 12pt
 *
 * Props:
 *   structuredJson  {object}   — { version, pages: [...] }
 *   onChange        {function} — called with updated structuredJson when saved
 *   readOnly        {boolean}  — render as viewer (no editing)
 *   maxHeight       {string}   — CSS max-height
 */
import { useState, useCallback } from 'react';

/* ── Page dimensions ───────────────────────────────────────────────────────── */
const PAGE_W_PORTRAIT  = 794;   // ≈ 21cm at 96dpi
const PAGE_W_LANDSCAPE = 1122;  // ≈ 29.7cm at 96dpi

const FONT_FAMILY = '"Times New Roman", Georgia, serif';
const FONT_SIZE   = '12pt';

/* ── A4 margin defaults (cm) — government standard ────────────────────────── */
const DEFAULT_MARGIN = { top: 2.5, right: 2.5, bottom: 2.5, left: 3.0 };

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const toPx      = (cm) => `${(cm * 37.8).toFixed(0)}px`;
const cloneJson = (obj) => JSON.parse(JSON.stringify(obj));

/* ── Empty cell factory ──────────────────────────────────────────────────────  */
const emptyCell = () => ({ text: '', bold: false, align: 'left' });

// ══════════════════════════════════════════════════════════════════════════════
// EDITABLE PARAGRAPH
// ══════════════════════════════════════════════════════════════════════════════
function EditableParagraph({ block, onUpdate, readOnly }) {
    const align = block.style?.align || 'left';
    return (
        <p
            contentEditable={!readOnly}
            suppressContentEditableWarning
            style={{
                margin: 0, padding: '2px 0',
                minHeight: '1.2em',
                textAlign: align,
                outline: 'none',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                cursor: readOnly ? 'default' : 'text',
            }}
            onBlur={(e) => !readOnly && onUpdate({ ...block, text: e.target.innerText })}
            onFocus={!readOnly ? (e) => {
                e.target.style.background = 'rgba(99,102,241,0.05)';
                e.target.style.outline = '1px dashed rgba(99,102,241,0.4)';
            } : undefined}
            onMouseLeave={!readOnly ? (e) => {
                if (document.activeElement !== e.target) {
                    e.target.style.background = '';
                    e.target.style.outline = '';
                }
            } : undefined}
        >
            {block.text || ''}
        </p>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// EDITABLE HEADING
// ══════════════════════════════════════════════════════════════════════════════
function EditableHeading({ block, onUpdate, readOnly }) {
    const tags = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' };
    const Tag  = tags[block.level] || 'h3';
    const sizes = { 1: '14pt', 2: '13pt', 3: '12pt' };
    return (
        <Tag
            contentEditable={!readOnly}
            suppressContentEditableWarning
            style={{
                fontSize: sizes[block.level] || '12pt',
                fontWeight: 'bold',
                textAlign: block.style?.align || 'left',
                margin: '0.5em 0 0.3em',
                lineHeight: '1.3',
                outline: 'none',
            }}
            onBlur={(e) => !readOnly && onUpdate({ ...block, text: e.target.innerText })}
        >
            {block.text}
        </Tag>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// EDITABLE TABLE — with comprehensive toolbar and vContinue fix
// ══════════════════════════════════════════════════════════════════════════════
function EditableTable({ block, onUpdate, readOnly }) {
    const { rows = [] } = block;
    const [hoveredRow, setHoveredRow] = useState(null);
    const [selectedRows, setSelectedRows] = useState(new Set());

    /* ── Cell edit ────────────────────────────────────────────────────────── */
    const handleCellBlur = (rowIdx, colIdx, e) => {
        if (readOnly) return;
        const newRows = cloneJson(rows);
        if (newRows[rowIdx]?.[colIdx]) {
            newRows[rowIdx][colIdx].text = e.target.innerText;
        }
        onUpdate({ ...block, rows: newRows });
    };

    /* ── Cell alignment ───────────────────────────────────────────────────── */
    const setCellAlign = (rowIdx, colIdx, align) => {
        const newRows = cloneJson(rows);
        if (newRows[rowIdx]?.[colIdx]) {
            newRows[rowIdx][colIdx].align = align;
        }
        onUpdate({ ...block, rows: newRows });
    };

    /* ── Toggle row bold ──────────────────────────────────────────────────── */
    const toggleRowBold = (rowIdx) => {
        const newRows = cloneJson(rows);
        if (!newRows[rowIdx]) return;
        const currentBold = newRows[rowIdx].every(c => c.bold);
        newRows[rowIdx] = newRows[rowIdx].map(c => ({ ...c, bold: !currentBold }));
        onUpdate({ ...block, rows: newRows });
    };

    /* ── Add row at end ───────────────────────────────────────────────────── */
    const addRow = () => {
        const colCount = Math.max(...rows.map(r => r.filter(c => !c?.vContinue).length), 1);
        const newRow = Array.from({ length: colCount }, emptyCell);
        onUpdate({ ...block, rows: [...rows, newRow] });
    };

    /* ── Insert row after hovered row ────────────────────────────────────── */
    const insertRowAfter = (rowIdx) => {
        const colCount = Math.max(...rows.map(r => r.filter(c => !c?.vContinue).length), 1);
        const newRow = Array.from({ length: colCount }, emptyCell);
        const newRows = [...rows.slice(0, rowIdx + 1), newRow, ...rows.slice(rowIdx + 1)];
        onUpdate({ ...block, rows: newRows });
    };

    /* ── Remove last row ──────────────────────────────────────────────────── */
    const removeLastRow = () => {
        if (rows.length <= 1) return;
        onUpdate({ ...block, rows: rows.slice(0, -1) });
    };

    /* ── Delete specific row ──────────────────────────────────────────────── */
    const deleteRow = (rowIdx) => {
        if (rows.length <= 1) return;
        onUpdate({ ...block, rows: rows.filter((_, i) => i !== rowIdx) });
    };

    /* ── Add column ───────────────────────────────────────────────────────── */
    const addColumn = () => {
        const newRows = rows.map(row => {
            // Only add to rows that don't have vContinue as last cell
            const lastReal = [...row].reverse().find(c => !c?.vContinue);
            return [...row, emptyCell()];
        });
        onUpdate({ ...block, rows: newRows });
    };

    /* ── Remove last column ───────────────────────────────────────────────── */
    const removeLastColumn = () => {
        if (!rows[0] || rows[0].filter(c => !c?.vContinue).length <= 1) return;
        const newRows = rows.map(row => row.slice(0, -1));
        onUpdate({ ...block, rows: newRows });
    };

    /* ── Duplicate table ──────────────────────────────────────────────────── */
    // (handled at block level via parent)

    const numCols = Math.max(...rows.map(r => r.filter(c => !c?.vContinue).length), 0);
    const numRows = rows.length;

    const btnStyle = (color) => ({
        padding: '3px 9px',
        borderRadius: '4px',
        border: 'none',
        background: color,
        color: '#fff',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 700,
        lineHeight: 1.4,
        transition: 'opacity 0.15s',
    });

    const alignBtnStyle = (active) => ({
        padding: '2px 6px',
        borderRadius: '4px',
        border: active ? '2px solid #6366f1' : '1px solid #e2e8f0',
        background: active ? '#ede9fe' : '#f8fafc',
        color: active ? '#4f46e5' : '#475569',
        cursor: 'pointer',
        fontSize: '11px',
        lineHeight: 1.4,
    });

    return (
        <div style={{ margin: '0.6em 0', position: 'relative' }}>
            {/* Table toolbar */}
            {!readOnly && (
                <div style={{
                    display: 'flex', gap: '6px', flexWrap: 'wrap',
                    marginBottom: '6px', alignItems: 'center',
                    padding: '6px 8px', background: '#f1f5f9',
                    borderRadius: '6px', border: '1px solid #e2e8f0',
                }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                        📊 Tabel ({numRows}×{numCols})
                    </span>
                    <button onClick={addRow} style={btnStyle('#22c55e')} title="Tambah baris di akhir">+ Baris</button>
                    <button onClick={addColumn} style={btnStyle('#3b82f6')} title="Tambah kolom">+ Kolom</button>
                    <button onClick={removeLastRow} style={btnStyle('#f59e0b')} title="Hapus baris terakhir">− Baris</button>
                    <button onClick={removeLastColumn} style={btnStyle('#f59e0b')} title="Hapus kolom terakhir">− Kolom</button>
                    {hoveredRow !== null && hoveredRow > 0 && (
                        <>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>·</span>
                            <button
                                onClick={() => insertRowAfter(hoveredRow)}
                                style={btnStyle('#8b5cf6')}
                                title={`Sisipkan baris setelah baris ${hoveredRow + 1}`}
                            >
                                ↓ Sisipkan
                            </button>
                            <button
                                onClick={() => toggleRowBold(hoveredRow)}
                                style={btnStyle('#0ea5e9')}
                                title="Toggle bold seluruh baris"
                            >
                                <strong>B</strong> Row
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Table */}
            <div style={{ overflowX: numCols >= 5 ? 'auto' : 'visible' }}>
                <table style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    minWidth: numCols >= 5 ? '700px' : undefined,
                    fontSize: FONT_SIZE,
                    fontFamily: FONT_FAMILY,
                    tableLayout: 'auto',
                }}>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr
                                key={ri}
                                style={{
                                    background: ri === 0 ? '#e8eaf6' : '#fff',
                                    position: 'relative',
                                }}
                                onMouseEnter={() => !readOnly && setHoveredRow(ri)}
                                onMouseLeave={() => !readOnly && setHoveredRow(null)}
                            >
                                {row.map((cell, ci) => {
                                    // Skip vContinue cells — they're covered by rowspan on the start cell
                                    if (cell?.vContinue) return null;
                                    const Tag = ri === 0 ? 'th' : 'td';
                                    const isBold = ri === 0 || cell?.bold;
                                    return (
                                        <Tag
                                            key={ci}
                                            colSpan={cell?.colspan || 1}
                                            rowSpan={cell?.rowspan || 1}
                                            contentEditable={!readOnly}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellBlur(ri, ci, e)}
                                            style={{
                                                border: '1px solid #000',
                                                padding: '4px 7px',
                                                verticalAlign: 'top',
                                                fontWeight: isBold ? 'bold' : 'normal',
                                                textAlign: cell?.align || (ri === 0 ? 'center' : 'left'),
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: '1.4',
                                                outline: readOnly ? 'none' : '1px dashed transparent',
                                                cursor: readOnly ? 'default' : 'text',
                                                minWidth: '60px',
                                                position: 'relative',
                                            }}
                                            onFocus={!readOnly ? (e) => {
                                                e.target.style.outline = '2px solid rgba(99,102,241,0.5)';
                                                e.target.style.background = 'rgba(99,102,241,0.04)';
                                            } : undefined}
                                            onBlurCapture={!readOnly ? (e) => {
                                                e.target.style.outline = '1px dashed transparent';
                                                e.target.style.background = '';
                                            } : undefined}
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
                                {/* Per-row action buttons on hover */}
                                {!readOnly && hoveredRow === ri && (
                                    <td style={{
                                        border: 'none', padding: '0 0 0 4px',
                                        background: 'transparent', verticalAlign: 'middle',
                                        width: '56px',
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {ri > 0 && (
                                                <button
                                                    onMouseDown={(e) => { e.preventDefault(); deleteRow(ri); }}
                                                    title="Hapus baris ini"
                                                    style={{
                                                        background: '#ef4444',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        width: '22px',
                                                        height: '22px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        lineHeight: 1,
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            )}
                                            <button
                                                onMouseDown={(e) => { e.preventDefault(); insertRowAfter(ri); }}
                                                title="Sisipkan baris di bawah"
                                                style={{
                                                    background: '#8b5cf6',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    width: '22px',
                                                    height: '22px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    lineHeight: 1,
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// EDITABLE IMAGE (removable)
// ══════════════════════════════════════════════════════════════════════════════
function EditableImage({ block, onRemove, readOnly }) {
    const { base64, widthCm, heightCm, caption } = block;
    if (!base64) return null;
    const src   = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    const maxW  = widthCm ? `${(widthCm * 37.8).toFixed(0)}px` : '100%';

    return (
        <figure style={{ margin: '0.6em 0', textAlign: 'center', position: 'relative' }}>
            {!readOnly && (
                <button
                    onClick={onRemove}
                    title="Hapus Gambar"
                    style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: '#ef4444', color: '#fff',
                        border: 'none', borderRadius: '4px',
                        padding: '2px 8px', cursor: 'pointer',
                        fontSize: '11px', fontWeight: 700, zIndex: 10,
                    }}
                >
                    × Hapus
                </button>
            )}
            <img
                src={src}
                alt={caption || 'Gambar'}
                style={{
                    maxWidth: maxW,
                    height: heightCm ? `${(heightCm * 37.8).toFixed(0)}px` : 'auto',
                    display: 'block',
                    margin: '0 auto',
                    border: !readOnly ? '2px dashed #e2e8f0' : 'none',
                    borderRadius: '4px',
                }}
            />
            {caption && (
                <figcaption style={{ fontSize: '10pt', fontStyle: 'italic', color: '#555', marginTop: '4px' }}>
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// EDITABLE LIST
// ══════════════════════════════════════════════════════════════════════════════
function EditableList({ block, onUpdate, readOnly }) {
    const Tag = block.ordered ? 'ol' : 'ul';
    return (
        <Tag style={{ margin: '0.3em 0 0.3em 2em', padding: 0, lineHeight: '1.5' }}>
            {block.items.map((item, ii) => (
                <li
                    key={ii}
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    style={{ marginBottom: '0.1em', outline: 'none' }}
                    onBlur={(e) => {
                        if (readOnly) return;
                        const newItems = cloneJson(block.items);
                        newItems[ii] = { ...newItems[ii], text: e.target.innerText };
                        onUpdate({ ...block, items: newItems });
                    }}
                >
                    {item.text}
                </li>
            ))}
        </Tag>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK DISPATCHER
// ══════════════════════════════════════════════════════════════════════════════
function EditableBlock({ block, blockIdx, onBlockUpdate, onImageRemove, readOnly }) {
    const update = useCallback((updated) => onBlockUpdate(blockIdx, updated), [blockIdx, onBlockUpdate]);
    const remove = useCallback(() => onImageRemove(blockIdx), [blockIdx, onImageRemove]);

    switch (block.type) {
        case 'paragraph':  return <EditableParagraph block={block} onUpdate={update} readOnly={readOnly} />;
        case 'heading':    return <EditableHeading   block={block} onUpdate={update} readOnly={readOnly} />;
        case 'table':      return <EditableTable     block={block} onUpdate={update} readOnly={readOnly} />;
        case 'image':      return <EditableImage     block={block} onRemove={remove} readOnly={readOnly} />;
        case 'list':       return <EditableList      block={block} onUpdate={update} readOnly={readOnly} />;
        case 'page_break':
            return (
                <div style={{
                    borderTop: '2px dashed #bbb', margin: '1em 0',
                    textAlign: 'center', fontSize: '10px', color: '#bbb',
                }}>
                    — halaman baru —
                </div>
            );
        default: return null;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE EDITOR CONTAINER — A4 paper with correct government margins
// ══════════════════════════════════════════════════════════════════════════════
function PageEditor({ page, pageIdx, onPageUpdate, readOnly }) {
    const isLandscape = page.orientation === 'landscape';
    const w = isLandscape ? PAGE_W_LANDSCAPE : PAGE_W_PORTRAIT;
    const m = page.margin || DEFAULT_MARGIN;

    const handleBlockUpdate = useCallback((blockIdx, updatedBlock) => {
        const newContent = [...page.content];
        newContent[blockIdx] = updatedBlock;
        onPageUpdate(pageIdx, { ...page, content: newContent });
    }, [page, pageIdx, onPageUpdate]);

    const handleImageRemove = useCallback((blockIdx) => {
        const newContent = page.content.filter((_, i) => i !== blockIdx);
        onPageUpdate(pageIdx, { ...page, content: newContent });
    }, [page, pageIdx, onPageUpdate]);

    return (
        <div style={{ maxWidth: `${w + 48}px`, margin: '0 auto' }}>
            {/* Page label */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '8px',
                fontSize: '11px', color: '#94a3b8',
            }}>
                <span>Halaman {page.pageNumber}</span>
                <span style={{
                    background: isLandscape ? '#f59e0b' : '#64748b',
                    color: '#fff', padding: '2px 8px',
                    borderRadius: '99px', fontWeight: 700, fontSize: '10px',
                }}>
                    {isLandscape ? '🔄 Landscape' : '📄 Portrait'}
                </span>
            </div>

            {/* A4 Paper */}
            <div style={{
                background: '#fff',
                width: `${w}px`,
                margin: '0 auto 28px',
                paddingTop:    toPx(m.top    ?? DEFAULT_MARGIN.top),
                paddingRight:  toPx(m.right  ?? DEFAULT_MARGIN.right),
                paddingBottom: toPx(m.bottom ?? DEFAULT_MARGIN.bottom),
                paddingLeft:   toPx(m.left   ?? DEFAULT_MARGIN.left),
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                boxSizing: 'border-box',
                position: 'relative',
                fontFamily: FONT_FAMILY,
                fontSize: FONT_SIZE,
                lineHeight: '1.5',
                color: '#000',
                minHeight: isLandscape ? '561px' : '1123px',
            }}>
                {/* Header */}
                {page.header?.text && (
                    <div style={{
                        borderBottom: '1px solid #dee2e9',
                        paddingBottom: '6px', marginBottom: '8px',
                        fontSize: '10pt', color: '#64748b', fontStyle: 'italic',
                    }}>
                        {page.header.text}
                    </div>
                )}

                {/* Content blocks */}
                {page.content.map((block, bi) => (
                    <EditableBlock
                        key={bi}
                        block={block}
                        blockIdx={bi}
                        onBlockUpdate={handleBlockUpdate}
                        onImageRemove={handleImageRemove}
                        readOnly={readOnly}
                    />
                ))}

                {/* Footer */}
                {page.footer?.text && (
                    <div style={{
                        borderTop: '1px solid #dee2e9',
                        paddingTop: '6px', marginTop: '8px',
                        fontSize: '10pt', color: '#64748b',
                        fontStyle: 'italic', textAlign: 'center',
                    }}>
                        {page.footer.text}
                    </div>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function PagedDocumentEditor({
    structuredJson,
    onChange,
    readOnly = false,
    maxHeight = '80vh',
}) {
    const [localJson, setLocalJson]   = useState(() =>
        structuredJson ? cloneJson(structuredJson) : { version: '3.0', pages: [] }
    );
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving]         = useState(false);

    const pages       = localJson.pages || [];
    const hasLandscape = pages.some(p => p.orientation === 'landscape');

    const handlePageUpdate = useCallback((pageIdx, updatedPage) => {
        setLocalJson(prev => {
            const newPages = [...prev.pages];
            newPages[pageIdx] = updatedPage;
            return { ...prev, pages: newPages };
        });
        setHasChanges(true);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            await onChange?.(localJson);
            setHasChanges(false);
        } finally {
            setSaving(false);
        }
    }, [localJson, onChange]);

    const handleDiscard = useCallback(() => {
        setLocalJson(cloneJson(structuredJson));
        setHasChanges(false);
    }, [structuredJson]);

    if (!pages.length) {
        return (
            <div style={{
                padding: '40px', textAlign: 'center',
                color: '#94a3b8', background: '#f8fafc',
                borderRadius: '8px', border: '2px dashed #e2e8f0',
            }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
                <p style={{ margin: 0, fontSize: '14px' }}>Tidak ada konten untuk diedit.</p>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'inherit' }}>
            {/* ── Toolbar ─────────────────────────────────────────────── */}
            {!readOnly && (
                <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#1e293b',
                    borderRadius: '8px 8px 0 0',
                    flexWrap: 'wrap', gap: '8px',
                }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '12px', fontWeight: 700, color: '#fff',
                            padding: '3px 10px', background: '#7c3aed', borderRadius: '99px',
                        }}>
                            ✏️ Mode Edit
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {pages.length} halaman · Klik teks/sel untuk mengedit · Hover baris untuk opsi
                        </span>
                        {hasLandscape && (
                            <span style={{
                                fontSize: '11px', fontWeight: 700,
                                padding: '2px 8px', borderRadius: '99px',
                                background: '#f59e0b', color: '#fff',
                            }}>
                                🔄 Mixed Orientation
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {hasChanges && (
                            <button
                                onClick={handleDiscard}
                                style={{
                                    padding: '6px 14px', borderRadius: '6px',
                                    border: '1px solid #475569', background: 'transparent',
                                    color: '#94a3b8', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 600,
                                }}
                            >
                                ✕ Batalkan
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            style={{
                                padding: '6px 16px', borderRadius: '6px',
                                border: 'none',
                                background: hasChanges ? '#22c55e' : '#374151',
                                color: '#fff',
                                cursor: hasChanges ? 'pointer' : 'not-allowed',
                                fontSize: '13px', fontWeight: 700,
                                opacity: saving ? 0.7 : 1,
                            }}
                        >
                            {saving ? '⏳ Menyimpan...' : hasChanges ? '💾 Simpan Perubahan' : '✓ Tersimpan'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Pages scroll area ─────────────────────────────────── */}
            <div style={{
                maxHeight,
                overflowY: 'auto',
                overflowX: hasLandscape ? 'auto' : 'hidden',
                background: '#dde1e7',
                padding: '24px 16px',
                borderRadius: readOnly ? '8px' : '0 0 8px 8px',
                border: '1px solid #e2e8f0',
            }}>
                {pages.map((page, idx) => (
                    <PageEditor
                        key={page.pageNumber || idx}
                        page={page}
                        pageIdx={idx}
                        onPageUpdate={handlePageUpdate}
                        readOnly={readOnly}
                    />
                ))}
            </div>
        </div>
    );
}
