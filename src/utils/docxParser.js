/**
 * docxParser.js — DOCX Fidelity Engine Core
 *
 * Parses a .docx file using mammoth.js (OpenXML → HTML) with style preservation.
 *
 * STYLE LOCK rules (enforced):
 *   - ignoreEmptyParagraphs: false  → preserve blank lines
 *   - Inline images embedded as base64 <img> (no external refs lost)
 *   - All heading levels mapped to semantic HTML (h1–h6)
 *   - Tables preserved with full structure (including multi-column)
 *   - Bold, italic, underline, strikethrough preserved
 *   - Bullet lists and numbered lists preserved
 *   - No auto-typography conversion
 *   - No spacing normalization
 *   - Page orientation (landscape/portrait) extracted from XML
 */

// Lazy-load mammoth to avoid bloating initial bundle
const getMammoth = () => import('mammoth/mammoth.browser.min');

/* ── Mammoth style map ───────────────────────────────────────────────────────
   Maps Word paragraph styles → HTML classes for precise CSS targeting.
   Unknown styles fall through to plain <p class="docx-normal">.
──────────────────────────────────────────────────────────────────────────── */
const STYLE_MAP = [
    // Headings
    "p[style-name='Heading 1'] => h1.docx-h1:fresh",
    "p[style-name='Heading 2'] => h2.docx-h2:fresh",
    "p[style-name='Heading 3'] => h3.docx-h3:fresh",
    "p[style-name='Heading 4'] => h4.docx-h4:fresh",
    "p[style-name='Heading 5'] => h5.docx-h5:fresh",
    "p[style-name='Heading 6'] => h6.docx-h6:fresh",
    // Normal / Body
    "p[style-name='Normal'] => p.docx-normal:fresh",
    "p[style-name='Body Text'] => p.docx-body:fresh",
    "p[style-name='Body Text 2'] => p.docx-body2:fresh",
    "p[style-name='Body Text 3'] => p.docx-body3:fresh",
    // TOC entries
    "p[style-name='TOC 1'] => p.docx-toc1:fresh",
    "p[style-name='TOC 2'] => p.docx-toc2:fresh",
    "p[style-name='TOC 3'] => p.docx-toc3:fresh",
    // Block quote / caption
    "p[style-name='Quote'] => blockquote.docx-quote:fresh",
    "p[style-name='Caption'] => p.docx-caption:fresh",
    // List continuation
    "p[style-name='List Paragraph'] => p.docx-list-para:fresh",
    // Character styles
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em",
    "r[style-name='Intense Emphasis'] => em.docx-intense-em",
    "r[style-name='Subtle Reference'] => span.docx-subtle-ref",
    "r[style-name='Intense Reference'] => span.docx-intense-ref",
    // Indonesian government styles (common in Kemenkumham docs)
    "p[style-name='Heading 1 Char'] => h1.docx-h1:fresh",
    "p[style-name='Isi Dokumen'] => p.docx-normal:fresh",
    "p[style-name='Judul BAB'] => h1.docx-h1:fresh",
    "p[style-name='Sub Judul'] => h2.docx-h2:fresh",
];

/* ── Page Layout Extractor ───────────────────────────────────────────────────
   Reads word/document.xml from the DOCX ZIP to extract:
   - Page orientation (portrait/landscape)
   - Page dimensions (width, height in cm)
   - Page margins (top, right, bottom, left in cm)
   Uses DOMParser — no extra library needed.
──────────────────────────────────────────────────────────────────────────── */

/**
 * Twips (twentieths of a point) to centimeters.
 * 1 inch = 1440 twips, 1 inch = 2.54 cm → 1 twip = 2.54/1440 cm
 */
const twipsToCm = (twips) => +(twips * 2.54 / 1440).toFixed(2);

/**
 * Extract page layout info from the DOCX's document.xml.
 * Returns orientation, page size in cm, and margins in cm.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ orientation: 'portrait'|'landscape', widthCm: number, heightCm: number, margins: {top,right,bottom,left} }}
 */
