import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// ── Konversi cm ke twip (satuan docx) ──────────────────────────
const cmToTwip = (cm) => Math.round(cm * 567); // 1 cm = 567 twip

// ── Margin standar laporan dinas / skripsi Indonesia ──────────
// ── Margin 2.54 cm semua sisi (format resmi) ──────────────
const MARGIN = {
    top: cmToTwip(2.54),
    bottom: cmToTwip(2.54),
    left: cmToTwip(2.54),
    right: cmToTwip(2.54),
    header: cmToTwip(1.27),
    footer: cmToTwip(1.27),
};

// ── Ukuran font (half-point) ──────────────────────────────
const FONT_BODY = 24;   // 12pt
const FONT_H1 = 28;   // 14pt
const FONT_H2 = 24;   // 12pt — sama dgn body, tapi bold
const FONT_COVER = 36;   // 18pt
const FONT_SUB = 28;   // 14pt
const FONT_SMALL = 20;   // 10pt

const FONT_FAMILY = 'Times New Roman';

// ── Spasi 1.5 ─────────────────────────────────────────────
const LINE_SPACING = { line: 360, lineRule: 'auto' };
const INDENT_FIRST = cmToTwip(1.27);   // indent baris pertama
const SPACE_AFTER = 120;               // 6pt ≈ 120 twip

