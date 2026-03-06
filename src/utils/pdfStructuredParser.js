/**
 * pdfStructuredParser.js
 *
 * Parses a PDF file using pdf.js into the same structured pages[] JSON format
 * as docxStructuredParser, enabling uniform rendering and export.
 *
 * Approach:
 *   - Uses pdf.js TextContent API for text with positioning
 *   - Groups text items into rows/columns to detect tables
 *   - Bug4 Fix: renders each page to canvas to capture images as base64 blocks
 *
 * Output: same pages[] JSON format as docxStructuredParser.
 */

/* ── PDF.js loader ─────────────────────────────────────────────────────────── */

let _pdfjsLib = null;
async function getPdfjsLib() {
    if (_pdfjsLib) return _pdfjsLib;

    // Check if already loaded (e.g. via CDN script tag)
    if (typeof window !== 'undefined' && window.pdfjsLib) {
        _pdfjsLib = window.pdfjsLib;
        return _pdfjsLib;
    }

    // Dynamically load pdf.js from CDN
    return new Promise((resolve, reject) => {
        if (document.querySelector('script[data-pdfjs]')) {
            const check = setInterval(() => {
                if (window.pdfjsLib) {
                    clearInterval(check);
                    _pdfjsLib = window.pdfjsLib;
                    resolve(_pdfjsLib);
                }
            }, 100);
            setTimeout(() => { clearInterval(check); reject(new Error('pdf.js load timeout')); }, 15000);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.setAttribute('data-pdfjs', '1');
        script.onload = () => {
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                _pdfjsLib = window.pdfjsLib;
                resolve(_pdfjsLib);
            } else {
                reject(new Error('pdf.js loaded but pdfjsLib not available'));
            }
        };
        script.onerror = () => reject(new Error('pdf.js CDN failed to load'));
        document.head.appendChild(script);
    });
}

/* ── Layout constants ──────────────────────────────────────────────────────── */
// A4 in points: 595.28 x 841.89 pt
const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const PT_TO_CM = 2.54 / 72;

const ptToCm = (pt) => +(pt * PT_TO_CM).toFixed(2);

/* ── Bug4 Fix: Render page to canvas → base64 image ─────────────────────── */

/**
 * Render a pdf.js page object to an off-screen canvas and return a base64
 * data URL (PNG). Scale is capped at 1.5 (equivalent to 108 DPI) so files
 * don't get excessively large.
 *
 * @param {PDFPage} page - pdf.js page object
 * @param {number} [scale=1.5] - rendering scale
 * @returns {Promise<string|null>} base64 data URL or null on failure
 */
async function renderPageToBase64(page, scale = 1.5) {
    try {
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        await page.render({ canvasContext: ctx, viewport }).promise;
        // Use JPEG at 0.88 quality to balance size vs. fidelity
        return canvas.toDataURL('image/jpeg', 0.88);
    } catch (err) {
        console.warn('[pdfStructuredParser] renderPageToBase64 error:', err.message);
        return null;
    }
}

/* ── Table detection ───────────────────────────────────────────────────────── */

/**
 * Group text items into potential table rows based on y-coordinate proximity.
 * Items within Y_THRESHOLD points of each other are considered the same row.
 */
function detectTables(textItems, pageHeight) {
    const Y_THRESH = 4;   // pt — vertical tolerance for same-row grouping
    const COL_THRESH = 10;  // pt — horizontal tolerance for column alignment

    if (textItems.length < 4) return { tables: [], paragraphs: textItems };

    // Sort by y (bottom of page = 0 in PDF coords, so invert)
    const sorted = [...textItems].sort((a, b) => {
        const ay = pageHeight - a.transform[5];
        const by = pageHeight - b.transform[5];
        return ay - by || a.transform[4] - b.transform[4];
    });

    // Group into rows by Y proximity
    const rows = [];
    let currentRow = [sorted[0]];
    let currentY = pageHeight - sorted[0].transform[5];

    for (let i = 1; i < sorted.length; i++) {
        const item = sorted[i];
        const y = pageHeight - item.transform[5];
        if (Math.abs(y - currentY) <= Y_THRESH) {
            currentRow.push(item);
        } else {
            rows.push({ y: currentY, items: currentRow });
            currentRow = [item];
            currentY = y;
        }
    }
    rows.push({ y: currentY, items: currentRow });

    // Detect table: 3+ consecutive rows each with 2+ columns
    const tables = [];
    const paraItems = [];
    let inTable = false;
    let tableStart = -1;

    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (row.items.length >= 2) {
            if (!inTable) { inTable = true; tableStart = r; }
        } else {
            if (inTable && r - tableStart >= 2) {
                // It's a table: rows[tableStart..r-1]
                tables.push(rows.slice(tableStart, r));
            } else if (inTable) {
                // Too short — treat as paragraphs
                rows.slice(tableStart, r).forEach(tr =>
                    tr.items.forEach(ti => paraItems.push(ti))
                );
            }
            inTable = false;
            row.items.forEach(ti => paraItems.push(ti));
        }
    }
    if (inTable) {
        if (rows.length - tableStart >= 2) {
            tables.push(rows.slice(tableStart));
        } else {
            rows.slice(tableStart).forEach(tr =>
                tr.items.forEach(ti => paraItems.push(ti))
            );
        }
    }

    return { tables, paragraphs: paraItems };
}

