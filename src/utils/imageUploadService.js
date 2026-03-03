/**
 * imageUploadService.js
 * ─────────────────────
 * Enterprise-level image storage layer for HORAS-IM.
 *
 * Strategy: ALL images are converted to base64 and stored inside
 * laporan_bulanan.content_json (Supabase JSONB column).
 * → No external URLs, no temporary paths, no broken links on export.
 *
 * Image IDs are namespaced per-seksi to prevent collision during merge:
 *   format: {seksiAlias}_{timestamp}_{random4}
 *   example: inteldakim_1709380800000_a3f2
 */

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_SIZE_BYTES = 5 * 1024 * 1024;   // 5 MB per image
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const CONTENT_JSON_VER = '2.0';

// ── Error types ──────────────────────────────────────────────────────────────
export const IMAGE_ERROR = {
    TOO_LARGE: 'too_large',
    INVALID_FORMAT: 'invalid_format',
    MISSING_BASE64: 'missing_base64',
    CORRUPT: 'corrupt',
};

/**
 * Normalize seksi name to a filesystem-safe alias.
 * Example: "Seksi Inteldakim" → "inteldakim"
 */
export const toSeksiAlias = (name = '') =>
    name.toLowerCase().trim()
        .replace(/^seksi\s+/i, '')
        .replace(/^subbag(ian)?\s+/i, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

/**
 * Generate a unique, namespaced image ID.
 * @param {string} seksiName - Name of the section (e.g., "Seksi Inteldakim")
 * @returns {string} Unique image ID
 */
export const generateImageId = (seksiName) => {
    const alias = toSeksiAlias(seksiName) || 'seksi';
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 6);
    return `${alias}_img_${ts}_${rand}`;
};

/**
 * Get image dimensions from a File object.
 * @param {File} file
 * @returns {Promise<{width: number, height: number}>}
 */
const getImageDimensions = (file) =>
    new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.width, height: img.height }); };
        img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }); };
        img.src = url;
    });

/**
 * Convert a File to a base64 data URL string.
 * @param {File} file
 * @returns {Promise<string>} base64 data URL
 */
const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(file);
    });

/**
 * Validate an image File before processing.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string, errorType?: string }}
 */
export const validateImageFile = (file) => {
    if (!file) return { valid: false, error: 'File tidak ditemukan', errorType: IMAGE_ERROR.MISSING_BASE64 };
    if (!ALLOWED_MIME.includes(file.type)) {
        return {
            valid: false,
            error: `Format tidak didukung: ${file.type}. Gunakan PNG, JPG, WEBP, atau GIF.`,
            errorType: IMAGE_ERROR.INVALID_FORMAT,
        };
    }
    if (file.size > MAX_SIZE_BYTES) {
        return {
            valid: false,
            error: `Ukuran gambar ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi batas 5 MB.`,
            errorType: IMAGE_ERROR.TOO_LARGE,
        };
    }
    return { valid: true };
};

/**
 * Process an image File into a content_json image block.
 *
 * @param {File}   file        - Image file from file input
 * @param {string} seksiName   - Section name for ID namespace
 * @param {string} caption     - Optional caption text
 * @returns {Promise<{ block: Object|null, error: string|null }>}
 */
export const processImageToBlock = async (file, seksiName = '', caption = '') => {
    // 1. Validate
    const validation = validateImageFile(file);
    if (!validation.valid) return { block: null, error: validation.error };

    try {
        // 2. Convert to base64
        const base64 = await fileToBase64(file);

        // 3. Verify the base64 result looks valid
        if (!base64 || !base64.startsWith('data:image/')) {
            return { block: null, error: 'Konversi base64 gagal — file mungkin corrupt.' };
        }

        // 4. Get dimensions
        const { width, height } = await getImageDimensions(file);

        // 5. Build the image block
        const block = {
            type: 'image',
            id: generateImageId(seksiName),
            base64,
            metadata: {
                filename: file.name,
                mime: file.type,
                width_px: width,
                height_px: height,
                size_bytes: file.size,
                uploaded_at: new Date().toISOString(),
                seksi: seksiName,
            },
            caption: caption.trim(),
        };

        return { block, error: null };
    } catch (err) {
        return { block: null, error: `Error memproses gambar: ${err.message}` };
    }
};

/**
 * Build a full content_json object from an array of mixed blocks.
 * Accepts: paragraph strings, image blocks (from processImageToBlock), headings.
 *
 * @param {Array<string|Object>} items
 *   - string  → paragraph block
 *   - object  → already-formed block (image, heading, etc.)
 * @param {string} seksiId
 * @returns {Object} content_json
 */
export const buildContentJson = (items = [], seksiId = '') => ({
    version: CONTENT_JSON_VER,
    seksi_id: seksiId,
    blocks: items.map(item => {
        if (typeof item === 'string') return { type: 'paragraph', text: item };
        return item; // already a block object
    }),
});

/**
 * Merge multiple content_json objects into one (for Gabung Laporan).
 * Preserves image ID namespacing — no collision between sections.
 *
 * @param {Array<{seksiName: string, content_json: Object}>} contentJsonList
 * @returns {Array<Object>} Merged blocks array (flat)
 */
export const mergeContentJsonList = (contentJsonList = []) => {
    const mergedBlocks = [];
    contentJsonList.forEach(({ seksiName, content_json }) => {
        if (!content_json?.blocks?.length) return;
        // Add section separator heading
        mergedBlocks.push({ type: 'heading', level: 3, text: seksiName });
        // Add all blocks — image IDs already namespaced per seksi, safe to merge
        content_json.blocks.forEach(block => mergedBlocks.push({ ...block }));
    });
    return mergedBlocks;
};

/**
 * Extract only image blocks from a content_json.
 * @param {Object} contentJson
 * @returns {Array<Object>} Image blocks
 */
export const extractImageBlocks = (contentJson) =>
    (contentJson?.blocks || []).filter(b => b.type === 'image');

/**
 * Count images in a content_json object.
 * @param {Object} contentJson
 * @returns {number}
 */
export const countImages = (contentJson) =>
    extractImageBlocks(contentJson).length;

export default {
    processImageToBlock,
    buildContentJson,
    mergeContentJsonList,
    extractImageBlocks,
    countImages,
    validateImageFile,
    generateImageId,
    toSeksiAlias,
};
