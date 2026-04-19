/**
 * Letterhead Generator for DOCX Export
 * 
 * Creates professional government letterhead (kop surat)
 * for use with docx library exports
 * 
 * Based on Kementerian Imigrasi dan Pemasyarakatan RI standards
 */

import {
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    AlignmentType,
    WidthType,
    ImageRun,
    VerticalAlign,
    TableLayoutType,
} from 'docx';

import {
    LETTERHEAD_LOGO,
    LETTERHEAD_FONT,
    LETTERHEAD_STYLES,
    LETTERHEAD_BORDER,
} from './letterheadConfig';

import { fetchImageAsArrayBuffer } from './imageHandler';

// ==================== HELPER FUNCTIONS ====================

/**
 * Create a text run with letterhead font (Arial)
 */
const createLetterheadTextRun = (text, options = {}) => {
    return new TextRun({
        text: text || '',
        font: LETTERHEAD_FONT.FAMILY,
        size: options.size || LETTERHEAD_FONT.SIZE_HALF_POINTS.LINE_1_3,
        bold: options.bold || false,
    });
};

/**
 * Create a centered paragraph for letterhead
 */
const createLetterheadParagraph = (text, options = {}) => {
    return new Paragraph({
        children: [createLetterheadTextRun(text, options)],
        alignment: AlignmentType.CENTER,
        spacing: {
            before: 0,
            after: options.spaceAfter || 0,
            line: 240, // Single spacing
        },
    });
};

// ==================== MAIN LETTERHEAD GENERATOR ====================

/**
 * Generate letterhead table with logo and text
 * 
 * @param {string} logoPath - Path or URL to the logo image
 * @param {object} data - Optional coverLetterData containing letterhead1-6 overrides
 * @returns {Promise<Array>} Array of docx elements (Table and border Paragraph)
 */
export const generateLetterhead = async (logoPath, data = {}) => {
    const elements = [];

    // Use default logo URL if no path provided
    const logoUrl = logoPath || LETTERHEAD_LOGO.DEFAULT_URL;

    // Try to load logo
    let logoRun = null;
    if (logoUrl) {
        try {
            const logoData = await fetchImageAsArrayBuffer(logoUrl);
            if (logoData) {
                logoRun = new ImageRun({
                    data: logoData,
                    transformation: {
                        width: LETTERHEAD_LOGO.WIDTH_PX,
                        height: LETTERHEAD_LOGO.HEIGHT_PX,
                    },
                });
            }
        } catch (error) {
            console.warn('Failed to load letterhead logo:', error);
        }
    }

    // Logo cell (left side)
    const logoCell = new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        borders: {
            top: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
            bottom: { style: BorderStyle.NIL },
        },
        children: logoRun ? [
            new Paragraph({
                children: [logoRun],
                alignment: AlignmentType.CENTER,
            }),
        ] : [
            new Paragraph({
                children: [createLetterheadTextRun('[LOGO]', {
                    size: LETTERHEAD_FONT.SIZE_HALF_POINTS.LINE_6
                })],
                alignment: AlignmentType.CENTER,
            }),
        ],
    });

    // Text cell (right side) - All letterhead text lines
    const textCell = new TableCell({
        width: { size: 85, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        borders: {
            top: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
            bottom: { style: BorderStyle.NIL },
        },
        children: [
            // Line 1: KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA
            createLetterheadParagraph(data?.letterhead1 || LETTERHEAD_STYLES.LINE_1.text, {
                size: LETTERHEAD_STYLES.LINE_1.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_1.bold,
            }),
            // Line 2: DIREKTORAT JENDERAL IMIGRASI
            createLetterheadParagraph(data?.letterhead2 || LETTERHEAD_STYLES.LINE_2.text, {
                size: LETTERHEAD_STYLES.LINE_2.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_2.bold,
            }),
            // Line 3: KANTOR WILAYAH SUMATERA UTARA
            createLetterheadParagraph(data?.letterhead3 || LETTERHEAD_STYLES.LINE_3.text, {
                size: LETTERHEAD_STYLES.LINE_3.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_3.bold,
            }),
            // Line 4: KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR (Bold)
            createLetterheadParagraph(data?.letterhead4 || LETTERHEAD_STYLES.LINE_4.text, {
                size: LETTERHEAD_STYLES.LINE_4.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_4.bold,
                spaceAfter: 40,
            }),
            // Line 5: Address
            createLetterheadParagraph(data?.letterhead5 || LETTERHEAD_STYLES.LINE_5.text, {
                size: LETTERHEAD_STYLES.LINE_5.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_5.bold,
            }),
            // Line 6: Website and Email
            createLetterheadParagraph(data?.letterhead6 || LETTERHEAD_STYLES.LINE_6.text, {
                size: LETTERHEAD_STYLES.LINE_6.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_6.bold,
            }),
        ],
    });

    // Create letterhead table with bottom border
    const letterheadTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        borders: {
            top: { style: BorderStyle.NIL },
            bottom: { 
                style: BorderStyle.DOUBLE, 
                size: 12, // Double line border (typically 1.5pt equivalent)
                color: LETTERHEAD_BORDER.COLOR 
            },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
            insideH: { style: BorderStyle.NIL },
            insideV: { style: BorderStyle.NIL },
        },
        rows: [
            new TableRow({
                children: [logoCell, textCell],
            }),
        ],
    });

    elements.push(letterheadTable);

    return elements;
};

