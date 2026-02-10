/**
 * DOCX Exporter - Professional Government Report Layout
 * 
 * Uses style-based formatting and proper page break control
 * Based on Kementerian Imigrasi dan Pemasyarakatan RI standards
 */

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    AlignmentType,
    PageBreak,
    WidthType,
    UnderlineType,
    HeadingLevel,
    TabStopType,
    LeaderType,
    ImageRun,
    VerticalAlign,
    TableLayoutType,
} from 'docx';
import { saveAs } from 'file-saver';

// Import centralized styles
import {
    CM,
    MARGINS,
    FONT,
    SPACING,
    INDENT,
    PAGE_WIDTH,
    GOVERNMENT_STYLES,
    PAGE_SETUP,
    TOC_STYLES,
} from '../styles/governmentStyles';

// Import image handler
import { fetchImageAsArrayBuffer, loadLogo } from './imageHandler';

// Import global letterhead generator
import { generateLetterhead } from './letterheadGenerator';

// ==================== PARAGRAPH HELPERS ====================

const createTextRun = (text, options = {}) => {
    return new TextRun({
        text: text || '',
        font: FONT.NAME,
        size: options.size || FONT.SIZE.BODY,
        bold: options.bold || false,
        italics: options.italics || false,
        underline: options.underline,
        allCaps: options.allCaps || false,
    });
};

const createParagraph = (text, options = {}) => {
    return new Paragraph({
        children: [createTextRun(text, options)],
        alignment: options.alignment || AlignmentType.JUSTIFIED,
        spacing: {
            before: options.spaceBefore || 0,
            after: options.spaceAfter || 0,  // No spacing after (per user requirements)
            line: SPACING.LINE_1,  // Single spacing (240 twips)
        },
        indent: options.indent ? { firstLine: INDENT.FIRST_LINE } : undefined,
        // Prevent orphan headings - keep with next paragraph
        keepNext: options.keepNext || false,
        keepLines: options.keepLines || false,
    });
};

const createCenteredParagraph = (text, options = {}) => {
    return createParagraph(text, { ...options, alignment: AlignmentType.CENTER });
};

const createEmptyParagraph = (count = 1) => {
    return Array(count).fill(null).map(() =>
        new Paragraph({ children: [], spacing: { after: 200 } })
    );
};

const createPageBreak = () => {
    return new Paragraph({ children: [new PageBreak()] });
};

// ==================== HTML CONTENT CLEANER ====================

const cleanHtmlContent = (html) => {
    if (!html) return '';

    // Remove page break styles that cause "liar" page breaks
    let cleaned = html
        .replace(/<div[^>]*style="[^"]*page-break[^"]*"[^>]*>/gi, '<div>')
        .replace(/page-break-before:\s*always;?/gi, '')
        .replace(/page-break-after:\s*always;?/gi, '')
        .replace(/break-before:\s*page;?/gi, '')
        .replace(/break-after:\s*page;?/gi, '');

    return cleaned;
};

const stripHtml = (html) => {
    if (!html) return '';

    const cleaned = cleanHtmlContent(html);

    return cleaned
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
        .trim();
};

// ==================== COVER LETTER (SURAT PENGANTAR) ====================

const createCoverLetter = async (data, logoPath) => {
    if (!data || !data.nomor) return [];

    const elements = [];

    // Use global letterhead generator
    const letterheadElements = await generateLetterhead(logoPath);
    elements.push(...letterheadElements);

    // Date (right-aligned, after letterhead)
    elements.push(
        new Paragraph({
            children: [createTextRun(data.tanggal || '')],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 200 },
        })
    );

    // Metadata
    const metaRows = [
        ['Nomor', data.nomor],
        ['Sifat', data.sifat],
        ['Lampiran', data.lampiran],
        ['Hal', data.hal],
    ];

    metaRows.forEach(([label, value]) => {
        elements.push(
            new Paragraph({
                children: [
                    createTextRun(label),
                    createTextRun('\\t: ' + (value || '-')),
                ],
                tabStops: [{ type: TabStopType.LEFT, position: 2 * CM }],
                spacing: { after: 40 },
            })
        );
    });

    elements.push(...createEmptyParagraph(1));

    // Recipient
    if (data.tujuan) {
        elements.push(
            new Paragraph({
                children: [createTextRun(data.tujuan)],
                spacing: { after: 300 },
            })
        );
    }

    // Content
    const paragraphs = (data.isi || '').split('\n\n');
    paragraphs.forEach(p => {
        if (p.trim()) {
            elements.push(createParagraph(p.replace(/\n/g, ' '), { indent: true }));
        }
    });

    elements.push(...createEmptyParagraph(2));

    // Signature
    elements.push(
        new Paragraph({
            children: [createTextRun('Kepala Kantor,')],
            alignment: AlignmentType.RIGHT,
        })
    );

    elements.push(...createEmptyParagraph(4));

    elements.push(
        new Paragraph({
            children: [
                createTextRun(data.penandatangan || '', { bold: true, underline: { type: UnderlineType.SINGLE } }),
            ],
            alignment: AlignmentType.RIGHT,
        })
    );

    elements.push(...createEmptyParagraph(2));

    // Tembusan
    elements.push(
        new Paragraph({
            children: [createTextRun('Tembusan:', { size: FONT.SIZE.XSMALL, bold: true })],
        })
    );
    elements.push(
        new Paragraph({
            children: [createTextRun('1. Sekretaris Direktorat Jenderal Imigrasi Kemenkumham RI', { size: FONT.SIZE.XSMALL })],
            indent: { left: INDENT.SUB_BAB },
        })
    );

    elements.push(createPageBreak());

    return elements;
};

