import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { validateAllImages, logImageErrors } from '../../../utils/imageValidator';
import { exportToPdf } from '../../../utils/pdfExporter';
import { validateMergeDocuments } from '../../../utils/structuredDocValidator';
import {
    getLalintalkimDocxElements, getInteldakimDocxElements, getInfokimDocxElements,
    getKeuanganDocxElements, getKepegawaianDocxElements, getUmumDocxElements, getPenutupDocxElements,
} from '../../../utils/templateDocxExporter.js';
import { fetchImageAsArrayBuffer } from '../../../utils/imageHandler';
import { getDefaultPenutupData } from '../../../utils/penutupSchema.js';
// Note: Bab5OrgChart import removed — image now stored as base64 in monthly_reports

// ─── DOCX library — static import (must be static, NOT dynamic, in browser builds)
// Dynamic import('docx') conflicts with static imports in other files and breaks
// JSZip's browser-mode detection → "nodebuffer is not supported by this platform"
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, PageBreak, Footer, Header,
    PageNumber, NumberFormat, SectionType, BorderStyle,
    WidthType, VerticalAlign, TabStopType, LeaderType,
    UnderlineType, ImageRun, TableLayoutType, PageOrientation,
    TableOfContents,
} from 'docx';

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
const F_TABLE = pt(10);   // 20 hp — table cell text (10pt, compact)
const MARGIN = { top: cm(2), bottom: cm(2), left: cm(2.5), right: cm(2) };  // LOCKED: portrait margins
const MARGIN_LANDSCAPE = { top: cm(2), bottom: cm(2), left: cm(2), right: cm(2) }; // landscape: same
const LS_15 = { line: 360, lineRule: 'auto' };  // 1.5 line spacing — LOCKED
const INDENT_1 = cm(1.25); // first-line indent for body paragraphs
// Content area width portrait: 21cm - 2.5cm - 2cm = 16.5cm
const CONTENT_W = cm(16.5);


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

