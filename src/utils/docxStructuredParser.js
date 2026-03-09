/**
 * docxStructuredParser.js
 *
 * Parses a .docx (OpenXML) file by reading the XML directly from the ZIP.
 * Outputs a structured `pages[]` JSON format that is the single source of
 * truth for rendering (preview, edit, export).
 *
 * Architecture:
 *   File → ZIP extract → document.xml parse → pages[] JSON
 *
 * Output format:
 * {
 *   version: '3.0',
 *   pages: [{
 *     pageNumber: 1,
 *     orientation: 'portrait' | 'landscape',
 *     margin: { top, right, bottom, left },  // in cm
 *     header: { text, items: [] },
 *     footer: { text, items: [] },
 *     content: [
 *       { type: 'paragraph', text, style: { bold, italic, underline, align, fontSize } },
 *       { type: 'heading', level: 1-6, text, style: {} },
 *       { type: 'table', rows: [[{ text, colspan, rowspan, bold, align }]] },
 *       { type: 'image', base64: 'data:...', widthCm, heightCm, caption },
 *       { type: 'list', ordered: false, items: [{ text, level }] },
 *       { type: 'page_break' },
 *     ]
 *   }]
 * }
 */

/* ── ZIP reader (pure browser, no library) ─────────────────────────────────── */

const TWIPS_PER_CM = 1440 / 2.54;
const twipsToCm = (t) => +(t / TWIPS_PER_CM).toFixed(2);
const emuToCm = (e) => +(e / 914400 * 2.54).toFixed(2);
const halfPtToPt = (hp) => +(hp / 2).toFixed(1);

/**
 * Read a text entry from a DOCX ZIP ArrayBuffer using native browser APIs.
 * Handles both STORED and DEFLATE compressed entries.
 */
async function readZipEntry(buffer, entryName) {
    try {
        const view = new DataView(buffer);
        const dec = new TextDecoder('utf-8');

        // Find End-of-Central-Directory
        let eocd = buffer.byteLength - 22;
        while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
        if (eocd < 0) return null;

        const cdOffset = view.getUint32(eocd + 16, true);
        const cdSize = view.getUint32(eocd + 12, true);

        let pos = cdOffset;
        while (pos < cdOffset + cdSize) {
            if (view.getUint32(pos, true) !== 0x02014b50) break;
            const method = view.getUint16(pos + 10, true);
            const compSz = view.getUint32(pos + 20, true);
            const uncompSz = view.getUint32(pos + 24, true);
            const fnLen = view.getUint16(pos + 28, true);
            const exLen = view.getUint16(pos + 30, true);
            const cmtLen = view.getUint16(pos + 32, true);
            const lhOffset = view.getUint32(pos + 42, true);
            const name = dec.decode(new Uint8Array(buffer, pos + 46, fnLen));
            pos += 46 + fnLen + exLen + cmtLen;

            if (name !== entryName) continue;

            const lhFnLen = view.getUint16(lhOffset + 26, true);
            const lhExLen = view.getUint16(lhOffset + 28, true);
            const start = lhOffset + 30 + lhFnLen + lhExLen;

            if (method === 0) {
                return dec.decode(new Uint8Array(buffer, start, uncompSz));
            }
            if (method === 8 && typeof DecompressionStream !== 'undefined') {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                const reader = ds.readable.getReader();
                writer.write(new Uint8Array(buffer, start, compSz));
                writer.close();
                const chunks = [];
                let total = 0;
                for (; ;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value); total += value.length;
                }
                const out = new Uint8Array(total);
                let off = 0;
                for (const c of chunks) { out.set(c, off); off += c.length; }
                return dec.decode(out);
            }
            return null;
        }
        return null;
    } catch { return null; }
}

/**
 * Read a binary (image) entry from a DOCX ZIP — returns Uint8Array.
 */
