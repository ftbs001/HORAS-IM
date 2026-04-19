/**
 * Government Document Styles — TEMPLATE ARCHITECTURE v3
 *
 * Standar Laporan Bulanan Resmi Instansi Pemerintah RI
 *
 * LOCKED SETTINGS:
 *   Font    : Arial
 *   Margin  : 2cm all sides
 *   Spacing : 1.5 lines, 6pt after paragraph
 *   Body    : 11pt (22 half-points)
 *   BAB     : 14pt Bold Uppercase Center (Heading 1)
 *   Sub-BAB : 12pt Bold Left             (Heading 2)
 *   Sub-Sub : 11pt Bold Left             (Heading 3)
 *   Align   : Justify
 *   Color   : Black (#000000)
 *
 * v3: Uses PARAGRAPH_STYLES (named Word styles) instead of inline overrides.
 *     TOC auto-generated from Heading 1/2/3 via docx TableOfContents.
 */

import { AlignmentType } from 'docx';

// ==================== UNIT CONVERSION ====================
export const CM = 567;  // 1 cm in twips (1 inch = 1440 twips, 1 inch = 2.54 cm)
export const MM = 56.7; // 1 mm in twips

// ==================== MARGINS ====================
export const MARGINS = {
    LEFT: 3 * CM,   // 3 cm  (Professional standard for binded reports)
    RIGHT: 2 * CM,  // 2 cm
    TOP: 2 * CM,    // 2 cm
    BOTTOM: 2 * CM, // 2 cm
};

// ==================== FONTS (LOCKED: Arial) ====================
export const FONT = {
    NAME: 'Arial',   // LOCKED — do not change
    SIZE: {
        BODY: 22,  // 11pt (half-points) — LOCKED
        SUB_BAB: 24,  // 12pt
        BAB: 28,  // 14pt
        LARGE: 32,  // 16pt
        XLARGE: 40,  // 20pt
        SMALL: 22,  // 11pt
        XSMALL: 20,  // 10pt
        XXSMALL: 18,  //  9pt
        // Legacy aliases
        TITLE: 28,  // 14pt — same as BAB
    },
};

// ==================== SPACING (LOCKED: 1.5 lines) ====================
export const SPACING = {
    LINE_1_5: 360,          // 1.5 line spacing (twips) — LOCKED DEFAULT
    LINE_1: 240,          // 1.0 line spacing — for TOC / cover only
    LINE_2: 480,          // Double spacing
    BEFORE_HEADING: 360,   // Space before sub-heading (1 empty line)
    AFTER_HEADING: 120,   // Space after heading before content
    AFTER_PARA: 120,   // Space after paragraph
    PARA_SPACING_PT: 120,   // 6pt paragraph spacing-after (6 * 20 twips)
};

// ==================== INDENTATION ====================
export const INDENT = {
    FIRST_LINE: 1.25 * CM,  // 1.25 cm first-line indent for body paragraphs
    SUB_BAB: 0.5 * CM,  // Sub-bab left indent
    SUB_SUB_BAB: 1.0 * CM,  // Sub-sub-bab left indent
};

// A4 content width: 21cm - 2cm - 2cm = 17cm
export const PAGE_WIDTH = 21 * CM - MARGINS.LEFT - MARGINS.RIGHT;  // 17 cm = 9639 twips
export const PAGE_HEIGHT = 29.7 * CM - MARGINS.TOP - MARGINS.BOTTOM; // 25.7 cm

// ==================== DOCUMENT-LEVEL STYLES ====================
/**
 * Style definitions embedded in the DOCX document.
 * These serve as the global "Normal" and Heading styles.
 * Inline overrides in paragraph / textRun should mirror these values.
 */
export const GOVERNMENT_STYLES = {
    default: {
        document: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BODY,
                color: '000000',
            },
            paragraph: {
                spacing: {
                    line: SPACING.LINE_1_5,
                    after: SPACING.PARA_SPACING_PT,
                },
                alignment: AlignmentType.JUSTIFIED,
            },
        },

        // HEADING 1 — BAB
        // Uppercase · Bold · Center · 14pt · Page-break before · Underline border
        heading1: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BAB,    // 14pt
                bold: true,
                allCaps: true,
                color: '000000',
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

        // HEADING 2 — Sub-BAB  (A., B., C.)
        // Bold · Left · 13pt
        heading2: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.SUB_BAB,  // 13pt
                bold: true,
                color: '000000',
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

        // HEADING 3 — Sub-Sub-BAB  (1., 2., 3.)
        // Bold · Left · 12pt
        heading3: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BODY,     // 12pt
                bold: true,
                color: '000000',
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

        // HEADING 4 — Detail point (a., b., c.)
        // Regular · Left · 12pt
        heading4: {
            run: {
                font: FONT.NAME,
                size: FONT.SIZE.BODY,
                color: '000000',
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
        width: 11906,  // A4 width  in twips (21.0 cm)
        height: 16838,  // A4 height in twips (29.7 cm)
    },
    margin: MARGINS,
};

