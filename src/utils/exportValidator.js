/**
 * Export Validator - Quality Control for Document Export
 * 
 * Pre-export validation to ensure document quality:
 * - All BAB present
 * - No illegal page breaks
 * - Valid heading hierarchy
 * - All images embedded
 * - TOC matches content
 */

// ==================== VALIDATION CHECKS ====================

/**
 * Validate all chapters are present
 */
export const validateChaptersPresent = (chapters, expectedCount = 3) => {
    if (!chapters || !Array.isArray(chapters)) {
        return { pass: false, message: 'No chapters found' };
    }

    if (chapters.length < expectedCount) {
        return {
            pass: false,
            message: `Expected at least ${expectedCount} chapters, found ${chapters.length}`
        };
    }

    // Check BAB numbering
    const babNumbers = chapters.map(ch => {
        const match = ch.title?.match(/BAB\s+([IVX]+)/i);
        return match ? match[1] : null;
    }).filter(Boolean);

    if (babNumbers.length !== chapters.length) {
        return { pass: false, message: 'Some chapters missing BAB numbering' };
    }

    return { pass: true, message: `All ${chapters.length} chapters present` };
};

/**
 * Validate no illegal page breaks in content
 */
export const validateNoIllegalPageBreaks = (content) => {
    if (!content) {
        return { pass: true, message: 'No content to check' };
    }

    const illegalPatterns = [
        /page-break-before:\s*always/gi,
        /page-break-after:\s*always/gi,
        /break-before:\s*page/gi,
        /break-after:\s*page/gi,
    ];

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    for (const pattern of illegalPatterns) {
        if (pattern.test(contentStr)) {
            return {
                pass: false,
                message: `Found illegal page break: ${pattern.source}`
            };
        }
    }

    return { pass: true, message: 'No illegal page breaks found' };
};

/**
 * Validate heading hierarchy (1 → 2 → 3)
 */
export const validateHeadingHierarchy = (chapters) => {
    if (!chapters || !Array.isArray(chapters)) {
        return { pass: false, message: 'No chapters to validate' };
    }

    const errors = [];

    chapters.forEach((chapter, chIdx) => {
        if (chapter.level !== 1) {
            errors.push(`Chapter ${chIdx + 1}: level should be 1`);
        }

        let prevLevel = 1;
        chapter.sections?.forEach((section, secIdx) => {
            if (section.level < 2 || section.level > 3) {
                errors.push(`Chapter ${chIdx + 1}, Section ${secIdx + 1}: level must be 2 or 3`);
            }

            // Level jump validation (can't skip levels)
            if (section.level > prevLevel + 1) {
                errors.push(`Chapter ${chIdx + 1}, Section ${secIdx + 1}: level jump from ${prevLevel} to ${section.level}`);
            }

            prevLevel = section.level;
        });
    });

    if (errors.length > 0) {
        return { pass: false, message: errors.join('; ') };
    }

    return { pass: true, message: 'Heading hierarchy valid' };
};

/**
 * Validate all images are properly referenced
 */
export const validateImages = (chapters, imageRegistry = {}) => {
    if (!chapters) {
        return { pass: true, message: 'No chapters to check' };
    }

    const missingImages = [];

    const checkContent = (contents) => {
        contents?.forEach(item => {
            if (item.type === 'image' && item.data?.imageId) {
                if (!imageRegistry[item.data.imageId]) {
                    missingImages.push(item.data.imageId);
                }
            }
        });
    };

    chapters.forEach(chapter => {
        chapter.sections?.forEach(section => {
            checkContent(section.contents);
        });
    });

    if (missingImages.length > 0) {
        return {
            pass: false,
            message: `Missing images: ${missingImages.join(', ')}`
        };
    }

    return { pass: true, message: 'All images found' };
};

/**
 * Validate TOC matches actual content
 */
export const validateTOC = (tocItems, chapters) => {
    if (!tocItems || !chapters) {
        return { pass: false, message: 'TOC or chapters missing' };
    }

    // Count expected TOC entries from chapters
    let expectedEntries = 0;
    chapters.forEach(chapter => {
        expectedEntries++; // BAB title
        chapter.sections?.forEach(() => expectedEntries++);
    });

    if (tocItems.length !== expectedEntries) {
        return {
            pass: false,
            message: `TOC has ${tocItems.length} entries, expected ${expectedEntries}`
        };
    }

    return { pass: true, message: 'TOC matches content' };
};

/**
 * Validate content is not empty
 */
export const validateContentNotEmpty = (chapters) => {
    const emptyChapters = [];

    chapters?.forEach((chapter, idx) => {
        let hasContent = false;
        chapter.sections?.forEach(section => {
            if (section.contents?.length > 0) {
                hasContent = true;
            }
        });

        if (!hasContent) {
            emptyChapters.push(chapter.title || `Chapter ${idx + 1}`);
        }
    });

    if (emptyChapters.length > 0) {
        return {
            pass: false,
            message: `Empty chapters: ${emptyChapters.join(', ')}`
        };
    }

    return { pass: true, message: 'All chapters have content' };
};

// ==================== MAIN VALIDATION ====================

/**
 * Run all pre-export validations
 * @param {Object} document - Document to validate
 * @returns {Object} { valid: boolean, results: Array }
 */
export const validateBeforeExport = (document) => {
    const { chapters, tocItems, imageRegistry, rawContent } = document;

    const results = [
        {
            name: 'Chapters Present',
            ...validateChaptersPresent(chapters)
        },
        {
            name: 'No Illegal Page Breaks',
            ...validateNoIllegalPageBreaks(rawContent)
        },
        {
            name: 'Heading Hierarchy',
            ...validateHeadingHierarchy(chapters)
        },
        {
            name: 'Images Valid',
            ...validateImages(chapters, imageRegistry)
        },
        {
            name: 'TOC Matches Content',
            ...validateTOC(tocItems, chapters)
        },
        {
            name: 'Content Not Empty',
            ...validateContentNotEmpty(chapters)
        },
    ];

    const valid = results.every(r => r.pass);

    return { valid, results };
};

/**
 * Generate validation report
 */
export const generateValidationReport = (document) => {
    const { valid, results } = validateBeforeExport(document);

    const report = {
        timestamp: new Date().toISOString(),
        valid,
        summary: valid ? 'All checks passed' : 'Validation failed',
        checks: results.map(r => ({
            name: r.name,
            status: r.pass ? '✅ PASS' : '❌ FAIL',
            message: r.message,
        })),
    };

    return report;
};

export default {
    validateBeforeExport,
    generateValidationReport,
    validateChaptersPresent,
    validateNoIllegalPageBreaks,
    validateHeadingHierarchy,
    validateImages,
    validateTOC,
    validateContentNotEmpty,
};