async function readZipBinaryEntry(buffer, entryName) {
    try {
        const view = new DataView(buffer);
        const dec = new TextDecoder('utf-8');

        let eocd = buffer.byteLength - 22;
        while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
        if (eocd < 0) return null;

        const cdOffset = view.getUint32(eocd + 16, true);
        const cdSize = view.getUint32(eocd + 12, true);

        let pos = cdOffset;
        while (pos < cdOffset + cdSize) {
            if (view.getUint32(pos, true) !== 0x02014b50) break;
            const method = view.getUint16(pos + 10, true);
            const compSz = view.getUint32(pos + 20, true);
            const uncompSz = view.getUint32(pos + 24, true);
            const fnLen = view.getUint16(pos + 28, true);
            const exLen = view.getUint16(pos + 30, true);
            const cmtLen = view.getUint16(pos + 32, true);
            const lhOffset = view.getUint32(pos + 42, true);
            const name = dec.decode(new Uint8Array(buffer, pos + 46, fnLen));
            pos += 46 + fnLen + exLen + cmtLen;

            if (name !== entryName) continue;

            const lhFnLen = view.getUint16(lhOffset + 26, true);
            const lhExLen = view.getUint16(lhOffset + 28, true);
            const start = lhOffset + 30 + lhFnLen + lhExLen;

            if (method === 0) {
                return new Uint8Array(buffer, start, uncompSz);
            }
            if (method === 8 && typeof DecompressionStream !== 'undefined') {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                const reader = ds.readable.getReader();
                writer.write(new Uint8Array(buffer, start, compSz));
                writer.close();
                const chunks = []; let total = 0;
                for (; ;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value); total += value.length;
                }
                const out = new Uint8Array(total); let off = 0;
                for (const c of chunks) { out.set(c, off); off += c.length; }
                return out;
            }
            return null;
        }
        return null;
    } catch { return null; }
}

/* ── XML helper utilities ──────────────────────────────────────────────────── */

/** Get attribute with w: namespace fallback */
const wAttr = (el, name) =>
    el.getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', name) ||
    el.getAttribute(`w:${name}`) ||
    el.getAttribute(name) || '';

/** Get first descendant element by local name */
const findEl = (parent, localName) => {
    if (!parent) return null;
    const direct = parent.querySelector(localName);
    if (direct) return direct;
    // fallback: getElementsByTagNameNS
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    return parent.getElementsByTagNameNS(ns, localName)[0] || null;
};

/** Get all direct elements with given local name */
const findEls = (parent, localName) => {
    if (!parent) return [];
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    return Array.from(parent.getElementsByTagNameNS(ns, localName)).filter(
        el => el.parentElement === parent
    );
};

/** Get all descendants with given local name */
const findAllEls = (parent, localName) => {
    if (!parent) return [];
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    return Array.from(parent.getElementsByTagNameNS(ns, localName));
};

/** Get text content of a single element by local name */
const elText = (parent, localName) => {
    const el = findEl(parent, localName);
    return el ? el.textContent.trim() : '';
};

/* ── Relationship map builder ─────────────────────────────────────────────── */

async function buildImageRelMap(buffer) {
    const relsXml = await readZipEntry(buffer, 'word/_rels/document.xml.rels');
    if (!relsXml) return {};

    const parser = new DOMParser();
    const doc = parser.parseFromString(relsXml, 'text/xml');
    const rels = doc.querySelectorAll('Relationship');
    const map = {};

    for (const rel of rels) {
        const id = rel.getAttribute('Id') || '';
        const type = rel.getAttribute('Type') || '';
        const target = rel.getAttribute('Target') || '';
        if (type.includes('/image')) {
            map[id] = target.startsWith('..') ? target.replace('..', '') : `word/${target}`;
        }
    }
    return map;
}

/** Convert image bytes + mime → base64 data URL */
function bytesToBase64DataUrl(bytes, mime) {
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    return `data:${mime};base64,${btoa(binary)}`;
}

/* ── Page layout extractor ────────────────────────────────────────────────── */

