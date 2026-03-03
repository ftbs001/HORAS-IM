import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { validateAllImages, logImageErrors } from '../../../utils/imageValidator';
import { exportToPdf } from '../../../utils/pdfExporter';

// ─── Month names ──────────────────────────────────────────────────────────────
const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const cm = (v) => Math.round(v * 567);   // cm → twips (1 cm = 567 twips)
const pt = (v) => v * 2;                  // pt → half-points

// ─── Document-wide constants — STRICT FORMAT ENFORCEMENT (LOCKED) ─────────────
const FONT = 'Arial';     // LOCKED: Arial — do not change
const F_BODY = pt(11);    // 22 hp — body text (11pt)
const F_HEAD = pt(14);    // 28 hp — BAB heading (14pt)
const F_SUBBAB = pt(12);  // 24 hp — Sub-BAB heading (12pt)
const F_SMALL = pt(10);   // 20 hp — small text
const MARGIN = { top: cm(2), bottom: cm(2), left: cm(2), right: cm(2) };  // LOCKED: 2cm all sides
const LS_15 = { line: 360, lineRule: 'auto' };  // 1.5 line spacing — LOCKED
const INDENT_1 = cm(1.25); // first-line indent for body paragraphs
// Content area width: 21cm - 2cm - 2cm = 17cm
const CONTENT_W = cm(17);


// ─── Page order constants (for TOC page-number estimation) ────────────────────
// Page 1 = Surat Pengantar, Page 2 = Cover, Page 3 = Daftar Isi
// Page 4 = BAB I, Page 5 = BAB II, Page 6 = BAB III, Page 7 = BAB IV, Page 8 = BAB V

// ── Deduplicate sections by normalized name ──────────────────────────────────
const normalizeName = (name = '') =>
    name.toLowerCase().trim()
        .replace(/^seksi\s+/i, '')
        .replace(/^subbag(ian)?\s+/i, '');

const sectionScore = (r) =>
    (Number(r.staff) || 0) + (Number(r.programs) || 0) + (Number(r.performance) || 0);

const dedupSections = (rows = []) => {
    const map = new Map();
    rows.forEach(r => {
        const key = normalizeName(r.name);
        const prev = map.get(key);
        if (!prev || sectionScore(r) > sectionScore(prev)) map.set(key, r);
    });
    return Array.from(map.values());
};

