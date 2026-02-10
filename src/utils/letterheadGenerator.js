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
 * @returns {Promise<Array>} Array of docx elements (Table and border Paragraph)
 */
export const generateLetterhead = async (logoPath) => {
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
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
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
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
        },
        children: [
            // Line 1: KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA
            createLetterheadParagraph(LETTERHEAD_STYLES.LINE_1.text, {
                size: LETTERHEAD_STYLES.LINE_1.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_1.bold,
            }),
            // Line 2: DIREKTORAT JENDERAL IMIGRASI
            createLetterheadParagraph(LETTERHEAD_STYLES.LINE_2.text, {
                size: LETTERHEAD_STYLES.LINE_2.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_2.bold,
            }),
            // Line 3: KANTOR WILAYAH SUMATERA UTARA
            createLetterheadParagraph(LETTERHEAD_STYLES.LINE_3.text, {
                size: LETTERHEAD_STYLES.LINE_3.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_3.bold,
            }),
            // Line 4: KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR (Bold)
            createLetterheadParagraph(LETTERHEAD_STYLES.LINE_4.text, {
                size: LETTERHEAD_STYLES.LINE_4.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_4.bold,
                spaceAfter: 40,
            }),
            // Line 5: Address
            createLetterheadParagraph(LETTERHEAD_STYLES.LINE_5.text, {
                size: LETTERHEAD_STYLES.LINE_5.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_5.bold,
            }),
            // Line 6: Website and Email
            createLetterheadParagraph(LETTERHEAD_STYLES.LINE_6.text, {
                size: LETTERHEAD_STYLES.LINE_6.fontSizeHalfPoints,
                bold: LETTERHEAD_STYLES.LINE_6.bold,
            }),
        ],
    });

    // Create letterhead table
    const letterheadTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [
            new TableRow({
                children: [logoCell, textCell],
            }),
        ],
    });

    elements.push(letterheadTable);

    // Border line (0.5pt single line)
    const borderLine = new Paragraph({
        children: [],
        border: {
            bottom: {
                style: BorderStyle.SINGLE,
                size: LETTERHEAD_BORDER.THICKNESS_EIGHTH, // 0.5pt = 4 eighths
                color: LETTERHEAD_BORDER.COLOR,
            },
        },
        spacing: {
            before: 100,
            after: 200,
        },
    });

    elements.push(borderLine);

    return elements;
};

/**
 * Generate letterhead HTML for Word HTML export
 * 
 * @param {string} logoBase64 - Base64 encoded logo image
 * @returns {string} HTML string for letterhead
 */
export const generateLetterheadHTML = (logoBase64) => {
    return `
    <table style="width:100%; margin-bottom:10pt; font-family: ${LETTERHEAD_FONT.FAMILY}, sans-serif;">
        <tr>
            <td style="width:${LETTERHEAD_LOGO.WIDTH_CM}cm; text-align:center; vertical-align:middle;">
                ${logoBase64 ?
            `<img src="${logoBase64}" style="width:${LETTERHEAD_LOGO.WIDTH_CM}cm; height:${LETTERHEAD_LOGO.HEIGHT_CM}cm;" />` :
            '[LOGO]'
        }
            </td>
            <td style="text-align:center; vertical-align:middle;">
                <div style="font-size:${LETTERHEAD_FONT.SIZE.LINE_1_3}pt; font-weight:normal; line-height:1.3;">
                    ${LETTERHEAD_STYLES.LINE_1.text}
                </div>
                <div style="font-size:${LETTERHEAD_FONT.SIZE.LINE_1_3}pt; font-weight:normal; line-height:1.3;">
                    ${LETTERHEAD_STYLES.LINE_2.text}
                </div>
                <div style="font-size:${LETTERHEAD_FONT.SIZE.LINE_1_3}pt; font-weight:normal; line-height:1.3;">
                    ${LETTERHEAD_STYLES.LINE_3.text}
                </div>
                <div style="font-size:${LETTERHEAD_FONT.SIZE.LINE_4}pt; font-weight:bold; line-height:1.3;">
                    ${LETTERHEAD_STYLES.LINE_4.text}
                </div>
                <div style="font-size:${LETTERHEAD_FONT.SIZE.LINE_5}pt; font-weight:normal; line-height:1.3;">
                    ${LETTERHEAD_STYLES.LINE_5.text}
                </div>
                <div style="font-size:${LETTERHEAD_FONT.SIZE.LINE_6}pt; font-weight:normal; line-height:1.3;">
                    ${LETTERHEAD_STYLES.LINE_6.text}
                </div>
            </td>
        </tr>
    </table>
    <div style="border-bottom:${LETTERHEAD_BORDER.THICKNESS_PT}pt solid #${LETTERHEAD_BORDER.COLOR}; margin-bottom:15pt;"></div>
    `;
};

export default {
    generateLetterhead,
    generateLetterheadHTML,
};