function extractSectPr(sectPrEl) {
    if (!sectPrEl) return null;
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    const pgSz = sectPrEl.getElementsByTagNameNS(ns, 'pgSz')[0] || sectPrEl.querySelector('pgSz');
    const pgMar = sectPrEl.getElementsByTagNameNS(ns, 'pgMar')[0] || sectPrEl.querySelector('pgMar');

    const getAttr = (el, attr) => {
        if (!el) return '0';
        return el.getAttributeNS(ns, attr) || el.getAttribute(`w:${attr}`) || el.getAttribute(attr) || '0';
    };

    let orientation = 'portrait';
    let widthCm = 21.0;
    let heightCm = 29.7;

    if (pgSz) {
        const orientAttr = getAttr(pgSz, 'orient');
        const wTwips = parseInt(getAttr(pgSz, 'w'), 10);
        const hTwips = parseInt(getAttr(pgSz, 'h'), 10);
        if (wTwips > 0) widthCm = twipsToCm(wTwips);
        if (hTwips > 0) heightCm = twipsToCm(hTwips);
        if (orientAttr === 'landscape') orientation = 'landscape';
        else if (orientAttr === 'portrait') orientation = 'portrait';
        else if (wTwips > hTwips) orientation = 'landscape';
    }

    const margin = {
        top: twipsToCm(parseInt(getAttr(pgMar, 'top'), 10) || 1440),
        right: twipsToCm(parseInt(getAttr(pgMar, 'right'), 10) || 1800),
        bottom: twipsToCm(parseInt(getAttr(pgMar, 'bottom'), 10) || 1440),
        left: twipsToCm(parseInt(getAttr(pgMar, 'left'), 10) || 1800),
    };

    // Header/footer distance
    const headerDist = twipsToCm(parseInt(getAttr(pgMar, 'header'), 10) || 720);
    const footerDist = twipsToCm(parseInt(getAttr(pgMar, 'footer'), 10) || 720);

    return { orientation, widthCm, heightCm, margin, headerDist, footerDist };
}

/* ── Run / paragraph style extractor ─────────────────────────────────────── */

function extractRunStyle(rEl) {
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const rPr = rEl.getElementsByTagNameNS(ns, 'rPr')[0];
    if (!rPr) return {};

    const has = (tag) => rPr.getElementsByTagNameNS(ns, tag).length > 0;
    const szEl = rPr.getElementsByTagNameNS(ns, 'sz')[0];
    const colorEl = rPr.getElementsByTagNameNS(ns, 'color')[0];
    const fontEl = rPr.getElementsByTagNameNS(ns, 'rFonts')[0];

    return {
        bold: has('b'),
        italic: has('i'),
        underline: has('u'),
        strike: has('strike') || has('dstrike'),
        fontSize: szEl ? halfPtToPt(parseInt(szEl.getAttribute('w:val') || szEl.getAttribute('val') || '24', 10)) : null,
        color: colorEl ? (colorEl.getAttribute('w:val') || colorEl.getAttribute('val') || null) : null,
        font: fontEl ? (fontEl.getAttribute('w:ascii') || fontEl.getAttribute('ascii') || null) : null,
    };
}

function extractParaStyle(pEl) {
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const pPr = pEl.getElementsByTagNameNS(ns, 'pPr')[0];
    if (!pPr) return { align: 'left', styleId: null, numPr: null, indentCm: 0 };

    const jcEl = pPr.getElementsByTagNameNS(ns, 'jc')[0];
    const pStyle = pPr.getElementsByTagNameNS(ns, 'pStyle')[0];
    const numPr = pPr.getElementsByTagNameNS(ns, 'numPr')[0];
    const indEl = pPr.getElementsByTagNameNS(ns, 'ind')[0];

    const align = jcEl
        ? (jcEl.getAttribute('w:val') || jcEl.getAttribute('val') || 'left')
        : 'left';

    const styleId = pStyle
        ? (pStyle.getAttribute('w:val') || pStyle.getAttribute('val') || null)
        : null;

    let numPrData = null;
    if (numPr) {
        const ilvl = numPr.getElementsByTagNameNS(ns, 'ilvl')[0];
        const numId = numPr.getElementsByTagNameNS(ns, 'numId')[0];
        numPrData = {
            level: parseInt(ilvl?.getAttribute('w:val') || ilvl?.getAttribute('val') || '0', 10),
            numId: numId?.getAttribute('w:val') || numId?.getAttribute('val') || '1',
        };
    }

    const leftTwips = parseInt(
        indEl?.getAttribute('w:left') || indEl?.getAttribute('left') || '0', 10
    );

    return {
        align: align === 'both' ? 'justify' : align,
        styleId,
        numPr: numPrData,
        indentCm: twipsToCm(leftTwips),
    };
}