async function extractPageLayout(arrayBuffer) {
    const DEFAULT = {
        orientation: 'portrait',
        widthCm: 21.0,   // A4 width
        heightCm: 29.7,  // A4 height
        margins: { top: 2.54, right: 3.18, bottom: 2.54, left: 3.18 },
    };

    try {
        // Read central directory from ZIP to find word/document.xml
        const docXml = await extractZipEntry(arrayBuffer, 'word/document.xml');
        if (!docXml) return DEFAULT;

        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXml, 'text/xml');

        // Find <w:pgSz> — page size element
        // Attributes: w:w (width in twips), w:h (height in twips), w:orient ("landscape"|"portrait")
        const pgSz = xmlDoc.querySelector('pgSz') ||
            xmlDoc.getElementsByTagNameNS('*', 'pgSz')[0];

        // Find <w:pgMar> — page margin element
        const pgMar = xmlDoc.querySelector('pgMar') ||
            xmlDoc.getElementsByTagNameNS('*', 'pgMar')[0];

        let orientation = 'portrait';
        let widthCm = 21.0;
        let heightCm = 29.7;
        let margins = { ...DEFAULT.margins };

        if (pgSz) {
            // w:orient attribute is authoritative
            const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
            const orientAttr = pgSz.getAttributeNS(ns, 'orient') ||
                pgSz.getAttribute('w:orient') ||
                pgSz.getAttribute('orient') || '';

            const wAttr = pgSz.getAttributeNS(ns, 'w') ||
                pgSz.getAttribute('w:w') ||
                pgSz.getAttribute('w') || '0';
            const hAttr = pgSz.getAttributeNS(ns, 'h') ||
                pgSz.getAttribute('w:h') ||
                pgSz.getAttribute('h') || '0';

            const wTwips = parseInt(wAttr, 10);
            const hTwips = parseInt(hAttr, 10);

            if (wTwips > 0) widthCm = twipsToCm(wTwips);
            if (hTwips > 0) heightCm = twipsToCm(hTwips);

            // Determine orientation: explicit attribute, or width > height
            if (orientAttr === 'landscape') {
                orientation = 'landscape';
            } else if (orientAttr === 'portrait') {
                orientation = 'portrait';
            } else if (wTwips > hTwips) {
                // No explicit orient — infer from dimensions
                orientation = 'landscape';
            }
        }

        if (pgMar) {
            const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
            const getMargin = (attr) => {
                const val = pgMar.getAttributeNS(ns, attr) ||
                    pgMar.getAttribute(`w:${attr}`) ||
                    pgMar.getAttribute(attr);
                const n = parseInt(val, 10);
                return isNaN(n) ? null : twipsToCm(n);
            };

            margins = {
                top: getMargin('top') ?? DEFAULT.margins.top,
                right: getMargin('right') ?? DEFAULT.margins.right,
                bottom: getMargin('bottom') ?? DEFAULT.margins.bottom,
                left: getMargin('left') ?? DEFAULT.margins.left,
            };
        }

        return { orientation, widthCm, heightCm, margins };

    } catch (err) {
        console.warn('[docxParser] extractPageLayout error:', err.message);
        return DEFAULT;
    }
}

/**
 * Extract a text file entry from a ZIP ArrayBuffer.
 * Uses the minimal ZIP reader approach (no external library).
 *
 * @param {ArrayBuffer} buffer
 * @param {string} entryName — e.g. 'word/document.xml'
 * @returns {Promise<string|null>}
 */
async function extractZipEntry(buffer, entryName) {
    try {
        const view = new DataView(buffer);

        // Find End of Central Directory record
        let eocdOffset = buffer.byteLength - 22;
        while (eocdOffset >= 0) {
            if (view.getUint32(eocdOffset, true) === 0x06054b50) break;
            eocdOffset--;
        }
        if (eocdOffset < 0) return null;

        const cdOffset = view.getUint32(eocdOffset + 16, true);
        const cdSize = view.getUint32(eocdOffset + 12, true);
        const textDec = new TextDecoder('utf-8');

        let pos = cdOffset;
        while (pos < cdOffset + cdSize) {
            const sig = view.getUint32(pos, true);
            if (sig !== 0x02014b50) break;

            const fileNameLen = view.getUint16(pos + 28, true);
            const extraLen = view.getUint16(pos + 30, true);
            const commentLen = view.getUint16(pos + 32, true);
            const localOffset = view.getUint32(pos + 42, true);
            const compMethod = view.getUint16(pos + 10, true);
            const compSize = view.getUint32(pos + 20, true);
            const uncompSize = view.getUint32(pos + 24, true);

            const nameBytes = new Uint8Array(buffer, pos + 46, fileNameLen);
            const name = textDec.decode(nameBytes);
            pos += 46 + fileNameLen + extraLen + commentLen;

            if (name !== entryName) continue;

            // Found — read local file header to get data start
            const localFnLen = view.getUint16(localOffset + 26, true);
            const localExLen = view.getUint16(localOffset + 28, true);
            const dataStart = localOffset + 30 + localFnLen + localExLen;

            if (compMethod === 0) {
                // STORED: no compression
                const slice = buffer.slice(dataStart, dataStart + uncompSize);
                return textDec.decode(new Uint8Array(slice));
            } else if (compMethod === 8) {
                // DEFLATE — use DecompressionStream if available
                if (typeof DecompressionStream !== 'undefined') {
                    const compressed = new Uint8Array(buffer, dataStart, compSize);
                    const ds = new DecompressionStream('deflate-raw');
                    const writer = ds.writable.getWriter();
                    const reader = ds.readable.getReader();
                    writer.write(compressed);
                    writer.close();
                    const chunks = [];
                    let totalLen = 0;
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(value);
                        totalLen += value.length;
                    }
                    const merged = new Uint8Array(totalLen);
                    let off = 0;
                    for (const c of chunks) { merged.set(c, off); off += c.length; }
                    return textDec.decode(merged);
                }
                // Fallback: can't decompress
                return null;
            }
            return null;
        }
        return null;
    } catch {
        return null;
    }
}

