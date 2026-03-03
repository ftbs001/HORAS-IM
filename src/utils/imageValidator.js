/**
 * imageValidator.js
 * ─────────────────
 * Pre-export image validation for HORAS-IM.
 *
 * Validates ALL image blocks across ALL laporan before allowing export.
 * If ANY image fails, export is blocked and a detailed error list is returned.
 *
 * Checks:
 *  1. base64 string exists and is non-empty
 *  2. base64 starts with valid data URL prefix "data:image/"
 *  3. Supported MIME type (png, jpg, webp, gif)
 *  4. Base64 payload is decodable (not corrupt)
 *  5. Image dimensions are non-zero
 *  6. File size is within limit (< 10 MB encoded)
 *  7. Image ID is unique across all sections (merge safety)
 *  8. No temporary or external URLs (blob:, http://, https://)
 */

import { supabase } from '../lib/supabaseClient';

const ALLOWED_MIME_PREFIXES = ['data:image/png', 'data:image/jpeg', 'data:image/jpg', 'data:image/webp', 'data:image/gif'];
const MAX_BASE64_CHARS = 14_000_000;  // ~10 MB in base64 chars

/** Error severity levels */
export const SEVERITY = {
    ERROR: 'error',   // Blocks export
    WARNING: 'warning', // Shown but doesn't block
};

/**
 * Validate a single image block from content_json.
 *
 * @param {Object} block    - Image block from content_json.blocks
 * @param {string} seksiName - Section name (for error messages)
 * @returns {{ valid: boolean, errors: Array<{field, message, severity}> }}
 */
export const validateImageBlock = (block, seksiName = 'Unknown') => {
    const errors = [];
    const ctx = `[${seksiName} › ${block.id || 'no-id'}]`;

    // 1. ID must exist
    if (!block.id) {
        errors.push({ field: 'id', message: `${ctx} Image ID kosong — tidak bisa diidentifikasi`, severity: SEVERITY.ERROR });
    }

    // 2. base64 must exist
    if (!block.base64) {
        errors.push({ field: 'base64', message: `${ctx} Data gambar (base64) kosong`, severity: SEVERITY.ERROR });
        return { valid: false, errors }; // No point checking further
    }

    // 3. Must be a data URL (not external URL or blob)
    if (block.base64.startsWith('http://') || block.base64.startsWith('https://')) {
        errors.push({ field: 'base64', message: `${ctx} Gambar menggunakan URL eksternal — tidak aman untuk export`, severity: SEVERITY.ERROR });
    }
    if (block.base64.startsWith('blob:')) {
        errors.push({ field: 'base64', message: `${ctx} Gambar menggunakan blob URL sementara — akan hilang saat export`, severity: SEVERITY.ERROR });
    }

    // 4. Must be valid data:image/ format
    const hasValidPrefix = ALLOWED_MIME_PREFIXES.some(p => block.base64.startsWith(p));
    if (!hasValidPrefix) {
        errors.push({ field: 'base64', message: `${ctx} Format MIME tidak valid: "${block.base64.substring(0, 30)}..."`, severity: SEVERITY.ERROR });
    }

    // 5. Base64 payload must be decodable
    if (hasValidPrefix && block.base64.includes(',')) {
        const payload = block.base64.split(',')[1];
        if (!payload || payload.length < 100) {
            errors.push({ field: 'base64', message: `${ctx} Data base64 terlalu pendek — gambar mungkin corrupt`, severity: SEVERITY.ERROR });
        } else {
            try {
                atob(payload.slice(0, 100)); // Spot-check first 100 chars
            } catch {
                errors.push({ field: 'base64', message: `${ctx} Data base64 tidak dapat di-decode — file corrupt`, severity: SEVERITY.ERROR });
            }
        }
    }

    // 6. Size check
    if (block.base64.length > MAX_BASE64_CHARS) {
        errors.push({ field: 'size', message: `${ctx} Gambar terlalu besar (${(block.base64.length / 1_000_000).toFixed(1)} MB) — melebihi batas 10 MB`, severity: SEVERITY.ERROR });
    }

    // 7. Dimension check (warning only — dimensions may be 0 on older entries)
    if (block.metadata?.width_px === 0 || block.metadata?.height_px === 0) {
        errors.push({ field: 'dimensions', message: `${ctx} Dimensi gambar 0×0 — mungkin gagal dibaca`, severity: SEVERITY.WARNING });
    }

    return { valid: errors.filter(e => e.severity === SEVERITY.ERROR).length === 0, errors };
};