/** Detect heading level from styleId */
function headingLevel(styleId) {
    if (!styleId) return 0;
    const lower = styleId.toLowerCase();
    if (lower.startsWith('heading')) {
        const n = parseInt(lower.replace(/\D/g, ''), 10);
        return isNaN(n) ? 0 : n;
    }
    if (lower === 'title') return 1;
    if (lower === 'subtitle') return 2;
    // Indonesian government style names
    if (lower.includes('judul bab') || lower.includes('judulbab')) return 1;
    if (lower.includes('sub judul') || lower.includes('subjudul')) return 2;
    return 0;
}

/* ── Run text extractor ───────────────────────────────────────────────────── */

function extractRunText(rEl) {
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const tEl = rEl.getElementsByTagNameNS(ns, 't')[0];
    if (!tEl) {
        // Check for tab or break
        if (rEl.getElementsByTagNameNS(ns, 'tab').length > 0) return '\t';
        if (rEl.getElementsByTagNameNS(ns, 'br').length > 0) return '\n';
        return '';
    }
    return tEl.textContent;
}

/* ── Paragraph parser ─────────────────────────────────────────────────────── */

function parseParagraph(pEl, imageRelMap, buffer) {
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const pStyle = extractParaStyle(pEl);
    const level = headingLevel(pStyle.styleId);

    const runs = pEl.getElementsByTagNameNS(ns, 'r');
    const drawingEl = pEl.getElementsByTagNameNS(ns, 'drawing')[0];
    const pict = pEl.getElementsByTagNameNS(ns, 'pict')[0];

    // ── Image in paragraph? ────────────────────────────────────────────────
    if (drawingEl || pict) {
        return { type: '__image_para__', drawingEl: drawingEl || pict, pStyle };
    }

    // ── Check for page break ───────────────────────────────────────────────
    const allBr = pEl.getElementsByTagNameNS(ns, 'br');
    for (const br of allBr) {
        const brType = br.getAttribute('w:type') || br.getAttribute('type') || '';
        if (brType === 'page') return { type: 'page_break' };
    }

    // ── Collect text from runs ─────────────────────────────────────────────
    let fullText = '';
    const runStyles = [];
    let hasInlineStyle = false;

    for (const r of runs) {
        const txt = extractRunText(r);
        const style = extractRunStyle(r);
        fullText += txt;
        if (txt) {
            runStyles.push({ text: txt, style });
            if (style.bold || style.italic || style.underline || style.fontSize) {
                hasInlineStyle = true;
            }
        }
    }

    // Empty paragraph → spacing marker
    if (!fullText.trim()) {
        return { type: 'paragraph', text: '', style: pStyle, isEmpty: true };
    }

    if (level > 0) {
        return {
            type: 'heading',
            level,
            text: fullText.trim(),
            style: { align: pStyle.align, styleId: pStyle.styleId },
        };
    }

    // List paragraph
    if (pStyle.numPr) {
        return {
            type: 'list_item',
            text: fullText.trim(),
            level: pStyle.numPr.level,
            numId: pStyle.numPr.numId,
            ordered: null, // resolved later
            style: pStyle,
            runs: hasInlineStyle ? runStyles : undefined,
        };
    }

    return {
        type: 'paragraph',
        text: fullText.trim(),
        style: pStyle,
        runs: hasInlineStyle ? runStyles : undefined,
    };
}

/* ── Table parser ─────────────────────────────────────────────────────────── */

/**
 * Parse a <w:tbl> element into a structured table block.
 * Preserves:
 *   - Column widths (w:tblGrid -> w:gridCol)
 *   - colspan (gridSpan)
 *   - vMerge / vContinue (rowspan tracking)
 *   - Per-cell rich-text runs (bold, italic, underline)
 *   - Paragraph alignment per cell
 */
