/**
 * DOCX Exporter — TEMPLATE ARCHITECTURE v3
 *
 * Indonesian Government Monthly Report (.docx)
 *
 * v3 Changes:
 *   - Named Word styles (GovernmentBAB/Heading 1, GovernmentSubBAB/Heading 2, etc.)
 *     embedded in styles.xml via PARAGRAPH_STYLES — no inline overrides
 *   - TableOfContents auto-generated from Heading 1–3 (updateFields: true)
 *   - Two-section model kept for split page numbering (roman → arabic)
 *
 * LOCKED:
 *   Paper  : A4
 *   Margin : 2cm all sides
 *   Font   : Arial (enforced via named styles)
 *   Body   : 11pt Normal style
 *   BAB    : 14pt Heading 1 — page break before, thick border
 *   Sub-BAB: 12pt Heading 2
 *   Spacing: 1.5 lines, 6pt paragraph-after
 */

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    TableOfContents,
    BorderStyle,
    AlignmentType,
    PageBreak,
    PageNumber,
    UnderlineType,
    HeadingLevel,
    TabStopType,
    LeaderType,
    ImageRun,
    SectionType,
    Footer,
    NumberFormat,
    LevelFormat,
    convertInchesToTwip,
    VerticalAlign,
    TableLayoutType,
    PageOrientation,
} from 'docx';

import { saveAs } from 'file-saver';

import {
    CM,
    MARGINS,
    FONT,
    SPACING,
    INDENT,
    PAGE_WIDTH,
    GOVERNMENT_STYLES,
    PARAGRAPH_STYLES,
    STYLE_ID,
} from '../styles/governmentStyles';

import { fetchImageAsArrayBuffer, base64ToArrayBuffer, getMimeFromBase64, scaleToMaxWidth } from './imageHandler';
import { generateLetterhead } from './letterheadGenerator';

// ==================== XML SANITIZER ====================
const cleanXml = (str) => {
    if (typeof str !== 'string') return str;
    // Remove illegal XML control characters
    // eslint-disable-next-line no-control-regex
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '');
};

// ==================== PARAGRAPH HELPERS ====================

/**
 * Body TextRun — only font lock needed; size/bold comes from named style.
 */
const tr = (text, opts = {}) =>
    new TextRun({
        text: cleanXml(text || ''),
        font: FONT.NAME,
        size: opts.size ?? FONT.SIZE.BODY,
        bold: opts.bold ?? false,
        italics: opts.italics ?? false,
        underline: opts.underline,
        allCaps: opts.allCaps ?? false,
        color: '000000',
    });

/**
 * Body paragraph — references GovernmentNormal style.
 * No inline size/bold/align needed (inherits from style definition).
 */
const para = (text, opts = {}) =>
    new Paragraph({
        style: STYLE_ID.NORMAL,
        children: opts.children || [tr(text, opts)],
        alignment: opts.alignment ?? AlignmentType.JUSTIFIED,
        spacing: {
            before: opts.spaceBefore ?? 0,
            after: opts.spaceAfter ?? SPACING.PARA_SPACING_PT,
            line: SPACING.LINE_1_5,
        },
        indent: opts.indent ? { firstLine: INDENT.FIRST_LINE } : undefined,
        keepNext: opts.keepNext ?? false,
        keepLines: opts.keepLines ?? false,
    });

const centerPara = (text, opts = {}) =>
    para(text, { ...opts, alignment: AlignmentType.CENTER });

const emptyLine = () =>
    new Paragraph({
        style: STYLE_ID.NORMAL,
        children: [],
        spacing: { before: 0, after: 0, line: SPACING.LINE_1_5 },
    });

const pageBreak = () =>
    new Paragraph({ children: [new PageBreak()] });

// ==================== HTML CONTENT CLEANER ====================

const removePageBreakStyles = (html) => {
    if (!html) return '';
    return html
        .replace(/<div[^>]*style="[^"]*page-break[^"]*"[^>]*>/gi, '<div>')
        .replace(/page-break-before:\s*always;?/gi, '')
        .replace(/page-break-after:\s*always;?/gi, '')
        .replace(/break-before:\s*page;?/gi, '')
        .replace(/break-after:\s*page;?/gi, '');
};

const stripHtml = (html) => {
    if (!html) return '';
    return cleanXml(
        removePageBreakStyles(html)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    );
};

// ==================== HTML → DOCX CONVERTER ====================
// Converts mammoth-generated HTML (tables, bold, italic, headings)
// into proper docx library elements.

const CELL_BORDER = {
    top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
};

/**
 * Build DOCX TextRun(s) from an HTML inline element / text node.
 * Handles <strong>, <b>, <em>, <i>, <u>, <s>, nested spans.
 */
const inlineNodeToRuns = (node, inherited = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent || '';
        if (!txt) return [];
        return [new TextRun({
            text: txt,
            font: FONT.NAME,
            size: inherited.size ?? FONT.SIZE.BODY,
            bold: inherited.bold ?? false,
            italics: inherited.italic ?? false,
            underline: inherited.underline ? { type: UnderlineType.SINGLE } : undefined,
            strike: inherited.strike ?? false,
            color: '000000',
        })];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const tag = node.tagName?.toLowerCase();
    const newCtx = { ...inherited };
    if (tag === 'strong' || tag === 'b') newCtx.bold = true;
    if (tag === 'em' || tag === 'i') newCtx.italic = true;
    if (tag === 'u') newCtx.underline = true;
    if (tag === 's' || tag === 'del') newCtx.strike = true;
    // Recurse into children
    const runs = [];
    node.childNodes.forEach(child => runs.push(...inlineNodeToRuns(child, newCtx)));
    return runs;
};

/**
 * Convert a <table> HTML element into a DOCX Table (Grid-Aware).
 */
