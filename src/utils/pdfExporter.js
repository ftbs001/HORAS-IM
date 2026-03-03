/**
 * pdfExporter.js
 * ──────────────
 * PDF Export for HORAS-IM using html2canvas + jsPDF.
 *
 * Strategy: Renders the ContentBlockRenderer DOM element to canvas,
 * then embeds it page-by-page into PDF.
 * → Preview = PDF (same engine, same output).
 *
 * Notes:
 * - Images are served from base64 in content_json — no CORS issues.
 * - useCORS: false because we don't have any cross-origin resources.
 * - scale: 2 gives 144 DPI output (professional quality).
 */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const DPI_SCALE = 2;   // 2x for 144 DPI — higher means better quality
const MARGIN_MM = 10;  // safety margin per page

/**
 * Export a rendered ContentBlockRenderer element to PDF.
 *
 * @param {string} elementId   - DOM id of ContentBlockRenderer (default: 'content-block-renderer')
 * @param {string} filename    - Output PDF filename (e.g., 'Laporan_Maret_2026.pdf')
 * @param {Function} onProgress - Optional callback(percent) for progress UI
 * @returns {Promise<boolean>} - true on success, false on error
 */
export const exportToPdf = async (elementId = 'content-block-renderer', filename = 'Laporan.pdf', onProgress) => {
    try {
        onProgress?.(5);

        // Dynamic imports — keeps bundle light
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf'),
        ]);

        onProgress?.(15);

        const element = document.getElementById(elementId);
        if (!element) throw new Error(`Element #${elementId} tidak ditemukan.`);

        // 1. Render DOM to canvas at 2x scale (144 DPI)
        const canvas = await html2canvas(element, {
            scale: DPI_SCALE,
            useCORS: false,    // All images are base64 — no CORS needed
            allowTaint: false,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 0,       // No timeout — wait for all images
        });

        onProgress?.(70);

        // 2. Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: false,        // Do NOT compress — preserves image quality
        });

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // 3. Calculate usable width in PDF pixels
        const pdfWidthMM = A4_WIDTH_MM - MARGIN_MM * 2;
        const pdfHeightMM = A4_HEIGHT_MM - MARGIN_MM * 2;

        // px per mm on canvas
        const canvasMmWidth = canvasWidth;
        const pageHeightPx = Math.floor((pdfHeightMM / pdfWidthMM) * canvasWidth);

        let yOffset = 0;
        let pageNum = 0;

        // 4. Slice canvas into A4 pages
        while (yOffset < canvasHeight) {
            if (pageNum > 0) pdf.addPage();

            const sliceHeight = Math.min(pageHeightPx, canvasHeight - yOffset);

            // Create a slice canvas for this page
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = sliceHeight;
            const ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, yOffset, canvasWidth, sliceHeight, 0, 0, canvasWidth, sliceHeight);

            const imgData = pageCanvas.toDataURL('image/jpeg', 0.97); // 97% quality — near-lossless

            pdf.addImage(
                imgData,
                'JPEG',
                MARGIN_MM,       // x
                MARGIN_MM,       // y
                pdfWidthMM,      // width
                (sliceHeight / canvasWidth) * pdfWidthMM,  // height proportional
                undefined,
                'FAST',          // No lossy re-compression
            );

            yOffset += sliceHeight;
            pageNum++;
        }

        onProgress?.(95);

        // 5. Save
        pdf.save(filename);

        onProgress?.(100);
        return true;

    } catch (err) {
        console.error('[pdfExporter] Error:', err);
        return false;
    }
};

/**
 * Quick check if html2canvas and jsPDF are available.
 * Call this before showing the Export PDF button.
 * @returns {Promise<boolean>}
 */
export const isPdfExportAvailable = async () => {
    try {
        await Promise.all([import('html2canvas'), import('jspdf')]);
        return true;
    } catch {
        return false;
    }
};

export default { exportToPdf, isPdfExportAvailable };