function parseTable(tblEl) {
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const rows = tblEl.getElementsByTagNameNS(ns, 'tr');
    const tableRows = [];

    // ── Extract column widths (w:tblGrid) ──────────────────────────────────
    let colWidths = [];
    const tblGrid = tblEl.getElementsByTagNameNS(ns, 'tblGrid')[0];
    if (tblGrid) {
        const gridCols = tblGrid.getElementsByTagNameNS(ns, 'gridCol');
        for (const gc of gridCols) {
            const wVal = gc.getAttribute('w:w') || gc.getAttribute('w');
            const parsedW = parseInt(wVal || '0', 10);
            colWidths.push(isNaN(parsedW) ? 0 : parsedW);
        }
    }
    // Convert absolute twips to percentages if valid
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
    if (totalWidth > 0) {
        // e.g., if one col is 1500 and total is 3000, it's 50%
        colWidths = colWidths.map(w => Math.round((w / totalWidth) * 100));
    } else {
        colWidths = []; // Fallback to auto if no valid data
    }

    // Track rowspan counts per column index for vMerge
    // columnRowspanRemaining[colIndex] = remaining rows this col spans
    const columnRowspanRemaining = {};

    for (const tr of rows) {
        const cells = tr.getElementsByTagNameNS(ns, 'tc');
        const rowData = [];
        let colIdx = 0;

        for (const tc of cells) {
            // Skip columns that are still in a rowspan
            while (columnRowspanRemaining[colIdx] > 1) {
                columnRowspanRemaining[colIdx]--;
                rowData.push({ text: '', vContinue: true, _skipped: true });
                colIdx++;
            }

            // Get colspan from tcPr → gridSpan
            const tcPr = tc.getElementsByTagNameNS(ns, 'tcPr')[0];
            const gridSpan = tcPr?.getElementsByTagNameNS(ns, 'gridSpan')[0];
            const colSpan = parseInt(
                gridSpan?.getAttribute('w:val') || gridSpan?.getAttribute('val') || '1', 10
            );

            // vMerge for rowspan: 'restart' = first cell; no-val = continuation
            const vMerge = tcPr?.getElementsByTagNameNS(ns, 'vMerge')[0];
            const vMergeVal = vMerge?.getAttribute('w:val') || vMerge?.getAttribute('val') || '';
            const isVStart = vMerge && vMergeVal === 'restart';
            const isVContinue = vMerge && vMergeVal !== 'restart';

            // Collect rich-text runs (preserves bold/italic/underline per run)
            const cellParas = tc.getElementsByTagNameNS(ns, 'p');
            const cellLines = [];
            const richRuns = [];   // [{text, bold, italic, underline}]
            let isBold = false;
            let align = 'left';
            let hasRichText = false;

            for (const cp of cellParas) {
                const pStyle = extractParaStyle(cp);
                align = pStyle.align;
                const runs = cp.getElementsByTagNameNS(ns, 'r');
                let lineText = '';

                for (const r of runs) {
                    const txt = extractRunText(r);
                    const rStyle = extractRunStyle(r);
                    if (txt) {
                        lineText += txt;
                        const hasStyle = rStyle.bold || rStyle.italic || rStyle.underline;
                        richRuns.push({ text: txt, ...rStyle });
                        if (hasStyle) hasRichText = true;
                        if (rStyle.bold) isBold = true;
                    }
                }
                if (lineText.trim()) cellLines.push(lineText.trim());
            }

            rowData.push({
                text: cellLines.join('\n'),
                colspan: colSpan > 1 ? colSpan : undefined,
                vContinue: isVContinue || undefined,
                bold: isBold || undefined,
                align: align,
                // Rich-text runs preserved for WYSIWYG fidelity
                runs: hasRichText ? richRuns : undefined,
            });

            // Advance column index by colspan
            colIdx += colSpan;
        }

        if (rowData.length > 0) tableRows.push(rowData);
    }

    // Compute actual rowspan values by scanning vMerge restart → continuation
    // (Post-process: count how many rows each vMerge=restart cell spans)
    for (let ri = 0; ri < tableRows.length; ri++) {
        for (let ci = 0; ci < tableRows[ri].length; ci++) {
            const cell = tableRows[ri][ci];
            if (!cell.vContinue && !cell._skipped) {
                // Check if rows below continue this column
                let span = 1;
                for (let rj = ri + 1; rj < tableRows.length; rj++) {
                    if (tableRows[rj][ci]?.vContinue) span++;
                    else break;
                }
                if (span > 1) cell.rowspan = span;
            }
            delete cell._skipped;
        }
    }

    const tableResult = { type: 'table', rows: tableRows };
    if (colWidths.length > 0) tableResult.colWidths = colWidths;

    return tableResult;
}