export const htmlTableToDocxTable = (tableEl) => {
    const allTrs = Array.from(tableEl.querySelectorAll('tr'));
    if (allTrs.length === 0) return null;

    const theadTrs = new Set(Array.from(tableEl.querySelectorAll('thead tr')));

    // 1. Calculate max columns across all rows
    const maxCols = allTrs.reduce((max, row) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const colCount = cells.reduce((sum, cell) => sum + (parseInt(cell.getAttribute('colspan') || '1', 10)), 0);
        return Math.max(max, colCount);
    }, 1);

    const defaultColPct = Math.floor(100 / maxCols);

    // 2. Track occupied cells for rowSpan
    const occupied = Array.from({ length: allTrs.length }, () => Array(maxCols).fill(false));
    const rows = [];

    allTrs.forEach((tr, rowIdx) => {
        const cells = Array.from(tr.querySelectorAll('th, td'));
        const isHeader = theadTrs.has(tr) || tr.querySelector('th') !== null;
        const docxCells = [];
        let currentCol = 0;

        cells.forEach((cell) => {
            // Skip occupied
            while (currentCol < maxCols && occupied[rowIdx][currentCol]) {
                currentCol++;
            }
            if (currentCol >= maxCols) return;

            const colspan = Math.min(parseInt(cell.getAttribute('colspan') || '1', 10), maxCols - currentCol);
            const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
            const alignment = cell.style.textAlign || (isHeader ? 'center' : 'left');

            // Mark occupied
            for (let r = 0; r < rowspan; r++) {
                for (let c = 0; c < colspan; c++) {
                    if (rowIdx + r < allTrs.length) {
                        occupied[rowIdx + r][currentCol + c] = true;
                    }
                }
            }

            const cellWidthPct = defaultColPct * colspan;

            const paragraphs = Array.from(cell.childNodes).flatMap(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const txt = stripHtml(node.textContent || '').trim();
                    return txt ? [para(txt, { alignment, bold: isHeader })] : [];
                }
                if (node.tagName?.toLowerCase() === 'p') {
                    const txt = stripHtml(node.textContent || '').trim();
                    return txt ? [para(txt, { alignment, bold: isHeader })] : [];
                }
                return [];
            });

            if (paragraphs.length === 0) {
                paragraphs.push(para('', { alignment, bold: isHeader }));
            }

            docxCells.push(new TableCell({
                children: paragraphs,
                columnSpan: colspan > 1 ? colspan : undefined,
                rowSpan: rowspan > 1 ? rowspan : undefined,
                shading: isHeader ? { fill: 'F5F5F5' } : undefined,
                width: { size: Math.max(1, Math.round(cellWidthPct)), type: WidthType.AUTO }, // Changed from PERCENTAGE to AUTO for autofitting
                borders: CELL_BORDER,
            }));

            currentCol += colspan;
        });

        if (docxCells.length > 0) {
            rows.push(new TableRow({
                children: docxCells,
                tableHeader: isHeader,
            }));
        }
    });

    return new Table({
        width: { size: 100, type: WidthType.AUTO }, // Changed to AUTO
        layout: TableLayoutType.AUTOFIT, // Changed to AUTOFIT
        borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            insideH: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
            insideV: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
        },
        rows,
    });
};

/**
 * Convert mammoth-generated HTML string into an array of DOCX elements.
 * Handles: paragraphs, headings, tables, bold/italic inline text, lists.
 *
 * @param {string} htmlStr — HTML from mammoth.convertToHtml or Quill editor
 * @returns {Array} Array of docx Paragraph / Table objects
 */