/**
 * Generate letterhead HTML for Word HTML export
 * 
 * @param {string} logoBase64 - Base64 encoded logo image
 * @returns {string} HTML string for letterhead
 */
export const generateLetterheadHTML = (logoBase64) => {
    const f = LETTERHEAD_FONT.FAMILY;
    const logoW = LETTERHEAD_LOGO.WIDTH_CM;
    const logoH = LETTERHEAD_LOGO.HEIGHT_CM;
    return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:none;margin:0;padding:0;font-family:${f},sans-serif;"><tr><td style="width:${logoW}cm;text-align:center;vertical-align:middle;padding:4pt 6pt 0 0;border:none;">${logoBase64 ? `<img src="${logoBase64}" style="width:${logoW}cm;height:${logoH}cm;display:block;margin:0 auto;" />` : '[LOGO]'}</td><td style="text-align:center;vertical-align:middle;padding:4pt 0 0 0;border:none;"><div style="font-family:${f},sans-serif;font-size:${LETTERHEAD_FONT.SIZE.LINE_1_3}pt;font-weight:normal;line-height:1.3;margin:0;padding:0;">${LETTERHEAD_STYLES.LINE_1.text}</div><div style="font-family:${f},sans-serif;font-size:${LETTERHEAD_FONT.SIZE.LINE_1_3}pt;font-weight:normal;line-height:1.3;margin:0;padding:0;">${LETTERHEAD_STYLES.LINE_2.text}</div><div style="font-family:${f},sans-serif;font-size:${LETTERHEAD_FONT.SIZE.LINE_1_3}pt;font-weight:normal;line-height:1.3;margin:0;padding:0;">${LETTERHEAD_STYLES.LINE_3.text}</div><div style="font-family:${f},sans-serif;font-size:${LETTERHEAD_FONT.SIZE.LINE_4}pt;font-weight:bold;line-height:1.4;margin:1pt 0;padding:0;">${LETTERHEAD_STYLES.LINE_4.text}</div><div style="font-family:${f},sans-serif;font-size:${LETTERHEAD_FONT.SIZE.LINE_5}pt;font-weight:normal;line-height:1.3;margin:0;padding:0;">${LETTERHEAD_STYLES.LINE_5.text}</div><div style="font-family:${f},sans-serif;font-size:${LETTERHEAD_FONT.SIZE.LINE_6}pt;font-weight:normal;line-height:1.3;margin:0;padding:0;">${LETTERHEAD_STYLES.LINE_6.text}</div></td></tr><tr><td colspan="2" style="border-top:3pt solid #000000;height:0;padding:0;line-height:0;font-size:0;border-left:none;border-right:none;border-bottom:none;"></td></tr><tr><td colspan="2" style="border-top:1pt solid #000000;height:0;padding:0;line-height:0;font-size:0;border-left:none;border-right:none;border-bottom:none;"></td></tr></table><p style="margin:0 0 12pt 0;padding:0;line-height:0;font-size:0;"></p>`.trim();
};

export default {
    generateLetterhead,
    generateLetterheadHTML,
};