/* ── Image extractor from drawing element ─────────────────────────────────── */

/**
 * Extract an image from a <w:drawing> or <w:pict> (VML) element.
 * Supports:
 *   - Modern DrawingML (a:blip r:embed) — most DOCX files
 *   - Legacy VML (v:imagedata r:id) — older Word .doc / .docx
 */
async function extractImage(drawingEl, imageRelMap, buffer) {
    try {
        const blipNs = 'http://schemas.openxmlformats.org/drawingml/2006/main';
        const relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
        const wpNs = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
        const picNs = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
        const vNs = 'urn:schemas-microsoft-com:vml';

        let rId = null;
        let widthEmu = 0;
        let heightEmu = 0;

        // ── Method 1: Modern DrawingML (standard) ───────────────────────────
        const extent = drawingEl.getElementsByTagNameNS(wpNs, 'extent')[0] ||
            drawingEl.querySelector('extent');
        if (extent) {
            widthEmu = parseInt(extent.getAttribute('cx') || '0', 10);
            heightEmu = parseInt(extent.getAttribute('cy') || '0', 10);
        }

        const blipFill = drawingEl.getElementsByTagNameNS(picNs, 'blipFill')[0] ||
            drawingEl.getElementsByTagNameNS(blipNs, 'blipFill')[0] ||
            drawingEl.querySelector('blipFill');
        const blip = blipFill?.getElementsByTagNameNS(blipNs, 'blip')[0] ||
            blipFill?.querySelector('blip') ||
            drawingEl.querySelector('blip');

        if (blip) {
            rId = blip.getAttributeNS(relNs, 'embed') ||
                blip.getAttribute('r:embed') ||
                blip.getAttribute('embed');
        }

        // ── Method 2: Legacy VML <v:imagedata> fallback ─────────────────────
        if (!rId) {
            const imageData = drawingEl.getElementsByTagNameNS(vNs, 'imagedata')[0] ||
                drawingEl.querySelector('v\\:imagedata, imagedata');
            if (imageData) {
                rId = imageData.getAttributeNS(relNs, 'id') ||
                    imageData.getAttribute('r:id') ||
                    imageData.getAttribute('id');
                // VML size is in CSS units (style attribute)
                const styleAttr = imageData.closest('v\\:shape, shape')?.getAttribute('style') || '';
                const wMatch = styleAttr.match(/width:(\d+(?:\.\d+)?)pt/);
                const hMatch = styleAttr.match(/height:(\d+(?:\.\d+)?)pt/);
                if (wMatch) widthEmu = Math.round(parseFloat(wMatch[1]) * 12700);
                if (hMatch) heightEmu = Math.round(parseFloat(hMatch[1]) * 12700);
            }
        }

        // ── Method 3: Any blip anywhere in the element ──────────────────────
        if (!rId) {
            const anyBlip = drawingEl.querySelector('[r\\:embed]') ||
                Array.from(drawingEl.querySelectorAll('*')).find(el =>
                    el.getAttributeNS(relNs, 'embed') ||
                    el.getAttribute('r:embed')
                );
            if (anyBlip) {
                rId = anyBlip.getAttributeNS(relNs, 'embed') || anyBlip.getAttribute('r:embed');
            }
        }

        if (!rId || !imageRelMap[rId]) return null;

        const imgPath = imageRelMap[rId].replace(/^\//, '');
        const imgBytes = await readZipBinaryEntry(buffer, imgPath);
        if (!imgBytes) return null;

        // Determine mime type from extension
        const ext = imgPath.split('.').pop().toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
            : ext === 'png' ? 'image/png'
                : ext === 'gif' ? 'image/gif'
                    : ext === 'webp' ? 'image/webp'
                        : ext === 'bmp' ? 'image/bmp'
                            : ext === 'svg' ? 'image/svg+xml'
                                : 'image/png';

        const base64 = bytesToBase64DataUrl(imgBytes, mime);

        return {
            type: 'image',
            base64,
            widthCm: widthEmu > 0 ? emuToCm(widthEmu) : null,
            heightCm: heightEmu > 0 ? emuToCm(heightEmu) : null,
            rId,
        };
    } catch (err) {
        console.warn('[docxStructuredParser] Image extract error:', err.message);
        return null;
    }
}

/* ── List grouper ─────────────────────────────────────────────────────────── */

/**
 * Takes a flat array of content items and groups consecutive list_item
 * entries into list blocks.
 */
function groupListItems(items) {
    const result = [];
    let i = 0;
    while (i < items.length) {
        const item = items[i];
        if (item.type === 'list_item') {
            // Heuristic: if numId looks like a number, treat as ordered
            // (without numbering XML we can't be certain — default unordered)
            const listBlock = {
                type: 'list',
                ordered: false,
                items: [],
            };
            while (i < items.length && items[i].type === 'list_item') {
                listBlock.items.push({
                    text: items[i].text,
                    level: items[i].level || 0,
                    style: items[i].style,
                });
                i++;
            }
            result.push(listBlock);
        } else {
            result.push(item);
            i++;
        }
    }
    return result;
}

/* ── Header / Footer extractor ────────────────────────────────────────────── */

async function extractHeaderFooter(buffer, type = 'header') {
    // Headers: word/header1.xml, word/header2.xml, etc.
    for (let n = 1; n <= 3; n++) {
        const xml = await readZipEntry(buffer, `word/${type}${n}.xml`);
        if (!xml) continue;
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const texts = Array.from(doc.getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't'
        )).map(el => el.textContent).join('');
        if (texts.trim()) return { text: texts.trim() };
    }
    return { text: '' };
}