export const htmlToDocxElements = async (htmlStr) => {
    if (!htmlStr || typeof htmlStr !== 'string') return [];
    const elements = [];

    // Use DOMParser to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${htmlStr}</body>`, 'text/html');
    const body = doc.body;

    const processNode = async (node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.tagName?.toLowerCase();

        // ── Table ────────────────────────────────────────────────
        if (tag === 'table') {
            const tbl = htmlTableToDocxTable(node);
            if (tbl) {
                elements.push(tbl);
                elements.push(new Paragraph({ children: [], spacing: { before: 0, after: 120 } }));
            }
            return; // don't recurse into children — table already processed
        }

        // ── Headings ──────────────────────────────────────────────
        if (tag === 'h1') {
            const txt = node.textContent?.trim() || '';
            if (txt) elements.push(buildBabHeader(txt));
            return;
        }
        if (tag === 'h2') {
            const txt = node.textContent?.trim() || '';
            if (txt) elements.push(buildSubBabHeader(txt));
            return;
        }
        if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
            const txt = node.textContent?.trim() || '';
            if (txt) elements.push(buildSubSubBabHeader(txt));
            return;
        }

        // ── Images ───────────────────────────────────────────────
        if (tag === 'img') {
            const src = node.getAttribute('src');
            if (src) {
                try {
                    // Use robust native handler which correctly cracks gigabytes of data:image base64 without memory bounds
                    const arrBuf = await fetchImageAsArrayBuffer(src);
                    if (arrBuf) {
                        // Native dimensions from DOM or fallback to A4 safe bounds
                        let w = parseInt(node.getAttribute('width'));
                        let h = parseInt(node.getAttribute('height'));
                        
                        // Infer width/height from inline style if attributes are missing
                        if (!w || !h) {
                            const style = node.getAttribute('style') || '';
                            const wMatch = style.match(/width:\s*(\d+)px/);
                            if (wMatch) w = parseInt(wMatch[1], 10);
                            const hMatch = style.match(/height:\s*(\d+)px/);
                            if (hMatch) h = parseInt(hMatch[1], 10);
                        }

                        // Get image type for DOCX ImageRun MIME validation
                        const type = getMimeFromBase64(src) || 'png';

                        if (!w || !h) {
                            // If still 0, cap at 500x350 to ensure Word compatibility
                            w = 500; h = 350;
                        }

                        // Force DOCX page boundary safety (600px max width for A4 portrait)
                        if (w > 600) {
                            h = Math.round(h * (600 / w));
                            w = 600;
                        }

                        elements.push(new Paragraph({
                            children: [
                                new ImageRun({
                                    data: arrBuf,
                                    type: type,
                                    transformation: { width: w, height: h }
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 120, after: 120 }
                        }));
                    }
                } catch(e) { console.warn('[docxExporter] htmlToDocxElements image fetch failed:', src.substring(0, 50), e); }
            }
            return;
        }

        // ── Paragraphs ────────────────────────────────────────────
        if (tag === 'p') {
            const runs = [];
            node.childNodes.forEach(child => runs.push(...inlineNodeToRuns(child, {})));
            if (runs.length > 0 && runs.some(r => r.root?.children?.[0]?.options?.text?.trim())) {
                elements.push(new Paragraph({
                    style: STYLE_ID.NORMAL,
                    children: runs,
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { before: 0, after: SPACING.PARA_SPACING_PT, line: SPACING.LINE_1_5 },
                    indent: { firstLine: INDENT.FIRST_LINE },
                }));
            } else {
                // Fallback: just get the text
                const txt = node.textContent?.trim();
                if (txt) elements.push(para(txt, { indent: true }));
            }
            return;
        }

        // ── Lists ─────────────────────────────────────────────────
        if (tag === 'ul' || tag === 'ol') {
            const items = Array.from(node.querySelectorAll('li'));
            items.forEach((li, i) => {
                const bullet = tag === 'ol' ? `${i + 1}.` : '•';
                const txt = li.textContent?.trim() || '';
                if (txt) {
                    elements.push(new Paragraph({
                        style: STYLE_ID.NORMAL,
                        children: [new TextRun({ text: `${bullet}  ${txt}`, font: FONT.NAME, size: FONT.SIZE.BODY, color: '000000' })],
                        indent: { left: INDENT.SUB_BAB },
                        spacing: { before: 0, after: 60, line: SPACING.LINE_1_5 },
                    }));
                }
            });
            return;
        }

        // ── Wrapper divs — just recurse into children ─────────────
        if (tag === 'div' || tag === 'section' || tag === 'article') {
            for (const childNode of Array.from(node.childNodes)) {
                await processNode(childNode);
            }
            return;
        }

        // ── br → empty line ───────────────────────────────────────
        if (tag === 'br') {
            elements.push(emptyLine());
            return;
        }

        // ── Fallback: recurse ─────────────────────────────────────
        for (const childNode of Array.from(node.childNodes)) {
            await processNode(childNode);
        }
    };

    for (const childNode of Array.from(body.childNodes)) {
        await processNode(childNode);
    }
    return elements;
};



// ==================== PAGE NUMBER FOOTER ====================

const buildPageFooter = () =>
    new Footer({
        children: [
            new Paragraph({
                style: STYLE_ID.NORMAL,
                children: [
                    new TextRun({
                        children: [PageNumber.CURRENT],
                        font: FONT.NAME,
                        size: FONT.SIZE.BODY,
                        color: '000000',
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: SPACING.LINE_1 },
            }),
        ],
    });

// ==================== COVER LETTER ====================

const buildCoverLetter = async (data, logoPath) => {
    if (!data || !data.nomor) return [];
    const elems = [];

    const letterheadElems = await generateLetterhead(logoPath, data);
    elems.push(...letterheadElems);

    // ── Nomor/Sifat/Lampiran/Hal using TabStops (No Table to avoid border bugs) ──
    const attrPairs = [
        ['Nomor', data.nomor, data.tanggal], // Tanggal is injected on the right of Nomor
        ['Sifat', data.sifat, null],
        ['Lampiran', data.lampiran, null],
        ['Hal', data.hal, null]
    ];

    attrPairs.forEach(([label, value, rightText]) => {
        const pChildren = [tr(label), tr('\t: ' + (value || '-'))];
        if (rightText) {
            // Add a tab stop to push the text to the far right margin
            pChildren.push(tr('\t' + rightText));
        }

        elems.push(new Paragraph({
            style: STYLE_ID.NORMAL,
            children: pChildren,
            tabStops: [
                { type: TabStopType.LEFT, position: 2 * CM }, // Align the colon
                { type: TabStopType.RIGHT, position: 16 * CM } // Align the right text (e.g., date)
            ],
            spacing: { after: 40, line: SPACING.LINE_1_5 },
        }));
    });

    elems.push(emptyLine());

    // Tujuan
    const tujuanArr = (data.tujuan || 'Yth. Kepala Kantor Wilayah Sumatera Utara\nDirektorat Jenderal Imigrasi\ndi tempat').split('\n').filter(Boolean);
    tujuanArr.forEach(line => {
        elems.push(new Paragraph({
            style: STYLE_ID.NORMAL,
            children: [tr(line.trim())],
            spacing: { after: 0, line: SPACING.LINE_1_5 },
        }));
    });
    elems.push(emptyLine());

    // Isi
    const rawIsi = data.isi || 'Menindaklanjuti surat Sekretaris Direktorat Jenderal Imigrasi No.IMI.1-TI.03-3178 tanggal 27 Agustus 2018 tentang Penggunaan Aplikasi Laporan Bulanan Online, bersama ini dengan hormat kami kirimkan Laporan Kegiatan Bulan Maret 2026 pada Kantor Imigrasi Kelas II TPI Pematang Siantar.\n\nDemikian kami sampaikan, atas perkenan dan petunjuk lebih lanjut kami ucapkan terima kasih.';
    rawIsi.split('\n\n').forEach(p => {
        if (p.trim()) elems.push(para(p.replace(/\n/g, ' '), { indent: true }));
    });

    elems.push(emptyLine());

    // --- BSrE Electronic Signature Layout ---
    let bsreLogoData = null;
    try {
        bsreLogoData = await fetchImageAsArrayBuffer('/logo_kemenimipas.png');
    } catch (err) {
        console.warn('Docx electronic signature badge image failed to load:', err);
    }

    const badgeLogoCell = bsreLogoData ? [new Paragraph({
        children: [new ImageRun({
            data: bsreLogoData,
            transformation: { width: 38, height: 38 },
        })],
        alignment: AlignmentType.CENTER,
    })] : [new Paragraph({ text: '[LOGO]', alignment: AlignmentType.CENTER })];

    const ttdLayoutTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        borders: {
            top: { style: BorderStyle.NIL },
            bottom: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
            insideH: { style: BorderStyle.NIL },
            insideV: { style: BorderStyle.NIL },
        },
        rows: [
            new TableRow({
                children: [
                    // Left: Placeholder ttd_pengirim
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.BOTTOM,
                        borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
                        children: [
                            new Paragraph({
                                style: STYLE_ID.NORMAL,
                                children: [tr('')], // Empty block to preserve structure
                            })
                        ]
                    }),
                    // Right: BSrE Signer Layout
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.TOP,
                        borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
                        children: [
                            new Paragraph({
                                style: STYLE_ID.NORMAL,
                                children: [tr('Kepala Kantor,')],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 100 },
                            }),
                            // BSrE Badge Table (nested)
                            new Table({
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                alignment: AlignmentType.CENTER,
                                borders: {
                                    top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL },
                                    insideV: { style: BorderStyle.NIL }, insideH: { style: BorderStyle.NIL }
                                },
                                rows: [
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                width: { size: 30, type: WidthType.PERCENTAGE },
                                                verticalAlign: VerticalAlign.CENTER,
                                                borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
                                                children: badgeLogoCell,
                                            }),
                                            new TableCell({
                                                width: { size: 70, type: WidthType.PERCENTAGE },
                                                verticalAlign: VerticalAlign.CENTER,
                                                borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
                                                children: [
                                                    new Paragraph({
                                                        style: STYLE_ID.NORMAL,
                                                        children: [tr('KEMENIMIPAS', { bold: true, size: 20 /*10pt*/ })],
                                                        spacing: { after: 0, line: 240 },
                                                    }),
                                                    new Paragraph({
                                                        style: STYLE_ID.NORMAL,
                                                        children: [tr('Ditandatangani secara elektronik oleh:', { size: 16 /*8pt*/, color: '666666' })],
                                                        spacing: { after: 0, line: 240 },
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }),
                            new Paragraph({
                                spacing: { before: 100, after: 0 },
                                style: STYLE_ID.NORMAL,
                                children: [tr(data.penandatangan || 'Benyamin Kali Patembal Harahap', { bold: true, underline: { type: UnderlineType.SINGLE } })],
                                alignment: AlignmentType.CENTER,
                            })
                        ]
                    })
                ]
            })
        ]
    });
    elems.push(ttdLayoutTable);

    elems.push(emptyLine());
    elems.push(emptyLine());

    // Tembusan
    elems.push(new Paragraph({ 
        style: STYLE_ID.NORMAL, 
        children: [tr('Tembusan:', { bold: false, size: FONT.SIZE.XSMALL })], 
        spacing: { after: 0, line: SPACING.LINE_1_5 } 
    }));
    
    const tembusanArr = (data.tembusan || '1  Sekretaris Direktorat Jenderal Imigrasi\n   Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia.').split('\n').filter(Boolean);
    tembusanArr.forEach(line => {
        elems.push(new Paragraph({ 
            style: STYLE_ID.NORMAL, 
            children: [tr(line, { size: FONT.SIZE.XSMALL })], 
            indent: { left: 0 }, 
            spacing: { after: 0, line: SPACING.LINE_1_5 } 
        }));
    });

    return elems;
};

