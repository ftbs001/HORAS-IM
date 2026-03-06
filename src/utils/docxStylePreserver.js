/**
 * docxStylePreserver.js — DOCX Style Lock CSS Engine
 *
 * Generates the CSS ruleset injected into DocxPreviewRenderer.
 * All rules use .docx-page as the scoping root to prevent leakage.
 *
 * Font fallback priority (if original font unavailable):
 *   1. Times New Roman  — most common in Indonesian government docs
 *   2. Calibri          — modern Office default
 *   3. Arial            — universal sans-serif fallback
 *   4. serif / sans-serif — browser native
 *
 * STYLE LOCK guarantees:
 *   - No auto-clean formatting
 *   - No normalize spacing
 *   - No auto-typography conversion
 *   - Empty paragraphs preserved as visual spacers
 *   - Table borders preserved
 *   - Images constrained to page width, aspect ratio maintained
 */

/* ── Font fallback map ───────────────────────────────────────────────────── */
const FONT_FALLBACK_MAP = {
  // Commonly missing decorative / display fonts
  garamond: '"Times New Roman", Times, Georgia, serif',
  'book antiqua': '"Times New Roman", Times, Georgia, serif',
  palatino: '"Book Antiqua", "Times New Roman", Times, serif',
  'century schoolbook': '"Times New Roman", Times, Georgia, serif',
  baskerville: '"Times New Roman", Times, Georgia, serif',
  didot: '"Times New Roman", Times, Georgia, serif',

  // Office fonts that may not be on all systems
  cambria: '"Cambria", "Times New Roman", Georgia, serif',
  constantia: '"Constantia", "Times New Roman", Georgia, serif',
  corbel: 'Corbel, Calibri, "Trebuchet MS", Verdana, sans-serif',
  candara: 'Candara, Calibri, "Trebuchet MS", Verdana, sans-serif',
  consolas: '"Consolas", "Courier New", Courier, monospace',

  // Generic fallbacks
  default: '"Times New Roman", Calibri, Arial, sans-serif',
};

/**
 * Get a CSS font-family stack for a given font name.
 * If the font is known to be safe, return it with standard fallbacks.
 * If unknown/decorative, return a professional fallback stack.
 *
 * @param {string} fontName
 * @returns {string} CSS font-family value
 */
export function getFontFallback(fontName) {
  if (!fontName) return FONT_FALLBACK_MAP.default;
  const key = fontName.toLowerCase().trim();
  if (FONT_FALLBACK_MAP[key]) return FONT_FALLBACK_MAP[key];
  // Standard safe system fonts — keep as-is with fallback
  return `"${fontName}", "Times New Roman", Calibri, Arial, sans-serif`;
}

/* ── Main CSS builder ────────────────────────────────────────────────────── */

/**
 * Build the complete scoped CSS for DOCX preview rendering.
 *
 * @param {object} options
 * @param {object} [options.pageMargins] - { top, right, bottom, left } in cm
 * @param {boolean} [options.preserveLayout=true]
 * @param {'portrait'|'landscape'} [options.orientation='portrait']
 * @returns {string} CSS string to inject via <style> tag
 */