/* ── Main entry point ─────────────────────────────────────────────────────── */

/**
 * Parse a .docx File to structured pages[] JSON.
 *
 * @param {File} file
 * @returns {Promise<{
 *   version: '3.0',
 *   pages: Array,
 *   error: string|null,
 *   warnings: string[]
 * }>}
 */
export async function parseDocxStructured(file) {
    const warnings = [];
    try {
        const buffer = await file.arrayBuffer();
        const docXml = await readZipEntry(buffer, 'word/document.xml');
        if (!docXml) throw new Error('word/document.xml tidak ditemukan dalam file DOCX.');

        const imageRelMap = await buildImageRelMap(buffer);
        const headerInfo = await extractHeaderFooter(buffer, 'header');
        const footerInfo = await extractHeaderFooter(buffer, 'footer');

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXml, 'text/xml');
        const bodyEl = xmlDoc.getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'body'
        )[0] || xmlDoc.querySelector('body');

        if (!bodyEl) throw new Error('Body element tidak ditemukan dalam document.xml.');

        // Extract global sectPr (last child of body)
        const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        const allSectPr = bodyEl.getElementsByTagNameNS(ns, 'sectPr');
        const globalSectPr = allSectPr[allSectPr.length - 1] || null;
        const defaultLayout = extractSectPr(globalSectPr) || {
            orientation: 'portrait',
            widthCm: 21.0,
            heightCm: 29.7,
            margin: { top: 2.54, right: 3.18, bottom: 2.54, left: 3.18 },
            headerDist: 1.25,
            footerDist: 1.25,
        };

        // ── Walk body children ─────────────────────────────────────────────
        const children = Array.from(bodyEl.children);
        const pages = [];
        let currentPage = {
            pageNumber: 1,
            orientation: defaultLayout.orientation,
            widthCm: defaultLayout.widthCm,
            heightCm: defaultLayout.heightCm,
            margin: { ...defaultLayout.margin },
            headerDist: defaultLayout.headerDist,
            footerDist: defaultLayout.footerDist,
            header: headerInfo,
            footer: footerInfo,
            content: [],
        };

        for (const child of children) {
            const localName = child.localName || child.tagName?.split(':').pop() || '';

            // ── Table ──────────────────────────────────────────────────────
            if (localName === 'tbl') {
                currentPage.content.push(parseTable(child));
                continue;
            }

            // ── Paragraph ─────────────────────────────────────────────────
            if (localName === 'p') {
                // Check for section break INSIDE paragraph pPr
                const pPr = child.getElementsByTagNameNS(ns, 'pPr')[0];
                const sectPr = pPr?.getElementsByTagNameNS(ns, 'sectPr')[0];

                const parsed = parseParagraph(child, imageRelMap, buffer);

                // Image in paragraph
                if (parsed.type === '__image_para__') {
                    const imgEl = parsed.drawingEl;
                    const imgBlock = await extractImage(imgEl, imageRelMap, buffer);
                    if (imgBlock) {
                        currentPage.content.push(imgBlock);
                    } else {
                        warnings.push('Satu gambar tidak dapat diekstrak.');
                    }
                    // End this paragraph, check for section break
                    if (sectPr) {
                        const newLayout = extractSectPr(sectPr);
                        pages.push(currentPage);
                        currentPage = {
                            pageNumber: pages.length + 1,
                            orientation: newLayout?.orientation || defaultLayout.orientation,
                            widthCm: newLayout?.widthCm || defaultLayout.widthCm,
                            heightCm: newLayout?.heightCm || defaultLayout.heightCm,
                            margin: { ...(newLayout?.margin || defaultLayout.margin) },
                            headerDist: newLayout?.headerDist || defaultLayout.headerDist,
                            footerDist: newLayout?.footerDist || defaultLayout.footerDist,
                            header: headerInfo,
                            footer: footerInfo,
                            content: [],
                        };
                    }
                    continue;
                }

                // Page break → start new page
                if (parsed.type === 'page_break') {
                    currentPage.content.push({ type: 'page_break' });
                    pages.push(currentPage);
                    const newLayout = sectPr ? extractSectPr(sectPr) : defaultLayout;
                    currentPage = {
                        pageNumber: pages.length + 1,
                        orientation: newLayout?.orientation || defaultLayout.orientation,
                        widthCm: newLayout?.widthCm || defaultLayout.widthCm,
                        heightCm: newLayout?.heightCm || defaultLayout.heightCm,
                        margin: { ...(newLayout?.margin || defaultLayout.margin) },
                        headerDist: newLayout?.headerDist || defaultLayout.headerDist,
                        footerDist: newLayout?.footerDist || defaultLayout.footerDist,
                        header: headerInfo,
                        footer: footerInfo,
                        content: [],
                    };
                    continue;
                }

                currentPage.content.push(parsed);

                // Section break at end of paragraph → close page
                if (sectPr) {
                    const newLayout = extractSectPr(sectPr);
                    pages.push(currentPage);
                    currentPage = {
                        pageNumber: pages.length + 1,
                        orientation: newLayout?.orientation || defaultLayout.orientation,
                        widthCm: newLayout?.widthCm || defaultLayout.widthCm,
                        heightCm: newLayout?.heightCm || defaultLayout.heightCm,
                        margin: { ...(newLayout?.margin || defaultLayout.margin) },
                        headerDist: newLayout?.headerDist || defaultLayout.headerDist,
                        footerDist: newLayout?.footerDist || defaultLayout.footerDist,
                        header: headerInfo,
                        footer: footerInfo,
                        content: [],
                    };
                }
            }
        }

        // Push the last page if it has content
        if (currentPage.content.length > 0 || pages.length === 0) {
            pages.push(currentPage);
        }

        // Post-process: group list items and clean up empty paragraphs
        for (const page of pages) {
            page.content = groupListItems(page.content);
            // Remove trailing empty paragraphs
            while (
                page.content.length > 0 &&
                page.content[page.content.length - 1]?.isEmpty
            ) {
                page.content.pop();
            }
        }

        return {
            version: '3.0',
            pages,
            error: null,
            warnings,
            metadata: {
                pageCount: pages.length,
                orientation: defaultLayout.orientation,
                widthCm: defaultLayout.widthCm,
                heightCm: defaultLayout.heightCm,
                margin: defaultLayout.margin,
                hasImages: pages.some(p => p.content.some(c => c.type === 'image')),
                hasTables: pages.some(p => p.content.some(c => c.type === 'table')),
                hasHeaders: !!headerInfo.text,
                hasFooters: !!footerInfo.text,
            },
        };

    } catch (err) {
        console.error('[docxStructuredParser] Error:', err);
        return {
            version: '3.0',
            pages: [],
            error: err.message || 'Gagal mem-parse file DOCX.',
            warnings,
            metadata: null,
        };
    }
}