// ==================== COVER PAGE ====================

const createCoverPage = async (data, logoPath) => {
    if (!data) return [];

    const elements = [];

    elements.push(...createEmptyParagraph(4));

    elements.push(createCenteredParagraph('KANTOR IMIGRASI KELAS II TPI', { size: FONT.SIZE.TITLE, bold: true, spaceAfter: 0 }));
    elements.push(createCenteredParagraph('PEMATANG SIANTAR', { size: FONT.SIZE.TITLE, bold: true, spaceAfter: 600 }));

    elements.push(createCenteredParagraph(data.reportTitle || 'LAPORAN BULANAN', { size: FONT.SIZE.XLARGE, bold: true, spaceAfter: 300 }));
    elements.push(createCenteredParagraph(`${data.month || ''} ${data.year || ''}`, { size: FONT.SIZE.LARGE, bold: true, spaceAfter: 800 }));

    // Logo
    if (logoPath) {
        const logoData = await fetchImageAsArrayBuffer(logoPath);
        if (logoData) {
            elements.push(
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: logoData,
                            transformation: { width: 100, height: 100 },
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 800 },
                })
            );
        }
    } else {
        elements.push(createCenteredParagraph('[LOGO KEMENTERIAN]', { size: FONT.SIZE.XSMALL, spaceAfter: 800 }));
    }

    elements.push(...createEmptyParagraph(4));

    const footerLines = [
        'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN',
        'REPUBLIK INDONESIA',
        'DIREKTORAT JENDERAL IMIGRASI',
        data.year || new Date().getFullYear().toString(),
    ];

    footerLines.forEach(line => {
        elements.push(createCenteredParagraph(line, { bold: true, spaceAfter: 40 }));
    });

    elements.push(createPageBreak());

    return elements;
};

// ==================== FOREWORD ====================

const createForeword = (data) => {
    if (!data || !data.content) return [];

    const elements = [];

    elements.push(createCenteredParagraph('KATA PENGANTAR', { size: FONT.SIZE.TITLE, bold: true, spaceAfter: 400 }));
    elements.push(...createEmptyParagraph(1));

    const paragraphs = stripHtml(data.content).split('\n\n');
    paragraphs.forEach(p => {
        if (p.trim()) {
            elements.push(createParagraph(p.replace(/\n/g, ' '), { indent: true }));
        }
    });

    elements.push(createPageBreak());

    return elements;
};

// ==================== TABLE OF CONTENTS ====================

/**
 * Creates professional Table of Contents
 * - 4 levels: BAB (H1), Sub BAB (H2), Sub-Sub BAB (H3), Point (H4)
 * - Single spacing for compact 1-page layout
 * - Precise dot leader with right-aligned page numbers
 * - No manual spacing - uses tab stops only
 */