/**
 * Validate ALL image blocks across an array of laporan objects.
 *
 * @param {Array<{id, seksi_name, content_json}>} laporanList
 * @returns {{
 *   valid        : boolean,
 *   totalImages  : number,
 *   errors       : Array<{laporanId, seksiName, imageId, message, severity}>,
 *   warnings     : Array<{laporanId, seksiName, imageId, message}>,
 *   summary      : string,
 * }}
 */
export const validateAllImages = (laporanList = []) => {
    const allErrors = [];
    const allWarnings = [];
    const seenImageIds = new Set();
    let totalImages = 0;

    laporanList.forEach(laporan => {
        const seksiName = laporan.seksi_name || `seksi_${laporan.seksi_id}`;
        const contentJson = laporan.content_json || { blocks: [] };
        const imageBlocks = (contentJson.blocks || []).filter(b => b.type === 'image');

        totalImages += imageBlocks.length;

        imageBlocks.forEach(block => {
            // Check duplicate ID across sections (merge safety)
            if (block.id && seenImageIds.has(block.id)) {
                allErrors.push({
                    laporanId: laporan.id,
                    seksiName,
                    imageId: block.id,
                    message: `[${seksiName}] Duplikat image ID "${block.id}" — akan tertimpa saat merge`,
                    severity: SEVERITY.ERROR,
                });
            }
            if (block.id) seenImageIds.add(block.id);

            // Validate the block
            const { errors } = validateImageBlock(block, seksiName);
            errors.forEach(e => {
                const item = { laporanId: laporan.id, seksiName, imageId: block.id, message: e.message, severity: e.severity };
                if (e.severity === SEVERITY.ERROR) allErrors.push(item);
                else allWarnings.push(item);
            });
        });
    });

    const valid = allErrors.length === 0;

    return {
        valid,
        totalImages,
        errors: allErrors,
        warnings: allWarnings,
        summary: valid
            ? `✅ ${totalImages} gambar tervalidasi — aman untuk export`
            : `❌ ${allErrors.length} error pada ${totalImages} gambar — export diblokir`,
    };
};

/**
 * Log image errors to Supabase image_error_logs table.
 * Fire-and-forget — does not throw.
 *
 * @param {Array<Object>} errors - From validateAllImages().errors
 */
export const logImageErrors = async (errors = []) => {
    if (!errors.length) return;
    try {
        await supabase.from('image_error_logs').insert(
            errors.map(e => ({
                laporan_id: e.laporanId,
                seksi_id: e.seksiId || null,
                image_id: e.imageId || 'unknown',
                error_type: e.severity,
                error_message: e.message,
            }))
        );
    } catch { /* Log gagal tidak menghentikan alur utama */ }
};

/**
 * Quick-check a single content_json for any image issues.
 * Lighter than validateAllImages, useful for inline form validation.
 *
 * @param {Object}  contentJson
 * @param {string}  seksiName
 * @returns {{ valid: boolean, imageCount: number, errorMessages: string[] }}
 */
export const quickCheckContentJson = (contentJson, seksiName = '') => {
    const blocks = (contentJson?.blocks || []).filter(b => b.type === 'image');
    const errorMessages = [];

    blocks.forEach(block => {
        const { errors } = validateImageBlock(block, seksiName);
        errors.filter(e => e.severity === SEVERITY.ERROR).forEach(e => errorMessages.push(e.message));
    });

    return {
        valid: errorMessages.length === 0,
        imageCount: blocks.length,
        errorMessages,
    };
};

export default {
    validateImageBlock,
    validateAllImages,
    logImageErrors,
    quickCheckContentJson,
    SEVERITY,
};