// PAGE SETUP for section with PAGE NUMBERS at bottom center
export const PAGE_SETUP_ROMAN = {
    ...PAGE_SETUP,
    pageNumberStart: 1,
    pageNumberFormatType: 'lowerRoman',  // i, ii, iii
};

export const PAGE_SETUP_ARABIC = {
    ...PAGE_SETUP,
    pageNumberStart: 1,
    pageNumberFormatType: 'decimal',     // 1, 2, 3
};

// ==================== TOC STYLES ====================
export const TOC_STYLES = {
    level0: { bold: true, indent: 0 },
    level1: { bold: false, indent: 0.75 * CM },
    level2: { bold: false, indent: 1.25 * CM },
    level3: { bold: false, indent: 1.75 * CM },
};

// ==================== LETTERHEAD STYLES ====================
// Kop surat — uses Arial per government standard
export const LETTERHEAD = {
    FONT: {
        NAME: 'Arial',
        SIZE: {
            LINE_1_3: 20,   // 10pt — Kementerian … Kantor Wilayah
            LINE_4: 22,   // 11pt — Kantor Imigrasi (Bold)
            LINE_5: 18,   //  9pt — Address
            LINE_6: 16,   //  8pt — Website/Email
        },
    },
    LOGO: {
        WIDTH_CM: 2.2,
        HEIGHT_CM: 2.2,
        WIDTH_TWIPS: Math.round(2.2 * CM),
        HEIGHT_TWIPS: Math.round(2.2 * CM),
    },
    BORDER: {
        THICKNESS: 4,
        COLOR: '000000',
        STYLE: 'single',
    },
};

// ==================== NAMED WORD STYLES (v3 Template Architecture) ====================
/**
 * PARAGRAPH_STYLES — embedded in styles.xml of the output .docx.
 *
 * These are the SINGLE SOURCE of truth for formatting.
 * Paragraphs reference these by `style` name only — NO inline overrides allowed.
 *
 * Style IDs used in paragraphs:
 *   'GovernmentNormal'    → body text
 *   'GovernmentBAB'       → Heading 1 (BAB)
 *   'GovernmentSubBAB'    → Heading 2 (Sub-BAB A./B./C.)
 *   'GovernmentSubSubBAB' → Heading 3 (Sub-Sub-BAB 1./2./3.)
 */
export const STYLE_ID = {
    NORMAL: 'GovernmentNormal',
    HEADING_1: 'GovernmentBAB',
    HEADING_2: 'GovernmentSubBAB',
    HEADING_3: 'GovernmentSubSubBAB',
};

export const PARAGRAPH_STYLES = [
    // ── Normal (body text) ──────────────────────────────────────────────────
    {
        id: STYLE_ID.NORMAL,
        name: 'Normal',
        basedOn: 'Normal',
        quickFormat: true,
        run: {
            font: 'Arial',
            size: 22,          // 11pt
            color: '000000',
        },
        paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                line: 360,     // 1.5
                after: 120,     // 6pt  (6 × 20 twips)
            },
        },
    },

    // ── Heading 1 — BAB ─────────────────────────────────────────────────────
    // 14pt · Bold · Uppercase · Center · No border (per spec image)
    {
        id: STYLE_ID.HEADING_1,
        name: 'Heading 1',
        basedOn: 'Heading1',
        next: STYLE_ID.NORMAL,
        quickFormat: true,
        run: {
            font: 'Arial',
            size: 28,        // 14pt
            bold: true,
            allCaps: true,
            color: '000000',
        },
        paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 0,
                after: 240,    // 12pt gap between BAB number and title
                line: 360,
            },
        },
    },

    // ── Heading 2 — Sub-BAB (A., B., C.) ────────────────────────────────────
    // 12pt · Bold · Left
    {
        id: STYLE_ID.HEADING_2,
        name: 'Heading 2',
        basedOn: 'Heading2',
        next: STYLE_ID.NORMAL,
        quickFormat: true,
        run: {
            font: 'Arial',
            size: 24,          // 12pt
            bold: true,
            color: '000000',
        },
        paragraph: {
            alignment: AlignmentType.LEFT,
            spacing: {
                before: 360,    // 18pt before
                after: 120,    // 6pt after
                line: 360,
            },
        },
    },

    // ── Heading 3 — Sub-Sub-BAB (1., 2., 3.) ────────────────────────────────
    // 11pt · Bold · Left
    {
        id: STYLE_ID.HEADING_3,
        name: 'Heading 3',
        basedOn: 'Heading3',
        next: STYLE_ID.NORMAL,
        quickFormat: true,
        run: {
            font: 'Arial',
            size: 22,          // 11pt
            bold: true,
            color: '000000',
        },
        paragraph: {
            alignment: AlignmentType.LEFT,
            spacing: {
                before: 180,    // 9pt before
                after: 120,    // 6pt after
                line: 360,
            },
        },
    },
];

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
    PAGE_SETUP_ROMAN,
    PAGE_SETUP_ARABIC,
    TOC_STYLES,
    LETTERHEAD,
    STYLE_ID,
    PARAGRAPH_STYLES,
};
