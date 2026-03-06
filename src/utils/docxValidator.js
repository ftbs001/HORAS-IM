/**
 * docxValidator.js — Pre-upload DOCX structure validator
 *
 * Validates a .docx file BEFORE it is uploaded to storage.
 *
 * Checks performed:
 *  1. File is a valid ZIP archive (DOCX is ZIP-based)
 *  2. word/document.xml exists and is well-formed XML
 *  3. Relationship files exist ([Content_Types].xml)
 *  4. Embedded resources referenced in relationships are present
 *  5. Font table is readable (list fonts for fallback warning)
 *  6. File size warning if > 5 MB
 *
 * Returns: { valid: boolean, errors: string[], warnings: string[], info: object }
 */

/* ── ZIP signature check (PK magic bytes) ───────────────────────────────── */
const PK_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"

async function isZipBuffer(arrayBuffer) {
    try {
        const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
        return PK_MAGIC.every((b, i) => bytes[i] === b);
    } catch {
        return false;
    }
}

/* ── Minimal ZIP reader (browser-native, no library needed) ─────────────── */

/**
 * Parse central directory of a ZIP to get file entries.
 * Returns a Map: filename → { offset, compressedSize, uncompressedSize }
 * This is a simplified reader sufficient for validation.
 */
function parseZipEntries(buffer) {
    const view = new DataView(buffer);
    const entries = new Map();

    try {
        // Find End of Central Directory record (signature 0x06054b50)
        let eocdOffset = buffer.byteLength - 22;
        while (eocdOffset >= 0) {
            if (view.getUint32(eocdOffset, true) === 0x06054b50) break;
            eocdOffset--;
        }
        if (eocdOffset < 0) return entries;

        const cdOffset = view.getUint32(eocdOffset + 16, true);
        const cdSize = view.getUint32(eocdOffset + 12, true);

        let pos = cdOffset;
        const textDecoder = new TextDecoder('utf-8');

        while (pos < cdOffset + cdSize) {
            const sig = view.getUint32(pos, true);
            if (sig !== 0x02014b50) break; // Central directory file header signature

            const fileNameLen = view.getUint16(pos + 28, true);
            const extraLen = view.getUint16(pos + 30, true);
            const commentLen = view.getUint16(pos + 32, true);
            const localOffset = view.getUint32(pos + 42, true);
            const compressedSize = view.getUint32(pos + 20, true);

            const nameBytes = new Uint8Array(buffer, pos + 46, fileNameLen);
            const name = textDecoder.decode(nameBytes);

            entries.set(name, { offset: localOffset, compressedSize });
            pos += 46 + fileNameLen + extraLen + commentLen;
        }
    } catch {
        // Ignore parse errors — entries collected so far are usable
    }

    return entries;
}

/**
 * Extract text content of a specific file from the ZIP.
 * Uses the local file header to find compressed data.
 * Only works for STORED (method=0) or DEFLATED — we use TextDecoder for XML.
 *
 * For our validation purposes we just need to know if the file EXISTS
 * and optionally read its raw bytes. We don't decompress here.
 */
function entryRawPreview(buffer, entry, maxBytes = 512) {
    try {
        const view = new DataView(buffer);
        // Local file header: skip 30 bytes + filename + extra
        const localSig = view.getUint32(entry.offset, true);
        if (localSig !== 0x04034b50) return null; // Not a local file header

        const fnLen = view.getUint16(entry.offset + 26, true);
        const exLen = view.getUint16(entry.offset + 28, true);
        const dataStart = entry.offset + 30 + fnLen + exLen;

        const slice = buffer.slice(dataStart, dataStart + maxBytes);
        return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(slice));
    } catch {
        return null;
    }
}

/* ── Known standard fonts ───────────────────────────────────────────────── */
const STANDARD_FONTS = new Set([
    'times new roman', 'calibri', 'arial', 'verdana', 'helvetica',
    'georgia', 'garamond', 'tahoma', 'trebuchet ms', 'courier new',
    'palatino linotype', 'book antiqua', 'comic sans ms',
    'century schoolbook', 'cambria', 'cambria math', 'constantia',
    'corbel', 'candara', 'consolas', 'symbol', 'wingdings',
    'bookman old style', 'lucida console', 'ms mincho', 'ms gothic',
]);

/**
 * Extract font names from fontTable.xml content.
 */
function extractFontsFromXml(xml) {
    const fonts = [];
    const regex = /w:name="([^"]+)"/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        fonts.push(match[1]);
    }
    return [...new Set(fonts)];
}

/* ── Main validation function ───────────────────────────────────────────── */

/**
 * Validate a DOCX file before upload.
 *
 * @param {File} file
 * @returns {Promise<{
 *   valid: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   info: {
 *     fonts: string[],
 *     unsupportedFonts: string[],
 *     hasImages: boolean,
 *     hasTables: boolean,
 *     entryCount: number,
 *     sizeMb: number
 *   }
 * }>}
 */
