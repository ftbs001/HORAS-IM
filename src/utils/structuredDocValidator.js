/**
 * structuredDocValidator.js
 * ─────────────────────────
 * Validates a structured_json (pages[] format v3.0) before DOCX export.
 *
 * Returns { valid, errors, warnings, stats }
 *
 * Rules:
 *  - pages[] must exist and be non-empty
 *  - Each page must have content[]
 *  - Table blocks must have at least 1 row
 *  - Image blocks must have base64 field (warn if missing, don't hard-block)
 *  - No null/undefined block types
 *  - Margins must not be null
 */

/**
 * Validate a single structured_json document.
 *
 * @param {Object} structuredJson - The structured_json from the database
 * @param {string} [label] - Human-readable label for error messages (e.g. seksi name)
 * @returns {{ valid: boolean, errors: string[], warnings: string[], stats: Object }}
 */
export function validateStructuredDoc(structuredJson, label = 'Dokumen') {
    const errors = [];
    const warnings = [];
    const stats = {
        pageCount: 0,
        blockCount: 0,
        tableCount: 0,
        imageCount: 0,
        imagesWithBase64: 0,
        emptyTables: 0,
        corruptBlocks: 0,
    };

    if (!structuredJson) {
        errors.push(`[${label}] structured_json tidak ditemukan (null/undefined).`);
        return { valid: false, errors, warnings, stats };
    }

    if (!structuredJson.pages || !Array.isArray(structuredJson.pages)) {
        errors.push(`[${label}] structured_json.pages[] tidak ditemukan atau bukan array.`);
        return { valid: false, errors, warnings, stats };
    }

    if (structuredJson.pages.length === 0) {
        errors.push(`[${label}] structured_json.pages[] kosong (0 halaman).`);
        return { valid: false, errors, warnings, stats };
    }

    stats.pageCount = structuredJson.pages.length;

    for (let pi = 0; pi < structuredJson.pages.length; pi++) {
        const page = structuredJson.pages[pi];

        if (!page) {
            errors.push(`[${label}] Halaman ${pi + 1} adalah null.`);
            stats.corruptBlocks++;
            continue;
        }

        if (!page.content || !Array.isArray(page.content)) {
            warnings.push(`[${label}] Halaman ${pi + 1} tidak memiliki content[].`);
            continue;
        }

        for (let bi = 0; bi < page.content.length; bi++) {
            const block = page.content[bi];
            stats.blockCount++;

            if (!block || typeof block.type !== 'string') {
                warnings.push(`[${label}] Halaman ${pi + 1}, blok ${bi + 1}: tipe tidak valid (${JSON.stringify(block?.type)}).`);
                stats.corruptBlocks++;
                continue;
            }

            if (block.type === 'table') {
                stats.tableCount++;
                if (!block.rows || !Array.isArray(block.rows) || block.rows.length === 0) {
                    warnings.push(`[${label}] Halaman ${pi + 1}, blok ${bi + 1}: tabel kosong (tidak ada baris).`);
                    stats.emptyTables++;
                }
            }

            if (block.type === 'image') {
                stats.imageCount++;
                if (!block.base64 || !block.base64.startsWith('data:')) {
                    warnings.push(`[${label}] Halaman ${pi + 1}, blok ${bi + 1}: gambar tidak memiliki base64 (akan terlihat kosong saat export).`);
                } else {
                    stats.imagesWithBase64++;
                }
            }
        }
    }

    // Check margins for layout correctness
    const firstPage = structuredJson.pages[0];
    if (firstPage?.margin) {
        const m = firstPage.margin;
        if (m.top == null || m.right == null || m.bottom == null || m.left == null) {
            warnings.push(`[${label}] Margin halaman pertama tidak lengkap — nilai null akan menggunakan default.`);
        }
    }

    // Images missing base64 = warning only (not error), user can still export
    const missingImages = stats.imageCount - stats.imagesWithBase64;
    const valid = errors.length === 0;

    return { valid, errors, warnings, stats, missingImages };
}

/**
 * Validate an array of structured_json objects (one per approved laporan).
 *
 * @param {Array<{ seksiName: string, structured_json: Object|null }>} items
 * @returns {{ allValid: boolean, results: Array, summary: string }}
 */
export function validateMergeDocuments(items = []) {
    const results = items.map(({ seksiName, structured_json }) => {
        const result = validateStructuredDoc(structured_json, seksiName);
        return { seksiName, ...result };
    });

    const allValid = results.every(r => r.valid);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const totalImages = results.reduce((sum, r) => sum + (r.stats?.imageCount || 0), 0);
    const missingImages = results.reduce((sum, r) => sum + (r.missingImages || 0), 0);

    const summary = allValid
        ? `✅ ${items.length} dokumen valid untuk export.` +
        (missingImages > 0 ? ` ⚠️ ${missingImages} gambar tanpa base64 (akan kosong).` : '')
        : `❌ ${totalErrors} error ditemukan pada ${results.filter(r => !r.valid).length} dokumen.`;

    return { allValid, results, summary, totalErrors, totalWarnings, totalImages, missingImages };
}

export default { validateStructuredDoc, validateMergeDocuments };