export function buildPreservedCss({ pageMargins = {}, preserveLayout = true, orientation = 'portrait' } = {}) {
  const mt = pageMargins.top ?? 2.54;
  const mr = pageMargins.right ?? 3.18;
  const mb = pageMargins.bottom ?? 2.54;
  const ml = pageMargins.left ?? 3.18;

  const isLandscape = orientation === 'landscape';
  // A4 portrait: 794px (21cm @96dpi), A4 landscape: 1122px (29.7cm @96dpi)
  const pageMaxWidth = isLandscape ? '1122px' : '794px';
  const pageMinHeight = isLandscape ? '561px' : '1123px'; // 21cm vs 29.7cm inverted

  return `
/* ──────────────────────────────────────────────────────
   DOCX FIDELITY RENDERER — Scoped Styles
   Scope: .docx-renderer-wrap > .docx-page
   STYLE LOCK: no auto-clean, no normalize, no compress
────────────────────────────────────────────────────── */

/* A4 page container */
.docx-renderer-wrap {
  background: #e8eaed;
  padding: 32px 24px;
  min-height: 200px;
  border-radius: 8px;
  overflow-y: auto;
}

.docx-page {
  background: #fff;
  width: 100%;
  max-width: ${pageMaxWidth};
  min-height: ${pageMinHeight};
  margin: 0 auto;
  padding: ${mt}cm ${mr}cm ${mb}cm ${ml}cm;
  box-shadow: 0 2px 16px rgba(0,0,0,0.18);
  box-sizing: border-box;
  font-family: "Times New Roman", Calibri, Arial, sans-serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #000;
  /* STYLE LOCK: no reflow */
  word-break: break-word;
  overflow-wrap: break-word;
}

/* ── Headings ──────────────────────────────────────── */
.docx-page h1, .docx-page .docx-h1 {
  font-family: "Times New Roman", Calibri, Arial, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  margin: 0.5em 0;
  line-height: 1.3;
  page-break-after: avoid;
}

.docx-page h2, .docx-page .docx-h2 {
  font-family: "Times New Roman", Calibri, Arial, sans-serif;
  font-size: 12pt;
  font-weight: bold;
  margin: 0.6em 0 0.3em;
  line-height: 1.4;
  page-break-after: avoid;
}

.docx-page h3, .docx-page .docx-h3 {
  font-family: "Times New Roman", Calibri, Arial, sans-serif;
  font-size: 12pt;
  font-weight: bold;
  font-style: italic;
  margin: 0.5em 0 0.2em;
  line-height: 1.4;
}

.docx-page h4, .docx-page .docx-h4,
.docx-page h5, .docx-page .docx-h5,
.docx-page h6, .docx-page .docx-h6 {
  font-family: "Times New Roman", Calibri, Arial, sans-serif;
  font-size: 12pt;
  font-weight: bold;
  margin: 0.4em 0 0.2em;
}

/* ── Normal paragraphs ─────────────────────────────── */
.docx-page p,
.docx-page .docx-normal,
.docx-page .docx-body {
  font-family: "Times New Roman", Calibri, Arial, sans-serif;
  font-size: 12pt;
  line-height: 1.5;
  margin: 0;
  padding: 0;
  /* STYLE LOCK: preserve empty lines as visual spacers */
  min-height: 1em;
  text-align: justify;
}

/* STYLE LOCK: preserve blank paragraphs */
.docx-page p:empty,
.docx-page .docx-normal:empty {
  display: block;
  height: 1.5em;
  min-height: 1.5em;
}

/* ── Lists ─────────────────────────────────────────── */
.docx-page ul, .docx-page ol {
  margin: 0.3em 0 0.3em 2em;
  padding: 0;
  line-height: 1.5;
}

.docx-page li {
  font-family: "Times New Roman", Calibri, Arial, sans-serif;
  font-size: 12pt;
  line-height: 1.5;
  margin-bottom: 0.1em;
}

.docx-page .docx-list-para {
  margin-left: 1.2em;
  text-indent: -0.6em;
  padding-left: 0.6em;
}

/* ── Tables — STYLE LOCK: preserve grid, no flatten ── */
.docx-page table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
  font-size: 12pt;
  font-family: "Times New Roman", Calibri, Arial, sans-serif;
  table-layout: auto;
  /* STYLE LOCK: never flatten */
  word-break: normal;
}

.docx-page table td,
.docx-page table th {
  border: 1px solid #000;
  padding: 4px 8px;
  vertical-align: top;
  font-size: 12pt;
  line-height: 1.4;
}

.docx-page table th {
  font-weight: bold;
  background: #f5f5f5;
}

/* ── Images — STYLE LOCK: no compress, preserve ratio ─ */
.docx-page img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.4em auto;
  /* STYLE LOCK: never compress */
  image-rendering: high-quality;
  image-rendering: -webkit-optimize-contrast;
}

/* ── Block quote / caption ─────────────────────────── */
.docx-page blockquote,
.docx-page .docx-quote {
  margin: 0.4em 2em;
  padding-left: 1em;
  border-left: 3px solid #aaa;
  font-style: italic;
  color: #333;
}

.docx-page .docx-caption {
  text-align: center;
  font-size: 10pt;
  font-style: italic;
  color: #555;
  margin: 0.2em 0 0.6em;
}

/* ── TOC entries ───────────────────────────────────── */
.docx-page .docx-toc1 { font-weight: bold; margin-left: 0; }
.docx-page .docx-toc2 { margin-left: 1.5em; }
.docx-page .docx-toc3 { margin-left: 3em; }

/* ── Inline styles ─────────────────────────────────── */
.docx-page strong, .docx-page b { font-weight: bold; }
.docx-page em, .docx-page i { font-style: italic; }
.docx-page u { text-decoration: underline; }
.docx-page s, .docx-page del { text-decoration: line-through; }

/* ── Page break signal (visual only in preview) ────── */
.docx-page .docx-page-break {
  border: none;
  border-top: 2px dashed #bbb;
  margin: 1.5em 0;
  position: relative;
}
.docx-page .docx-page-break::after {
  content: "— halaman baru —";
  position: absolute;
  top: -0.7em;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  padding: 0 8px;
  font-size: 10px;
  color: #bbb;
}

/* ── Layout lock toggle ────────────────────────── */
${!preserveLayout ? `
/* Preserve Layout OFF — allow browser reflow */
.docx-page { padding: 24px; }
.docx-page p { text-align: left; }
` : ''}

/* ── Landscape orientation override ───────────── */
${isLandscape ? `
.docx-renderer-wrap {
  padding: 24px 16px;
}
.docx-page {
  /* Landscape: wider, shorter — prevent side-scroll in small viewports */
  overflow-x: auto;
}
.docx-page table {
  /* Landscape table: allow full width without overflow */
  min-width: unset;
  max-width: 100%;
}
` : ''}
  `.trim();
}

/* ── Style lock constant (default margins, portrait, ON) ───────────── */
export const STYLE_LOCK_CSS = buildPreservedCss({ preserveLayout: true, orientation: 'portrait' });