// ==================== COVER PAGE ====================
// Layout persis seperti gambar referensi:
//   [spasi atas]
//   KANTOR IMIGRASI KELAS II TPI   ← 14pt Bold Underline Center
//   PEMATANG SIANTAR               ← 14pt Bold Underline Center
//   [spasi]
//   LAPORAN BULANAN                ← 14pt Bold Center
//   DESEMBER 2025                  ← 14pt Bold Center
//   [spasi besar]
//   [LOGO HD 240×120px]            ← logos-combined.png embedded
//   [spasi besar]
//   KEMENTERIAN IMIGRASI...        ← 12pt Bold Center (per baris)
//   REPUBLIK INDONESIA             ← 12pt Bold Center
//   DIREKTORAT JENDERAL IMIGRASI   ← 12pt Bold Center
//   2025                           ← 12pt Bold Center

const buildCoverPage = async (data, logoPath) => {
    if (!data) return [];
    const elems = [];

    // ── Judul Kantor: Bold + Underline + Center ─────────────────
    const titleStyle = (text, isFirst = false) => new Paragraph({
        style: STYLE_ID.NORMAL,
        pageBreakBefore: isFirst, // <--- Force page break correctly
        children: [new TextRun({
            text,
            font: FONT.NAME,
            size: FONT.SIZE.BAB,        // 14pt
            bold: true,
            underline: { type: UnderlineType.SINGLE },
            color: '000000',
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0, line: SPACING.LINE_1 },
    });

    // We add 5 empty lines if page is already fresh, but with pageBreakBefore we want the empty lines AFTER the break.
    elems.push(titleStyle('KANTOR IMIGRASI KELAS II TPI', true));
    elems.push(titleStyle('PEMATANG SIANTAR', false));

    // ── Spasi setelah judul ─────────────────────────────────────
    for (let i = 0; i < 4; i++) elems.push(emptyLine());

    // ── Judul Laporan ───────────────────────────────────────────
    elems.push(centerPara(data.reportTitle || 'LAPORAN BULANAN', {
        size: FONT.SIZE.BAB,           // 14pt
        bold: true,
        spaceAfter: SPACING.PARA_SPACING_PT,
    }));
    elems.push(centerPara(`${(data.month || '').toUpperCase()} ${data.year || ''}`, {
        size: FONT.SIZE.BAB,           // 14pt
        bold: true,
        spaceAfter: 0,
    }));

    // ── Spasi sebelum logo ──────────────────────────────────────
    for (let i = 0; i < 5; i++) elems.push(emptyLine());

    // ── Logo HD — embedded ImageRun 240×120px ──────────────────
    if (logoPath) {
        try {
            const logoData = await fetchImageAsArrayBuffer(logoPath);
            if (logoData) {
                // logos-combined.png: 2 logo berdampingan, rasio ±2:1
                elems.push(new Paragraph({
                    children: [new ImageRun({
                        data: logoData,
                        transformation: {
                            width: 240,   // px → ~6.4cm di 96 DPI
                            height: 120,  // px → ~3.2cm (rasio 2:1)
                        },
                    })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: SPACING.LINE_1 },
                }));
            }
        } catch (e) {
            console.warn('Cover logo load failed:', e);
        }
    }

    // ── Spasi setelah logo ──────────────────────────────────────
    for (let i = 0; i < 5; i++) elems.push(emptyLine());

    // ── Footer Institusi: Bold Center ──────────────────────────
    [
        'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN',
        'REPUBLIK INDONESIA',
        'DIREKTORAT JENDERAL IMIGRASI',
        data.year || String(new Date().getFullYear()),
    ].forEach(line => elems.push(centerPara(line, {
        size: FONT.SIZE.SUB_BAB,       // 12pt
        bold: true,
        spaceAfter: 40,
    })));

    return elems;
};

// ==================== KATA PENGANTAR ====================

const buildForeword = (data) => {
    if (!data || !data.content) return [];
    const elems = [];

    elems.push(new Paragraph({
        style: STYLE_ID.HEADING_1,
        children: [tr('KATA PENGANTAR', { size: FONT.SIZE.BAB, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: SPACING.PARA_SPACING_PT * 2, line: SPACING.LINE_1_5 },
        // Override to prevent page break on first element of this section
        pageBreakBefore: false,
    }));

    stripHtml(data.content).split('\n\n').forEach(p => {
        if (p.trim()) elems.push(para(p.replace(/\n/g, ' '), { indent: true }));
    });

    elems.push(pageBreak());
    return elems;
};

// ==================== AUTO TABLE OF CONTENTS ====================

/**
 * Generates a Word-native auto-TOC.
 *
 * Word will populate the page numbers when:
 *  a) The document is opened (updateFields: true triggers auto-update)
 *  b) The user presses F9 on the TOC
 *
 * Headings detected: GovernmentBAB (H1), GovernmentSubBAB (H2), GovernmentSubSubBAB (H3)
 */
const buildAutoTOC = () => {
    const elems = [];

    // TOC title
    elems.push(new Paragraph({
        children: [
            new TextRun({ text: 'DAFTAR ISI', font: FONT.NAME, size: FONT.SIZE.BAB, bold: true, color: '000000' }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240, line: SPACING.LINE_1 },
    }));

    // Word-native TableOfContents field
    elems.push(
        new TableOfContents('Daftar Isi', {
            headingStyleRange: '1-3',
            stylesWithLevels: [
                { styleName: 'GovernmentBAB', level: 1 },
                { styleName: 'GovernmentSubBAB', level: 2 },
                { styleName: 'GovernmentSubSubBAB', level: 3 },
            ],
            hyperlink: true,
            preserveTabInEntries: true,
            preserveNewLineInEntries: false,
            updateFields: true,
        })
    );

    return elems;
};

// ==================== BAB HEADER (Heading 1) ====================

/**
 * Creates a BAB heading using the GovernmentBAB named style.
 * Style definition handles: Uppercase, Bold, Center, 14pt, page-break-before, border-bottom.
 */
const buildBabHeader = (text, isFirstBab = false) =>
    new Paragraph({
        style: STYLE_ID.HEADING_1,
        children: [tr(text.toUpperCase(), { bold: true, size: FONT.SIZE.BAB })],
        // First BAB doesn't need extra page break (section break already moves to new page)
        pageBreakBefore: !isFirstBab,
        keepNext: true,
    });

// ==================== SUB-BAB HEADER (Heading 2) ====================

const buildSubBabHeader = (text) =>
    new Paragraph({
        style: STYLE_ID.HEADING_2,
        children: [tr(text, { bold: true, size: FONT.SIZE.SUB_BAB })],
        keepNext: true,
        keepLines: true,
    });

// ==================== SUB-SUB-BAB HEADER (Heading 3) ====================

const buildSubSubBabHeader = (text) =>
    new Paragraph({
        style: STYLE_ID.HEADING_3,
        children: [tr(text, { bold: true })],
        indent: { left: INDENT.SUB_BAB },
        keepNext: true,
    });

// ==================== CHAPTER BUILDER ====================

// Max image width in EMU: 14 cm × 914400 EMU/m ÷ 100 = content area width
const MAX_IMG_W_EMU = Math.round(14 / 2.54 * 914400); // 14cm in EMU

/**
 * Build a block paragraph or image from a content_json block object.
 * Called from buildChapter when section.blocks is available.
 */
const buildContentBlock = async (block, { Paragraph, ImageRun, AlignmentType }) => {
    if (!block) return [];

    if (block.type === 'paragraph' || block.type === 'text') {
        if (!block.text?.trim()) return [];
        return [para(block.text.trim(), { indent: true })];
    }

    if (block.type === 'heading') {
        if (block.level === 2) return [buildSubBabHeader(block.text)];
        return [buildSubSubBabHeader(block.text)];
    }

    if (block.type === 'image') {
        if (!block.base64) {
            // Placeholder paragraph for missing image — visible in document
            return [para(`[⚠️ Gambar tidak tersedia: ${block.id || 'unknown'}]`, { alignment: AlignmentType.CENTER })];
        }
        try {
            const imgBuf = base64ToArrayBuffer(block.base64);
            if (!imgBuf) return [para(`[⚠️ Gagal memuat gambar: ${block.id}]`, { alignment: AlignmentType.CENTER })];

            const mime = getMimeFromBase64(block.base64);
            const origW = block.metadata?.width_px || MAX_IMG_W_EMU;
            const origH = block.metadata?.height_px || Math.round(MAX_IMG_W_EMU * 0.75);
            const { width: scaledW, height: scaledH } = scaleToMaxWidth(origW, origH, MAX_IMG_W_EMU);

            const imgPara = new Paragraph({
                children: [
                    new ImageRun({
                        data: imgBuf,
                        type: mime,
                        transformation: { width: scaledW, height: scaledH },
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120 },
            });

            const elems = [imgPara];
            if (block.caption) {
                elems.push(para(block.caption, {
                    alignment: AlignmentType.CENTER,
                    size: FONT?.SIZE?.XSMALL || 20,
                    italics: true,
                    spaceAfter: 200,
                    noIndent: true,
                }));
            }
            return elems;
        } catch (err) {
            console.warn('[docxExporter] Image embed error:', err);
            return [para(`[⚠️ Error memuat gambar: ${block.id}]`, { alignment: AlignmentType.CENTER })];
        }
    }

    if (block.type === 'list') {
        return (block.items || []).map(item =>
            new Paragraph({
                style: STYLE_ID.NORMAL,
                children: [tr('• ' + item)],
                indent: { left: INDENT?.SUB_BAB || 720 },
                spacing: { before: 0, after: 60 },
            })
        );
    }

    return [];
};

const buildChapter = async (title, sections, isFirst = false, coverPageData = {}) => {
    const elems = [];
    elems.push(buildBabHeader(title, isFirst));

    for (const section of (sections || [])) {
        if (section.level === 3) {
            elems.push(buildSubSubBabHeader(section.title));
        } else if (section.title && !section.isLalintalkimTemplate && !section.isInteldakimTemplate && !section.isInfokimTemplate && !section.isPengaduanTemplate && !section.isKeuanganTemplate && !section.isKepegawaianTemplate && !section.isUmumTemplate) {
            // For templates, the template generator already provides heading
            elems.push(buildSubBabHeader(section.title));
        }

        if (section.isLalintalkimTemplate) {
            const { getLalintalkimDocxElements } = await import('./templateDocxExporter.js');
            const templateElems = getLalintalkimDocxElements(section.lalintalkimPart || null, section.templateData || {});
            if (templateElems.length > 0) elems.push(...templateElems);
            continue;
        }

        if (section.isInteldakimTemplate) {
            const { getInteldakimDocxElements } = await import('./templateDocxExporter.js');
            const templateElems = getInteldakimDocxElements(section.inteldakimPart || null, section.templateData || {}, coverPageData?.month || '', coverPageData?.year || '');
            if (templateElems.length > 0) elems.push(...templateElems);
            continue;
        }

        if (section.isInfokimTemplate || section.isPengaduanTemplate) {
            const { getInfokimDocxElements } = await import('./templateDocxExporter.js');
            const part = section.isInfokimTemplate ? 'infokim' : 'pengaduan';
            const templateElems = getInfokimDocxElements(part, section.templateData || {}, coverPageData?.month || '', coverPageData?.year || '');
            if (templateElems.length > 0) elems.push(...templateElems);
            continue;
        }

        if (section.isKeuanganTemplate) {
            const { getKeuanganDocxElements } = await import('./templateDocxExporter.js');
            const templateElems = getKeuanganDocxElements(section.keuanganPart || null, section.templateData || {});
            if (templateElems.length > 0) elems.push(...templateElems);
            continue;
        }

        if (section.isKepegawaianTemplate) {
            const { getKepegawaianDocxElements } = await import('./templateDocxExporter.js');
            const templateElems = getKepegawaianDocxElements(section.kepegawaianPart || null, section.templateData || {}, coverPageData?.month || '', coverPageData?.year || '');
            if (templateElems.length > 0) elems.push(...templateElems);
            continue;
        }

        if (section.isUmumTemplate) {
            const { getUmumDocxElements } = await import('./templateDocxExporter.js');
            const templateElems = getUmumDocxElements(section.umumPart || null, section.templateData || {}, coverPageData?.month || '', coverPageData?.year || '');
            if (templateElems.length > 0) elems.push(...templateElems);
            continue;
        }

        if (section.isPenutupTemplate) {
            const { getPenutupDocxElements } = await import('./templateDocxExporter.js');
            const penutupData = section.templateData?.penutup || null;
            if (penutupData) {
                // Resolve month to name string (getPenutupDocxElements needs a name like 'April' not '4')
                const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                const rawMonth = coverPageData?.month || '';
                const mInt = parseInt(rawMonth);
                const bulanName = (mInt > 0 && mInt <= 12)
                    ? BULAN[mInt]
                    : (typeof rawMonth === 'string' && rawMonth.length > 0 ? rawMonth : 'Bulan');
                // Fetch logo for BSrE e-signature
                let logoKemenBufLocal = null;
                try {
                    logoKemenBufLocal = await fetchImageAsArrayBuffer('/logo_kemenimipas.png');
                } catch (e) {
                    console.warn('[docxExporter] BAB IV logo fetch failed:', e);
                }
                const templateElems = getPenutupDocxElements(penutupData, bulanName, String(coverPageData?.year || ''), logoKemenBufLocal);
                if (templateElems.length > 0) elems.push(...templateElems);
            }
            // Always ensure last element is a paragraph (not a Table) to avoid Word OOXML errors
            elems.push(new Paragraph({ children: [] }));
            continue;
        }

        // ── BAB V Lampiran: Org Chart Image ─────────────────────────────────────
        if (section.isBab5Template) {
            const { ImageRun: IR } = await import('docx');
            // Sub-heading for structure org
            elems.push(new Paragraph({
                children: [new TextRun({
                    text: 'Struktur Organisasi Kantor Imigrasi Kelas II TPI Pematang Siantar',
                    font: FONT.NAME, size: FONT.SIZE.SUB_BAB, bold: true, color: '000000',
                })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 200 },
            }));

            const imageUrl = section.bab5ImageUrl;
            if (imageUrl) {
                try {
                    const imgBuf = await fetchImageAsArrayBuffer(imageUrl);
                    if (imgBuf) {
                        // Landscape page: usable width ≈ 25cm (29.7cm – 2×2cm margins)
                        // Scale to fill the page width, height proportional (~660/940 ratio = 0.7)
                        const W = 900, H = Math.round(900 * 0.7); // px
                        // Detect MIME: base64 data URL or Supabase HTTPS URL (check file extension)
                        let imgType = 'jpeg';
                        if (imageUrl.startsWith('data:')) {
                            imgType = getMimeFromBase64(imageUrl) || 'jpeg';
                        } else {
                            const ext = imageUrl.split('?')[0].split('.').pop().toLowerCase();
                            if (ext === 'png') imgType = 'png';
                            else if (ext === 'gif') imgType = 'gif';
                            else if (ext === 'webp') imgType = 'webp';
                            else imgType = 'jpeg';
                        }
                        elems.push(new Paragraph({
                            children: [new IR({
                                data: imgBuf,
                                type: imgType,
                                transformation: { width: W, height: H },
                            })],
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                        }));
                    } else {
                        elems.push(para('(Gambar Struktur Organisasi tidak dapat dimuat.)', { alignment: AlignmentType.CENTER }));
                    }
                } catch (e) {
                    console.warn('[docxExporter] BAB V org chart fetch failed:', e);
                    elems.push(para('(Gambar Struktur Organisasi tidak dapat dimuat.)', { alignment: AlignmentType.CENTER }));
                }
            } else {
                elems.push(para('(Gambar Struktur Organisasi belum diupload.)', { alignment: AlignmentType.CENTER }));
            }
            elems.push(new Paragraph({ children: [] }));
            continue;
        }

        // Priority 1: content_json blocks (rich content with images)
        if (section.blocks && section.blocks.length > 0) {
            for (const block of section.blocks) {
                const blockElems = await buildContentBlock(block, { Paragraph, ImageRun: (await import('docx')).ImageRun, AlignmentType });
                elems.push(...blockElems);
            }
        }
        // Priority 2: HTML content → convert tables and formatting to DOCX elements
        else if (section.content && section.content.trim() && !section.content.includes('[Belum ada konten]')) {
            const hasTable = /<table/i.test(section.content);
            if (hasTable || /<img/i.test(section.content)) {
                // Use full HTML-to-DOCX converter that preserves tables and images
                const htmlElems = await htmlToDocxElements(section.content);
                if (htmlElems.length > 0) {
                    elems.push(...htmlElems);
                } else {
                    // Fallback to plain text if conversion failed
                    stripHtml(section.content).split('\n\n').forEach(p => {
                        if (p.trim()) elems.push(para(p.replace(/\n/g, ' '), { indent: true }));
                    });
                }
            } else {
                // No tables — use plain text (simpler, more reliable)
                stripHtml(section.content).split('\n\n').forEach(p => {
                    if (p.trim() && !p.includes('[Belum ada konten]')) {
                        elems.push(para(p.replace(/\n/g, ' '), { indent: true }));
                    }
                });
            }
        }
    }

    // Always end the chapter with an explicit empty paragraph (ensures Word
    // can attach the sectPr to it and won't bleed orientation to next section)
    elems.push(new Paragraph({ children: [] }));
    return elems;
};


// ==================== STRUCTURED JSON → DOCX ELEMENTS ====================
/**
 * Convert a structured pages[] JSON (from docxStructuredParser) into an array
 * of DOCX elements (Paragraph / Table) suitable for embedding in a report section.
 *
 * @param {object} structuredJson  — { version: '3.0', pages: [...] }
 * @returns {Promise<Array>}  Array of docx Paragraph / Table
 */
export const structuredJsonToDocxElements = async (structuredJson) => {
    if (!structuredJson?.pages?.length) return [];
    const elements = [];

    for (const page of structuredJson.pages) {
        for (const block of (page.content || [])) {
            const blockElems = await structuredBlockToDocx(block);
            elements.push(...blockElems);
        }
        elements.push(emptyLine());
    }

    return elements;
};

/** Convert a single structured block to DOCX elements array */
async function structuredBlockToDocx(block) {
    if (!block) return [];

    switch (block.type) {
        case 'paragraph': {
            if (!block.text?.trim() && !block.runs?.length) return [];
            const runs = block.runs?.length
                ? block.runs.map(r => new TextRun({
                    text: cleanXml(r.text || ''),
                    font: FONT.NAME,
                    size: r.fontSize ? r.fontSize * 2 : FONT.SIZE.BODY,
                    bold: r.bold ?? false,
                    italics: r.italic ?? false,
                    underline: r.underline ? { type: UnderlineType.SINGLE } : undefined,
                    color: '000000',
                }))
                : [tr(block.text || '')];
            const align =
                block.style?.align === 'center' ? AlignmentType.CENTER :
                block.style?.align === 'right' ? AlignmentType.RIGHT :
                block.style?.align === 'justify' ? AlignmentType.JUSTIFIED :
                AlignmentType.BOTH;
            return [new Paragraph({
                style: STYLE_ID.NORMAL,
                children: runs,
                alignment: align,
                spacing: { before: 0, after: SPACING.PARA_SPACING_PT, line: SPACING.LINE_1_5 },
            })];
        }

        case 'heading': {
            const text = block.text?.trim();
            if (!text) return [];
            if (block.level === 1) return [buildBabHeader(text)];
            if (block.level === 2) return [buildSubBabHeader(text)];
            return [buildSubSubBabHeader(text)];
        }

        case 'table': {
            const { rows = [] } = block;
            if (!rows.length) return [];

            const maxCols = Math.max(...rows.map(r => r.filter(c => !c?.vContinue).length), 1);
            const colWidthPct = Math.floor(100 / maxCols);

            const tableRows = rows.map(row => {
                const docxCells = row
                    .filter(cell => !cell?.vContinue)
                    .map(cell => {
                        const isBold = cell?.bold ?? false;
                        const alignType = cell?.align === 'center' ? AlignmentType.CENTER
                            : cell?.align === 'right' ? AlignmentType.RIGHT
                            : AlignmentType.LEFT;
                        const colSpan = cell?.colspan || 1;
                        const rowSpan = cell?.rowspan || 1;
                        const cellWidthPct = colWidthPct * colSpan;

                        const cellRuns = cell?.runs?.length
                            ? cell.runs.map(r => new TextRun({
                                text: cleanXml(r.text || ''),
                                font: FONT.NAME,
                                size: r.fontSize ? r.fontSize * 2 : 20,
                                bold: r.bold ?? isBold,
                                italics: r.italic ?? false,
                                underline: r.underline ? { type: UnderlineType.SINGLE } : undefined,
                                color: '000000',
                            }))
                            : [new TextRun({
                                text: cleanXml(cell?.text || ''),
                                font: FONT.NAME,
                                size: 20,
                                bold: isBold,
                                color: '000000',
                            })];

                        return new TableCell({
                            children: [new Paragraph({
                                children: cellRuns,
                                alignment: alignType,
                                spacing: { before: 0, after: 0, line: SPACING.LINE_1 },
                            })],
                            columnSpan: colSpan > 1 ? colSpan : undefined,
                            rowSpan: rowSpan > 1 ? rowSpan : undefined,
                            width: { size: Math.min(cellWidthPct, 100), type: WidthType.PERCENTAGE },
                            borders: CELL_BORDER,
                            verticalAlign: VerticalAlign.TOP,
                        });
                    });

                if (!docxCells.length) return null;
                return new TableRow({ children: docxCells });
            }).filter(Boolean);

            if (!tableRows.length) return [];

            return [
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows,
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                        bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                        left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                        right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                        insideH: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
                        insideV: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
                    },
                }),
                emptyLine(),
            ];
        }

        case 'image': {
            if (!block.base64) return [];
            try {
                const imgBuf = base64ToArrayBuffer(block.base64);
                if (!imgBuf) return [];
                const mime = getMimeFromBase64(block.base64);
                const MAX_EMU = Math.round(14 / 2.54 * 914400);
                const origW = block.widthPx || MAX_EMU;
                const origH = block.heightPx || Math.round(MAX_EMU * 0.75);
                const { width: scaledW, height: scaledH } = scaleToMaxWidth(origW, origH, MAX_EMU);
                return [new Paragraph({
                    children: [new ImageRun({ data: imgBuf, type: mime, transformation: { width: scaledW, height: scaledH } })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 120 },
                })];
            } catch {
                return [];
            }
        }

        case 'list': {
            return (block.items || []).map(item =>
                new Paragraph({
                    style: STYLE_ID.NORMAL,
                    children: [tr(`${block.ordered ? '1.' : '•'} ${item.text || item || ''}`)],
                    indent: { left: INDENT?.SUB_BAB || 720 },
                    spacing: { before: 0, after: 60 },
                })
            );
        }

        case 'page_break':
            return [new Paragraph({ children: [new PageBreak()] })];

        default:
            return [];
    }
}

// ==================== MAIN EXPORT FUNCTION ====================

// A4 portrait: 11906 × 16838 twips  |  A4 landscape: 16838 × 11906 twips
const A4_P = { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT };
// FIX: docx library v9+ swaps dimensions internally when orientation is LANDSCAPE.
// Providing pre-swapped width/height will cause the library to flip them back to portrait.
const A4_L = { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE };

// Chapters that should be rendered in LANDSCAPE orientation
// STRICT: ONLY BAB II (Pelaksanaan Tugas) and BAB V (Lampiran) use Landscape.
// BAB I, BAB III, BAB IV and everything else must be Portrait.
const LANDSCAPE_CHAPTERS = ['BAB II', 'BAB V'];

const isLandscapeChapter = (title = '') => {
    const upper = title.toUpperCase();
    return LANDSCAPE_CHAPTERS.some(prefix => upper.startsWith(prefix));
};

const buildSectionProps = (landscape, pageStart = null, includePageNumbers = true, customMargin = null) => {
    const pageSize = landscape ? A4_L : A4_P;
    return {
        type: SectionType.NEXT_PAGE,
        page: {
            size: pageSize,
            margin: customMargin || MARGINS,
            ...(includePageNumbers && pageStart !== null
                ? { pageNumbers: { start: pageStart, formatType: NumberFormat.DECIMAL } }
                : includePageNumbers
                    ? { pageNumbers: { formatType: NumberFormat.DECIMAL } }
                    : {}),
        },
    };
};

/**
 * Generates and downloads a government monthly report .docx.
 *
 * Document structure:
 *  Section 1 (portrait, roman page numbers) — Front matter
 *    Cover Letter → Cover Page → Kata Pengantar → Daftar Isi
 *
 *  Section 2+ (per-chapter, mixed orientation) — Chapters
 *    BAB I      → portrait
 *    BAB II     → landscape  ← Pelaksanaan Tugas (tables)
 *    BAB III    → portrait
 *    BAB IV     → portrait
 *    BAB V      → landscape  ← Lampiran/Struktur Organisasi
 */
export const generateDocx = async ({
    coverLetterData,
    coverPageData,
    forewordData,
    tocItems,
    chapters,
    filename,
    logoPath,
    coverLogoPath,
    penutupData,        // Direct BAB IV data: template_data.penutup (seksi_id=4)
    bulan,             // month integer (1-12)
    tahun,             // year number
}) => {
    // ── INJECT BAB IV directly from penutupData ───────────────────────────────
    // This bypasses the fragile filteredToc-to-chapter pipeline.
    // Always build BAB IV from the top-level penutupData param or fallback to defaults.
    const { getDefaultPenutupData } = await import('./penutupSchema.js');
    const finalPenutupData = penutupData || getDefaultPenutupData();

    if (finalPenutupData) {
        const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const mInt = parseInt(bulan);
        const bulanName = (mInt > 0 && mInt <= 12) ? BULAN[mInt]
            : (typeof bulan === 'string' && bulan.length > 0 ? bulan : 'Bulan');

        const { getPenutupDocxElements } = await import('./templateDocxExporter.js');
        
        let logoKemenBuf = null;
        try {
            logoKemenBuf = await fetchImageAsArrayBuffer('/logo_kemenimipas.png');
        } catch (e) {
            console.warn('Docx electronic signature badge image failed to load:', e);
        }

        const penutupElems = getPenutupDocxElements(finalPenutupData, bulanName, String(tahun || ''), logoKemenBuf);

        if (penutupElems.length > 0) {
            // If BAB IV exists in chapters already, replace its content with template
            const bab4Idx = chapters.findIndex(c => c.title?.toUpperCase().startsWith('BAB IV'));
            if (bab4Idx >= 0) {
                // Prepend penutup elements as the first section to display
                chapters[bab4Idx].sections = [{
                    title: '',
                    level: 2,
                    isPenutupTemplate: true,
                    templateData: { penutup: finalPenutupData },
                }, ...chapters[bab4Idx].sections.filter(s => !s.isPenutupTemplate)];
            } else {
                // BAB IV absent — create it and insert before BAB V
                const bab5Idx = chapters.findIndex(c => c.title?.toUpperCase().startsWith('BAB V'));
                const bab4Chapter = {
                    title: 'BAB IV PENUTUP',
                    sections: [{ title: '', level: 2, isPenutupTemplate: true, templateData: { penutup: finalPenutupData } }],
                };
                if (bab5Idx >= 0) chapters.splice(bab5Idx, 0, bab4Chapter);
                else chapters.push(bab4Chapter);
            }
        }
    }
    // ── Section 1: Front matter (roman) ──────────────────────────────────────
    const sec1Children = [];

    const coverLetterElems = await buildCoverLetter(coverLetterData, logoPath);
    sec1Children.push(...coverLetterElems);

    const coverPageElems = await buildCoverPage(coverPageData, coverLogoPath);
    sec1Children.push(...coverPageElems);
    sec1Children.push(pageBreak());

    sec1Children.push(...buildForeword(forewordData));
    sec1Children.push(...buildAutoTOC());

    const sections = [
        // Section 1: roman page numbers (i, ii, iii)
        {
            properties: {
                page: {
                    size: A4_P,
                    margin: MARGINS,
                    pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN },
                },
                titlePage: true,
            },
            footers: {
                default: buildPageFooter(),
                first: new Footer({ children: [new Paragraph({ children: [] })] }),
            },
            children: sec1Children,
        },
    ];

    // ── Section 2+: One Word section per BAB ─────────────────────────────────
    let arabicPageStart = 1; // reset arabic counter at first chapter

    for (const [idx, chapter] of (chapters || []).entries()) {
        const chapElems = await buildChapter(chapter.title, chapter.sections, idx === 0, coverPageData);
        const landscape = isLandscapeChapter(chapter.title);
        const isBab4 = chapter.title && chapter.title.toUpperCase().startsWith('BAB IV');

        const { convertInchesToTwip } = await import('docx');
        const cm = (val) => Math.round(val * 567); // 1cm = 567 twip
        // BAB IV PENUTUP needs tighter margins to fit exactly on ONE page with the huge signature badge
        const customMargin = isBab4 ? { top: cm(2), bottom: cm(2), left: cm(2.5), right: cm(2) } : null;

        sections.push({
            properties: {
                ...buildSectionProps(landscape, idx === 0 ? arabicPageStart : null, true, customMargin),
                ...(idx === 0 ? {} : {}), // page numbering continues automatically
            },
            footers: {
                default: buildPageFooter(),
            },
            children: chapElems,
        });
    }

    // ── Assemble document ────────────────────────────────────────────────────
    const doc = new Document({
        styles: {
            ...GOVERNMENT_STYLES,
            paragraphStyles: PARAGRAPH_STYLES,
        },
        features: { updateFields: true },
        sections,
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename || 'Laporan_Bulanan.docx');
    return true;
};

export default { generateDocx };

