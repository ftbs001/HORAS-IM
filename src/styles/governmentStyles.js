/**
 * Government Document Styles
 * Style definitions for official Indonesian government reports
 * 
 * Based on Kementerian Imigrasi dan Pemasyarakatan RI standards
 */

import { AlignmentType, HeadingLevel } from 'docx';

// ==================== UNITS ====================
export const CM = 567;  // 1 cm in twips
export const MM = 56.7; // 1 mm in twips

// ==================== MARGINS ====================
export const MARGINS = {
    LEFT: 2 * CM,     // 2 cm (standardized for user's office)
    RIGHT: 2 * CM,    // 2 cm
    TOP: 2 * CM,      // 2 cm
    BOTTOM: 2 * CM,   // 2 cm
};

// ==================== FONTS ====================
export const FONT = {
    NAME: 'Arial',    // Changed from Times New Roman per user requirements
    SIZE: {
        BODY: 24,       // 12pt (half-points)
        TITLE: 28,      // 14pt
        LARGE: 32,      // 16pt
        XLARGE: 40,     // 20pt
        SMALL: 22,      // 11pt
        XSMALL: 20,     // 10pt
        XXSMALL: 18,    // 9pt
    },
};

// ==================== SPACING ====================
export const SPACING = {
    LINE_1: 240,            // 1.0 line spacing (single) - new standard for exports
    LINE_1_5: 360,          // 1.5 line spacing (twips) - kept for backward compatibility
    LINE_2: 480,            // Double spacing
    BEFORE_HEADING: 360,    // Space before heading
    AFTER_HEADING: 240,     // Space after heading
    AFTER_PARA: 120,        // Space after paragraph
};

// ==================== INDENTATION ====================
export const INDENT = {
    FIRST_LINE: 1.25 * CM,  // First line indent for paragraphs
    SUB_BAB: 0.5 * CM,      // Sub-bab indent
    SUB_SUB_BAB: 1 * CM,    // Sub-sub bab indent
};

// Page content width (A4 - margins)
export const PAGE_WIDTH = 21 * CM - MARGINS.LEFT - MARGINS.RIGHT;
export const PAGE_HEIGHT = 29.7 * CM - MARGINS.TOP - MARGINS.BOTTOM;

// ==================== DOCUMENT STYLES ====================
export const GOVERNMENT_STYLES = {
    default: {
        document: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BODY,
            },
            paragraph: {
                spacing: { line: SPACING.LINE_1_5 },
                alignment: AlignmentType.JUSTIFIED,
            },
        },
        // HEADING 1 - BAB (12pt Bold Uppercase Center, page break before)
        heading1: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BODY,
                bold: true,
                allCaps: true,
            },
            paragraph: {
                alignment: AlignmentType.CENTER,
                spacing: {
                    before: 0,
                    after: SPACING.AFTER_HEADING * 2,
                    line: SPACING.LINE_1_5,
                },
            },
        },
        // HEADING 2 - Sub BAB (12pt Bold Left, no page break)
        heading2: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BODY,
                bold: true,
            },
            paragraph: {
                alignment: AlignmentType.LEFT,
                spacing: {
                    before: SPACING.BEFORE_HEADING,
                    after: SPACING.AFTER_HEADING,
                    line: SPACING.LINE_1_5,
                },
            },
        },
        // HEADING 3 - Sub-Sub BAB (12pt Regular Left, indented)
        heading3: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BODY,
            },
            paragraph: {
                alignment: AlignmentType.LEFT,
                spacing: {
                    before: SPACING.BEFORE_HEADING / 2,
                    after: SPACING.AFTER_PARA,
                    line: SPACING.LINE_1_5,
                },
            },
        },
        // HEADING 4 - Point (12pt Regular Left, more indented) - a., b., c.
        heading4: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BODY,
            },
            paragraph: {
                alignment: AlignmentType.LEFT,
                spacing: {
                    before: SPACING.BEFORE_HEADING / 4,
                    after: SPACING.AFTER_PARA / 2,
                    line: SPACING.LINE_1_5,
                },
            },
        },
    },
};

// ==================== PAGE SETUP ====================
export const PAGE_SETUP = {
    size: {
        width: 11906,   // A4 width in twips
        height: 16838,  // A4 height in twips
    },
    margin: MARGINS,
};

// ==================== TOC STYLES ====================
export const TOC_STYLES = {
    level0: {
        bold: true,
        indent: 0,
    },
    level1: {
        bold: false,
        indent: 0.75 * CM,
    },
    level2: {
        bold: false,
        indent: 1.25 * CM,
    },
    level3: {
        bold: false,
        indent: 1.75 * CM,
    },
};

// ==================== LETTERHEAD STYLES ====================
// Font: Arial as per government standards for kop surat
export const LETTERHEAD = {
    FONT: {
        NAME: 'Arial',
        SIZE: {
            LINE_1_3: 20,   // 10pt (half-points) - Kementerian...Kantor Wilayah
            LINE_4: 22,     // 11pt (half-points) - Kantor Imigrasi (Bold)
            LINE_5: 18,     // 9pt (half-points) - Address
            LINE_6: 16,     // 8pt (half-points) - Website/Email
        },
    },
    LOGO: {
        WIDTH_CM: 2.2,
        HEIGHT_CM: 2.2,
        WIDTH_TWIPS: 2.2 * 567,  // ~1247 twips
        HEIGHT_TWIPS: 2.2 * 567,
    },
    BORDER: {
        THICKNESS: 4,       // 0.5pt = 4 eighths of a point
        COLOR: '000000',
        STYLE: 'single',
    },
};

export default {
    CM,
    MM,
    MARGINS,
    FONT,
    SPACING,
    INDENT,
    PAGE_WIDTH,
    PAGE_HEIGHT,
    GOVERNMENT_STYLES,
    PAGE_SETUP,
    TOC_STYLES,
    LETTERHEAD,
};
