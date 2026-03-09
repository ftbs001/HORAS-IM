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
                width: { size: Math.round(cellWidthPct), type: WidthType.PERCENTAGE },
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
        width: { size: 100, type: WidthType.PERCENTAGE },
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
export const htmlToDocxElements = (htmlStr) => {
    if (!htmlStr || typeof htmlStr !== 'string') return [];
    const elements = [];

    // Use DOMParser to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${htmlStr}</body>`, 'text/html');
    const body = doc.body;

    const processNode = (node) => {
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
            node.childNodes.forEach(processNode);
            return;
        }

        // ── br → empty line ───────────────────────────────────────
        if (tag === 'br') {
            elements.push(emptyLine());
            return;
        }

        // ── Fallback: recurse ─────────────────────────────────────
        node.childNodes.forEach(processNode);
    };

    body.childNodes.forEach(processNode);
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

    elems.push(new Paragraph({
        style: STYLE_ID.NORMAL,
        children: [tr(data.tanggal || '')],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200, line: SPACING.LINE_1_5 },
    }));

    [['Nomor', data.nomor], ['Sifat', data.sifat], ['Lampiran', data.lampiran], ['Hal', data.hal]]
        .forEach(([label, value]) => {
            elems.push(new Paragraph({
                style: STYLE_ID.NORMAL,
                children: [tr(label), tr('\t: ' + (value || '-'))],
                tabStops: [{ type: TabStopType.LEFT, position: 2 * CM }],
                spacing: { after: 40, line: SPACING.LINE_1_5 },
            }));
        });

    elems.push(emptyLine());
    if (data.tujuan) elems.push(para(data.tujuan, { spaceAfter: 300 }));

    (data.isi || '').split('\n\n').forEach(p => {
        if (p.trim()) elems.push(para(p.replace(/\n/g, ' '), { indent: true }));
    });

    elems.push(emptyLine());
    elems.push(emptyLine());
    elems.push(new Paragraph({
        style: STYLE_ID.NORMAL,
        children: [tr('Kepala Kantor,')],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0, line: SPACING.LINE_1_5 },
    }));
    for (let i = 0; i < 4; i++) elems.push(emptyLine());
    elems.push(new Paragraph({
        style: STYLE_ID.NORMAL,
        children: [tr(data.penandatangan || '', { bold: true, underline: { type: UnderlineType.SINGLE } })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0, line: SPACING.LINE_1_5 },
    }));
    elems.push(emptyLine());
    elems.push(emptyLine());
    elems.push(new Paragraph({ style: STYLE_ID.NORMAL, children: [tr('Tembusan:', { bold: true, size: FONT.SIZE.XSMALL })], spacing: { after: 0, line: SPACING.LINE_1_5 } }));
    elems.push(new Paragraph({ style: STYLE_ID.NORMAL, children: [tr('1. Sekretaris Direktorat Jenderal Imigrasi Kemenkumham RI', { size: FONT.SIZE.XSMALL })], indent: { left: INDENT.SUB_BAB }, spacing: { after: 0, line: SPACING.LINE_1_5 } }));

    elems.push(pageBreak());
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

    // ── Spasi atas ─────────────────────────────────────────────
    for (let i = 0; i < 5; i++) elems.push(emptyLine());

    // ── Judul Kantor: Bold + Underline + Center ─────────────────
    const titleStyle = (text) => new Paragraph({
        style: STYLE_ID.NORMAL,
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

    elems.push(titleStyle('KANTOR IMIGRASI KELAS II TPI'));
    elems.push(titleStyle('PEMATANG SIANTAR'));

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
            headingStyleRange: '1-3',
            preserveTabInEntries: true,
            preserveNewLineInEntries: false,
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

const buildChapter = async (title, sections, isFirst = false) => {
    const elems = [];
    elems.push(buildBabHeader(title, isFirst));

    for (const section of (sections || [])) {
        if (section.level === 3) {
            elems.push(buildSubSubBabHeader(section.title));
        } else if (section.title) {
            elems.push(buildSubBabHeader(section.title));
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
            if (hasTable) {
                // Use full HTML-to-DOCX converter that preserves tables
                const htmlElems = htmlToDocxElements(section.content);
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

    return elems;
};


// ==================== MAIN EXPORT FUNCTION ====================

/**
 * Generates and downloads a government monthly report .docx.
 *
 * Document structure (two-section, required for split page numbering):
 *
 *  Section 1 — Front matter (roman: i, ii, iii — bottom center)
 *    Cover Letter  → Cover Page  → Kata Pengantar  → Daftar Isi (auto-TOC)
 *
 *  Section 2 — Chapters (arabic: 1, 2, 3 — bottom center)
 *    BAB I … BAB V
 *
 * Named styles embedded in PARAGRAPH_STYLES prevent any inline-override drift.
 * updateFields: true causes Word to auto-populate TOC on open.
 */
export const generateDocx = async ({
    coverLetterData,
    coverPageData,
    forewordData,
    tocItems,          // kept for fallback, but auto-TOC is primary
    chapters,
    filename,
    logoPath,
    coverLogoPath,
}) => {
    // ── Section 1: Front matter ──────────────────────────────────────────────
    const sec1 = [];

    const coverLetterElems = await buildCoverLetter(coverLetterData, logoPath);
    sec1.push(...coverLetterElems);

    const coverPageElems = await buildCoverPage(coverPageData, coverLogoPath);
    sec1.push(...coverPageElems);
    sec1.push(pageBreak());

    sec1.push(...buildForeword(forewordData));
    sec1.push(...buildAutoTOC());

    // ── Section 2: Chapters (await each — buildChapter is now async for image embedding) ─
    const sec2 = [];
    for (const [idx, chapter] of (chapters || []).entries()) {
        const chapElems = await buildChapter(chapter.title, chapter.sections, idx === 0);
        sec2.push(...chapElems);
    }

    // ── Assemble document ────────────────────────────────────────────────────
    const doc = new Document({
        // v3: Named styles embedded — single source of formatting truth
        styles: {
            ...GOVERNMENT_STYLES,
            paragraphStyles: PARAGRAPH_STYLES,
        },

        // Word auto-updates TOC page numbers on open
        features: { updateFields: true },

        sections: [
            // Section 1: roman page numbers (i, ii, iii)
            {
                properties: {
                    type: SectionType.NEXT_PAGE,
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: MARGINS,
                        pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN },
                    },
                    titlePage: true,
                },
                footers: {
                    default: buildPageFooter(),
                    first: new Footer({ children: [new Paragraph({ children: [] })] }),
                },
                children: sec1,
            },

            // Section 2: arabic page numbers (1, 2, 3)
            {
                properties: {
                    type: SectionType.NEXT_PAGE,
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: MARGINS,
                        pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
                    },
                },
                footers: {
                    default: buildPageFooter(),
                },
                children: sec2,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename || 'Laporan_Bulanan.docx');
    return true;
};

export default { generateDocx };
