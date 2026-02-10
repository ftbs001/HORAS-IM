/**
 * Letterhead Configuration (Kop Surat)
 * 
 * Centralized configuration for government letterhead
 * Based on Kementerian Imigrasi dan Pemasyarakatan RI standards
 * 
 * All font sizes are in points (pt)
 * Logo dimensions are in centimeters (cm)
 */

// ==================== LOGO CONFIGURATION ====================
export const LETTERHEAD_LOGO = {
    WIDTH_CM: 2.2,
    HEIGHT_CM: 2.2,
    // Default logo URL from Supabase storage
    DEFAULT_URL: 'https://hbrlbecsbriiicsenlwi.supabase.co/storage/v1/object/public/logos/Logo%20Imipas%20(22mm%20x%2022mm).png',
    // Convert to pixels (assuming 96 DPI for screen, adjust for print)
    get WIDTH_PX() { return Math.round(this.WIDTH_CM * 37.8); }, // ~83px
    get HEIGHT_PX() { return Math.round(this.HEIGHT_CM * 37.8); }, // ~83px
    // Convert to twips for DOCX (1 cm = 567 twips)
    get WIDTH_TWIPS() { return Math.round(this.WIDTH_CM * 567); },
    get HEIGHT_TWIPS() { return Math.round(this.HEIGHT_CM * 567); },
    // EMU for DOCX ImageRun (1 cm = 360000 EMU)
    get WIDTH_EMU() { return Math.round(this.WIDTH_CM * 360000); },
    get HEIGHT_EMU() { return Math.round(this.HEIGHT_CM * 360000); },
};

// ==================== FONT CONFIGURATION ====================
export const LETTERHEAD_FONT = {
    FAMILY: 'Arial',
    // Font sizes in points (pt)
    SIZE: {
        LINE_1_3: 10,  // KEMENTERIAN... KANTOR WILAYAH (pt)
        LINE_4: 11,    // KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR (pt)
        LINE_5: 9,     // Alamat (pt)
        LINE_6: 8,     // Laman dan Pos-el (pt)
    },
    // Half-points for DOCX library (multiply pt by 2)
    SIZE_HALF_POINTS: {
        LINE_1_3: 20,  // 10pt = 20 half-points
        LINE_4: 22,    // 11pt = 22 half-points
        LINE_5: 18,    // 9pt = 18 half-points
        LINE_6: 16,    // 8pt = 16 half-points
    },
};

// ==================== TEXT CONTENT ====================
export const LETTERHEAD_TEXT = {
    LINE_1: 'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA',
    LINE_2: 'DIREKTORAT JENDERAL IMIGRASI',
    LINE_3: 'KANTOR WILAYAH SUMATERA UTARA',
    LINE_4: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR',
    LINE_5: 'Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun',
    LINE_6_LAMAN: 'pematangsiantar.imigrasi.go.id',
    LINE_6_EMAIL: 'kanim_pematangsiantar@imigrasi.go.id',
    get LINE_6() {
        return `Laman: ${this.LINE_6_LAMAN}, Pos-el: ${this.LINE_6_EMAIL}`;
    },
};

// ==================== BORDER LINE CONFIGURATION ====================
export const LETTERHEAD_BORDER = {
    THICKNESS_PT: 0.5,       // 0.5pt as specified
    THICKNESS_EIGHTH: 4,     // For DOCX (0.5pt = 4 eighths of a point)
    COLOR: '000000',         // Black
    STYLE: 'single',         // Single line
};

// ==================== STYLES PER LINE ====================
export const LETTERHEAD_STYLES = {
    LINE_1: {
        fontSize: LETTERHEAD_FONT.SIZE.LINE_1_3,
        fontSizeHalfPoints: LETTERHEAD_FONT.SIZE_HALF_POINTS.LINE_1_3,
        bold: false,
        text: LETTERHEAD_TEXT.LINE_1,
    },
    LINE_2: {
        fontSize: LETTERHEAD_FONT.SIZE.LINE_1_3,
        fontSizeHalfPoints: LETTERHEAD_FONT.SIZE_HALF_POINTS.LINE_1_3,
        bold: false,
        text: LETTERHEAD_TEXT.LINE_2,
    },
    LINE_3: {
        fontSize: LETTERHEAD_FONT.SIZE.LINE_1_3,
        fontSizeHalfPoints: LETTERHEAD_FONT.SIZE_HALF_POINTS.LINE_1_3,
        bold: false,
        text: LETTERHEAD_TEXT.LINE_3,
    },
    LINE_4: {
        fontSize: LETTERHEAD_FONT.SIZE.LINE_4,
        fontSizeHalfPoints: LETTERHEAD_FONT.SIZE_HALF_POINTS.LINE_4,
        bold: true,
        text: LETTERHEAD_TEXT.LINE_4,
    },
    LINE_5: {
        fontSize: LETTERHEAD_FONT.SIZE.LINE_5,
        fontSizeHalfPoints: LETTERHEAD_FONT.SIZE_HALF_POINTS.LINE_5,
        bold: false,
        text: LETTERHEAD_TEXT.LINE_5,
    },
    LINE_6: {
        fontSize: LETTERHEAD_FONT.SIZE.LINE_6,
        fontSizeHalfPoints: LETTERHEAD_FONT.SIZE_HALF_POINTS.LINE_6,
        bold: false,
        text: LETTERHEAD_TEXT.LINE_6,
    },
};

// ==================== CSS STYLES FOR HTML EXPORT ====================
export const LETTERHEAD_CSS = `
.letterhead-container {
    display: table;
    width: 100%;
    margin-bottom: 10pt;
}

.letterhead-logo-cell {
    display: table-cell;
    width: ${LETTERHEAD_LOGO.WIDTH_CM}cm;
    vertical-align: middle;
    text-align: center;
}

.letterhead-logo {
    width: ${LETTERHEAD_LOGO.WIDTH_CM}cm;
    height: ${LETTERHEAD_LOGO.HEIGHT_CM}cm;
}

.letterhead-text-cell {
    display: table-cell;
    vertical-align: middle;
    text-align: center;
    font-family: ${LETTERHEAD_FONT.FAMILY}, sans-serif;
}

.letterhead-line-1,
.letterhead-line-2,
.letterhead-line-3 {
    font-size: ${LETTERHEAD_FONT.SIZE.LINE_1_3}pt;
    font-weight: normal;
    margin: 0;
    line-height: 1.3;
}

.letterhead-line-4 {
    font-size: ${LETTERHEAD_FONT.SIZE.LINE_4}pt;
    font-weight: bold;
    margin: 0;
    line-height: 1.3;
}

.letterhead-line-5 {
    font-size: ${LETTERHEAD_FONT.SIZE.LINE_5}pt;
    font-weight: normal;
    margin: 0;
    line-height: 1.3;
}

.letterhead-line-6 {
    font-size: ${LETTERHEAD_FONT.SIZE.LINE_6}pt;
    font-weight: normal;
    margin: 0;
    line-height: 1.3;
}

.letterhead-border {
    border-bottom: ${LETTERHEAD_BORDER.THICKNESS_PT}pt solid #${LETTERHEAD_BORDER.COLOR};
    margin-top: 8pt;
    margin-bottom: 15pt;
}
`;

// ==================== DEFAULT EXPORT ====================
export default {
    LETTERHEAD_LOGO,
    LETTERHEAD_FONT,
    LETTERHEAD_TEXT,
    LETTERHEAD_BORDER,
    LETTERHEAD_STYLES,
    LETTERHEAD_CSS,
};