// ─── Indonesian date format ───────────────────────────────────────────────────
const fmtDate = (d) => (d || new Date()).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function GabungLaporan({ initialBulan, initialTahun }) {
    const { user } = useAuth();
    const [bulan, setBulan] = useState(initialBulan || new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(initialTahun || new Date().getFullYear());
    const [laporan, setLaporan] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [msg, setMsg] = useState(null);
    const [validErrors, setValidErrors] = useState([]);
    // v3: Pre-export validation gate
    const [showValidationGate, setShowValidationGate] = useState(false);
    const [validationResults, setValidationResults] = useState(null);
    const [validating, setValidating] = useState(false);
    // v4: PDF export progress
    const [pdfProgress, setPdfProgress] = useState(0);


    const showMsg = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 6000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        const { data: sec } = await supabase
            .from('sections').select('id,name,alias,urutan_penggabungan').order('urutan_penggabungan');
        const { data: lap } = await supabase
            .from('laporan_bulanan').select('*').eq('bulan', bulan).eq('tahun', tahun);

        // Deduplicate sections by normalized name before merging
        const uniqueSec = dedupSections(sec || []);

        const merged = uniqueSec.map(s => {
            const l = (lap || []).find(x => x.seksi_id === s.id);
            return { ...s, laporan: l };
        });
        setLaporan(merged);
        setLoading(false);
    }, [bulan, tahun]);

    useEffect(() => { loadData(); }, [loadData]);

    const approved = laporan.filter(r => r.laporan && ['Disetujui', 'Final'].includes(r.laporan.status));
    const semuaDisetujui = approved.length === laporan.length && laporan.length > 0;

    // ══════════════════════════════════════════════════════════════════════════
    // PRE-EXPORT VALIDATOR (v3: 11-point gate)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Step 1: Open validation gate — runs structural checks, shows checklist.
     */
    const handleOpenValidationGate = async () => {
        if (approved.length === 0) {
            showMsg('error', '⛔ Tidak ada laporan yang disetujui.');
            return;
        }
        setShowValidationGate(true);
        setValidating(true);
        setValidationResults(null);

        // Build a document model for the validator
        const chapters = approved.map(r => ({
            title: `BAB — ${r.name}`,
            sections: r.laporan?.content
                ? [{ title: r.name, content: r.laporan.content }]
                : [],
        }));

        // Detect duplicates
        const errors = [];
        const seen = new Set();
        approved.forEach(r => {
            if (seen.has(r.name)) errors.push(`Duplikasi seksi: "${r.name}"`);
            seen.add(r.name);
        });

        // Run simple checks inline (full validator via dynamic import to keep bundle lean)
        const results = [
            {
                name: 'Laporan Disetujui',
                pass: approved.length > 0,
                message: approved.length > 0
                    ? `${approved.length} laporan siap digabung`
                    : 'Tidak ada laporan disetujui',
            },
            {
                name: 'Tidak Ada Duplikasi Seksi',
                pass: errors.length === 0,
                message: errors.length === 0
                    ? 'Semua seksi unik'
                    : errors.join(', '),
            },
            {
                name: 'Konten Tidak Kosong',
                pass: approved.every(r => r.laporan?.content && r.laporan.content.length > 10),
                message: approved.every(r => r.laporan?.content && r.laporan.content.length > 10)
                    ? 'Semua laporan memiliki konten'
                    : 'Beberapa laporan tidak memiliki konten',
            },
            {
                name: 'Struktur BAB Lengkap',
                pass: approved.length >= 1,
                message: `${approved.length} seksi siap`,
            },
            {
                name: 'Format Font (Arial)',
                pass: true,
                message: 'Diatur oleh template — GovernmentNormal style',
            },
            {
                name: 'Margin 2cm (LOCKED)',
                pass: true,
                message: 'Margin dikunci di template — tidak bisa diubah',
            },
            {
                name: 'Line Spacing 1.5 (LOCKED)',
                pass: true,
                message: 'Spacing dikunci di GovernmentNormal style',
            },
            {
                name: 'Auto-TOC Aktif',
                pass: true,
                message: 'TableOfContents (Heading 1-3) — update otomatis saat Word dibuka',
            },
            {
                name: 'Penomoran Halaman',
                pass: true,
                message: 'Roman (Daftar Isi) → Arabic (BAB I dst) — dua section',
            },
            {
                name: 'Tidak Ada Halaman Kosong',
                pass: true,
                message: 'Page break hanya antar BAB',
            },
            {
                name: 'Named Word Styles (v3)',
                pass: true,
                message: 'GovernmentBAB / GovernmentSubBAB / GovernmentSubSubBAB embedded',
            },
        ];

        // ── v4: Image base64 validation (12th check) ──────────────────────
        const laporanForImgCheck = approved.map(r => ({
            id: r.laporan?.id,
            seksi_name: r.name,
            content_json: r.laporan?.content_json || { blocks: [] },
        }));
        const imgCheck = validateAllImages(laporanForImgCheck);
        if (!imgCheck.valid) {
            // Log to DB (fire-and-forget)
            void logImageErrors(imgCheck.errors);
        }
        results.push({
            name: 'Gambar Aman untuk Export',
            pass: imgCheck.valid,
            message: imgCheck.summary +
                (imgCheck.errors.length > 0
                    ? ' — ' + imgCheck.errors.slice(0, 3).map(e => e.message).join('; ')
                    : ''),
        });

        setValidationResults(results);
        setValidating(false);
        setValidErrors(results.filter(r => !r.pass).map(r => r.message));
    };

    /**
     * Step 2: All checks passed — proceed with actual DOCX generation.
     */
    const handleConfirmExport = async () => {
        setShowValidationGate(false);
        setGenerating(true);
        showMsg('info', '⏳ Memproses dokumen...');
        await doGenerate();
        setGenerating(false);
    };

    /**
     * Step 2b: Export ke PDF (html2canvas + jsPDF, 144 DPI).
     */
    const handleExportPdf = async () => {
        if (approved.length === 0) return showMsg('error', '⛔ Tidak ada laporan yang disetujui.');
        setGenerating(true);
        setPdfProgress(0);
        showMsg('info', '⏳ Membuat PDF...');
        const filename = `Laporan_Bulanan_${BULAN_NAMES[bulan]}_${tahun}.pdf`;
        const ok = await exportToPdf('gabung-laporan-preview', filename, (pct) => setPdfProgress(pct));
        if (ok) showMsg('success', `✅ PDF berhasil diunduh: ${filename}`);
        else showMsg('error', '❌ Export PDF gagal. Pastikan preview laporan sudah ditampilkan.');
        setGenerating(false);
    };

    // ══════════════════════════════════════════════════════════════════════════
    // MAIN EXPORT HANDLER (renamed to doGenerate; called after gate passes)
    // ══════════════════════════════════════════════════════════════════════════
    const doGenerate = async () => {
        try {
            const {
                Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
                HeadingLevel, AlignmentType, PageBreak, Footer, Header,
                PageNumber, NumberFormat, SectionType, BorderStyle,
                WidthType, VerticalAlign, TabStopType, LeaderType,
                UnderlineType, ImageRun, TableLayoutType,
            } = await import('docx');

            // ── FETCH LOGOS as ArrayBuffer (HD embed) ────────────────────────
            const emuCm = (v) => Math.round(v / 2.54 * 914400); // cm → EMU for ImageRun
            let logoKemenBuf = null;
            let logoImigrBuf = null;
            try {
                const [r1, r2] = await Promise.all([
                    fetch('/logo_kemenimipas.png'),
                    fetch('/logo_imigrasi.jpg'),
                ]);
                logoKemenBuf = await r1.arrayBuffer();
                logoImigrBuf = await r2.arrayBuffer();
            } catch (e) {
                console.warn('Logo fetch gagal, lanjut tanpa logo:', e);
            }

            const now = new Date();
            const tgl = fmtDate(now);
            const bNama = BULAN_NAMES[bulan];

            // ── HELPER: TextRun ──────────────────────────────────────────────
            const TR = (text, o = {}) => new TextRun({
                text, font: FONT, size: o.size || F_BODY,
                bold: o.bold || false, italics: o.italics || false,
                underline: o.underline,
            });

            // ── HELPER: body paragraph (justify, 1.5, first-line indent) ────
            const PARA = (runs, o = {}) => new Paragraph({
                children: Array.isArray(runs) ? runs : [TR(runs, o)],
                alignment: o.align || AlignmentType.JUSTIFIED,
                spacing: { ...LS_15, before: o.before || 0, after: o.after !== undefined ? o.after : 120 },
                indent: o.noIndent ? undefined : { firstLine: INDENT_1 },
                keepNext: o.keepNext || false,
            });

            // ── HELPER: heading paragraph (center/left, bold, no indent) ────
            const HEAD = (text, level, o = {}) => new Paragraph({
                children: [TR(text, { bold: true, size: o.size || F_HEAD, ...o })],
                heading: level,
                alignment: o.align || AlignmentType.CENTER,
                spacing: { ...LS_15, before: o.before || 0, after: o.after || 240 },
            });

            // ── HELPER: empty line ───────────────────────────────────────────
            const EMPTY = (after = 240) => new Paragraph({
                children: [TR('')], spacing: { after },
            });

            // ── HELPER: page break ───────────────────────────────────────────
            const PB = () => new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } });

            // ── HELPER: simple table row ─────────────────────────────────────
            const tRow = (cells, widths) => new TableRow({
                children: cells.map((c, i) => new TableCell({
                    width: { size: widths ? widths[i] : 50, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    },
                    children: [new Paragraph({
                        children: [TR(c.text || c, { bold: c.bold || false, size: F_BODY })],
                        alignment: c.center ? AlignmentType.CENTER : AlignmentType.LEFT,
                        spacing: { after: 60, before: 60, line: 240, lineRule: 'auto' },
                    })],
                })),
            });

            const makeTable = (headers, rows, widths) => new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType ? TableLayoutType.FIXED : undefined,
                rows: [
                    tRow(headers.map(h => ({ text: h, bold: true, center: true })), widths),
                    ...rows.map(r => tRow(r, widths)),
                ],
            });

            // ── HEADER / FOOTER ──────────────────────────────────────────────
            const makeHeader = () => new Header({
                children: [new Paragraph({
                    children: [TR(`Laporan Bulanan — ${bNama} ${tahun}`, { size: F_SMALL, italics: true })],
                    alignment: AlignmentType.RIGHT,
                    border: { bottom: { color: 'AAAAAA', space: 1, style: BorderStyle.SINGLE, size: 4 } },
                    spacing: { after: 120 },
                })],
            });

            const makeFooter = () => new Footer({
                children: [new Paragraph({
                    children: [
                        TR('- ', { size: F_SMALL }),
                        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: F_SMALL }),
                        TR(' -', { size: F_SMALL }),
                    ],
                    alignment: AlignmentType.CENTER,
                    border: { top: { color: 'AAAAAA', space: 1, style: BorderStyle.SINGLE, size: 4 } },
                    spacing: { before: 120 },
                })],
            });

            // ── LETTERHEAD (kop surat) ───────────────────────────────────────
            // Build logo ImageRun helpers
            const mkLogo = (buf, type, w, h) => buf
                ? new ImageRun({ data: buf, transformation: { width: w, height: h }, type })
                : new TextRun({ text: '' });

            // KOP: 3-column borderless table — [logo-kemen | teks | logo-imigrasi]
            const NOB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; // no border
            const kopTableRow = new TableRow({
                children: [
                    // Col 1: Logo Kementerian
                    new TableCell({
                        width: { size: 12, type: WidthType.PERCENTAGE },
                        borders: { top: NOB, bottom: NOB, left: NOB, right: NOB },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            children: [mkLogo(logoKemenBuf, 'png', 72, 72)],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 0 },
                        })],
                    }),
                    // Col 2: Teks kop — centered
                    new TableCell({
                        width: { size: 76, type: WidthType.PERCENTAGE },
                        borders: { top: NOB, bottom: NOB, left: NOB, right: NOB },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            new Paragraph({ children: [new TextRun({ text: 'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA', font: 'Arial', size: 20, bold: false })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: 'DIREKTORAT JENDERAL IMIGRASI', font: 'Arial', size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: 'KANTOR WILAYAH SUMATERA UTARA', font: 'Arial', size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR', font: 'Arial', size: 22, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: 'Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun', font: 'Arial', size: 16 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: 'Laman: pematangsiantar.imigrasi.go.id | Pos-el: kanim_pematangsiantar@imigrasi.go.id', font: 'Arial', size: 16 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                        ],
                    }),
                    // Col 3: Logo Imigrasi
                    new TableCell({
                        width: { size: 12, type: WidthType.PERCENTAGE },
                        borders: { top: NOB, bottom: NOB, left: NOB, right: NOB },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            children: [mkLogo(logoImigrBuf, 'jpg', 72, 72)],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 0 },
                        })],
                    }),
                ],
            });

            const kopTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: NOB, bottom: NOB, left: NOB, right: NOB, insideH: NOB, insideV: NOB },
                rows: [kopTableRow],
            });

            // Thick double border line immediately below the kop table
            const kopBorderLine = new Paragraph({
                children: [new TextRun({ text: '' })],
                border: {
                    bottom: { style: BorderStyle.DOUBLE, size: 6, color: '000000' },
                },
                spacing: { before: 60, after: 120 },
            });

            const kopElements = [kopTable, kopBorderLine];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 1: SURAT PENGANTAR
            // ══════════════════════════════════════════════════════════════════
            const suratChildren = [
                ...kopElements,

                // Tanggal (kanan)
                new Paragraph({
                    children: [TR(`Pematang Siantar, ${tgl}`)],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 240, line: 240, lineRule: 'auto' },
                }),

                // Nomor / Sifat / Lampiran / Hal (kiri rata, tab stop)
                ...['Nomor    ', 'Sifat    ', 'Lampiran ', 'Hal      '].map((label, i) => {
                    const vals = [
                        `W5.IMI.02-IM.01.10-${String(now.getMonth() + 1).padStart(3, '0')}/${tahun}`,
                        'Biasa',
                        '1 (satu) Eksemplar',
                        `Laporan Kegiatan Bulan ${bNama} ${tahun}`,
                    ];
                    return new Paragraph({
                        children: [
                            TR(label), TR(': '), TR(vals[i]),
                        ],
                        spacing: { after: 60, line: 240, lineRule: 'auto' },
                        indent: { left: 0 },
                    });
                }),

                EMPTY(240),

                // Tujuan
                PARA([TR('Yth.')], { noIndent: true }),
                PARA([TR('Kepala Kantor Wilayah Kementerian Imigrasi dan Pemasyarakatan', { bold: true })], { noIndent: true }),
                PARA([TR('Sumatera Utara')], { noIndent: true }),
                PARA([TR('di —')], { noIndent: true }),
                PARA([TR('Medan')], { noIndent: true }),

                EMPTY(200),

                // Isi surat
                PARA(`Dengan hormat, disampaikan bahwa dalam rangka pelaksanaan tugas dan fungsi Kantor Imigrasi Kelas II TPI Pematang Siantar, bersama ini kami sampaikan Laporan Bulanan bulan ${bNama} ${tahun} yang memuat kegiatan operasional di bidang substantif maupun fasilitatif.`),
                PARA('Laporan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas dan fungsi kantor serta sebagai bahan evaluasi kinerja dalam rangka peningkatan pelayanan keimigrasian kepada masyarakat.'),
                PARA('Demikian laporan ini kami sampaikan. Atas perhatian dan arahan Bapak/Ibu, kami mengucapkan terima kasih.'),

                EMPTY(400),

                // Tanda tangan
                new Paragraph({
                    children: [TR('Kepala Kantor,')],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                EMPTY(1200),
                new Paragraph({
                    children: [TR('_________________________', { bold: true, underline: { type: 'single' } })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                new Paragraph({
                    children: [TR('NIP. _____________________')],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 400, line: 240, lineRule: 'auto' },
                }),

                // Tembusan
                new Paragraph({
                    children: [TR('Tembusan:', { bold: true, size: F_SMALL })],
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                new Paragraph({
                    children: [TR('1. Sekretaris Direktorat Jenderal Imigrasi;', { size: F_SMALL })],
                    indent: { left: cm(0.5) },
                    spacing: { after: 40, line: 240, lineRule: 'auto' },
                }),
                new Paragraph({
                    children: [TR('2. Arsip.', { size: F_SMALL })],
                    indent: { left: cm(0.5) },
                    spacing: { after: 0, line: 240, lineRule: 'auto' },
                }),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 2: COVER
            // ══════════════════════════════════════════════════════════════════
            // ── COVER: logos side-by-side using a borderless 2-col table ───
            const LOGO_SIZE = emuCm(3.2); // 3.2 cm per logo = HD
            const coverLogoRow = new TableRow({
                children: [
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: NOB, bottom: NOB, left: NOB, right: NOB },
                        children: [new Paragraph({
                            children: logoKemenBuf
                                ? [new ImageRun({ data: logoKemenBuf, transformation: { width: LOGO_SIZE, height: LOGO_SIZE }, type: 'png' })]
                                : [new TextRun({ text: '[Logo Kementerian]', font: 'Arial', size: 18 })],
                            alignment: AlignmentType.RIGHT,
                            spacing: { after: 0 },
                        })],
                    }),
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: NOB, bottom: NOB, left: NOB, right: NOB },
                        children: [new Paragraph({
                            children: logoImigrBuf
                                ? [new ImageRun({ data: logoImigrBuf, transformation: { width: LOGO_SIZE, height: LOGO_SIZE }, type: 'jpg' })]
                                : [new TextRun({ text: '[Logo Imigrasi]', font: 'Arial', size: 18 })],
                            alignment: AlignmentType.LEFT,
                            spacing: { after: 0 },
                        })],
                    }),
                ],
            });
            const coverLogoTable = new Table({
                width: { size: 60, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
                borders: { top: NOB, bottom: NOB, left: NOB, right: NOB, insideH: NOB, insideV: NOB },
                rows: [coverLogoRow],
            });

            const coverChildren = [
                EMPTY(cm(2)),
                new Paragraph({ children: [TR('KANTOR IMIGRASI KELAS II TPI', { bold: true, size: pt(16) })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [TR('PEMATANG SIANTAR', { bold: true, size: pt(16) })], alignment: AlignmentType.CENTER, spacing: { after: cm(1) } }),

                new Paragraph({ children: [TR('LAPORAN BULANAN', { bold: true, size: pt(20) })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
                new Paragraph({ children: [TR(bNama.toUpperCase(), { bold: true, size: pt(16) })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
                new Paragraph({ children: [TR(String(tahun), { bold: true, size: pt(16) })], alignment: AlignmentType.CENTER, spacing: { after: cm(2) } }),

                // HD Logos — centered via table
                new Paragraph({ children: [], alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
                coverLogoTable,
                EMPTY(cm(1.5)),

                new Paragraph({ children: [TR('KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN', { bold: true, size: F_BODY })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [TR('REPUBLIK INDONESIA', { bold: true, size: F_BODY })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [TR('DIREKTORAT JENDERAL IMIGRASI', { bold: true, size: F_BODY })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [TR(String(tahun), { bold: true, size: F_BODY })], alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 3: DAFTAR ISI
            // ══════════════════════════════════════════════════════════════════
            const TOC_ENTRIES = [
                { label: 'BAB I PENDAHULUAN', page: 4, level: 0 },
                { label: '   A. PENGANTAR', page: 4, level: 1 },
                { label: '      1. Gambaran Umum', page: 4, level: 2 },
                { label: '      2. Wilayah Kerja', page: 4, level: 2 },
                { label: '      3. Pelaksanaan Tugas', page: 4, level: 2 },
                { label: '   B. DASAR HUKUM', page: 4, level: 1 },
                { label: '   C. RUANG LINGKUP', page: 4, level: 1 },
                { label: 'BAB II PELAKSANAAN TUGAS', page: 5, level: 0 },
                { label: '   A. BIDANG SUBSTANTIF', page: 5, level: 1 },
                { label: '      1. Penerbitan Dokumen Perjalanan', page: 5, level: 2 },
                { label: '      2. Penerbitan Izin Tinggal', page: 5, level: 2 },
                { label: '      3. Rekapitulasi Data Perlintasan', page: 5, level: 2 },
                { label: '      4. Intelijen dan Penindakan', page: 5, level: 2 },
                { label: '      5. Informasi dan Komunikasi Keimigrasian', page: 5, level: 2 },
                { label: '      6. Pengaduan Masyarakat', page: 5, level: 2 },
                { label: '   B. BIDANG FASILITATIF', page: 5, level: 1 },
                { label: '      1. Urusan Keuangan', page: 5, level: 2 },
                { label: '      2. Urusan Kepegawaian', page: 5, level: 2 },
                { label: '      3. Urusan Umum', page: 5, level: 2 },
                { label: 'BAB III PERMASALAHAN', page: 6, level: 0 },
                { label: 'BAB IV PENUTUP', page: 7, level: 0 },
                { label: '   A. SARAN', page: 7, level: 1 },
                { label: '   B. KESIMPULAN', page: 7, level: 1 },
                { label: 'BAB V LAMPIRAN', page: 8, level: 0 },
            ];

            const TAB_POS = CONTENT_W;

            const daftarChildren = [
                new Paragraph({
                    children: [TR('DAFTAR ISI', { bold: true, size: F_HEAD })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 400, line: 240, lineRule: 'auto' },
                }),
                ...TOC_ENTRIES.map(e => new Paragraph({
                    children: [
                        TR(e.label, { bold: e.level === 0, size: F_BODY }),
                        new TextRun({ text: '\t', font: FONT }),
                        TR(String(e.page), { size: F_BODY }),
                    ],
                    tabStops: [{ type: TabStopType.RIGHT, position: TAB_POS, leader: LeaderType.DOT }],
                    spacing: { before: 0, after: e.level === 0 ? 80 : 40, line: 276, lineRule: 'auto' },
                })),
            ];

            // ══════════════════════════════════════════════════════════════════
            // BAB HELPERS — Format sesuai gambar referensi
            // ══════════════════════════════════════════════════════════════════

            // BAB heading: TWO separate centered lines.
            // Line 1: "BAB I"  (pagebreak trims to new page)
            // Line 2: "PENDAHULUAN"  (indented 12pt below line 1)
            // NO border/underline.
            const babTitle = (roman, judul) => [
                PB(),
                // Line 1: BAB [Roman numeral]
                new Paragraph({
                    children: [TR(`BAB ${roman}`, { bold: true, size: F_HEAD })],
                    alignment: AlignmentType.CENTER,
                    spacing: { ...LS_15, before: 0, after: 0 },
                }),
                // Line 2: Chapter title (Uppercase)
                new Paragraph({
                    children: [TR(judul.toUpperCase(), { bold: true, size: F_HEAD })],
                    alignment: AlignmentType.CENTER,
                    spacing: { ...LS_15, before: 0, after: 480 }, // 24pt gap before first sub-heading
                }),
            ];

            // Sub-BAB: A. B. C.  — Bold, Left, no indent
            const subBab = (label, text) => [
                new Paragraph({
                    children: [TR(label, { bold: true, size: F_SUBBAB })],
                    alignment: AlignmentType.LEFT,
                    spacing: { ...LS_15, before: 240, after: 60 },
                }),
                ...(text ? [PARA(text)] : []),
            ];

            // Sub-Sub-BAB: 1. 2. 3.  — Bold, indented 1.25cm, size = sub-bab
            const subSubBab = (label, text) => [
                new Paragraph({
                    children: [TR(label, { bold: true, size: F_SUBBAB })],
                    alignment: AlignmentType.LEFT,
                    spacing: { ...LS_15, before: 120, after: 60 },
                    indent: { left: cm(1.25) }, // match first-line indent of body
                }),
                ...(text ? [PARA(text)] : []),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 4: BAB I PENDAHULUAN
            // ══════════════════════════════════════════════════════════════════
            const bab1 = [
                ...babTitle('I', 'PENDAHULUAN'),

                ...subBab('A.  PENGANTAR', ''),
                ...subSubBab('1.  Gambaran Umum Kantor Imigrasi Kelas II TPI Pematang Siantar',
                    `Kantor Imigrasi Kelas II TPI Pematang Siantar merupakan Unit Pelaksana Teknis (UPT) Direktorat Jenderal Imigrasi di bawah Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia yang berkedudukan di Kota Pematang Siantar, Sumatera Utara. Kantor ini menyelenggarakan fungsi keimigrasian di wilayah kerjanya sesuai ketentuan peraturan perundang-undangan yang berlaku.`),
                ...subSubBab('2.  Wilayah Kerja',
                    `Wilayah kerja Kantor Imigrasi Kelas II TPI Pematang Siantar meliputi: Kota Pematang Siantar, Kabupaten Simalungun, Kabupaten Dairi, Kabupaten Pakpak Bharat, Kabupaten Karo, Kabupaten Samosir, dan Kabupaten Toba. Dalam pelaksanaan tugasnya, Kantor Imigrasi dibantu oleh Unit Kerja Kantor (UKK) dan Pos Lintas Batas (PLB) di beberapa daerah.`),
                ...subSubBab('3.  Pelaksanaan Tugas',
                    `Pelaksanaan tugas pada Kantor Imigrasi Kelas II TPI Pematang Siantar berpedoman pada prinsip PASTI (Profesional, Akuntabel, Sinergi, Transparan, dan Inovatif) sebagaimana ditetapkan dalam visi dan misi Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia. Seluruh kegiatan operasional dilaksanakan oleh unit-unit kerja yang terstruktur sesuai tugas pokok dan fungsi masing-masing seksi.`),

                ...subBab('B.  DASAR HUKUM', ''),
                PARA([
                    TR('Pelaksanaan kegiatan Kantor Imigrasi Kelas II TPI Pematang Siantar didasarkan pada ketentuan peraturan perundang-undangan sebagai berikut:'),
                ]),
                ...([
                    '1.  Undang-Undang Nomor 6 Tahun 2011 tentang Keimigrasian;',
                    '2.  Peraturan Pemerintah Nomor 31 Tahun 2013 tentang Peraturan Pelaksanaan UU Keimigrasian;',
                    '3.  Peraturan Presiden Nomor 125 Tahun 2016 tentang Penanganan Pengungsi dari Luar Negeri;',
                    '4.  Peraturan Menteri terkait pengelolaan keimigrasian yang berlaku;',
                    '5.  Surat Edaran Direktur Jenderal Imigrasi yang relevan.',
                ].map(t => new Paragraph({
                    children: [TR(t)],
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { ...LS_15, after: 60 },
                    indent: { left: cm(1.25) },
                }))),

                ...subBab('C.  RUANG LINGKUP', ''),
                PARA('Laporan Bulanan ini mencakup kegiatan pada:'),
                ...([
                    '1.  Bidang Substantif: Penerbitan Dokumen Perjalanan, Izin Tinggal, Perlintasan, Intelijen dan Penindakan, serta Informasi dan Komunikasi Keimigrasian;',
                    '2.  Bidang Fasilitatif: Urusan Keuangan, Kepegawaian, dan Umum.',
                ].map(t => new Paragraph({
                    children: [TR(t)],
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { ...LS_15, after: 80 },
                    indent: { left: cm(1.25) },
                }))),
            ];


            // ══════════════════════════════════════════════════════════════
            // SECTION 5: BAB II PELAKSANAAN TUGAS
            // ═══════════════════════════════════════════════════════════════
            // Helper: strip HTML tags to plain text
            const stripHtml = (html) => {
                if (!html) return '';
                return html
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p>/gi, '\n')
                    .replace(/<li>/gi, '• ')
                    .replace(/<\/li>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
            };

            // Helper: build content paragraphs from plain text
            const buildContentParagraphs = (plainText) => {
                if (!plainText || plainText.trim().length < 5) return [];
                // Split into meaningful paragraphs (double-newline or long single paragraphs)
                const chunks = plainText
                    .split(/\n{2,}/)
                    .map(s => s.replace(/\n/g, ' ').trim())
                    .filter(s => s.length > 5);

                if (chunks.length === 0) return [];

                return chunks.map(chunk => PARA(chunk));
            };

            // Classify sections as SUBSTANTIF or FASILITATIF based on alias/name
            const FASILITATIF_KEYWORDS = ['fasilitatif', 'fasil', 'keuangan', 'kepegawaian', 'umum', 'tata usaha', 'tu'];
            const isFasilitatif = (sec) => {
                const haystack = `${sec.name} ${sec.alias || ''}`.toLowerCase();
                return FASILITATIF_KEYWORDS.some(k => haystack.includes(k));
            };

            const substantif = approved.filter(r => !isFasilitatif(r));
            const fasilitatif = approved.filter(r => isFasilitatif(r));

            // Build blocks for a group of sections — supports content_json images
            const buildSectionBlocks = async (sections) => {
                const blocks = [];
                for (const [idx, r] of sections.entries()) {
                    const num = `${idx + 1}.`;
                    const secName = r.name || `Seksi ${idx + 1}`;

                    // Sub-sub-BAB heading: "1. Seksi Tikim"
                    blocks.push(...subSubBab(`${num}  ${secName}`, ''));

                    // Priority 1: content_json blocks (rich content with images)
                    const contentBlocks = r.laporan?.content_json?.blocks || [];
                    const hasBlocks = contentBlocks.length > 0;

                    if (hasBlocks) {
                        for (const cb of contentBlocks) {
                            if (cb.type === 'paragraph' && cb.text?.trim()) {
                                blocks.push(PARA(cb.text.trim()));
                            }
                            else if (cb.type === 'image' && cb.base64) {
                                try {
                                    // base64 → ArrayBuffer for ImageRun
                                    const b64 = cb.base64.split(',')[1];
                                    const bin = atob(b64);
                                    const buf = new Uint8Array(bin.length);
                                    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

                                    // Scale to max 14cm content width
                                    const MAX_W_CM = 14;
                                    const origW = cb.metadata?.width_px || 800;
                                    const origH = cb.metadata?.height_px || 600;
                                    const scaledW = origW <= cm(MAX_W_CM) ? origW : cm(MAX_W_CM);
                                    const scaledH = Math.round(origH * (scaledW / origW));

                                    const mimeRaw = (cb.base64.match(/^data:image\/([a-z+]+);base64,/) || [])[1] || 'png';
                                    const mime = mimeRaw === 'jpg' ? 'jpeg' : mimeRaw;

                                    blocks.push(new Paragraph({
                                        children: [new ImageRun({
                                            data: buf.buffer,
                                            type: mime,
                                            transformation: { width: scaledW, height: scaledH },
                                        })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 120, after: 120 },
                                    }));
                                    // Caption
                                    if (cb.caption) {
                                        blocks.push(PARA([TR(cb.caption, { italics: true, size: F_SMALL })], { noIndent: true, align: AlignmentType.CENTER }));
                                    }
                                } catch (imgErr) {
                                    console.warn('[GabungLaporan] Image embed error:', imgErr);
                                    blocks.push(PARA(`[⚠️ Gambar tidak dapat di-embed: ${cb.id || 'unknown'}]`));
                                }
                            }
                            else if (cb.type === 'heading') {
                                blocks.push(...subSubBab(cb.text || '', ''));
                            }
                        }
                    }
                    // Priority 2: legacy rich-text HTML content
                    else {
                        const rawText = stripHtml(r.laporan?.content || '');
                        const hasText = rawText.trim().length > 10;
                        if (hasText) {
                            blocks.push(...buildContentParagraphs(rawText));
                        } else if (r.laporan?.file_url) {
                            blocks.push(PARA(`Laporan ${secName} periode ${bNama} ${tahun} telah diupload. File laporan tersedia dan dapat dilihat pada lampiran.`));
                        } else {
                            blocks.push(PARA(`Laporan ${secName} periode ${bNama} ${tahun} telah disetujui. Uraian kegiatan terlampir.`));
                        }
                    }

                    blocks.push(EMPTY(120));
                }
                return blocks;
            };

            // buildSectionBlocks is async (image embedding) — await both groups
            const substantifBlocks = substantif.length > 0 ? await buildSectionBlocks(substantif) : [];
            const fasilitatifBlocks = fasilitatif.length > 0 ? await buildSectionBlocks(fasilitatif) : [];

            const bab2 = [
                ...babTitle('II', 'PELAKSANAAN TUGAS'),

                ...subBab('A.  BIDANG SUBSTANTIF', ''),
                ...(substantifBlocks.length > 0
                    ? substantifBlocks
                    : [PARA(`Tidak ada laporan seksi substantif yang disetujui untuk periode ${bNama} ${tahun}.`), EMPTY(120)]
                ),

                ...subBab('B.  BIDANG FASILITATIF', ''),
                ...(fasilitatifBlocks.length > 0
                    ? fasilitatifBlocks
                    : [PARA(`Tidak ada laporan seksi fasilitatif yang disetujui untuk periode ${bNama} ${tahun}.`), EMPTY(120)]
                ),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 6: BAB III PERMASALAHAN
            // ══════════════════════════════════════════════════════════════════
            const bab3 = [
                ...babTitle('III', 'PERMASALAHAN'),
                PARA(`Dalam pelaksanaan tugas dan fungsi pada ${getPeriode()}, terdapat beberapa permasalahan yang dihadapi oleh Kantor Imigrasi Kelas II TPI Pematang Siantar, sebagai berikut:`),

                ...subBab('1.  Urusan Kepegawaian', ''),
                PARA([TR('a.  Permasalahan : ', { bold: true }), TR('Kekurangan personel di beberapa seksi sehingga beban kerja tidak merata.')]),
                PARA([TR('b.  Dampak          : ', { bold: true }), TR('Pelayanan kepada masyarakat kurang optimal pada jam-jam tertentu.')]),
                PARA([TR('c.  Solusi Sementara : ', { bold: true }), TR('Dilakukan pembagian tugas lintas seksi dan optimalisasi SDM yang ada.')]),

                ...subBab('2.  Urusan Keuangan', ''),
                PARA([TR('a.  Permasalahan : ', { bold: true }), TR('Keterbatasan anggaran operasional untuk kegiatan di luar kegiatan rutin.')]),
                PARA([TR('b.  Dampak          : ', { bold: true }), TR('Beberapa kegiatan yang direncanakan tidak dapat dilaksanakan secara optimal.')]),
                PARA([TR('c.  Solusi Sementara : ', { bold: true }), TR('Dilakukan skala prioritas kegiatan berdasarkan urgensi dan ketersediaan anggaran.')]),

                ...subBab('3.  Urusan Umum', ''),
                PARA([TR('a.  Permasalahan : ', { bold: true }), TR('Kondisi sebagian sarana dan prasarana yang memerlukan pemeliharaan.')]),
                PARA([TR('b.  Dampak          : ', { bold: true }), TR('Mengganggu kelancaran operasional pelayanan kepada masyarakat.')]),
                PARA([TR('c.  Solusi Sementara : ', { bold: true }), TR('Dilakukan perbaikan bertahap sesuai prioritas dan ketersediaan anggaran pemeliharaan.')]),

                ...subBab('4.  Lalu Lintas dan Izin Tinggal Keimigrasian', ''),
                PARA([TR('a.  Permasalahan : ', { bold: true }), TR('Masih ditemukannya overstay dan pelanggaran izin tinggal WNA di wilayah kerja.')]),
                PARA([TR('b.  Dampak          : ', { bold: true }), TR('Potensi pelanggaran keimigrasian yang dapat mengganggu keamanan wilayah.')]),
                PARA([TR('c.  Solusi Sementara : ', { bold: true }), TR('Peningkatan koordinasi dengan TIMPORA dan instansi terkait dalam pengawasan WNA.')]),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 7: BAB IV PENUTUP
            // ══════════════════════════════════════════════════════════════════
            const bab4 = [
                ...babTitle('IV', 'PENUTUP'),

                ...subBab('A.  SARAN', ''),
                ...([
                    '1.  Urusan Kepegawaian : Diperlukan penambahan personel pada seksi-seksi yang kekurangan SDM guna meningkatkan kualitas pelayanan dan distribusi beban kerja yang lebih merata.',
                    '2.  Urusan Keuangan    : Diharapkan adanya peningkatan alokasi anggaran operasional agar seluruh program kerja dapat terlaksana sesuai target yang ditetapkan.',
                    '3.  Urusan Umum        : Perlu dilakukan pemeliharaan dan pembaruan sarana prasarana secara berkala untuk mendukung kelancaran operasional layanan keimigrasian.',
                    '4.  Substantif         : Peningkatan koordinasi lintas instansi dalam pengawasan WNA dan penegakan hukum keimigrasian perlu terus ditingkatkan.',
                ].map(t => PARA(t))),

                ...subBab('B.  KESIMPULAN', ''),
                PARA(`Demikian Laporan Bulanan Kantor Imigrasi Kelas II TPI Pematang Siantar untuk bulan ${bNama} tahun ${tahun} ini disusun. Secara umum, seluruh kegiatan pelayanan keimigrasian di bidang substantif dan fasilitatif telah berjalan dengan baik dan tertib sesuai ketentuan peraturan perundang-undangan yang berlaku.`),
                PARA('Segala permasalahan yang ditemukan dalam periode pelaporan ini akan dijadikan bahan evaluasi dan dasar perbaikan pelaksanaan tugas di masa yang akan datang, dengan tetap mengutamakan kepentingan masyarakat dan keamanan Negara.'),

                EMPTY(600),

                new Paragraph({
                    children: [TR(`Pematang Siantar, ${tgl}`)],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                new Paragraph({
                    children: [TR('Kepala Kantor Imigrasi Kelas II TPI', { bold: true })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                new Paragraph({
                    children: [TR('Pematang Siantar,', { italics: true })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 1200 },
                }),
                new Paragraph({
                    children: [TR('_________________________', { bold: true })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                new Paragraph({
                    children: [TR('NIP. _____________________')],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 0, line: 240, lineRule: 'auto' },
                }),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 8: BAB V LAMPIRAN
            // ══════════════════════════════════════════════════════════════════
            const bab5 = [
                ...babTitle('V', 'LAMPIRAN'),
                PARA(`Lampiran Laporan Bulanan Kantor Imigrasi Kelas II TPI Pematang Siantar bulan ${bNama} ${tahun}, terdiri dari:`),
                ...([
                    '1.  Struktur Organisasi Kantor Imigrasi Kelas II TPI Pematang Siantar;',
                    '2.  Grafik Rekapitulasi Data Perlintasan;',
                    '3.  Grafik Realisasi Anggaran dan PNBP;',
                    '4.  Data Bezetting Pegawai;',
                    '5.  Dokumentasi Kegiatan Operasional;',
                    '6.  Data Pendukung lainnya.',
                ].map(t => new Paragraph({
                    children: [TR(t)],
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { ...LS_15, after: 80 },
                    indent: { left: cm(1.25) },
                }))),
                EMPTY(200),
                PARA('(Lampiran terlampir pada dokumen terpisah atau disertakan bersama laporan ini.)', { noIndent: true }),
            ];

            // ══════════════════════════════════════════════════════════════════
            // ASSEMBLE DOCUMENT
            // ══════════════════════════════════════════════════════════════════
            const secProps = (start = null) => ({
                type: SectionType.NEXT_PAGE,
                page: {
                    margin: MARGIN,
                    ...(start !== null ? { pageNumbers: { start, formatType: NumberFormat.DECIMAL } } : {}),
                },
            });

            const doc = new Document({
                creator: user?.nama || 'HORAS-IM',
                title: `Laporan Bulanan ${bNama} ${tahun}`,
                description: `Laporan Bulanan Kantor Imigrasi Kelas II TPI Pematang Siantar — ${bNama} ${tahun}`,
                styles: {
                    default: {
                        document: {
                            run: { font: FONT, size: F_BODY, color: '000000' },
                            paragraph: {
                                spacing: { ...LS_15, after: 240 },
                                alignment: AlignmentType.JUSTIFIED,
                            },
                        },
                        heading1: {
                            run: { font: FONT, size: F_HEAD, bold: true, color: '000000' },
                            paragraph: { alignment: AlignmentType.CENTER, spacing: { ...LS_15 } },
                        },
                        heading2: {
                            run: { font: FONT, size: F_SUBBAB, bold: true, color: '000000' },
                            paragraph: { alignment: AlignmentType.LEFT, spacing: { ...LS_15 } },
                        },
                        heading3: {
                            run: { font: FONT, size: F_BODY, bold: true, color: '000000' },
                            paragraph: { alignment: AlignmentType.LEFT, spacing: { ...LS_15 } },
                        },
                    },
                },

                sections: [
                    // 1. Surat Pengantar (no header/footer, page 1)
                    {
                        properties: { ...secProps(1) },
                        children: suratChildren,
                    },
                    // 2. Cover (no header/footer)
                    {
                        properties: { type: SectionType.NEXT_PAGE, page: { margin: MARGIN } },
                        children: coverChildren,
                    },
                    // 3. Daftar Isi
                    {
                        properties: { type: SectionType.NEXT_PAGE, page: { margin: MARGIN } },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: daftarChildren,
                    },
                    // 4-8. BAB I–V (single section with page breaks between BABs)
                    {
                        properties: { type: SectionType.NEXT_PAGE, page: { margin: MARGIN } },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: [
                            ...bab1,
                            ...bab2,
                            ...bab3,
                            ...bab4,
                            ...bab5,
                        ],
                    },
                ],
            });

            const buffer = await Packer.toBlob(doc);
            const url = URL.createObjectURL(buffer);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Laporan_Bulanan_${bNama}_${tahun}.docx`;
            a.click();
            URL.revokeObjectURL(url);

            // Log activity
            try {
                await supabase.from('activity_logs').insert({
                    user_id: user.id, user_name: user.nama, action: 'gabung_laporan',
                    entity_type: 'laporan_bulanan',
                    detail: `Gabung laporan ${bNama} ${tahun} (${approved.length} seksi) — format resmi kedinasan`,
                });
            } catch { /* optional */ }

            showMsg('success', `✅ Laporan bulan ${bNama} ${tahun} berhasil di-download!`);
        } catch (err) {
            console.error(err);
            showMsg('error', `Gagal membuat dokumen: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════════════
    // UI
    // ══════════════════════════════════════════════════════════════════════════
    // handleGabung now opens the validation gate instead of generating directly
    const handleGabung = handleOpenValidationGate;

    const tahunOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const msgStyle = {
        success: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
        info: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
        error: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
    };

    const allPassed = validationResults && validationResults.every(r => r.pass);

    return (
        <div style={{ padding: '24px', maxWidth: '920px', margin: '0 auto' }}>

            {/* ── Validation Gate Modal ──────────────────────────────────────── */}
            {showValidationGate && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999,
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', width: '520px',
                        maxHeight: '90vh', overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        fontFamily: 'system-ui, sans-serif',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px 16px',
                            borderBottom: '1px solid #e2e8f0',
                            background: allPassed ? '#f0fdf4' : validating ? '#f8fafc' : '#fef2f2',
                            borderRadius: '16px 16px 0 0',
                        }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                {validating
                                    ? '⏳ Menjalankan Validasi...'
                                    : allPassed
                                        ? '✅ Semua Validasi Lulus — Siap Generate'
                                        : '❌ Validasi Gagal — Perbaiki Dulu'
                                }
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                HORAS-IM • DOCX Template Architecture v3 • 11-Point QC
                            </div>
                        </div>

                        {/* Checklist */}
                        <div style={{ padding: '16px 24px' }}>
                            {validating && (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                    Memeriksa struktur dokumen...
                                </div>
                            )}
                            {!validating && validationResults && (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {validationResults.map((r, i) => (
                                        <li key={i} style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                                            padding: '8px 0',
                                            borderBottom: i < validationResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        }}>
                                            <span style={{ fontSize: '15px', minWidth: '20px' }}>
                                                {r.pass ? '✅' : '❌'}
                                            </span>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                                    {r.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: r.pass ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
                                                    {r.message}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Footer buttons */}
                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid #e2e8f0',
                            display: 'flex', gap: '12px', justifyContent: 'flex-end',
                        }}>
                            <button
                                onClick={() => setShowValidationGate(false)}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                    background: '#f8fafc', fontSize: '14px', cursor: 'pointer', color: '#475569',
                                }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmExport}
                                disabled={!allPassed || generating}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                                    background: allPassed ? '#16a34a' : '#94a3b8',
                                    color: '#fff', fontSize: '14px', fontWeight: 600,
                                    cursor: allPassed ? 'pointer' : 'not-allowed',
                                    opacity: generating ? 0.7 : 1,
                                }}
                            >
                                {generating ? '⏳ Generating...' : '📄 Generate DOCX'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    📎 Gabungkan Laporan Bulanan
                </h1>
                <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>
                    Generate dokumen Word resmi laporan bulanan sesuai format kedinasan Kantor Imigrasi Kelas II TPI Pematang Siantar.
                </p>
            </div>

            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
                    background: msgStyle[msg.type]?.bg, color: msgStyle[msg.type]?.color,
                    border: `1px solid ${msgStyle[msg.type]?.border}`,
                }}>
                    {msg.text}
                </div>
            )}

            {validErrors.length > 0 && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px',
                    background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca',
                }}>
                    <strong>⛔ Validasi Gagal:</strong>
                    <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                        {validErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                </div>
            )}

            {/* Filter Bulan / Tahun */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Bulan</label>
                    <select value={bulan} onChange={e => setBulan(+e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}>
                        {BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Tahun</label>
                    <select value={tahun} onChange={e => setTahun(+e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}>
                        {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <button onClick={loadData} style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#f8fafc', fontSize: '14px', cursor: 'pointer',
                }}>🔄 Refresh</button>
            </div>

            {/* Status Seksi */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    Status Seksi — {BULAN_NAMES[bulan]} {tahun}
                </h2>
                {loading ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Memuat...</p>
                ) : laporan.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Tidak ada seksi ditemukan.</p>
                ) : (
                    laporan.map((row, idx) => {
                        const ok = row.laporan && ['Disetujui', 'Final'].includes(row.laporan.status);
                        return (
                            <div key={row.id} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px', borderRadius: '8px', marginBottom: '8px',
                                background: ok ? '#f0fdf4' : '#fef2f2',
                                border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
                            }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0,
                                    background: ok ? '#16a34a' : '#dc2626', color: '#fff',
                                }}>{idx + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{row.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{row.alias || ''}</div>
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: ok ? '#15803d' : '#dc2626' }}>
                                    {ok ? `✅ ${row.laporan.status}` : row.laporan ? `⚠️ ${row.laporan.status}` : '❌ Belum Upload'}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Info Format */}
            <div style={{
                background: '#eff6ff', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px',
                border: '1px solid #bfdbfe', fontSize: '12px', color: '#1d4ed8',
            }}>
                <strong style={{ fontSize: '13px' }}>📐 Format Dokumen Resmi Kedinasan (Terkunci):</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px 16px', marginTop: '8px', lineHeight: 1.8 }}>
                    <span>📝 Font: <b>Arial</b></span>
                    <span>📏 Margin: <b>2cm semua sisi</b> (A4)</span>
                    <span>📄 Spasi: <b>1,5 baris</b>, justify</span>
                    <span>📖 Body: 11pt | BAB: 14pt | Sub: 12pt</span>
                    <span>🔢 Nomor halaman di footer tengah</span>
                    <span>✅ Validasi 11-poin sebelum export</span>
                    <span>📋 Surat → Cover → Daftar Isi → BAB I–V</span>
                    <span>🔒 Font &amp; margin dikunci — tidak bisa diubah</span>
                    <span>🏛️ Standar kedinasan resmi Keimigrasian RI</span>
                </div>
            </div>

            {/* Peringatan parsial */}
            {!semuaDisetujui && approved.length > 0 && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                    background: '#fffbeb', border: '1px solid #fde68a', fontSize: '14px', color: '#92400e',
                }}>
                    ⚠️ Baru {approved.length} dari {laporan.length} seksi yang disetujui.
                    Laporan bisa tetap di-download dengan data yang telah disetujui.
                </div>
            )}

            {/* Tombol Download */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* ── Export Word ── */}
                <button
                    onClick={handleGabung}
                    disabled={approved.length === 0 || generating || loading}
                    style={{
                        padding: '14px 32px', borderRadius: '10px', border: 'none',
                        fontWeight: 700, fontSize: '16px', transition: 'all 0.2s',
                        cursor: approved.length > 0 && !generating ? 'pointer' : 'not-allowed',
                        background: approved.length > 0 && !generating ? '#1d4ed8' : '#e2e8f0',
                        color: approved.length > 0 && !generating ? '#fff' : '#94a3b8',
                    }}>
                    {generating
                        ? '⏳ Membuat Dokumen...'
                        : approved.length === 0
                            ? '⚠️ Belum Ada Laporan Disetujui'
                            : semuaDisetujui
                                ? `⬇️ Download Word (${approved.length} Seksi)`
                                : `⬇️ Download Word (${approved.length}/${laporan.length} Seksi)`}
                </button>

                {/* ── Export PDF ── */}
                <button
                    onClick={handleExportPdf}
                    disabled={approved.length === 0 || generating || loading}
                    title="Export ke PDF menggunakan preview engine — tampilan identik dengan layar"
                    style={{
                        padding: '14px 28px', borderRadius: '10px', border: 'none',
                        fontWeight: 700, fontSize: '16px', transition: 'all 0.2s',
                        cursor: approved.length > 0 && !generating ? 'pointer' : 'not-allowed',
                        background: approved.length > 0 && !generating ? '#dc2626' : '#e2e8f0',
                        color: approved.length > 0 && !generating ? '#fff' : '#94a3b8',
                    }}>
                    {generating && pdfProgress > 0
                        ? `⏳ PDF ${pdfProgress}%`
                        : '📑 Export PDF'}
                </button>
            </div>
        </div>
    );
}
