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

// ==================== NEW: STRICT FORMAT CHECKS ====================

/**
 * Validate no non-Arial font families found in content HTML.
 * (Detects residual inline font-family that may override Arial)
 */
export const validateFontConsistency = (chapters) => {
    if (!chapters) return { pass: true, message: 'No chapters to check' };

    const nonArialPattern = /font-family\s*:\s*(?!Arial|sans-serif)[^;"']+/gi;
    const issues = [];

    chapters.forEach((chapter, ci) => {
        chapter.sections?.forEach((section, si) => {
            const content = section.content || '';
            if (nonArialPattern.test(content)) {
                issues.push(`Chapter ${ci + 1}, Section ${si + 1}`);
            }
            nonArialPattern.lastIndex = 0;  // Reset regex state
        });
    });

    if (issues.length > 0) {
        return { pass: false, message: `Non-Arial fonts detected in: ${issues.join(', ')}` };
    }
    return { pass: true, message: 'Font consistency OK — all Arial' };
};

/**
 * Validate no custom margin styles override the global 2cm setting.
 */
export const validateMarginConsistency = (chapters) => {
    if (!chapters) return { pass: true, message: 'No chapters to check' };

    const marginPattern = /margin\s*:\s*(?!0|auto)[^;"']+/gi;
    const issues = [];

    chapters.forEach((chapter, ci) => {
        chapter.sections?.forEach((section, si) => {
            const content = section.content || '';
            if (marginPattern.test(content)) {
                issues.push(`Chapter ${ci + 1}, Section ${si + 1}`);
            }
            marginPattern.lastIndex = 0;
        });
    });

    if (issues.length > 0) {
        return {
            pass: false,
            message: `Inline margin overrides detected in: ${issues.join(', ')} — AUTO CORRECT: stripped by cleanHtmlContent`
        };
    }
    return { pass: true, message: 'Margin consistency OK' };
};

/**
 * Validate no duplicate heading titles across BAB or Sub-BAB.
 */
export const validateNoDuplicateHeadings = (chapters) => {
    if (!chapters) return { pass: true, message: 'No chapters to check' };

    const babTitles = [];
    const subTitles = [];
    const dupBab = [];
    const dupSub = [];

    chapters.forEach(chapter => {
        const babKey = (chapter.title || '').trim().toUpperCase();
        if (babTitles.includes(babKey)) {
            dupBab.push(babKey);
        } else {
            babTitles.push(babKey);
        }

        chapter.sections?.forEach(section => {
            const subKey = (section.title || '').trim().toUpperCase();
            if (subTitles.includes(subKey)) {
                dupSub.push(subKey);
            } else {
                subTitles.push(subKey);
            }
        });
    });

    const allDups = [...dupBab, ...dupSub];
    if (allDups.length > 0) {
        return { pass: false, message: `Duplicate headings: ${allDups.join('; ')}` };
    }
    return { pass: true, message: 'No duplicate headings' };
};

/**
 * Validate no orphan BAB headings (each BAB must have at least one sub-section).
 */
export const validateNoOrphanHeadings = (chapters) => {
    if (!chapters) return { pass: true, message: 'No chapters to check' };

    const orphans = chapters
        .filter(ch => !ch.sections || ch.sections.length === 0)
        .map(ch => ch.title || 'Untitled BAB');

    if (orphans.length > 0) {
        return { pass: false, message: `Orphan BAB (no sub-sections): ${orphans.join(', ')}` };
    }
    return { pass: true, message: 'No orphan headings' };
};

/**
 * Validate no empty paragraph nodes in chapter content HTML.
 * Detects <p></p>, <p> </p>, <p>&nbsp;</p> — these corrupt DOCX spacing.
 */
export const validateNoEmptyParagraphs = (chapters) => {
    if (!chapters) return { pass: true, message: 'No chapters to check' };

    const emptyParaPattern = /<p[^>]*>\s*(&nbsp;)?\s*<\/p>/gi;
    const found = [];

    chapters.forEach(ch => {
        (ch.sections || []).forEach(sec => {
            const html = sec.content || '';
            const matches = html.match(emptyParaPattern);
            if (matches && matches.length > 2) {  // Allow up to 2 (structural)
                found.push(`${ch.title} › ${sec.title || 'section'} (${matches.length} empty nodes)`);
            }
        });
    });

    if (found.length > 0) {
        return { pass: false, message: `Empty paragraphs found: ${found.join('; ')}` };
    }
    return { pass: true, message: 'No empty paragraph nodes' };
};




import { validateAllImages } from './imageValidator';

/**
 * Run all pre-export validations (12-point QC checklist).
 * @param {Object} document - Document to validate
 * @param {Array}  laporanList - Array of laporan objects with content_json (for image check)
 * @returns {Object} { valid: boolean, results: Array }
 */
export const validateBeforeExport = (document, laporanList = []) => {
    const { chapters, tocItems, imageRegistry, rawContent } = document;

    // Check 12: image validation against content_json
    const imgCheck = validateAllImages(laporanList);

    const results = [
        { name: 'Chapters Present', ...validateChaptersPresent(chapters) },
        { name: 'No Illegal Page Breaks', ...validateNoIllegalPageBreaks(rawContent) },
        { name: 'Heading Hierarchy', ...validateHeadingHierarchy(chapters) },
        { name: 'Images Valid (registry)', ...validateImages(chapters, imageRegistry) },
        { name: 'TOC Matches Content', ...validateTOC(tocItems, chapters) },
        { name: 'Content Not Empty', ...validateContentNotEmpty(chapters) },
        // Strict format enforcement checks
        { name: 'Font Consistency (Arial)', ...validateFontConsistency(chapters) },
        { name: 'Margin Consistency (2cm)', ...validateMarginConsistency(chapters) },
        { name: 'No Duplicate Headings', ...validateNoDuplicateHeadings(chapters) },
        { name: 'No Orphan Headings', ...validateNoOrphanHeadings(chapters) },
        // v3: Structure integrity
        { name: 'No Empty Paragraphs', ...validateNoEmptyParagraphs(chapters) },
        // v4: Image-safe export (base64 validation)
        {
            name: 'Gambar Aman untuk Export',
            pass: imgCheck.valid,
            message: imgCheck.summary +
                (imgCheck.errors.length > 0
                    ? '\n' + imgCheck.errors.slice(0, 5).map(e => '  • ' + e.message).join('\n')
                    : ''),
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
    validateFontConsistency,
    validateMarginConsistency,
    validateNoDuplicateHeadings,
    validateNoOrphanHeadings,
    validateNoEmptyParagraphs,
};