const createTableOfContents = (items) => {
    const elements = [];

    // Title
    elements.push(
        new Paragraph({
            children: [createTextRun('DAFTAR ISI', { bold: true, size: FONT.SIZE.TITLE })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400, line: 240 }, // Single spacing
        })
    );

    // TOC indentation per level (in cm converted to twips)
    const TOC_INDENT = {
        0: 0,           // Heading 1 (BAB) - 0 cm
        1: 0.75 * CM,   // Heading 2 (Sub BAB) - 0.75 cm
        2: 1.25 * CM,   // Heading 3 (Sub-Sub BAB) - 1.25 cm
        3: 1.75 * CM,   // Heading 4 (Point) - 1.75 cm
    };

    // TOC bold rules
    const isBold = (level) => level === 0; // Only BAB is bold

    if (items && Array.isArray(items)) {
        items.forEach((item) => {
            const level = Math.min(item.level || 0, 3); // Cap at level 3
            const indent = TOC_INDENT[level] || 0;

            elements.push(
                new Paragraph({
                    children: [
                        // Title text
                        new TextRun({
                            text: item.title || '',
                            font: FONT.NAME,
                            size: FONT.SIZE.BODY,
                            bold: isBold(level),
                        }),
                        // Tab for dot leader
                        new TextRun({ text: '\t' }),
                        // Page number
                        new TextRun({
                            text: item.page ? item.page.toString() : '',
                            font: FONT.NAME,
                            size: FONT.SIZE.BODY,
                        }),
                    ],
                    tabStops: [{
                        type: TabStopType.RIGHT,
                        position: PAGE_WIDTH,
                        leader: LeaderType.DOT,
                    }],
                    indent: { left: indent },
                    spacing: {
                        before: 0,
                        after: 0,  // No extra spacing - compact
                        line: 240, // Single spacing (240 = 1.0)
                    },
                })
            );
        });
    }

    // Add some space before page break
    elements.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    elements.push(createPageBreak());

    return elements;
};


// ==================== CHAPTER (BAB) ====================

const createBabHeader = (text, addPageBreak = false) => {
    const elements = [];

    if (addPageBreak) {
        elements.push(createPageBreak());
    }

    elements.push(
        new Paragraph({
            children: [createTextRun(text.toUpperCase(), { bold: true, size: FONT.SIZE.TITLE })],  // 14pt
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: SPACING.AFTER_HEADING * 2, line: SPACING.LINE_1 },  // Single spacing
            // Keep heading with next content to prevent orphan
            keepNext: true,
        })
    );

    return elements;
};

const createSubBabHeader = (text) => {
    return new Paragraph({
        children: [createTextRun(text, { bold: true })],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { before: SPACING.BEFORE_HEADING, after: SPACING.AFTER_HEADING, line: SPACING.LINE_1 },  // Single spacing
        keepNext: true,  // Stay with next paragraph
        keepLines: true, // Don't split this paragraph
    });
};

const createSubSubBabHeader = (text) => {
    return new Paragraph({
        children: [createTextRun(text)],
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.LEFT,
        indent: { left: INDENT.SUB_BAB },
        spacing: { before: SPACING.BEFORE_HEADING / 2, after: SPACING.AFTER_PARA, line: SPACING.LINE_1 },  // Single spacing
        keepNext: true,
    });
};

const createChapter = (title, sections, isFirst = false) => {
    const elements = [];

    // BAB header with page break (except first BAB)
    elements.push(...createBabHeader(title, !isFirst));

    if (sections && Array.isArray(sections)) {
        sections.forEach(section => {
            // Section header based on level
            if (section.level === 2) {
                elements.push(createSubBabHeader(section.title));
            } else if (section.level === 3) {
                elements.push(createSubSubBabHeader(section.title));
            } else if (section.title) {
                elements.push(createSubBabHeader(section.title));
            }

            // Section content
            if (section.content) {
                const text = stripHtml(section.content);
                const paragraphs = text.split('\n\n');
                paragraphs.forEach(p => {
                    if (p.trim() && !p.includes('[Belum ada konten]')) {
                        elements.push(createParagraph(p.replace(/\n/g, ' '), { indent: true }));
                    }
                });
            }
        });
    }

    return elements;
};

// ==================== MAIN EXPORT FUNCTION ====================

export const generateDocx = async ({
    coverLetterData,
    coverPageData,
    forewordData,
    tocItems,
    chapters,
    filename,
    logoPath,
    coverLogoPath,
}) => {
    const allElements = [];

    // 1. Cover Letter
    const coverLetterElements = await createCoverLetter(coverLetterData, logoPath);
    allElements.push(...coverLetterElements);

    // 2. Cover Page
    const coverPageElements = await createCoverPage(coverPageData, coverLogoPath);
    allElements.push(...coverPageElements);

    // 3. Foreword
    allElements.push(...createForeword(forewordData));

    // 4. Table of Contents
    allElements.push(...createTableOfContents(tocItems));

    // 5. Chapters
    if (chapters && Array.isArray(chapters)) {
        chapters.forEach((chapter, idx) => {
            allElements.push(...createChapter(chapter.title, chapter.sections, idx === 0));
        });
    }

    // Create document with government styles
    const doc = new Document({
        styles: GOVERNMENT_STYLES,
        sections: [{
            properties: {
                page: PAGE_SETUP,
            },
            children: allElements,
        }],
    });

    // Generate and save
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename || 'Laporan_Bulanan.docx');

    return true;
};

export default { generateDocx };