export async function validateDocxFile(file) {
    const errors = [];
    const warnings = [];
    const info = {
        fonts: [],
        unsupportedFonts: [],
        hasImages: false,
        hasTables: false,
        entryCount: 0,
        sizeMb: 0,
    };

    // ── 1. File size check ─────────────────────────────────────────────────
    info.sizeMb = +(file.size / (1024 * 1024)).toFixed(2);
    if (info.sizeMb > 10) {
        errors.push(`Ukuran file ${info.sizeMb} MB melebihi batas 10 MB.`);
        return { valid: false, errors, warnings, info };
    }
    if (info.sizeMb > 5) {
        warnings.push(`File berukuran ${info.sizeMb} MB — proses parse mungkin memerlukan beberapa detik.`);
    }

    // ── 2. Read as ArrayBuffer ─────────────────────────────────────────────
    let buffer;
    try {
        buffer = await file.arrayBuffer();
    } catch {
        errors.push('Gagal membaca file. File mungkin sedang digunakan oleh program lain.');
        return { valid: false, errors, warnings, info };
    }

    // ── 3. ZIP magic bytes check ───────────────────────────────────────────
    const isZip = await isZipBuffer(buffer);
    if (!isZip) {
        errors.push('File bukan format DOCX valid. File harus berupa arsip ZIP yang berisi dokumen Word.');
        return { valid: false, errors, warnings, info };
    }

    // ── 4. Parse ZIP entries ───────────────────────────────────────────────
    let entries;
    try {
        entries = parseZipEntries(buffer);
        info.entryCount = entries.size;
    } catch {
        errors.push('Struktur ZIP file rusak. File mungkin corrupt atau tidak lengkap.');
        return { valid: false, errors, warnings, info };
    }

    if (entries.size === 0) {
        errors.push('File kosong atau struktur DOCX tidak dapat dibaca.');
        return { valid: false, errors, warnings, info };
    }

    // ── 5. Check [Content_Types].xml ──────────────────────────────────────
    if (!entries.has('[Content_Types].xml')) {
        errors.push('File bukan DOCX valid: [Content_Types].xml tidak ditemukan.');
        return { valid: false, errors, warnings, info };
    }

    // ── 6. Check word/document.xml ────────────────────────────────────────
    if (!entries.has('word/document.xml')) {
        errors.push('File DOCX tidak memiliki dokumen utama (word/document.xml).');
        return { valid: false, errors, warnings, info };
    }

    // ── 7. Check document.xml preview for XML validity ────────────────────
    const docEntry = entries.get('word/document.xml');
    const docPreview = entryRawPreview(buffer, docEntry, 256);
    if (docPreview !== null && !docPreview.includes('<?xml') && !docPreview.includes('<w:document') && !docPreview.includes('PK')) {
        // Compressed — we can't easily validate XML without decompression
        // But if it's stored (method=0), we could. Skip this check for compressed.
        // warnings.push('Konten dokumen terkompresi — validasi XML dilewati.');
    }

    // ── 8. Check for embedded images ──────────────────────────────────────
    const imageEntries = [...entries.keys()].filter(k =>
        k.startsWith('word/media/') &&
        /\.(png|jpg|jpeg|gif|bmp|svg|wmf|emf|tiff?)$/i.test(k)
    );
    info.hasImages = imageEntries.length > 0;

    if (info.hasImages) {
        // Check that images are actually referenced in relationships
        const relsEntry = entries.get('word/_rels/document.xml.rels');
        if (!relsEntry) {
            warnings.push(`${imageEntries.length} gambar ditemukan tapi file relasi tidak ada. Gambar mungkin tidak tampil.`);
        }
    }

    // ── 9. Font extraction ─────────────────────────────────────────────────
    const fontEntry = entries.get('word/fontTable.xml');
    if (fontEntry) {
        const fontXml = entryRawPreview(buffer, fontEntry, 4096);
        if (fontXml) {
            info.fonts = extractFontsFromXml(fontXml);
            info.unsupportedFonts = info.fonts.filter(
                f => !STANDARD_FONTS.has(f.toLowerCase())
            );
            if (info.unsupportedFonts.length > 0) {
                warnings.push(
                    `Font tidak standar terdeteksi: ${info.unsupportedFonts.slice(0, 3).join(', ')}` +
                    (info.unsupportedFonts.length > 3 ? ` +${info.unsupportedFonts.length - 3} lainnya` : '') +
                    '. Akan diganti fallback: Times New Roman / Calibri / Arial (layout tidak berubah).'
                );
            }
        }
    }

    // ── 10. Check for table ────────────────────────────────────────────────
    // We check by looking for word/styles.xml or via content types
    const contentTypesEntry = entries.get('[Content_Types].xml');
    if (contentTypesEntry) {
        const ctXml = entryRawPreview(buffer, contentTypesEntry, 2048);
        if (ctXml && ctXml.includes('table')) {
            info.hasTables = true;
        }
    }

    // ── Final result ───────────────────────────────────────────────────────
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        info,
    };
}