export default function GabungLaporan() {
    const { user } = useAuth();
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [laporan, setLaporan] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [msg, setMsg] = useState(null);

    const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000); };

    const loadData = useCallback(async () => {
        setLoading(true);
        const { data: sec } = await supabase.from('sections').select('id, name, alias, urutan_penggabungan').order('urutan_penggabungan');
        const { data: lap } = await supabase.from('laporan_bulanan').select('*').eq('bulan', bulan).eq('tahun', tahun);

        const merged = (sec || []).map(s => {
            const l = (lap || []).find(x => x.seksi_id === s.id);
            return { ...s, laporan: l };
        });
        setLaporan(merged);
        setLoading(false);
    }, [bulan, tahun]);

    useEffect(() => { loadData(); }, [loadData]);

    const approved = laporan.filter(r => r.laporan && ['Disetujui', 'Final'].includes(r.laporan.status));
    const semuaDisetujui = approved.length === laporan.length && laporan.length > 0;

    // ─────────────────────────────────────────────────────────────
    // EXPORT PROFESIONAL
    // ─────────────────────────────────────────────────────────────
    const handleGabung = async () => {
        if (approved.length === 0) return showMsg('error', 'Belum ada laporan yang disetujui.');

        setGenerating(true);
        showMsg('info', '⏳ Memproses penggabungan laporan...');

        try {
            const {
                Document, Packer, Paragraph, TextRun, HeadingLevel,
                AlignmentType, PageBreak, Footer, Header,
                PageNumber, NumberFormat, SectionType,
                BorderStyle, Table, TableRow, TableCell,
                WidthType, VerticalAlign,
            } = await import('docx');

            // ─── Helper: TextRun standar ──────────────────────────
            const tr = (text, opts = {}) => new TextRun({
                text, font: FONT_FAMILY, size: FONT_BODY, ...opts,
            });

            // ─── Paragraf body: justify + 1.5 spasi + indent baris pertama ──
            const bodyPara = (runs, opts = {}) => new Paragraph({
                children: Array.isArray(runs) ? runs : [tr(runs)],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { ...LINE_SPACING, after: SPACE_AFTER },
                indent: { firstLine: INDENT_FIRST },
                ...opts,
            });

            // ─── Paragraf kosong ──────────────────────────────────
            const emptyPara = (after = SPACE_AFTER) => new Paragraph({
                children: [tr('')],
                spacing: { after },
            });

            // ─── Heading A/B/C/D ─────────────────────────────────
            const headingPara = (text, opts = {}) => new Paragraph({
                children: [tr(text, { bold: true, size: FONT_H2 })],
                alignment: AlignmentType.LEFT,
                spacing: { ...LINE_SPACING, before: 280, after: SPACE_AFTER },
                keepNext: true,
                ...opts,
            });

            // ─── Garis pemisah ────────────────────────────────────
            const dividerPara = (style = BorderStyle.DOUBLE) => new Paragraph({
                children: [],
                border: { bottom: { color: '000000', space: 1, style, size: 6 } },
                spacing: { after: SPACE_AFTER },
            });

            // ─── Tabel sederhana ─────────────────────────────────
            const makeTable = (rows) => new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: rows.map((cells, rIdx) => new TableRow({
                    children: cells.map(cell => new TableCell({
                        children: [new Paragraph({
                            children: [tr(cell, { bold: rIdx === 0 })],
                            spacing: { after: 60 },
                        })],
                        margins: { top: 80, bottom: 80, left: 100, right: 100 },
                        verticalAlign: VerticalAlign.TOP,
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                            bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                            left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                            right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                        },
                    })),
                    cantSplit: true,
                })),
            });

            // ─── Tanggal Indonesia ────────────────────────────────
            const tglNow = new Date().toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            // ─────────────────────────────────────────────────────
            // SECTION 1: COVER PAGE + KOP SURAT
            // ─────────────────────────────────────────────────────
            const coverChildren = [
                // ── KOP SURAT ──────────────────────────────────────
                new Paragraph({
                    children: [tr('KEMENTERIAN HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA', { bold: true, size: FONT_H2 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 60 },
                }),
                new Paragraph({
                    children: [tr('DIREKTORAT JENDERAL IMIGRASI', { bold: true, size: FONT_H2 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 60 },
                }),
                new Paragraph({
                    children: [tr('KANTOR WILAYAH SUMATERA UTARA', { bold: true, size: FONT_H2 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 60 },
                }),
                new Paragraph({
                    children: [tr('KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR', { bold: true, size: FONT_H2 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                }),
                new Paragraph({
                    children: [tr('Jl. Tentara Nasional Indonesia No. 4, Pematang Siantar, Sumatera Utara', { size: FONT_SMALL })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                }),
                new Paragraph({
                    children: [tr('Website: www.imigrasi.go.id  |  Email: kanimsiansiantar@imigrasi.go.id', { size: FONT_SMALL })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                }),

                // ── Garis double separator bawah kop ──────────────
                dividerPara(BorderStyle.DOUBLE),

                emptyPara(400),

                // ── Judul (center, bold, uppercase, underline) ─────
                new Paragraph({
                    children: [tr('LAPORAN KEGIATAN', { bold: true, size: FONT_COVER, underline: {} })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 160 },
                }),
                new Paragraph({
                    children: [tr(`Periode: ${BULAN_NAMES[bulan]} ${tahun}`, { bold: true, size: FONT_SUB })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 600 },
                }),

                // ── Daftar seksi ───────────────────────────────────
                new Paragraph({
                    children: [tr(`Terdiri dari ${approved.length} Seksi:`, { italics: true })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                }),
                ...approved.map((row, i) => new Paragraph({
                    children: [tr(`${i + 1}. ${row.name}`)],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                })),

                emptyPara(600),
                dividerPara(),

                new Paragraph({
                    children: [tr(`Pematang Siantar, ${tglNow}`)],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 160, after: 60 },
                }),
                new Paragraph({
                    children: [tr(`Disusun oleh: ${user?.nama || 'Super Admin'}`)],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 160 },
                }),
            ];

            // ─────────────────────────────────────────────────────
            // SECTION 2: KATA PENGANTAR
            // ─────────────────────────────────────────────────────
            const kataChildren = [
                new Paragraph({
                    children: [tr('KATA PENGANTAR', { bold: true, size: FONT_H1 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 400 },
                }),
                bodyPara(`Puji syukur kami panjatkan kepada Tuhan Yang Maha Esa atas rahmat dan karunia-Nya sehingga Laporan Kegiatan Kantor Imigrasi Kelas II TPI Pematang Siantar periode ${BULAN_NAMES[bulan]} ${tahun} ini dapat diselesaikan.`),
                bodyPara(`Laporan ini merupakan kumpulan laporan dari seluruh seksi di lingkungan Kantor Imigrasi Kelas II TPI Pematang Siantar, yang disusun sebagai pertanggungjawaban atas pelaksanaan tugas dan fungsi pada periode ${BULAN_NAMES[bulan]} ${tahun}.`),
                bodyPara('Kami menyadari bahwa laporan ini masih jauh dari sempurna. Oleh karena itu, kritik dan saran yang membangun sangat kami harapkan demi perbaikan di masa mendatang.'),
                bodyPara('Atas perhatian dan kerja sama semua pihak yang telah berkontribusi dalam penyusunan laporan ini, kami mengucapkan terima kasih.'),
                emptyPara(400),
                new Paragraph({ children: [tr(`Pematang Siantar, ${tglNow}`)], alignment: AlignmentType.RIGHT, spacing: { after: 60 } }),
                new Paragraph({ children: [tr('Kepala Kantor Imigrasi Kelas II TPI', { bold: true })], alignment: AlignmentType.RIGHT, spacing: { after: 60 } }),
                new Paragraph({ children: [tr('Pematang Siantar')], alignment: AlignmentType.RIGHT, spacing: { after: 1200 } }),
                new Paragraph({ children: [tr('____________________________', { bold: true })], alignment: AlignmentType.RIGHT, spacing: { after: 60 } }),
                new Paragraph({ children: [tr('NIP. ________________________')], alignment: AlignmentType.RIGHT, spacing: { after: 200 } }),
            ];

            // ─────────────────────────────────────────────────────
            // SECTION 3: DAFTAR ISI
            // ─────────────────────────────────────────────────────
            const daftarChildren = [
                new Paragraph({
                    children: [tr('DAFTAR ISI', { bold: true, size: FONT_H1 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 600 },
                }),
                ...['Kata Pengantar', 'Daftar Isi'].map((label, i) => new Paragraph({
                    children: [
                        tr(label),
                        tr(' ............................................................. '),
                        tr(`${i + 2}`),
                    ],
                    spacing: { after: 120 },
                })),
                ...approved.map((row, i) => [
                    new Paragraph({
                        children: [
                            tr(`BAB ${ROMAWI[i]} — ${row.name.toUpperCase()}`, { bold: true }),
                            tr(' ............................................................. '),
                            tr(`${4 + i * 3}`),
                        ],
                        spacing: { after: 80 },
                    }),
                    new Paragraph({ children: [tr('   A. Pendahuluan'), tr(' ...................................................... '), tr(`${4 + i * 3}`)], spacing: { after: 60 } }),
                    new Paragraph({ children: [tr('   B. Isi Laporan'), tr(' ...................................................... '), tr(`${5 + i * 3}`)], spacing: { after: 60 } }),
                    new Paragraph({ children: [tr('   C. Penutup'), tr(' ...................................................... '), tr(`${5 + i * 3}`)], spacing: { after: 60 } }),
                    new Paragraph({ children: [tr('   D. Lampiran'), tr(' ...................................................... '), tr(`${6 + i * 3}`)], spacing: { after: 120 } }),
                ]).flat(),
                new Paragraph({
                    children: [
                        tr('Penutup', { bold: true }),
                        tr(' ............................................................. '),
                        tr(`${4 + approved.length * 3}`),
                    ],
                    spacing: { after: 120 },
                }),
            ];

            // ─────────────────────────────────────────────────────
            // SECTION 4: ISI LAPORAN — format resmi A/B/C/D
            // ─────────────────────────────────────────────────────
            const isiChildren = [];

            approved.forEach((row, idx) => {
                const l = row.laporan;
                const nomBab = ROMAWI[idx] || String(idx + 1);
                const tglUpload = l.updated_at
                    ? new Date(l.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-';
                const tglKirim = l.submitted_at
                    ? new Date(l.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-';

                // ── Page break sebelum setiap BAB ────────────────
                isiChildren.push(new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } }));

                // ── Judul BAB ─────────────────────────────────────
                isiChildren.push(
                    new Paragraph({
                        children: [tr(`BAB ${nomBab}`, { bold: true, size: FONT_H1 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 120 },
                    }),
                    new Paragraph({
                        children: [tr(row.name.toUpperCase(), { bold: true, size: FONT_H1 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),
                );

                // ── A. PENDAHULUAN ────────────────────────────────
                isiChildren.push(headingPara('A.  PENDAHULUAN'));

                isiChildren.push(headingPara('1.  Umum', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(bodyPara(
                    `Seksi ${row.name} merupakan salah satu unit kerja di Kantor Imigrasi Kelas II TPI Pematang Siantar yang bertugas melaksanakan fungsi keimigrasian sesuai ketentuan peraturan perundang-undangan yang berlaku.`
                ));

                isiChildren.push(headingPara('2.  Maksud dan Tujuan', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(bodyPara(
                    `Laporan ini disusun dengan maksud untuk memberikan gambaran pelaksanaan kegiatan ${row.name} selama periode ${BULAN_NAMES[bulan]} ${tahun}, serta sebagai bahan evaluasi dan pertanggungjawaban kinerja secara periodik.`
                ));

                isiChildren.push(headingPara('3.  Ruang Lingkup', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(bodyPara(
                    `Laporan ini mencakup seluruh kegiatan yang dilaksanakan oleh ${row.name} pada periode ${BULAN_NAMES[bulan]} ${tahun}, meliputi program kerja, realisasi kegiatan, dan pencapaian hasil.`
                ));

                isiChildren.push(headingPara('4.  Dasar Hukum', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(
                    bodyPara('a.  Undang-Undang Nomor 6 Tahun 2011 tentang Keimigrasian;', { indent: { left: cmToTwip(1.5), firstLine: 0 } }),
                    bodyPara('b.  Peraturan Pemerintah Nomor 31 Tahun 2013 tentang Peraturan Pelaksanaan UU Keimigrasian;', { indent: { left: cmToTwip(1.5), firstLine: 0 } }),
                    bodyPara('c.  Peraturan Menteri Hukum dan HAM terkait tupoksi unit kerja imigrasi.', { indent: { left: cmToTwip(1.5), firstLine: 0 } }),
                );

                // ── B. ISI LAPORAN ────────────────────────────────
                isiChildren.push(headingPara('B.  ISI LAPORAN'));

                isiChildren.push(headingPara('5.  Program yang Dilaksanakan', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(
                    makeTable([
                        ['No', 'Nama Program / Kegiatan', 'Target', 'Realisasi', 'Keterangan'],
                        ['1', `Program Kerja ${row.name} — ${BULAN_NAMES[bulan]} ${tahun}`, '100%', l.status === 'Disetujui' || l.status === 'Final' ? '100%' : 'Dalam Proses', 'Laporan telah disetujui'],
                        ['2', 'Penyusunan dan Pengiriman Laporan Bulanan', '1 Dokumen', '1 Dokumen', `Dikirim: ${tglKirim}`],
                        ['3', 'Monitoring dan Evaluasi Kegiatan', 'Terlaksana', 'Terlaksana', '-'],
                    ]),
                    emptyPara(SPACE_AFTER),
                );

                isiChildren.push(headingPara('6.  Hasil yang Dicapai', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(bodyPara(
                    `Pada periode ${BULAN_NAMES[bulan]} ${tahun}, ${row.name} telah berhasil melaksanakan seluruh program kerja yang telah direncanakan. Laporan kegiatan telah disusun dan dikirimkan tepat waktu, serta telah mendapatkan persetujuan dari atasan yang berwenang. File laporan tersedia dalam format ${l.file_type?.toUpperCase() || 'dokumen'} dengan nama file: ${l.file_name || '-'}.`
                ));

                // ── C. PENUTUP ────────────────────────────────────
                isiChildren.push(headingPara('C.  PENUTUP'));

                isiChildren.push(headingPara('7.  Simpulan dan Saran', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(
                    bodyPara([tr('Simpulan: ', { bold: true }), tr(`Seluruh kegiatan ${row.name} pada periode ${BULAN_NAMES[bulan]} ${tahun} telah terlaksana sesuai rencana dan target yang ditetapkan.`)], { indent: { firstLine: 0, left: cmToTwip(0.5) } }),
                    bodyPara([tr('Saran: ', { bold: true }), tr('Perlu peningkatan koordinasi antar seksi agar laporan dapat diselesaikan lebih awal dari batas waktu yang ditentukan.')], { indent: { firstLine: 0, left: cmToTwip(0.5) } }),
                );

                isiChildren.push(headingPara('8.  Penutup', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(bodyPara(
                    `Demikian laporan kegiatan ${row.name} untuk periode ${BULAN_NAMES[bulan]} ${tahun} ini disusun. Laporan ini telah diverifikasi dan disetujui pada tanggal ${tglUpload}. Semoga laporan ini dapat menjadi bahan evaluasi kinerja yang berkelanjutan.`
                ));

                // ── D. LAMPIRAN ───────────────────────────────────
                isiChildren.push(headingPara('D.  LAMPIRAN'));

                isiChildren.push(headingPara('9.  Daftar Lampiran / Dokumentasi', { indent: { left: cmToTwip(1) } }));
                isiChildren.push(
                    makeTable([
                        ['No', 'Nama Lampiran', 'Keterangan'],
                        ['1', l.file_name || 'Dokumen Laporan Utama', `Format: ${l.file_type?.toUpperCase() || '-'}`],
                        ['2', 'Tautan Akses Dokumen', l.file_url ? l.file_url.substring(0, 60) + '...' : 'Tidak tersedia'],
                    ]),
                    emptyPara(SPACE_AFTER),
                );
            });

            // ─────────────────────────────────────────────────────
            // SECTION 5: PENUTUP UMUM
            // ─────────────────────────────────────────────────────
            const penutupChildren = [
                new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } }),
                new Paragraph({
                    children: [tr('PENUTUP', { bold: true, size: FONT_H1 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 600 },
                }),
                bodyPara(
                    `Demikian Laporan Kegiatan Kantor Imigrasi Kelas II TPI Pematang Siantar untuk periode ${BULAN_NAMES[bulan]} ${tahun} ini disusun. Laporan ini merupakan gabungan dari laporan ${approved.length} unit, yaitu: ${approved.map(r => r.name).join(', ')}, yang telah melalui proses review dan persetujuan.`
                ),
                bodyPara(
                    'Semoga laporan ini dapat menjadi bahan evaluasi dan peningkatan kinerja di masa yang akan datang. Atas perhatian dan arahan Bapak/Ibu, kami mengucapkan terima kasih.'
                ),
                emptyPara(600),
                new Paragraph({ children: [tr(`Pematang Siantar, ${tglNow}`)], alignment: AlignmentType.RIGHT, spacing: { after: 60 } }),
                new Paragraph({ children: [tr('Kepala Kantor Imigrasi Kelas II TPI Pematang Siantar', { bold: true })], alignment: AlignmentType.RIGHT, spacing: { after: 60 } }),
                emptyPara(1400),
                new Paragraph({ children: [tr('____________________________', { bold: true })], alignment: AlignmentType.RIGHT, spacing: { after: 60 } }),
                new Paragraph({ children: [tr('NIP. ________________________')], alignment: AlignmentType.RIGHT, spacing: { after: 200 } }),
            ];

            // ─────────────────────────────────────────────────────
            // HEADER & FOOTER
            // ─────────────────────────────────────────────────────
            const makeHeader = () => new Header({
                children: [
                    new Paragraph({
                        children: [
                            tr(`Laporan Kegiatan — ${BULAN_NAMES[bulan]} ${tahun}  |  Kantor Imigrasi Kelas II TPI Pematang Siantar`, { size: FONT_SMALL, italics: true, color: '555555' }),
                        ],
                        alignment: AlignmentType.RIGHT,
                        border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 4 } },
                        spacing: { after: 120 },
                    }),
                ],
            });

            const makeFooter = () => new Footer({
                children: [
                    new Paragraph({
                        children: [
                            tr('- ', { size: FONT_SMALL }),
                            new TextRun({ children: [PageNumber.CURRENT], font: FONT_FAMILY, size: FONT_SMALL }),
                            tr(' -', { size: FONT_SMALL }),
                        ],
                        alignment: AlignmentType.CENTER,
                        border: { top: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 4 } },
                        spacing: { before: 120 },
                    }),
                ],
            });

            // ─────────────────────────────────────────────────────
            // BANGUN DOKUMEN
            // ─────────────────────────────────────────────────────
            const doc = new Document({
                creator: user?.nama || 'HORAS-IM',
                title: `Laporan Kegiatan ${BULAN_NAMES[bulan]} ${tahun}`,
                description: `Laporan Kegiatan Kantor Imigrasi Kelas II TPI Pematang Siantar — ${BULAN_NAMES[bulan]} ${tahun}`,
                styles: {
                    default: {
                        document: {
                            run: { font: FONT_FAMILY, size: FONT_BODY },
                            paragraph: { spacing: { ...LINE_SPACING } },
                        },
                    },
                },
                numbering: { config: [] },
                sections: [
                    // ── COVER (tanpa header/footer) ───────────────
                    {
                        properties: {
                            type: SectionType.NEXT_PAGE,
                            page: {
                                margin: MARGIN,
                                pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
                            },
                        },
                        children: coverChildren,
                    },
                    // ── KATA PENGANTAR ────────────────────────────
                    {
                        properties: {
                            type: SectionType.NEXT_PAGE,
                            page: { margin: MARGIN },
                        },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: kataChildren,
                    },
                    // ── DAFTAR ISI ────────────────────────────────
                    {
                        properties: {
                            type: SectionType.NEXT_PAGE,
                            page: { margin: MARGIN },
                        },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: daftarChildren,
                    },
                    // ── ISI (semua BAB dalam satu section) ───────
                    {
                        properties: {
                            type: SectionType.NEXT_PAGE,
                            page: { margin: MARGIN },
                        },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: isiChildren,
                    },
                    // ── PENUTUP ───────────────────────────────────
                    {
                        properties: {
                            type: SectionType.NEXT_PAGE,
                            page: { margin: MARGIN },
                        },
                        headers: { default: makeHeader() },
                        footers: { default: makeFooter() },
                        children: penutupChildren,
                    },
                ],
            });

            const buffer = await Packer.toBlob(doc);
            const url = URL.createObjectURL(buffer);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Laporan_Kegiatan_${BULAN_NAMES[bulan]}_${tahun}.docx`;
            a.click();
            URL.revokeObjectURL(url);

            // Log aktivitas
            try {
                await supabase.from('activity_logs').insert({
                    user_id: user.id, user_name: user.nama, action: 'gabung_laporan',
                    entity_type: 'laporan_bulanan',
                    detail: `Gabung laporan ${BULAN_NAMES[bulan]} ${tahun} (${approved.length} seksi) — format profesional`,
                });
            } catch { /* log opsional */ }

            showMsg('success', `✅ Laporan ${approved.length} seksi berhasil digabung dan didownload!`);
        } catch (err) {
            console.error(err);
            showMsg('error', `Gagal membuat dokumen: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const tahunOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    📎 Gabungkan Laporan Bulanan
                </h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
                    Gabungkan semua laporan seksi yang telah disetujui menjadi satu dokumen Word profesional.
                </p>
            </div>

            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
                    background: msg.type === 'success' ? '#dcfce7' : msg.type === 'info' ? '#eff6ff' : '#fee2e2',
                    color: msg.type === 'success' ? '#15803d' : msg.type === 'info' ? '#1d4ed8' : '#b91c1c',
                    border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : msg.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
                }}>
                    {msg.text}
                </div>
            )}

            {/* Filter */}
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
            </div>

            {/* Daftar urutan seksi */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                    Urutan Penggabungan
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
                                    alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                                    background: ok ? '#16a34a' : '#dc2626', color: '#fff', flexShrink: 0,
                                }}>
                                    {idx + 1}
                                </div>
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

            {/* Info format laporan */}
            <div style={{
                background: '#eff6ff', borderRadius: '10px', padding: '16px', marginBottom: '24px',
                border: '1px solid #bfdbfe', fontSize: '13px', color: '#1d4ed8'
            }}>
                <strong>📐 Format Dokumen Profesional:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', marginTop: '10px', lineHeight: 1.9 }}>
                    <span>📄 Font: Times New Roman 12pt (resmi)</span>
                    <span>📏 Margin: 2.54 cm semua sisi</span>
                    <span>✏️ Spasi: 1.5 baris, teks justify</span>
                    <span>🔢 Nomor halaman di footer tengah</span>
                    <span>📋 Kop Surat resmi + Kata Pengantar + Daftar Isi</span>
                    <span>📖 Struktur: BAB → A.Pendahuluan, B.Isi, C.Penutup, D.Lampiran</span>
                    <span>🗂️ Tabel program dengan border hitam 1pt</span>
                    <span>✅ Indent baris pertama 1.27 cm</span>
                </div>
            </div>

            {/* Status gabung */}
            {!semuaDisetujui && approved.length > 0 && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                    background: '#fffbeb', border: '1px solid #fde68a', fontSize: '14px', color: '#92400e'
                }}>
                    ⚠️ Baru {approved.length} dari {laporan.length} seksi yang disetujui.
                    Laporan bisa tetap didownload dengan seksi yang sudah disetujui.
                </div>
            )}

            {/* Tombol Gabung */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={handleGabung}
                    disabled={approved.length === 0 || generating || loading}
                    style={{
                        padding: '14px 32px', borderRadius: '10px', border: 'none',
                        fontWeight: 700, fontSize: '16px',
                        cursor: approved.length > 0 && !generating ? 'pointer' : 'not-allowed',
                        background: approved.length > 0 && !generating ? '#7c3aed' : '#e2e8f0',
                        color: approved.length > 0 && !generating ? '#fff' : '#94a3b8',
                        transition: 'all 0.2s',
                    }}>
                    {generating
                        ? '⏳ Membuat Dokumen...'
                        : approved.length === 0
                            ? '⚠️ Belum Ada Laporan Disetujui'
                            : semuaDisetujui
                                ? `⬇️ Download Laporan Lengkap (${approved.length} Seksi)`
                                : `⬇️ Download Laporan Parsial (${approved.length}/${laporan.length} Seksi)`}
                </button>
            </div>
        </div>
    );
}