/* ── Main parse function ─────────────────────────────────────────────────── */

/**
 * Parse a .docx File object and return fidelity-preserved HTML + metadata.
 *
 * @param {File} file — a .docx File from an <input type="file">
 * @param {object} options
 * @param {boolean} [options.preserveLayout=true] — enable STYLE LOCK mode
 * @returns {Promise<{
 *   html: string,
 *   styleMetadata: object,
 *   warnings: string[],
 *   error: string|null
 * }>}
 */
export async function parseDocxFile(file, { preserveLayout = true } = {}) {
    try {
        const mammoth = await getMammoth();
        const arrayBuffer = await file.arrayBuffer();

        // Extract page layout FIRST (before mammoth consumes the buffer)
        const pageLayout = await extractPageLayout(arrayBuffer);

        const options = {
            styleMap: STYLE_MAP,
            // STYLE LOCK: preserve empty paragraphs (spacing intent)
            ignoreEmptyParagraphs: false,
            // Convert images to base64 inline — never lose embedded images
            convertImage: mammoth.images.imgElement((image) =>
                image.read('base64').then((base64) => ({
                    src: `data:${image.contentType};base64,${base64}`,
                }))
            ),
        };

        const result = await mammoth.convertToHtml({ arrayBuffer }, options);

        const html = result.value;
        const mammothWarnings = (result.messages || [])
            .filter(m => m.type === 'warning')
            .map(m => m.message);

        // Extract style metadata from the HTML for CSS injection
        const styleMetadata = extractStyleMetadata(html, mammothWarnings, pageLayout);

        return {
            html: wrapDocxHtml(html, preserveLayout, pageLayout),
            styleMetadata,
            warnings: mammothWarnings,
            error: null,
            pageLayout, // expose for callers
        };
    } catch (err) {
        console.error('[docxParser] Parse error:', err);
        return {
            html: null,
            styleMetadata: {},
            warnings: [],
            error: err.message || 'Gagal mem-parse file DOCX.',
            pageLayout: null,
        };
    }
}

/* ── HTML wrapping ───────────────────────────────────────────────────────── */

/**
 * Wraps converted HTML in a docx-page container with STYLE LOCK data attributes.
 * The DocxPreviewRenderer reads these to inject correct CSS.
 */
function wrapDocxHtml(html, preserveLayout, pageLayout) {
    const orient = pageLayout?.orientation || 'portrait';
    return `<div class="docx-page" data-preserve="${preserveLayout}" data-orientation="${orient}">${html}</div>`;
}

/* ── Style metadata extractor ────────────────────────────────────────────── */

/**
 * Derives rendering metadata by scanning the produced HTML.
 * This is used by DocxPreviewRenderer to inject accurate CSS.
 */
function extractStyleMetadata(html, warnings, pageLayout) {
    const meta = {
        hasHeadings: false,
        hasTables: false,
        hasImages: false,
        hasLists: false,
        headingLevels: [],
        imageCount: 0,
        tableCount: 0,
        paragraphCount: 0,
        estimatedFonts: [],
        warnings: warnings || [],
        // Page layout
        pageOrientation: pageLayout?.orientation || 'portrait',
        pageWidthCm: pageLayout?.widthCm || 21.0,
        pageHeightCm: pageLayout?.heightCm || 29.7,
        pageMargins: pageLayout?.margins || { top: 2.54, right: 3.18, bottom: 2.54, left: 3.18 },
    };

    if (!html) return meta;

    // Count structural elements via regex (no DOM in worker context)
    meta.hasHeadings = /<h[1-6]/i.test(html);
    meta.hasTables = /<table/i.test(html);
    meta.hasImages = /<img/i.test(html);
    meta.hasLists = /<[uo]l/i.test(html);

    // Count approximate quantities
    meta.imageCount = (html.match(/<img/gi) || []).length;
    meta.tableCount = (html.match(/<table/gi) || []).length;
    meta.paragraphCount = (html.match(/<p[^>]*>/gi) || []).length;

    // Detect heading levels used
    for (let i = 1; i <= 6; i++) {
        if (new RegExp(`<h${i}`, 'i').test(html)) {
            meta.headingLevels.push(i);
        }
    }

    // Flag font warnings from mammoth
    const fontWarnings = warnings.filter(w =>
        w.toLowerCase().includes('font') ||
        w.toLowerCase().includes('style')
    );
    if (fontWarnings.length > 0) {
        meta.estimatedFonts = fontWarnings;
    }

    return meta;
}

/* ── Utility: read file as ArrayBuffer ───────────────────────────────────── */
export function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Gagal membaca file.'));
        reader.readAsArrayBuffer(file);
    });
}