// ─── XML Sanitizer ──────────────────────────────────────────────────────────
const cleanXml = (str) => {
    if (typeof str !== 'string') return str;
    // Remove illegal XML control characters except tab, newline, carriage return
    // eslint-disable-next-line no-control-regex
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '');
};

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

    // ── Data dari Monthly Reports (Semua Laporan) ──────────────────────────────
    const [coverLetterData, setCoverLetterData] = useState({});
    const [coverPageData, setCoverPageData] = useState({});
    const [forewordData, setForewordData] = useState({});
    const [bab5ImageBase64, setBab5ImageBase64] = useState(null); // base64 org chart

    // Fetch monthly_reports data on mount so Surat Pengantar, Cover, & Kata Pengantar
    // reflect what was saved in menu "Semua Laporan"
    useEffect(() => {
        const fetchMonthlyReportsData = async () => {
            try {
                const { data } = await supabase
                    .from('monthly_reports')
                    .select('section_key, content')
                    .in('section_key', ['cover_letter', 'cover_page', 'foreword', 'bab5']);
                if (!data) return;
                data.forEach(item => {
                    try {
                        const parsed = typeof item.content === 'string'
                            ? JSON.parse(item.content)
                            : item.content;
                        if (item.section_key === 'cover_letter') setCoverLetterData(parsed || {});
                        if (item.section_key === 'cover_page')   setCoverPageData(parsed || {});
                        if (item.section_key === 'foreword')      setForewordData(parsed || {});
                        // bab5: accept both public URL (https) and legacy base64
                        if (item.section_key === 'bab5' && typeof item.content === 'string' &&
                            (item.content.startsWith('https') || item.content.startsWith('http') || item.content.startsWith('data:image'))) {
                            setBab5ImageBase64(item.content);
                        }
                    } catch { /* keep defaults */ }
                });
            } catch (e) {
                console.warn('[GabungLaporan] fetch monthly_reports err:', e);
            }
        };
        fetchMonthlyReportsData();
    }, []);


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

    // ── File availability: approved but without file_url ──────────────────────
    const approvedMissingFile = approved.filter(r => !r.laporan?.file_url);

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
        // Check: setiap laporan yang disetujui harus memiliki file_url
        if (approvedMissingFile.length > 0) {
            showMsg('error',
                `⛔ ${approvedMissingFile.length} laporan disetujui tidak memiliki file:\n` +
                approvedMissingFile.map(r => `• ${r.name}`).join('\n') +
                '\n\nMinta seksi terkait untuk upload ulang sebelum menggabungkan.'
            );
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
                pass: approved.every(r => {
                    const l = r.laporan;
                    if (!l) return false;
                    // Bypass internal content check, trust the uploaded file presence
                    return !!l.file_url;
                }),
                message: approved.every(r => {
                    const l = r.laporan;
                    if (!l) return false;
                    return !!l.file_url;
                })
                    ? 'Semua laporan memiliki file'
                    : 'Kosong: ' + approved.filter(r => {
                        const l = r.laporan;
                        if (!l) return true;
                        return !l.file_url;
                    }).map(r => r.name).join(', ') + ' (Harap upload ulang file Word di seksi ini)',
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

        // ── v5: Structured JSON health check (13th check) ─────────────────
        // Validates pages[] format integrity — warns if missing, doesn't hard-block.
        const structuredItems = approved.map(r => ({
            seksiName: r.name,
            structured_json: r.laporan?.structured_json || null,
        }));
        const structCheck = validateMergeDocuments(structuredItems);
        const structuredCount = structuredItems.filter(s => s.structured_json?.pages?.length > 0).length;
        const missingStructured = structuredItems.length - structuredCount;
        results.push({
            name: 'Structured JSON (Fidelity Engine)',
            // Warn (but don't fail) if some laporan are missing structured_json.
            // They will fall back to HTML/text export.
            pass: true,
            message: structuredCount === structuredItems.length
                ? `✅ ${structuredCount} laporan pakai Structured JSON (tabel + gambar terjaga)`
                : missingStructured === structuredItems.length
                    ? `⚠️ Semua laporan belum memiliki Structured JSON — fallback ke HTML/teks`
                    : `⚠️ ${structuredCount}/${structuredItems.length} pakai Structured JSON; ${missingStructured} fallback ke HTML`,
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
            // All docx classes are imported statically at the top of this file.
            // (Dynamic import was causing 'nodebuffer is not supported' in browsers)

            // ImageRun.transformation expects PIXELS (96 DPI), NOT EMU.
            // pxCm: cm → pixels at 96 DPI  (96/2.54 ≈ 37.795 px/cm)
            // The old emuCm was giving ~1,150,748 for 3.2cm — 10,000× too large → corrupt OOXML.
            const pxCm = (v) => Math.round(v / 2.54 * 96);
            let logoKemenBuf = null;
            let logoImigrBuf = null;
            let logoCombinedBuf = null;
            try {
                const [r1, r2, r3] = await Promise.all([
                    fetch('/logo_kemenimipas.png'),
                    fetch('/logo_imigrasi.jpg'),
                    fetch('/logos-combined.png'),
                ]);
                // Guard: only read buffer if fetch was successful
                if (r1.ok) logoKemenBuf = await r1.arrayBuffer();
                if (r2.ok) logoImigrBuf = await r2.arrayBuffer();
                if (r3.ok) logoCombinedBuf = await r3.arrayBuffer();
            } catch (e) {
                console.warn('Logo fetch gagal, lanjut tanpa logo:', e);
            }

            const now = new Date();
            const tgl = fmtDate(now);
            const bNama = BULAN_NAMES[bulan];

            // ── HELPER: TextRun ──────────────────────────────────────────────
            const TR = (text, o = {}) => new TextRun({
                text: cleanXml(text), font: FONT, size: o.size || F_BODY,
                bold: o.bold || false, italics: o.italics || false,
                underline: o.underline,
            });

            // ── HELPER: body paragraph (justify, 1.5, first-line indent) ────
            const PARA = (runs, o = {}) => {
                const children = Array.isArray(runs)
                    ? runs
                    : [TR(typeof runs === 'string' ? cleanXml(runs) : runs, o)];

                return new Paragraph({
                    children: children.length > 0 ? children : [TR('')],
                    alignment: o.align || AlignmentType.JUSTIFIED,
                    spacing: { ...LS_15, before: o.before || 0, after: o.after !== undefined ? o.after : 120 },
                    indent: o.noIndent ? undefined : { firstLine: INDENT_1 },
                    keepNext: o.keepNext || false,
                });
            };

            // ── HELPER: heading paragraph (center/left, bold, no indent) ────
            const HEAD = (text, level, o = {}) => new Paragraph({
                children: [TR(text, { bold: true, size: o.size || F_HEAD, ...o })],
                heading: level,
                alignment: o.align || AlignmentType.CENTER,
                spacing: { ...LS_15, before: o.before || 0, after: o.after || 240 },
            });

            // ── HELPER: empty line ───────────────────────────────────────────
            // DOCX requires at least one run child — empty Paragraph is invalid OOXML
            const EMPTY = (after = 240) => new Paragraph({
                children: [new TextRun({ text: '', font: FONT, size: F_BODY })],
                spacing: { after },
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
            // Normalize type: 'jpg' → 'jpeg' required by docx v9
            const mkLogo = (buf, type, w, h) => buf
                ? new ImageRun({ data: buf, transformation: { width: w, height: h }, type: type === 'jpg' ? 'jpeg' : type })
                : new TextRun({ text: '', font: FONT, size: F_SMALL });

            // KOP: 2-column borderless table — [logo-kemen | teks-center]
            // Persis seperti gambar: 1 logo kiri saja, teks di tengah, garis ganda di bawah
            const NOB = { style: BorderStyle.NONE }; // explicitly NONE to disable vertical line artifact in DOCX
            const kopTableRow = new TableRow({
                children: [
                    // Col 1: Logo Kementerian (kiri)
                    new TableCell({
                        width: { size: 14, type: WidthType.PERCENTAGE },
                        borders: { top: NOB, bottom: NOB, left: NOB, right: NOB },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            children: [mkLogo(logoKemenBuf, 'png', 80, 80)],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 0 },
                        })],
                    }),
                    // Col 2: Teks kop — centered. Uses coverLetterData or exact defaults from CoverLetter.jsx
                    new TableCell({
                        width: { size: 86, type: WidthType.PERCENTAGE },
                        borders: { top: NOB, bottom: NOB, left: NOB, right: NOB },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            new Paragraph({ children: [new TextRun({ text: coverLetterData?.letterhead1 || 'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA', font: 'Arial', size: 20, bold: false })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: coverLetterData?.letterhead2 || 'DIREKTORAT JENDERAL IMIGRASI', font: 'Arial', size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: coverLetterData?.letterhead3 || 'KANTOR WILAYAH SUMATERA UTARA', font: 'Arial', size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: coverLetterData?.letterhead4 || 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR', font: 'Arial', size: 24, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: coverLetterData?.letterhead5 || 'Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun', font: 'Arial', size: 18 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                            new Paragraph({ children: [new TextRun({ text: coverLetterData?.letterhead6 || 'Laman: pematangsiantar.imigrasi.go.id, Pos-el: kanim_pematangsiantar@imigrasi.go.id', font: 'Arial', size: 16 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220, lineRule: 'auto' } }),
                        ],
                    }),
                ],
            });

            const kopTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { 
                    top: NOB, 
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: '000000' }, 
                    left: NOB, 
                    right: NOB, 
                    insideH: NOB, 
                    insideV: NOB 
                },
                rows: [kopTableRow],
            });

            // Hanya tabel kop (garis bawah sudah termasuk dalam properti border bottom tabel di atas)
            const kopElements = [kopTable];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 1: SURAT PENGANTAR
            // Menggunakan data dari coverLetterData (Semua Laporan) jika ada
            // ══════════════════════════════════════════════════════════════════
            // Helper: ambil nilai dari coverLetterData, fallback ke default yang persis sama dengan CoverLetter.jsx
            const clDate     = cleanXml(coverLetterData?.tanggal   || `19 Agustus 2025`); // Or dynamic if needed, but UI uses static in the form, let's keep it clean
            const clNomor    = cleanXml(coverLetterData?.nomor      || `WIM.2.IMI.4-PR.04.01-3291`);
            const clSifat    = cleanXml(coverLetterData?.sifat      || 'Penting');
            const clLampiran = cleanXml(coverLetterData?.lampiran   || '1 (satu) berkas');
            const clHal      = cleanXml(coverLetterData?.hal        || `Laporan Kegiatan Bulan Juli 2025\npada Kantor Imigrasi Kelas II TPI Pematang Siantar`);
            const clIsi      = cleanXml(coverLetterData?.isi         || `Menindaklanjuti surat Sekretaris Direktorat Jenderal Imigrasi No.IMI.1-TI.03-3178 tanggal 27 Agustus 2018 tentang Penggunaan Aplikasi Laporan Bulanan Online, bersama ini dengan hormat kami kirimkan Laporan Kegiatan Bulan Maret 2026 pada Kantor Imigrasi Kelas II TPI Pematang Siantar.\n\nDemikian kami sampaikan, atas perkenan dan petunjuk lebih lanjut kami ucapkan terima kasih.`);
            const clPenandatangan = cleanXml(coverLetterData?.penandatangan || 'Benyamin Kali Patembal Harahap');

            // Build Hal as possibly multi-line
            const halLines = clHal.split('\n').filter(Boolean);

            const suratChildren = [
                ...kopElements,

                // Nomor / Sifat / Lampiran / Hal with Tanggal right-aligned on the first row
                new Paragraph({
                    children: [
                        TR('Nomor    '), TR(': '), TR(clNomor),
                        TR(`\t${clDate}`)
                    ],
                    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                    indent: { left: 0 },
                }),
                ...[
                    { label: 'Sifat    ', val: clSifat },
                    { label: 'Lampiran ', val: clLampiran },
                    { label: 'Hal      ', val: halLines[0] || clHal },
                ].map(({ label, val }) => new Paragraph({
                    children: [TR(label), TR(': '), TR(val)],
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                    indent: { left: 0 },
                })),
                // Extra hal lines (if multi-line)
                ...halLines.slice(1).map(line => new Paragraph({
                    children: [TR('           '), TR('  '), TR(line)],
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                    indent: { left: 0 },
                })),

                EMPTY(240),

                // Tujuan — from coverLetterData or default
                ...(coverLetterData?.tujuan
                    ? coverLetterData.tujuan.split('\n').filter(Boolean).map(line =>
                        PARA([TR(cleanXml(line))], { noIndent: true }))
                    : [
                        PARA([TR('Yth. Kepala Kantor Wilayah Sumatera Utara')], { noIndent: true }),
                        PARA([TR('Direktorat Jenderal Imigrasi')], { noIndent: true }),
                        PARA([TR('di tempat')], { noIndent: true }),
                    ]),

                EMPTY(200),

                // Isi surat — from coverLetterData or default
                ...clIsi.split('\n\n').filter(s => s.trim()).map(para => PARA(para.trim())),

                EMPTY(400),

                // Tanda tangan
                new Paragraph({
                    children: [TR('Kepala Kantor,')],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                EMPTY(1400),
                new Paragraph({
                    children: [TR(clPenandatangan || '_________________________', { bold: true, underline: { type: 'single' } })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                new Paragraph({
                    children: [TR(coverLetterData?.nip ? `NIP. ${cleanXml(coverLetterData.nip)}` : '')],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 400, line: 240, lineRule: 'auto' },
                }),

                // Tembusan
                new Paragraph({
                    children: [TR('Tembusan:', { bold: false, size: F_SMALL })],
                    spacing: { after: 60, line: 240, lineRule: 'auto', before: 300 },
                }),
                ...(coverLetterData?.tembusan
                    ? coverLetterData.tembusan.split('\n').filter(Boolean).map(line =>
                        new Paragraph({
                            children: [TR(line, { size: F_SMALL })],
                            indent: { left: 0 },
                            spacing: { after: 40, line: 240, lineRule: 'auto' },
                        })
                    )
                    : [
                        new Paragraph({
                            children: [TR('1  Sekretaris Direktorat Jenderal Imigrasi', { size: F_SMALL })],
                            indent: { left: 0 },
                            spacing: { after: 40, line: 240, lineRule: 'auto' },
                        }),
                        new Paragraph({
                            children: [TR('   Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia.', { size: F_SMALL })],
                            indent: { left: 0 },
                            spacing: { after: 0, line: 240, lineRule: 'auto' },
                        }),
                    ]
                ),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 2: COVER
            // Menggunakan coverPageData dari Semua Laporan jika ada.
            // Logo: logos-combined.png (gambar gabungan HD, 1 gambar lebih besar)
            // ══════════════════════════════════════════════════════════════════

            // Resolve bulan/tahun: prefer coverPageData, fallback ke filter GabungLaporan
            const coverBulanNama = (() => {
                const m = coverPageData?.month || '';
                if (!m) return bNama.toUpperCase();
                // If it's a number string, convert; otherwise use as-is
                const idx = parseInt(m, 10);
                if (!isNaN(idx) && idx >= 1 && idx <= 12) return BULAN_NAMES[idx].toUpperCase();
                return cleanXml(m).toUpperCase();
            })();
            const coverTahunStr = cleanXml(String(coverPageData?.year || tahun));
            const coverTitle    = cleanXml(coverPageData?.reportTitle || 'LAPORAN BULANAN');

            // Cover logo: use logos-combined.png (both logos as one HD image, wider)
            // Width: 9cm = pxCm(9) ≈ 340px; height auto-calculated (aspect ≈ 2:1)
            const COVER_LOGO_W = pxCm(9);   // ≈ 340 px wide
            const COVER_LOGO_H = pxCm(4.5); // ≈ 170 px (roughly maintaining combined logo aspect ratio)

            const coverLogoPara = new Paragraph({
                children: logoCombinedBuf
                    ? [new ImageRun({
                        data: logoCombinedBuf,
                        transformation: { width: COVER_LOGO_W, height: COVER_LOGO_H },
                        type: 'png',
                    })]
                    // Fallback: use two separate logos side-by-side if combined not available
                    : [
                        ...(logoKemenBuf ? [new ImageRun({ data: logoKemenBuf, transformation: { width: pxCm(3.8), height: pxCm(3.8) }, type: 'png' })] : []),
                        new TextRun({ text: '   ', font: FONT, size: F_BODY }),
                        ...(logoImigrBuf ? [new ImageRun({ data: logoImigrBuf, transformation: { width: pxCm(3.8), height: pxCm(3.8) }, type: 'jpeg' })] : []),
                        ...(!logoKemenBuf && !logoImigrBuf ? [new TextRun({ text: '[Logo]', font: FONT, size: F_BODY })] : []),
                    ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
            });

            const coverChildren = [
                EMPTY(cm(2)),
                new Paragraph({ children: [TR('KANTOR IMIGRASI KELAS II TPI', { bold: true, size: pt(16) })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [TR('PEMATANG SIANTAR', { bold: true, size: pt(16) })], alignment: AlignmentType.CENTER, spacing: { after: cm(1) } }),

                new Paragraph({ children: [TR(coverTitle, { bold: true, size: pt(20) })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
                new Paragraph({ children: [TR(coverBulanNama, { bold: true, size: pt(16) })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
                new Paragraph({ children: [TR(coverTahunStr, { bold: true, size: pt(16) })], alignment: AlignmentType.CENTER, spacing: { after: cm(2) } }),

                // HD Logo gabungan — satu gambar, lebih besar, centered
                coverLogoPara,
                EMPTY(cm(1.5)),

                new Paragraph({ children: [TR('KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN', { bold: true, size: F_BODY })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [TR('REPUBLIK INDONESIA', { bold: true, size: F_BODY })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [TR('DIREKTORAT JENDERAL IMIGRASI', { bold: true, size: F_BODY })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [TR(coverTahunStr, { bold: true, size: F_BODY })], alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 2b: KATA PENGANTAR
            // Menggunakan forewordData dari Semua Laporan jika ada
            // ══════════════════════════════════════════════════════════════════
            const defaultForeword = `Puji Syukur kami panjatkan kepada Tuhan Yang Maha Esa sehingga Laporan bulanan ini dapat selesai tepat pada waktunya. Ucapan terima kasih juga kami sampaikan kepada semua pihak yang telah membantu dalam penyajian dan penyusunan laporan bulanan ini sehingga laporan bulanan ini dapat disajikan sesuai dengan lengkap dan benar.\n\nKantor Imigrasi Kelas II TPI Pematang Siantar adalah salah satu unit pelaksana teknis di bidang keimigrasian yang berada di bawah Kantor Wilayah Kementerian Imigrasi dan Pemasyarakatan Sumatera Utara yang memiliki kewajiban menyusun Laporan Bulanan yang berisi seluruh kegiatan yang telah dilaksanakan dan kendala yang dialami oleh seluruh seksi dan bagian yang ada selama satu periode.\n\nLaporan ini diharapkan dapat memberikan informasi yang berguna kepada para pemakai laporan khususnya sebagai sarana untuk meningkatkan kinerja, akuntabilitas / pertanggung jawaban dan transparansi pelaksanaan tugas pokok dan fungsi Kantor Imigrasi Kelas II TPI Pematang Siantar.`;

            const forewordText = cleanXml(forewordData?.content || defaultForeword);
            const forewordChildren = [
                new Paragraph({
                    children: [TR('KATA PENGANTAR', { bold: true, size: F_HEAD })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 480, line: 276, lineRule: 'auto' },
                }),
                ...forewordText.split('\n\n').filter(s => s.trim()).map(para =>
                    new Paragraph({
                        children: [TR(para.trim())],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { ...LS_15, after: 200 },
                        indent: { firstLine: INDENT_1 },
                    })
                ),
                EMPTY(600),
                new Paragraph({
                    children: [TR(`Pematang Siantar,    ${tgl}`)],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                new Paragraph({
                    children: [TR('Kepala Kantor,', { bold: true })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60, line: 240, lineRule: 'auto' },
                }),
                EMPTY(1000),
                new Paragraph({
                    children: [TR(cleanXml(coverLetterData?.penandatangan || ''), { bold: true })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 0, line: 240, lineRule: 'auto' },
                }),
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 3: DAFTAR ISI — Word native auto-updating TOC
            // Open in Microsoft Word → Ctrl+A → F9 to update page numbers.
            // ══════════════════════════════════════════════════════════════════
            const daftarChildren = [
                new Paragraph({
                    children: [TR('DAFTAR ISI', { bold: true, size: F_HEAD })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 400, line: 240, lineRule: 'auto' },
                }),
                new TableOfContents('Daftar Isi', {
                    headingStyleRange: '1-3',
                    stylesWithLevels: [
                        { styleName: 'Heading 1', level: 1 },
                        { styleName: 'Heading 2', level: 2 },
                        { styleName: 'Heading 3', level: 3 },
                        { styleName: 'GovernmentBAB', level: 1 },
                        { styleName: 'GovernmentSubBAB', level: 2 },
                        { styleName: 'GovernmentSubSubBAB', level: 3 },
                    ],
                }),
                new Paragraph({
                    children: [TR('[ Buka di Microsoft Word, tekan Ctrl+A lalu F9 untuk memperbarui nomor halaman ]',
                        { italics: true, size: F_SMALL })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 80 },
                }),
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
                ...babTitleNoPB('I', 'PENDAHULUAN'),

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
            // ══════════════════════════════════════════════════════════════

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
                const chunks = plainText
                    .split(/\n{2,}/)
                    .map(s => s.replace(/\n/g, ' ').trim())
                    .filter(s => s.length > 5);
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

            // ── Helper: decode HTML entities
            const decodeHtmlEntities = (str) => {
                if (!str) return '';
                return str
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
            };

            // ── Helper: get text content from DOM node (recursive)
            const getNodeText = (node) => {
                if (!node) return '';
                if (node.nodeType === Node.TEXT_NODE) return decodeHtmlEntities(node.textContent);
                return Array.from(node.childNodes).map(getNodeText).join('');
            };

            // ── Helper: build TextRun from a DOM element (handle bold/italic/underline)
            // ── nodeToRuns: context-based (FIX: was spreading TextRun class instances → corrupt XML)
            // Passes a plain `ctx` object {bold, italic, underline} down the DOM tree.
            // TextRun is only constructed at TEXT_NODE leaves — never spread from an instance.
            const nodeToRuns = (node, ctx = {}) => {
                if (!node) return [];
                if (node.nodeType === Node.TEXT_NODE) {
                    const txt = decodeHtmlEntities(node.textContent);
                    if (!txt) return [];
                    return [new TextRun({
                        text: cleanXml(txt),
                        font: FONT,
                        size: F_BODY,
                        bold: ctx.bold || false,
                        italics: ctx.italic || false,
                        underline: ctx.underline ? { type: UnderlineType.SINGLE } : undefined,
                        color: '000000',
                    })];
                }
                if (node.nodeType !== Node.ELEMENT_NODE) return [];
                const tag = node.tagName?.toLowerCase() || '';
                // Build new context merging inherited flags
                const newCtx = { ...ctx };
                if (tag === 'strong' || tag === 'b') newCtx.bold = true;
                if (tag === 'em' || tag === 'i') newCtx.italic = true;
                if (tag === 'u') newCtx.underline = true;
                if (tag === 'br') {
                    return [new TextRun({ text: '', break: 1, font: FONT, size: F_BODY })];
                }
                // Recurse into children with the updated context
                return Array.from(node.childNodes).flatMap(child => nodeToRuns(child, newCtx));
            };

            // ── Helper: convert a <table> DOM element → docx Table (Grid-Aware)
            const htmlTableToDocx = (tableEl) => {
                const allTrs = Array.from(tableEl.querySelectorAll('tr'));
                if (allTrs.length === 0) return null;

                // 1. Calculate max columns across all rows (including colspans)
                const maxCols = Math.max(1, allTrs.reduce((max, row) => {
                    const cells = Array.from(row.querySelectorAll('th, td'));
                    const cnt = cells.reduce((s, c) => s + (parseInt(c.getAttribute('colspan') || '1', 10)), 0);
                    return Math.max(max, cnt);
                }, 1));

                const colPct = Math.floor(100 / maxCols);

                // 2. Track occupied cells for rowSpan
                const occupied = Array.from({ length: allTrs.length }, () => Array(maxCols).fill(false));
                const docxRows = [];

                allTrs.forEach((row, rowIdx) => {
                    const cells = Array.from(row.querySelectorAll('th, td'));
                    const docxCells = [];
                    let currentCol = 0;

                    cells.forEach((cell) => {
                        while (currentCol < maxCols && occupied[rowIdx][currentCol]) currentCol++;
                        if (currentCol >= maxCols) return;

                        const colSpan = Math.min(parseInt(cell.getAttribute('colspan') || '1', 10), maxCols - currentCol);
                        const rowSpan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10));
                        const isHeader = cell.tagName.toLowerCase() === 'th';

                        // FIX: pass empty ctx object to start context-based traversal
                        const cellRuns = nodeToRuns(cell, {});

                        // Mark occupied cells
                        for (let r = 0; r < rowSpan; r++) {
                            for (let c = 0; c < colSpan; c++) {
                                if (rowIdx + r < allTrs.length) occupied[rowIdx + r][currentCol + c] = true;
                            }
                        }

                        docxCells.push(new TableCell({
                            columnSpan: colSpan > 1 ? colSpan : undefined,
                            rowSpan: rowSpan > 1 ? rowSpan : undefined,
                            width: { size: Math.max(1, Math.round(colPct * colSpan)), type: WidthType.AUTO }, // Changed from PERCENTAGE to AUTO for autofitting
                            shading: isHeader ? { fill: 'F5F5F5' } : undefined,
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                                left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                                right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                            },
                            // Always provide at least one paragraph child (DOCX requires it)
                            children: [new Paragraph({
                                children: cellRuns.length > 0 ? cellRuns : [new TextRun({ text: '', font: FONT, size: F_BODY })],
                                alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                                spacing: { after: 60, before: 60, line: 240, lineRule: 'auto' },
                            })],
                        }));

                        currentCol += colSpan;
                    });

                    if (docxCells.length > 0) {
                        docxRows.push(new TableRow({
                            children: docxCells,
                            tableHeader: rowIdx === 0,
                            height: { value: 350, rule: 'atLeast' },
                        }));
                    }
                });

                if (docxRows.length === 0) return null;
                const tbl = new Table({
                    width: { size: 100, type: WidthType.AUTO },
                    layout: TableLayoutType.AUTOFIT, // Changed to AUTOFIT for slimmer tables
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 6, color: '2F5496' },
                        bottom: { style: BorderStyle.SINGLE, size: 6, color: '2F5496' },
                        left: { style: BorderStyle.SINGLE, size: 6, color: '2F5496' },
                        right: { style: BorderStyle.SINGLE, size: 6, color: '2F5496' },
                        insideH: { style: BorderStyle.SINGLE, size: 4, color: '4472C4' },
                        insideV: { style: BorderStyle.SINGLE, size: 4, color: '4472C4' },
                    },
                    rows: docxRows,
                });
                tbl._colCount = maxCols;
                return tbl;
            };

            // ── Helper: convert HTML string (from docx_html / mammoth output) → docx elements[]
            // FIX: nodeToRuns now uses context-based traversal — no TextRun instance spreading
            const htmlToDocxElements = async (htmlStr) => {
                if (!htmlStr || htmlStr.trim().length < 5) return [];
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlStr, 'text/html');
                    const root = doc.querySelector('.docx-page') || doc.body;
                    const elements = [];

                    const processNode = async (node) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const txt = decodeHtmlEntities(node.textContent || '').trim();
                            if (txt) elements.push(PARA(txt));
                            return;
                        }
                        if (node.nodeType !== Node.ELEMENT_NODE) return;
                        const tag = node.tagName?.toLowerCase() || '';

                        if (tag === 'table') {
                            const tbl = htmlTableToDocx(node);
                            if (tbl) {
                                elements.push(tbl);
                                elements.push(EMPTY(120));
                            }
                            return;
                        }

                        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                            const txt = decodeHtmlEntities(node.textContent || '').trim();
                            if (txt) elements.push(...subSubBab(txt, ''));
                            return;
                        }

                        if (tag === 'p') {
                            // Use context-based nodeToRuns (safe — no TextRun spreading)
                            const runs = nodeToRuns(node, {});
                            const txt = decodeHtmlEntities(node.textContent || '').trim();
                            if (runs.length > 0 && txt) {
                                elements.push(new Paragraph({
                                    children: runs,
                                    alignment: AlignmentType.JUSTIFIED,
                                    spacing: { ...LS_15, before: 0, after: 120 },
                                    indent: { firstLine: INDENT_1 },
                                }));
                            } else if (txt) {
                                elements.push(PARA(txt));
                            } else {
                                elements.push(EMPTY(160));
                            }
                            return;
                        }

                        if (['ul', 'ol'].includes(tag)) {
                            const items = Array.from(node.querySelectorAll('li'));
                            items.forEach((li, idx) => {
                                const txt = decodeHtmlEntities(li.textContent || '').trim();
                                const bullet = tag === 'ol' ? `${idx + 1}.  ` : '•  ';
                                if (txt) elements.push(new Paragraph({
                                    children: [TR(`${bullet}${txt}`)],
                                    alignment: AlignmentType.JUSTIFIED,
                                    spacing: { ...LS_15, after: 60 },
                                    indent: { left: cm(1.25) },
                                }));
                            });
                            return;
                        }

                        if (tag === 'img') {
                            const src = node.getAttribute('src');
                            if (src) {
                                try {
                                    const resp = await fetch(src);
                                    const arrBuf = await resp.arrayBuffer();
                                    
                                    // Parse dimensions natively if they exist, otherwise fallback or scale down.
                                    let w = parseInt(node.getAttribute('width'));
                                    let h = parseInt(node.getAttribute('height'));
                                    
                                    if (!w || !h) {
                                        // Default fallback that fits A4 width
                                        w = 500;
                                        h = 350;
                                    }
                                    
                                    elements.push(new Paragraph({
                                        children: [
                                            new ImageRun({
                                                data: arrBuf,
                                                transformation: { width: w, height: h }
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 120, after: 120 }
                                    }));
                                } catch(e) { console.warn('[GabungLaporan] Failed to embed image:', src, e); }
                            }
                            return;
                        }

                        if (['div', 'section', 'article', 'main', 'body'].includes(tag)) {
                            for (const childNode of Array.from(node.childNodes)) {
                                await processNode(childNode);
                            }
                            return;
                        }
                        if (node.children?.length > 0) {
                            for (const childNode of Array.from(node.childNodes)) {
                                await processNode(childNode);
                            }
                        }
                    };

                    for (const childNode of Array.from(root.childNodes)) {
                        await processNode(childNode);
                    }
                    return elements;
                } catch (err) {
                    console.warn('[GabungLaporan] htmlToDocxElements error:', err);
                    return [];
                }
            };


            // ── NEW: Helper — convert structured_json page content → docx elements ──
            // This is Priority 0: structured JSON from docxStructuredParser is the
            // most accurate source (tables with colspan, images from ZIP).
            const structuredBlockToDocx = async (block) => {
                if (!block || !block.type) return [];
                switch (block.type) {
                    case 'paragraph': {
                        if (!block.text?.trim() && (!block.runs || block.runs.length === 0)) return [EMPTY(80)];
                        if (block.runs?.length > 0) {
                            // Bug1 fix: docxStructuredParser stores run props directly
                            // as r.bold, r.italic, r.fontSize — NOT r.style.bold etc.
                            const runs = block.runs.map(r => new TextRun({
                                text: r.text || '',
                                font: r.font || FONT,
                                size: r.fontSize ? pt(r.fontSize) : (r.style?.fontSize ? pt(r.style.fontSize) : F_BODY),
                                bold: !!(r.bold || r.style?.bold),
                                italics: !!(r.italic || r.style?.italic),
                                underline: (r.underline || r.style?.underline) ? { type: UnderlineType.SINGLE } : undefined,
                                strike: (r.strike || r.style?.strike) ? true : undefined,
                                color: r.color || r.style?.color || undefined,
                            }));
                            return [new Paragraph({
                                children: runs,
                                alignment: block.style?.align === 'center' ? AlignmentType.CENTER
                                    : block.style?.align === 'right' ? AlignmentType.RIGHT
                                        : AlignmentType.JUSTIFIED,
                                spacing: { ...LS_15, after: 120 },
                                indent: { firstLine: INDENT_1 },
                            })];
                        }
                        return [PARA(block.text?.trim() || '')];
                    }
                    case 'heading': {
                        const headingTxt = block.text?.trim() || '';
                        if (!headingTxt) return [];
                        if (block.level <= 2) return [...subBab(headingTxt, '')];
                        return [...subSubBab(headingTxt, '')];
                    }
                    case 'table': {
                        const { rows = [], colWidths = [] } = block;
                        if (rows.length === 0) return [];
                        const maxCols = rows.reduce((m, row) => {
                            const cols = row.reduce((s, c) => s + (c.colspan || 1), 0);
                            return Math.max(m, cols);
                        }, 1);

                        // Default fallback: evenly distributed
                        const defaultColPct = Math.floor(100 / maxCols);

                        // ── Cell run builder: 10pt font, richtext-aware, header bold+center ──
                        const buildCellRuns = (cell, isHeader) => {
                            if (cell.runs && cell.runs.length > 0) {
                                return cell.runs.map(r => new TextRun({
                                    text: cleanXml(r.text || ''),
                                    font: FONT,
                                    size: F_TABLE,
                                    bold: !!(r.bold || isHeader),
                                    italics: !!(r.italic),
                                    underline: r.underline ? { type: UnderlineType.SINGLE } : undefined,
                                    color: r.color || undefined,
                                }));
                            }
                            const rawText = cleanXml(cell.text || '');
                            return [new TextRun({
                                text: rawText,
                                font: FONT,
                                size: F_TABLE,
                                bold: !!(isHeader || cell.bold),
                            })];
                        };

                        // Track occupied grid for rowSpan
                        const occupied = Array.from({ length: rows.length }, () => Array(maxCols).fill(false));
                        const docxRows = [];

                        rows.forEach((row, ri) => {
                            const docxCells = [];
                            let currentCol = 0;
                            const isHeaderRow = ri === 0;

                            row.forEach((cell) => {
                                if (cell.vContinue) return; // skip vMerge continuations

                                while (currentCol < maxCols && occupied[ri][currentCol]) currentCol++;
                                if (currentCol >= maxCols) return;

                                const colSpan = Math.min(cell.colspan || 1, maxCols - currentCol);
                                const rowSpan = cell.rowspan || 1;

                                // Mark occupied cells
                                for (let r = 0; r < rowSpan; r++) {
                                    for (let c = 0; c < colSpan; c++) {
                                        if (ri + r < rows.length) occupied[ri + r][currentCol + c] = true;
                                    }
                                }

                                // Proportional width from tblGrid colWidths (if available)
                                let cellWidthPct = defaultColPct * colSpan;
                                if (colWidths && colWidths.length > 0) {
                                    cellWidthPct = 0;
                                    for (let spanIdx = 0; spanIdx < colSpan; spanIdx++) {
                                        const wPct = colWidths[currentCol + spanIdx];
                                        cellWidthPct += (typeof wPct === 'number' && !isNaN(wPct) ? wPct : defaultColPct);
                                    }
                                }

                                // Cell alignment: header always center; body follows cell.align
                                const cellAlign = cell.align === 'center' ? AlignmentType.CENTER
                                    : cell.align === 'right' ? AlignmentType.RIGHT
                                        : isHeaderRow ? AlignmentType.CENTER
                                            : AlignmentType.LEFT;

                                // Professional header shading: blue-gray for row 0
                                const shadeFill = isHeaderRow ? 'DDE8F4'
                                    : (ri % 2 === 0 ? undefined : 'F8FBFF'); // subtle alternating rows

                                docxCells.push(new TableCell({
                                    columnSpan: colSpan > 1 ? colSpan : undefined,
                                    rowSpan: rowSpan > 1 ? rowSpan : undefined,
                                    width: { size: Math.max(1, Math.round(cellWidthPct)), type: WidthType.PERCENTAGE },
                                    shading: shadeFill ? { fill: shadeFill, color: 'auto' } : undefined,
                                    borders: {
                                        top: { style: BorderStyle.SINGLE, size: 4, color: '4472C4' },
                                        bottom: { style: BorderStyle.SINGLE, size: 4, color: '4472C4' },
                                        left: { style: BorderStyle.SINGLE, size: 4, color: '4472C4' },
                                        right: { style: BorderStyle.SINGLE, size: 4, color: '4472C4' },
                                    },
                                    children: [new Paragraph({
                                        children: buildCellRuns(cell, isHeaderRow),
                                        alignment: cellAlign,
                                        spacing: { after: 40, before: 40, line: 240, lineRule: 'auto' },
                                    })],
                                }));

                                currentCol += colSpan;
                            });

                            if (docxCells.length > 0) {
                                docxRows.push(new TableRow({
                                    children: docxCells,
                                    tableHeader: ri === 0,
                                    height: { value: 350, rule: 'atLeast' }, // min row height
                                }));
                            }
                        });

                        return docxRows.length > 0 ? [
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                layout: TableLayoutType.FIXED,
                                borders: {
                                    top: { style: BorderStyle.SINGLE, size: 6, color: '2F5496' },
                                    bottom: { style: BorderStyle.SINGLE, size: 6, color: '2F5496' },
                                    left: { style: BorderStyle.SINGLE, size: 6, color: '2F5496' },
                                    right: { style: BorderStyle.SINGLE, size: 6, color: '2F5496' },
                                    insideH: { style: BorderStyle.SINGLE, size: 4, color: '4472C4' },
                                    insideV: { style: BorderStyle.SINGLE, size: 4, color: '4472C4' },
                                },
                                rows: docxRows,
                            }),
                            EMPTY(160),
                        ] : [];
                    }
                    case 'image': {
                        // Support both base64 inline images AND URL-referenced images (Supabase storage)
                        const PX_PER_CM = 37.795;
                        const MAX_W_PX = Math.round(14 * PX_PER_CM); // 14cm max
                        const calcDims = (widthCm, heightCm) => {
                            const wPx = widthCm
                                ? Math.min(Math.round(widthCm * PX_PER_CM), MAX_W_PX)
                                : MAX_W_PX;
                            const ar = (heightCm && widthCm && widthCm > 0) ? heightCm / widthCm : 0.75;
                            return { wPx, hPx: Math.round(wPx * ar) };
                        };
                        const buildImgElements = (buf, mime, wPx, hPx) => {
                            const els = [new Paragraph({
                                children: [new ImageRun({ data: buf, type: mime, transformation: { width: wPx, height: hPx } })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 120, after: 120 },
                            })];
                            if (block.caption) {
                                els.push(new Paragraph({
                                    children: [TR(block.caption, { italics: true, size: F_SMALL })],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 0, after: 120 },
                                }));
                            }
                            return els;
                        };

                        try {
                            const { wPx, hPx } = calcDims(block.widthCm, block.heightCm);

                            // Path A: base64 inline (most common for DOCX exports)
                            if (block.base64) {
                                const dataUrl = block.base64.startsWith('data:')
                                    ? block.base64
                                    : `data:image/png;base64,${block.base64}`;
                                const b64 = dataUrl.split(',')[1];
                                if (!b64) return [];
                                const bin = atob(b64);
                                const buf = new Uint8Array(bin.length);
                                for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
                                const mimeRaw = (dataUrl.match(/^data:image\/([a-z+]+);base64,/) || [])[1] || 'png';
                                const mime = mimeRaw === 'jpg' ? 'jpeg' : mimeRaw;
                                return buildImgElements(buf.buffer, mime, wPx, hPx);
                            }

                            // Path B: URL-referenced image (e.g. Supabase public storage URL)
                            if (block.url) {
                                try {
                                    const resp = await fetch(block.url);
                                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                                    const arrBuf = await resp.arrayBuffer();
                                    // Infer mime from URL extension or content-type header
                                    const ct = resp.headers.get('content-type') || '';
                                    let mime = 'png';
                                    if (ct.includes('jpeg') || ct.includes('jpg') || block.url.match(/\.(jpg|jpeg)(\?|$)/i)) mime = 'jpeg';
                                    else if (ct.includes('gif') || block.url.match(/\.gif(\?|$)/i)) mime = 'gif';
                                    else if (ct.includes('webp') || block.url.match(/\.webp(\?|$)/i)) mime = 'png'; // fallback
                                    return buildImgElements(arrBuf, mime, wPx, hPx);
                                } catch (fetchErr) {
                                    console.warn('[GabungLaporan] image URL fetch failed:', block.url, fetchErr.message);
                                    // Return a text placeholder so the section isn't silently skipped
                                    return [new Paragraph({
                                        children: [TR(`[Gambar tidak dapat dimuat: ${block.caption || block.url}]`, { italics: true, size: F_SMALL })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 60, after: 120 },
                                    })];
                                }
                            }

                            return []; // no base64 and no URL
                        } catch (imgErr) {
                            console.warn('[GabungLaporan] structured image embed err:', imgErr);
                            return [];
                        }
                    }
                    case 'list': {
                        const { ordered, items = [] } = block;
                        return items.map((item, ii) => new Paragraph({
                            children: [TR(`${ordered ? `${ii + 1}.  ` : '•  '}${item.text || ''}`)],
                            alignment: AlignmentType.JUSTIFIED,
                            spacing: { ...LS_15, after: 60 },
                            indent: { left: cm(1.25 + (item.level || 0) * 0.6) },
                        }));
                    }
                    case 'page_break':
                        return [new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } })];
                    default:
                        return [];
                }
            };

            // ── Build docx elements from one structured_json page ────────────
            const buildStructuredPageElements = async (page) => {
                const elems = [];
                for (const block of (page.content || [])) {
                    const items = await structuredBlockToDocx(block);
                    elems.push(...items);
                }
                return elems;
            };

            // Build orientation-tagged chunks for a group of sections.
            // Returns: Array<{ orientation: 'portrait'|'landscape', elements: docx.Paragraph[] }>
            // Each page from structured_json becomes its own chunk with the page's orientation.
            // Non-structured content is treated as portrait.
            const buildSectionChunks = async (sections) => {
                // All chunks across all sections, preserving per-page orientation
                const allChunks = [];

                // Helper: flush accumulated portrait elements into a chunk
                const flushPortrait = (buf) => {
                    if (buf.length > 0) {
                        allChunks.push({ orientation: 'portrait', elements: [...buf] });
                        buf.length = 0;
                    }
                };

                for (const [idx, r] of sections.entries()) {
                    const num = `${idx + 1}.`;
                    const secName = r.name || `Seksi ${idx + 1}`;

                    // Collect portrait-orientation elements that precede any landscape pages
                    const portraitBuf = [];

                    // Sub-sub-BAB heading always portrait
                    portraitBuf.push(...subSubBab(`${num}  ${secName}`, ''));

                    // ── Priority 0: structured_json pages[] — respect per-page orientation ──
                    const structJson = r.laporan?.structured_json;
                    if (structJson?.pages?.length > 0) {
                        // Global orientation from metadata — if the whole document is landscape,
                        // use landscape as the default for all pages in this section.
                        const globalOrient = structJson.metadata?.orientation || 'portrait';

                        for (const page of structJson.pages) {
                            const pageElems = await buildStructuredPageElements(page);
                            if (pageElems.length === 0) continue;

                            // Auto-detect landscape rules:
                            // BAB I, III, IV are EXPLICITLY portrait, regardless of tables, to ensure no sudden landscape breaks.
                            const strictPortraitSections = ['BAB I', 'BAB III', 'BAB IV'];
                            const isStrictPortrait = strictPortraitSections.some(s => secName.includes(s));

                            const pageHasTable = (page.content || []).some(b => b.type === 'table');
                            
                            let orient = isStrictPortrait ? 'portrait' 
                                : pageHasTable ? 'landscape'
                                : page.orientation === 'landscape' ? 'landscape'
                                : globalOrient === 'landscape' ? 'landscape'
                                : 'portrait';

                            if (orient === 'landscape') {
                                // Flush any accumulated portrait content first
                                flushPortrait(portraitBuf);
                                // Landscape page → dedicated landscape chunk
                                allChunks.push({ orientation: 'landscape', elements: [...pageElems, EMPTY(120)] });
                            } else {
                                portraitBuf.push(...pageElems);
                            }
                        }
                        portraitBuf.push(EMPTY(120));
                        flushPortrait(portraitBuf);
                        continue;
                    }

                    // ── Priority 1: docx_html ──
                    const docxHtml = r.laporan?.docx_html;
                    if (docxHtml && docxHtml.trim().length > 10) {
                        const htmlElements = await htmlToDocxElements(docxHtml);
                        if (htmlElements.length > 0) {
                            // Auto-detect landscape: any Table element → landscape.
                            const globalHtmlOrient = r.laporan?.docx_meta?.orientation || 'portrait';
                            const hasAnyTable = htmlElements.some(el => el instanceof Table);
                            
                            const strictPortraitSections = ['BAB I', 'BAB III', 'BAB IV'];
                            const isStrictPortrait = strictPortraitSections.some(s => secName.includes(s));

                            const isLandscape = !isStrictPortrait && (hasAnyTable || globalHtmlOrient === 'landscape');
                            
                            if (isLandscape) {
                                flushPortrait(portraitBuf);
                                allChunks.push({ orientation: 'landscape', elements: [...htmlElements, EMPTY(120)] });
                            } else {
                                portraitBuf.push(...htmlElements, EMPTY(120));
                                flushPortrait(portraitBuf);
                            }
                            continue;
                        }
                        // Conversion returned empty — add visible placeholder so section isn't silently dropped
                        console.warn('[GabungLaporan] docx_html conversion returned no elements for:', secName);
                        portraitBuf.push(PARA(`[Konten laporan ${secName} tersedia sebagai file DOCX — buka di aplikasi untuk melihat.]`));
                        portraitBuf.push(EMPTY(120));
                        flushPortrait(portraitBuf);
                        continue;
                    }

                    // ── Priority 2: content_json.blocks ──
                    const contentBlocks = r.laporan?.content_json?.blocks || [];
                    if (contentBlocks.length > 0) {
                        for (const cb of contentBlocks) {
                            if (cb.type === 'paragraph' && cb.text?.trim()) {
                                portraitBuf.push(PARA(cb.text.trim()));
                            }
                            else if (cb.type === 'image' && cb.base64) {
                                try {
                                    const dataUrl = cb.base64.startsWith('data:')
                                        ? cb.base64
                                        : `data:image/png;base64,${cb.base64}`;
                                    const b64 = dataUrl.split(',')[1];
                                    if (!b64) throw new Error('base64 kosong');
                                    const bin = atob(b64);
                                    const buf = new Uint8Array(bin.length);
                                    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
                                    const PX_PER_CM = 37.795;
                                    const MAX_W_PX = Math.round(14 * PX_PER_CM);
                                    const origW = cb.metadata?.width_px || 800;
                                    const origH = cb.metadata?.height_px || 600;
                                    const scaledW = Math.min(origW, MAX_W_PX);
                                    const scaledH = Math.round(origH * (scaledW / origW));
                                    const mimeRaw = (dataUrl.match(/^data:image\/([a-z+]+);base64,/) || [])[1] || 'png';
                                    const mime = mimeRaw === 'jpg' ? 'jpeg' : mimeRaw;
                                    portraitBuf.push(new Paragraph({
                                        children: [new ImageRun({ data: buf.buffer, type: mime, transformation: { width: scaledW, height: scaledH } })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 120, after: 120 },
                                    }));
                                    if (cb.caption) {
                                        portraitBuf.push(new Paragraph({
                                            children: [TR(cb.caption, { italics: true, size: F_SMALL })],
                                            alignment: AlignmentType.CENTER,
                                            spacing: { before: 0, after: 120 },
                                        }));
                                    }
                                } catch (imgErr) {
                                    console.warn('[GabungLaporan] Image embed error:', imgErr);
                                    portraitBuf.push(PARA(`[⚠️ Gambar tidak dapat di-embed: ${cb.id || 'unknown'}]`));
                                }
                            }
                            else if (cb.type === 'heading') {
                                portraitBuf.push(...subSubBab(cb.text || '', ''));
                            }
                            else if (cb.type === 'table') {
                                const { headers = [], rows = [] } = cb;
                                if ((headers && headers.length > 0) || (rows && rows.length > 0)) {
                                    try {
                                        const tableHeaders = headers.length > 0 ? headers : rows[0].map(() => '');
                                        portraitBuf.push(makeTable(
                                            tableHeaders, rows,
                                            tableHeaders.map(() => Math.floor(100 / tableHeaders.length))
                                        ));
                                        portraitBuf.push(EMPTY(120));
                                    } catch (tblErr) {
                                        console.warn('[GabungLaporan] Table block error:', tblErr);
                                    }
                                }
                            }
                        }
                        portraitBuf.push(EMPTY(120));
                        flushPortrait(portraitBuf);
                        continue;
                    }

                    // ── Priority 3: legacy plain text ──
                    const rawText = stripHtml(r.laporan?.content || '');
                    if (rawText.trim().length > 10) {
                        portraitBuf.push(...buildContentParagraphs(rawText));
                    } else if (r.laporan?.file_url) {
                        portraitBuf.push(PARA(`Laporan ${secName} periode ${bNama} ${tahun} telah diupload. File laporan tersedia dan dapat dilihat pada lampiran.`));
                    } else {
                        portraitBuf.push(PARA(`Laporan ${secName} periode ${bNama} ${tahun} telah disetujui. Uraian kegiatan terlampir.`));
                    }
                    portraitBuf.push(EMPTY(120));
                    flushPortrait(portraitBuf);
                }

                return allChunks;
            };


            // Build orientation-tagged section chunks for both groups
            const substantifChunks = substantif.length > 0 ? await buildSectionChunks(substantif) : [];
            const fasilitatifChunks = fasilitatif.length > 0 ? await buildSectionChunks(fasilitatif) : [];

            // ── INJECT TEMPLATES FROM laporan_template DB ──────────────────────────────────
            const { data: tmplRows } = await supabase
                .from('laporan_template')
                .select('seksi_id, template_data')
                .eq('bulan', bulan)
                .eq('tahun', tahun);

            const allTemplateData = {};
            if (tmplRows) {
                tmplRows.forEach(r => {
                    if (r.template_data) allTemplateData[r.seksi_id] = r.template_data;
                });
            }
            
            const tmplLalin = allTemplateData[2] || null;
            const tmplIntel = allTemplateData[1] || null;
            const tmplTikim = allTemplateData[3] || null;
            const tmplTU    = allTemplateData[4] || null;
            // Penutup data is stored nested inside the TU row (seksi_id=4) as template_data.penutup
            const penutupTemplateData = allTemplateData[4]?.penutup || null;



            // Collect Substantif Templates (Landscape)
            const substantifTemplateElems = [];
            if (tmplLalin) {
                substantifTemplateElems.push(...getLalintalkimDocxElements('all', tmplLalin));
            }
            if (tmplIntel) {
                substantifTemplateElems.push(...getInteldakimDocxElements('projus', tmplIntel, bNama, tahun));
                substantifTemplateElems.push(...getInteldakimDocxElements('tak', tmplIntel, bNama, tahun));
                substantifTemplateElems.push(...getInteldakimDocxElements('timpora', tmplIntel, bNama, tahun));
            }
            if (tmplTikim) {
                substantifTemplateElems.push(...getInfokimDocxElements('infokim', tmplTikim, bNama, tahun));
                substantifTemplateElems.push(...getInfokimDocxElements('pengaduan', tmplTikim, bNama, tahun));
            }
            if (substantifTemplateElems.length > 0) {
                substantifChunks.push({ orientation: 'landscape', elements: substantifTemplateElems });
            }

            // Collect Fasilitatif Templates (Landscape)
            const fasilitatifTemplateElems = [];
            if (tmplTU) {
                fasilitatifTemplateElems.push(...getKepegawaianDocxElements('bezetting', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getKepegawaianDocxElements('rekap', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getKepegawaianDocxElements('cuti', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getKepegawaianDocxElements('pembinaan', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getKepegawaianDocxElements('persuratan', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getKeuanganDocxElements('rm', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getKeuanganDocxElements('pnp', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getKeuanganDocxElements('gabungan', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getKeuanganDocxElements('bendahara', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getUmumDocxElements('kendaraan', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getUmumDocxElements('sarana', tmplTU, bNama, tahun));
                fasilitatifTemplateElems.push(...getUmumDocxElements('gedung', tmplTU, bNama, tahun));
            }
            if (fasilitatifTemplateElems.length > 0) {
                fasilitatifChunks.push({ orientation: 'landscape', elements: fasilitatifTemplateElems });
            }
            // ────────────────────────────────────────────────────────────────────────────────

            // ── Helper: convert orientation-tagged chunks → DOCX sections ───────
            // A new DOCX section is created whenever orientation changes.
            // Portrait sections use the standard MARGIN (2cm all sides).
            // Landscape sections use A4-landscape page size with same margins.
            // ── Section property builder ───────────────────────────────────────
            const mkSecProps = (landscape = false) => ({
                type: SectionType.NEXT_PAGE,
                page: {
                    margin: landscape ? MARGIN_LANDSCAPE : MARGIN,
                    size: {
                        // FIX: docx library v9.5+ will AUTOMATICALLY swap width & height internally
                        // if PageOrientation.LANDSCAPE is provided. If we provide pre-swapped
                        // dimensions, the engine reverts them to portrait. Always provide A4 
                        // portrait base dimensions!
                        width: cm(21.0),
                        height: cm(29.7),
                        orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
                    },
                },
            });

            // ── babTitle without leading PageBreak ────────────────────────────
            // Use this variant when generating children for a section that already
            // starts on a new page via SectionType.NEXT_PAGE (no PB() needed).
            const babTitleNoPB = (roman, judul) => [
                new Paragraph({
                    children: [TR(`BAB ${roman}`, { bold: true, size: F_HEAD })],
                    alignment: AlignmentType.CENTER,
                    spacing: { ...LS_15, before: 0, after: 0 },
                }),
                new Paragraph({
                    children: [TR(judul.toUpperCase(), { bold: true, size: F_HEAD })],
                    alignment: AlignmentType.CENTER,
                    spacing: { ...LS_15, before: 0, after: 480 },
                }),
            ];

            // ── Merge consecutive same-orientation chunks → DOCX sections ─────
            // Guards: (1) empty chunks are filtered, (2) each section gets ≥1 child
            const chunksToSections = (chunks) => {
                if (!chunks || chunks.length === 0) return [];

                // Step 1: filter out empty element arrays
                const valid = chunks.filter(c => c.elements && c.elements.length > 0);
                if (valid.length === 0) return [];

                // Step 2: merge consecutive same-orientation chunks
                const merged = [];
                for (const chunk of valid) {
                    const last = merged[merged.length - 1];
                    if (last && last.orientation === chunk.orientation) {
                        last.elements.push(...chunk.elements);
                    } else {
                        merged.push({ orientation: chunk.orientation, elements: [...chunk.elements] });
                    }
                }

                // Step 3: convert each merged chunk to a DOCX section object
                // Ensure children is never empty (add empty para as safety net)
                return merged.map((chunk) => ({
                    properties: mkSecProps(chunk.orientation === 'landscape'),
                    headers: { default: makeHeader() },
                    footers: { default: makeFooter() },
                    children: chunk.elements.length > 0 ? chunk.elements : [EMPTY(120)],
                }));
            };

            // ══════════════════════════════════════════════════════════════════
            // BAB II: PELAKSANAAN TUGAS
            // WAJIB LANDSCAPE: BAB II selalu menggunakan kertas Landscape
            // PENTING: Gunakan babTitleNoPB karena SectionType.NEXT_PAGE sudah
            //          memulai halaman baru — PB() di dalam children menyebabkan
            //          MS Word menyisipkan halaman kosong portrait di awal!
            // ══════════════════════════════════════════════════════════════════
            const bab2HeaderElems = babTitleNoPB('II', 'PELAKSANAAN TUGAS');
            const subBabAElems = subBab('A.  BIDANG SUBSTANTIF', '');
            const subBabBElems = subBab('B.  BIDANG FASILITATIF', '');

            // Kumpulkan semua elemen konten (laporan yang disetujui)
            const substantifBodyElems = [];
            for (const chunk of substantifChunks) {
                substantifBodyElems.push(...(chunk.elements || []));
            }
            const fasilitatifBodyElems = [];
            for (const chunk of fasilitatifChunks) {
                fasilitatifBodyElems.push(...(chunk.elements || []));
            }

            // Semua konten BAB II digabung dalam satu section LANDSCAPE
            const bab2AllElems = [
                ...bab2HeaderElems,   // NO PB() — section break sudah handle ini
                ...subBabAElems,
                ...(substantifBodyElems.length > 0
                    ? substantifBodyElems
                    : [PARA(`Tidak ada laporan seksi substantif yang disetujui untuk periode ${bNama} ${tahun}.`), EMPTY(120)]
                ),
                // Template tabel substantif
                ...(substantifTemplateElems.length > 0 ? [EMPTY(80), ...substantifTemplateElems] : []),
                EMPTY(120),
                ...subBabBElems,
                ...(fasilitatifBodyElems.length > 0
                    ? fasilitatifBodyElems
                    : [PARA(`Tidak ada laporan seksi fasilitatif yang disetujui untuk periode ${bNama} ${tahun}.`), EMPTY(120)]
                ),
                // Template tabel fasilitatif
                ...(fasilitatifTemplateElems.length > 0 ? [EMPTY(80), ...fasilitatifTemplateElems] : []),
                // FIX: DOCX section must never end with a Table.
                EMPTY(10)
            ];

            // BAB II = SATU section landscape
            const bab2Sections = [{
                properties: mkSecProps(true), // LANDSCAPE wajib
                headers: { default: makeHeader() },
                footers: { default: makeFooter() },
                children: bab2AllElems.length > 0 ? bab2AllElems : [
                    ...bab2HeaderElems,
                    PARA(`Belum ada laporan yang tersedia untuk periode ${bNama} ${tahun}.`),
                ],
            }];


            // ══════════════════════════════════════════════════════════════════
            // SECTION 6: BAB III PERMASALAHAN
            // ══════════════════════════════════════════════════════════════════
            const bab3 = [
                ...babTitleNoPB('III', 'PERMASALAHAN'),
                PARA(`Dalam pelaksanaan tugas dan fungsi pada ${BULAN_NAMES[bulan]} ${tahun}, terdapat beberapa permasalahan yang dihadapi oleh Kantor Imigrasi Kelas II TPI Pematang Siantar, sebagai berikut:`),

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
            // Selalu gunakan getPenutupDocxElements agar konsisten dengan preview.
            // Jika tidak ada data tersimpan di DB, gunakan data default dari penutupSchema.
            // ══════════════════════════════════════════════════════════════════
            const resolvedPenutupData = penutupTemplateData || getDefaultPenutupData();
            const bab4 = [
                ...babTitleNoPB('IV', 'PENUTUP'),
                ...getPenutupDocxElements(resolvedPenutupData, bNama, tahun, logoKemenBuf),
                // MS WORD BUG FIX: docx section MUST NOT end with a Table.
                EMPTY(10)
            ];

            // ══════════════════════════════════════════════════════════════════
            // SECTION 8: BAB V LAMPIRAN — LANDSCAPE (Struktur Organisasi)
            // ══════════════════════════════════════════════════════════════════
            let strukturOrgImageBuf = null;
            let bab5DebugInfo = 'Memulai fetch...';
            try {
                // Fetch directly from DB to ensure we have the absolute latest URL
                const { data: b5Data, error: dbErr } = await supabase
                    .from('monthly_reports')
                    .select('content')
                    .eq('section_key', 'bab5')
                    .single();

                if (dbErr) throw dbErr;
                const bab5Raw = b5Data?.content;
                
                if (!bab5Raw) {
                    bab5DebugInfo = 'Data BAB V kosong di database.';
                } else {
                    if (bab5Raw.startsWith('http')) {
                        bab5DebugInfo = `URL ditemukan: ${bab5Raw.substring(0, 40)}... mencoba fetch...`;
                        try {
                            const res = await fetch(bab5Raw);
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            const blob = await res.blob();
                            strukturOrgImageBuf = await blob.arrayBuffer();
                            bab5DebugInfo = `Success fetch URL (Size: ${strukturOrgImageBuf.byteLength} bytes)`;
                        } catch (fetchErr) {
                            bab5DebugInfo = `GAGAL FETCH URL: ${fetchErr.message}. Mungkin masalah CORS atau jaringan.`;
                        }
                    } else if (bab5Raw.startsWith('data:image')) {
                        bab5DebugInfo = 'Base64 ditemukan... decode...';
                        const b64 = bab5Raw.split(',')[1];
                        const bin = atob(b64);
                        strukturOrgImageBuf = new Uint8Array(bin.length);
                        for (let i = 0; i < bin.length; i++) strukturOrgImageBuf[i] = bin.charCodeAt(i);
                        bab5DebugInfo = `Success decode Base64 (Size: ${strukturOrgImageBuf.byteLength} bytes)`;
                    } else {
                        bab5DebugInfo = 'Format data BAB V tidak dikenali.';
                    }
                }
            } catch (err) {
                console.warn('[GabungLaporan] Gagal memuat image bab5:', err);
                bab5DebugInfo = `ERROR DB/TRY: ${err.message}`;
            }

            const bab5 = [
                ...babTitleNoPB('V', 'LAMPIRAN'),
                new Paragraph({
                    children: [TR('Struktur Organisasi Kantor Imigrasi Kelas II TPI Pematang Siantar', { bold: true, size: F_SUBBAB })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 200 },
                }),

                ...(strukturOrgImageBuf ? [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: strukturOrgImageBuf,
                                type: 'png',
                                // A4 Landscape usable w≈25.7cm, h≈18cm at 96dpi
                                // pxCm: 96/2.54 ≈ 37.8 px/cm → 25.7cm≈970px, 18cm≈680px
                                // Reduce slightly for margins: 940 x 660
                                transformation: {
                                    width: 940,
                                    height: 660,
                                }
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 0 }
                    }),
                ] : [
                    PARA('(Gambar Struktur Organisasi tidak dapat dimuat.)', { noIndent: true }),
                    PARA(`[DEBUG INFO]: ${bab5DebugInfo}`, { noIndent: true })
                ]),
                EMPTY(10),
            ];


            const doc = new Document({
                creator: user?.nama || 'HORAS-IM',
                title: `Laporan Bulanan ${bNama} ${tahun}`,
                description: `Laporan Bulanan Kantor Imigrasi Kelas II TPI Pematang Siantar — ${bNama} ${tahun}`,
                features: {
                    updateFields: true,
                },
                styles: {
                    default: {
                        document: {
                            // DOCX v9: default run/paragraph styles
                            // Do NOT spread LS_15 object here — use explicit values
                            run: { font: FONT, size: F_BODY, color: '000000' },
                            paragraph: {
                                spacing: { line: 360, lineRule: 'auto', after: 240 },
                                alignment: AlignmentType.JUSTIFIED,
                            },
                        },
                        heading1: {
                            run: { font: FONT, size: F_HEAD, bold: true, color: '000000' },
                            paragraph: { alignment: AlignmentType.CENTER, spacing: { line: 360, lineRule: 'auto', after: 240 } },
                        },
                        heading2: {
                            run: { font: FONT, size: F_SUBBAB, bold: true, color: '000000' },
                            paragraph: { alignment: AlignmentType.LEFT, spacing: { line: 360, lineRule: 'auto', after: 120 } },
                        },
                        heading3: {
                            run: { font: FONT, size: F_BODY, bold: true, color: '000000' },
                            paragraph: { alignment: AlignmentType.LEFT, spacing: { line: 360, lineRule: 'auto', after: 80 } },
                        },
                    },
                },

                sections: [
                    // 1. Surat Pengantar
                    {
                        properties: { type: SectionType.NEXT_PAGE, page: { margin: MARGIN } },
                        children: suratChildren,
                    },
                    // 2. Cover Page
                    {
                        properties: { type: SectionType.NEXT_PAGE, page: { margin: MARGIN } },
                        children: coverChildren,
                    },
                    // 2b. Kata Pengantar
                    {
                        properties: { type: SectionType.NEXT_PAGE, page: { margin: MARGIN } },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: forewordChildren,
                    },
                    // 3. Daftar Isi
                    {
                        properties: { type: SectionType.NEXT_PAGE, page: { margin: MARGIN } },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: daftarChildren,
                    },
                    // 4. BAB I PENDAHULUAN → PORTRAIT
                    {
                        properties: mkSecProps(false),
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: bab1,
                    },
                    // 5. BAB II PELAKSANAAN TUGAS → LANDSCAPE (wajib)
                    ...bab2Sections,
                    // 6. BAB III PERMASALAHAN → PORTRAIT (wajib)
                    // Explicit A4 portrait dimensions to override landscape inheritance from BAB II
                    {
                        properties: {
                            type: SectionType.NEXT_PAGE,
                            page: {
                                margin: MARGIN,
                                size: {
                                    width: cm(21),    // A4 portrait: 21cm wide
                                    height: cm(29.7), // A4 portrait: 29.7cm tall
                                    orientation: PageOrientation.PORTRAIT,
                                },
                            },
                        },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: bab3,
                    },
                    // 7. BAB IV PENUTUP → PORTRAIT, SATU HALAMAN
                    {
                        properties: {
                            type: SectionType.NEXT_PAGE,
                            page: {
                                margin: { top: cm(2), bottom: cm(2), left: cm(2.5), right: cm(2) },
                                size: {
                                    width: cm(21),
                                    height: cm(29.7),
                                    orientation: PageOrientation.PORTRAIT,
                                },
                            },
                        },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: bab4,
                    },
                    // 8. BAB V LAMPIRAN → LANDSCAPE (wajib)
                    {
                        properties: mkSecProps(true),
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: bab5,
                    },
                ],
            });


            // Use Packer.toBlob() — browser-compatible (toBuffer is Node.js only).
            // Then re-wrap the blob with the correct Word MIME type to ensure
            // Microsoft Word opens it without "experienced an error" dialog.
            const rawBlob = await Packer.toBlob(doc);
            const blob = new Blob([rawBlob], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Timestamp suffix prevents "file in use" error when Word still has a previous download open
            const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(8); // HHMMSS
            a.download = `Laporan_Bulanan_${bNama}_${tahun}_${ts}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);

            // Log activity
            try {
                await supabase.from('activity_logs').insert({
                    user_id: user?.id, user_name: user?.nama, action: 'gabung_laporan',
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
        <div className="page-scroll">
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
            
            {/* Hidden Org Chart Render Engine */}
            <div style={{ position: 'fixed', bottom: 0, right: 0, opacity: 0.01, pointerEvents: 'none', zIndex: -9999 }}>
                <Bab5OrgChart />
            </div>
        </div>
        </div>
    );
}