/**
 * Convert a detected table (array of row groups) → structured table block.
 */
function tableRowsToBlock(tableRows) {
    const rows = tableRows.map(row => {
        // Sort row items left to right
        const cells = row.items
            .sort((a, b) => a.transform[4] - b.transform[4])
            .map(item => ({
                text: item.str.trim(),
                align: 'left',
            }));
        return cells;
    });
    return { type: 'table', rows, fromPdf: true };
}

/* ── Text grouper → paragraph blocks ─────────────────────────────────────── */

function textItemsToBlocks(items, pageHeight) {
    if (!items.length) return [];
    const LINE_GAP = 15; // pt threshold for paragraph break

    const sorted = [...items].sort((a, b) => {
        const ay = pageHeight - a.transform[5];
        const by = pageHeight - b.transform[5];
        return ay - by || a.transform[4] - b.transform[4];
    });

    const blocks = [];
    let currentLine = [sorted[0]];
    let currentY = pageHeight - sorted[0].transform[5];

    const flush = () => {
        if (!currentLine.length) return;
        const text = currentLine.map(i => i.str).join('').trim();
        if (text) {
            const fontSize = currentLine[0].height || 12;
            blocks.push({
                type: fontSize > 14 ? 'heading' : 'paragraph',
                level: fontSize > 18 ? 1 : fontSize > 14 ? 2 : undefined,
                text,
                style: {
                    fontSize: +fontSize.toFixed(1),
                    align: 'left',
                },
            });
        }
        currentLine = [];
    };

    for (let i = 1; i < sorted.length; i++) {
        const item = sorted[i];
        const y = pageHeight - item.transform[5];
        if (Math.abs(y - currentY) > LINE_GAP) {
            flush();
            currentY = y;
        }
        currentLine.push(item);
    }
    flush();

    return blocks;
}

/* ── Main entry point ─────────────────────────────────────────────────────── */

/**
 * Parse a PDF File to structured pages[] JSON.
 *
 * Strategy (Bug4 Fix):
 *   1. Text extraction (tables + paragraphs) — as before.
 *   2. Canvas render — each page is rendered at 1.5x scale to an offscreen
 *      canvas. The resulting PNG is included as an image block at the start of
 *      each page's content array so embedded graphics/photos are always visible.
 *
 * @param {File} file
 * @returns {Promise<{ version: '3.0', pages: Array, error: string|null, warnings: string[] }>}
 */
export async function parsePdfStructured(file) {
    const warnings = [];
    try {
        const pdfjs = await getPdfjsLib();
        const arrayBuf = await file.arrayBuffer();
        const loadTask = pdfjs.getDocument({ data: arrayBuf });
        const pdf = await loadTask.promise;

        const numPages = pdf.numPages;
        const pages = [];
        let hasImages = false;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });
            const widthPt = viewport.width;
            const heightPt = viewport.height;
            const isLandscape = widthPt > heightPt;

            // ── Text content ─────────────────────────────────────────────
            const textContent = await page.getTextContent();
            const items = textContent.items.filter(i => i.str.trim());

            const { tables, paragraphs } = detectTables(items, heightPt);

            // Build content array preserving order by y-position
            const tableBlocks = tables.map(t => ({
                block: tableRowsToBlock(t),
                y: t[0]?.y || 0,
            }));
            const paraBlocks = textItemsToBlocks(paragraphs, heightPt).map((b, idx) => ({
                block: b,
                y: idx * 20, // approximate ordering
            }));

            // Merge and sort by y
            const textContentBlocks = [...tableBlocks, ...paraBlocks]
                .sort((a, b) => a.y - b.y)
                .map(x => x.block);

            // ── Bug4 Fix: Canvas render → image block ────────────────────
            // Render the full page as JPEG and prepend as image block.
            // This ensures photos, charts, and other graphics are always
            // visible in the preview and included in DOCX export.
            const pageBase64 = await renderPageToBase64(page, 1.5);
            const content = [];
            if (pageBase64) {
                hasImages = true;
                // widthCm / heightCm at 1.5x scale: same physical size as 1x
                content.push({
                    type: 'image',
                    base64: pageBase64,
                    widthCm: ptToCm(widthPt),
                    heightCm: ptToCm(heightPt),
                    caption: null,
                    fromPdfCanvas: true,
                });
            } else {
                // Canvas render failed — fall back to text only
                warnings.push(`Halaman ${pageNum}: render canvas gagal, tampil teks saja.`);
            }

            // Append text blocks after the page image
            // (keeps them available as structured data for search / export)
            content.push(...textContentBlocks);

            pages.push({
                pageNumber: pageNum,
                orientation: isLandscape ? 'landscape' : 'portrait',
                widthCm: ptToCm(widthPt),
                heightCm: ptToCm(heightPt),
                margin: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
                header: { text: '' },
                footer: { text: '' },
                content,
            });
        }

        return {
            version: '3.0',
            pages,
            error: null,
            warnings,
            metadata: {
                pageCount: pages.length,
                orientation: pages[0]?.orientation || 'portrait',
                hasTables: pages.some(p => p.content.some(c => c.type === 'table')),
                hasImages,
            },
        };
    } catch (err) {
        console.error('[pdfStructuredParser] Error:', err);
        return {
            version: '3.0',
            pages: [],
            error: err.message || 'Gagal mem-parse file PDF.',
            warnings,
            metadata: null,
        };
    }
}
