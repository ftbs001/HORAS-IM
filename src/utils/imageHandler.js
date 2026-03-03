/**
 * Image Handler for DOCX Export
 * Properly embeds images as ArrayBuffer for reliable display
 *
 * v2 additions:
 *  - base64ToArrayBuffer(): converts content_json base64 → ArrayBuffer for ImageRun
 *  - scaleToMaxWidth(): preserves aspect ratio with a max-width constraint (pixels)
 */

import { ImageRun } from 'docx';

/**
 * Convert image path/URL to ArrayBuffer for embedding
 * @param {string} imagePath - Path to image (can be URL, data URL, or imported asset)
 * @returns {Promise<ArrayBuffer|null>} ArrayBuffer of image data
 */
export const fetchImageAsArrayBuffer = async (imagePath) => {
    if (!imagePath) return null;

    try {
        // Handle data URLs
        if (imagePath.startsWith('data:')) {
            const base64 = imagePath.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
        }

        // Handle regular URLs or imported assets
        const response = await fetch(imagePath);
        if (!response.ok) {
            console.error('Failed to fetch image:', imagePath);
            return null;
        }

        const blob = await response.blob();
        return await blob.arrayBuffer();
    } catch (error) {
        console.error('Image fetch error:', error);
        return null;
    }
};

/**
 * Create an ImageRun for embedding in DOCX
 * @param {ArrayBuffer} imageData - Image data as ArrayBuffer
 * @param {Object} options - Image options
 * @returns {ImageRun|null} ImageRun instance or null if no data
 */
export const createImageRun = (imageData, options = {}) => {
    if (!imageData) return null;

    const {
        width = 100,
        height = 100,
        floating = false,
    } = options;

    return new ImageRun({
        data: imageData,
        transformation: {
            width,
            height,
        },
        // Only add floating if explicitly requested (not recommended for logos)
        ...(floating ? {
            floating: {
                horizontalPosition: { relative: 'page', align: 'center' },
                verticalPosition: { relative: 'page', offset: 0 },
            },
        } : {}),
    });
};

/**
 * Load and prepare logo for document
 * @param {string} logoPath - Path to logo image
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @returns {Promise<ImageRun|null>} ImageRun for logo
 */
export const loadLogo = async (logoPath, width = 60, height = 60) => {
    const imageData = await fetchImageAsArrayBuffer(logoPath);
    if (!imageData) return null;

    return createImageRun(imageData, { width, height, floating: false });
};

/**
 * Process HTML content and extract embedded images
 * @param {string} htmlContent - HTML content with possible img tags
 * @returns {Promise<{text: string, images: Array}>} Processed content and images
 */
export const extractImagesFromHtml = async (htmlContent) => {
    if (!htmlContent) return { text: '', images: [] };

    const images = [];
    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/gi;
    let match;
    let imageIndex = 0;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        const imageData = await fetchImageAsArrayBuffer(src);

        if (imageData) {
            images.push({
                placeholder: `{{IMAGE_${imageIndex}}}`,
                data: imageData,
                originalTag: match[0],
            });
            imageIndex++;
        }
    }

    // Replace img tags with placeholders
    let processedHtml = htmlContent;
    images.forEach((img, idx) => {
        processedHtml = processedHtml.replace(img.originalTag, `{{IMAGE_${idx}}}`);
    });

    // Strip remaining HTML
    const text = processedHtml
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

    return { text, images };
};

/**
 * Convert a base64 data URL (from content_json) to ArrayBuffer.
 * Used by docxExporter to embed image blocks as ImageRun.
 *
 * @param {string} base64DataUrl - e.g. "data:image/png;base64,iVBOR..."
 * @returns {ArrayBuffer|null}
 */
export const base64ToArrayBuffer = (base64DataUrl) => {
    if (!base64DataUrl || !base64DataUrl.includes(',')) return null;
    try {
        const base64 = base64DataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    } catch {
        return null;
    }
};

/**
 * Extract MIME type from a base64 data URL.
 * @param {string} base64DataUrl
 * @returns {string} e.g. 'png', 'jpeg'
 */
export const getMimeFromBase64 = (base64DataUrl = '') => {
    const m = base64DataUrl.match(/^data:image\/([a-zA-Z+]+);base64,/);
    const raw = m ? m[1] : 'png';
    return raw === 'jpg' ? 'jpeg' : raw; // normalize jpg → jpeg for ImageRun
};

/**
 * Scale image dimensions to fit within a maximum pixel width,
 * preserving the original aspect ratio.
 *
 * @param {number} origW  - Original width in pixels
 * @param {number} origH  - Original height in pixels
 * @param {number} maxW   - Maximum allowed width in EMU (from cm())
 * @returns {{ width: number, height: number }} Scaled dimensions
 */
export const scaleToMaxWidth = (origW, origH, maxW) => {
    if (!origW || !origH) return { width: maxW, height: Math.round(maxW * 0.75) }; // 4:3 fallback
    if (origW <= maxW) return { width: origW, height: origH };
    const ratio = origH / origW;
    return { width: maxW, height: Math.round(maxW * ratio) };
};

export default {
    fetchImageAsArrayBuffer,
    createImageRun,
    loadLogo,
    extractImagesFromHtml,
    base64ToArrayBuffer,
    getMimeFromBase64,
    scaleToMaxWidth,
};
