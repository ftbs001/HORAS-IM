/**
 * Report Content Validator
 * Validates JSON content from sections before merge
 * 
 * Based on approved architecture - enforces:
 * - Strict structure (Chapter → Section → Content)
 * - No styling information
 * - Proper heading hierarchy
 */

// ==================== VALIDATION PATTERNS ====================

const PATTERNS = {
    BAB_TITLE: /^BAB\s+[IVX]+\s+.+$/i,       // "BAB I PENDAHULUAN"
    SUB_BAB_TITLE: /^[A-Z]\.\s+.+$/,          // "A. Latar Belakang"
    SUB_SUB_BAB_TITLE: /^\d+\.\s+.+$/,        // "1. Gambaran Umum"
};

const FORBIDDEN_CONTENT = [
    'style=',
    'font-size',
    'font-family',
    'margin:',
    'padding:',
    'page-break',
    'break-before',
    'break-after',
    '<script',
    '<style',
    'javascript:',
];

const CONTENT_TYPES = ['paragraph', 'table', 'image', 'list'];

const IMAGE_CONSTRAINTS = {
    maxWidth: 800,
    maxHeight: 600,
    allowedFormats: ['jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
};

const TEXT_CONSTRAINTS = {
    maxParagraphLength: 5000,
    maxTableRows: 100,
    maxTableColumns: 10,
};

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate complete report content
 * @param {Object} content - Report content JSON
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateReportContent = (content) => {
    const errors = [];

    // Required fields
    if (!content.seksiId) errors.push('seksiId is required');
    if (!content.seksiName) errors.push('seksiName is required');
    if (!content.month || content.month < 1 || content.month > 12) {
        errors.push('month must be 1-12');
    }
    if (!content.year || content.year < 2020) {
        errors.push('year is invalid');
    }

    // Validate chapters
    if (!content.chapters || !Array.isArray(content.chapters)) {
        errors.push('chapters array is required');
    } else {
        content.chapters.forEach((chapter, idx) => {
            const chapterErrors = validateChapter(chapter, idx);
            errors.push(...chapterErrors);
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

/**
 * Validate a single chapter
 */
const validateChapter = (chapter, index) => {
    const errors = [];
    const prefix = `Chapter ${index + 1}`;

    if (!chapter.id) errors.push(`${prefix}: id is required`);
    if (!chapter.title) {
        errors.push(`${prefix}: title is required`);
    } else if (!PATTERNS.BAB_TITLE.test(chapter.title)) {
        errors.push(`${prefix}: title must match format "BAB I/II/III... TITLE"`);
    }

    if (chapter.level !== 1) {
        errors.push(`${prefix}: level must be 1 for chapters`);
    }

    if (typeof chapter.order !== 'number') {
        errors.push(`${prefix}: order is required`);
    }

    // Validate sections
    if (chapter.sections && Array.isArray(chapter.sections)) {
        chapter.sections.forEach((section, idx) => {
            const sectionErrors = validateSection(section, idx, index);
            errors.push(...sectionErrors);
        });
    }

    return errors;
};

/**
 * Validate a single section
 */
const validateSection = (section, sectionIndex, chapterIndex) => {
    const errors = [];
    const prefix = `Chapter ${chapterIndex + 1}, Section ${sectionIndex + 1}`;

    if (!section.id) errors.push(`${prefix}: id is required`);
    if (!section.title) errors.push(`${prefix}: title is required`);

    // Validate title format based on level
    if (section.level === 2) {
        if (!PATTERNS.SUB_BAB_TITLE.test(section.title)) {
            errors.push(`${prefix}: level 2 title must match format "A. Title"`);
        }
    } else if (section.level === 3) {
        if (!PATTERNS.SUB_SUB_BAB_TITLE.test(section.title)) {
            errors.push(`${prefix}: level 3 title must match format "1. Title"`);
        }
    }

    // Validate contents
    if (section.contents && Array.isArray(section.contents)) {
        section.contents.forEach((content, idx) => {
            const contentErrors = validateContent(content, idx, sectionIndex, chapterIndex);
            errors.push(...contentErrors);
        });
    }

    return errors;
};

/**
 * Validate a single content item
 */
const validateContent = (content, contentIndex, sectionIndex, chapterIndex) => {
    const errors = [];
    const prefix = `Ch${chapterIndex + 1}/Sec${sectionIndex + 1}/Content${contentIndex + 1}`;

    if (!content.id) errors.push(`${prefix}: id is required`);

    if (!content.type || !CONTENT_TYPES.includes(content.type)) {
        errors.push(`${prefix}: type must be one of: ${CONTENT_TYPES.join(', ')}`);
        return errors;
    }

    if (!content.data) {
        errors.push(`${prefix}: data is required`);
        return errors;
    }

    // Type-specific validation
    switch (content.type) {
        case 'paragraph':
            errors.push(...validateParagraph(content.data, prefix));
            break;
        case 'table':
            errors.push(...validateTable(content.data, prefix));
            break;
        case 'image':
            errors.push(...validateImage(content.data, prefix));
            break;
        case 'list':
            errors.push(...validateList(content.data, prefix));
            break;
    }

    return errors;
};

/**
 * Validate paragraph content
 */
const validateParagraph = (data, prefix) => {
    const errors = [];

    if (!data.text || typeof data.text !== 'string') {
        errors.push(`${prefix}: paragraph text is required`);
        return errors;
    }

    if (data.text.length > TEXT_CONSTRAINTS.maxParagraphLength) {
        errors.push(`${prefix}: paragraph exceeds ${TEXT_CONSTRAINTS.maxParagraphLength} characters`);
    }

    // Check for forbidden content
    FORBIDDEN_CONTENT.forEach(forbidden => {
        if (data.text.toLowerCase().includes(forbidden.toLowerCase())) {
            errors.push(`${prefix}: contains forbidden content "${forbidden}"`);
        }
    });

    return errors;
};

/**
 * Validate table content
 */
const validateTable = (data, prefix) => {
    const errors = [];

    if (!data.headers || !Array.isArray(data.headers)) {
        errors.push(`${prefix}: table headers array is required`);
        return errors;
    }

    if (data.headers.length > TEXT_CONSTRAINTS.maxTableColumns) {
        errors.push(`${prefix}: table exceeds ${TEXT_CONSTRAINTS.maxTableColumns} columns`);
    }

    if (data.rows && Array.isArray(data.rows)) {
        if (data.rows.length > TEXT_CONSTRAINTS.maxTableRows) {
            errors.push(`${prefix}: table exceeds ${TEXT_CONSTRAINTS.maxTableRows} rows`);
        }

        // Check column consistency
        data.rows.forEach((row, idx) => {
            if (row.length !== data.headers.length) {
                errors.push(`${prefix}: row ${idx + 1} column count doesn't match headers`);
            }
        });
    }

    return errors;
};

/**
 * Validate image content
 */
const validateImage = (data, prefix) => {
    const errors = [];

    if (!data.imageId) {
        errors.push(`${prefix}: image imageId is required`);
    }

    if (data.width && data.width > IMAGE_CONSTRAINTS.maxWidth) {
        errors.push(`${prefix}: image width exceeds ${IMAGE_CONSTRAINTS.maxWidth}px`);
    }

    if (data.height && data.height > IMAGE_CONSTRAINTS.maxHeight) {
        errors.push(`${prefix}: image height exceeds ${IMAGE_CONSTRAINTS.maxHeight}px`);
    }

    return errors;
};

/**
 * Validate list content
 */
const validateList = (data, prefix) => {
    const errors = [];

    if (!data.type || !['ordered', 'unordered'].includes(data.type)) {
        errors.push(`${prefix}: list type must be 'ordered' or 'unordered'`);
    }

    if (!data.items || !Array.isArray(data.items)) {
        errors.push(`${prefix}: list items array is required`);
    } else if (data.items.length === 0) {
        errors.push(`${prefix}: list must have at least one item`);
    }

    return errors;
};

/**
 * Clean content by removing forbidden elements
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export const cleanContent = (text) => {
    if (!text) return '';

    let cleaned = text;

    // Remove style attributes
    cleaned = cleaned.replace(/style="[^"]*"/gi, '');
    cleaned = cleaned.replace(/style='[^']*'/gi, '');

    // Remove page break styles
    cleaned = cleaned.replace(/page-break-[a-z]+:\s*[a-z]+;?/gi, '');
    cleaned = cleaned.replace(/break-[a-z]+:\s*[a-z]+;?/gi, '');

    // Remove script and style tags
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    return cleaned;
};

/**
 * Validate and clean report before merge
 */
export const prepareForMerge = (content) => {
    const validation = validateReportContent(content);

    if (!validation.valid) {
        return {
            success: false,
            errors: validation.errors,
        };
    }

    // Clean all text content
    const cleanedContent = JSON.parse(JSON.stringify(content));

    cleanedContent.chapters.forEach(chapter => {
        chapter.sections?.forEach(section => {
            section.contents?.forEach(contentItem => {
                if (contentItem.type === 'paragraph' && contentItem.data?.text) {
                    contentItem.data.text = cleanContent(contentItem.data.text);
                }
            });
        });
    });

    return {
        success: true,
        content: cleanedContent,
    };
};

export default {
    validateReportContent,
    cleanContent,
    prepareForMerge,
    PATTERNS,
    CONTENT_TYPES,
};
