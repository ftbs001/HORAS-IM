import { useState, useEffect, useMemo, useRef } from 'react';
import { useReport, SECTION_TOC_MAPPING } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';
import ReactQuill from 'react-quill-new';
import Quill from 'quill';  // Import Quill directly from the package
import 'react-quill-new/dist/quill.snow.css';
import '../../styles/quill-custom.css';
import CoverLetter from './CoverLetter';
import CoverPage from './CoverPage';
import Foreword from './Foreword';
import TableOfContents from './TableOfContents';
import { supabase } from '../../lib/supabaseClient';
import html2pdf from 'html2pdf.js';

// Import logos for proper bundling
import logoKementerian from '../../assets/logo-kementerian-imigrasi.png';
import logosCombined from '../../assets/logos-combined.png';

// Import DOCX exporter for template-based Word export
import { generateDocx } from '../../utils/docxExporter';

// Register custom fonts
const Font = Quill.import('formats/font');
Font.whitelist = ['arial', 'times-new-roman', 'courier', 'georgia', 'verdana'];
Quill.register(Font, true);

// Register custom sizes
const Size = Quill.import('formats/size');
Size.whitelist = ['8px', '10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px', '72px'];
Quill.register(Size, true);

// Note: line-height and image resize modules removed due to compatibility issues
// Basic Quill functionality is sufficient for most use cases

// TOC Structure - Complete DAFTAR ISI
const toc = [
    {
        id: 'cover_letter', label: 'SURAT PENGANTAR', type: 'file'
    },
    {
        id: 'cover_page', label: 'HALAMAN JUDUL', type: 'file'
    },
    {
        id: 'foreword', label: 'KATA PENGANTAR', type: 'file'
    },
    {
        id: 'toc', label: 'DAFTAR ISI', type: 'file'
    },
    {
        id: 'bab1', label: 'BAB I PENDAHULUAN', type: 'folder', children: [
            {
                id: 'bab1_pengantar', label: 'A. PENGANTAR', type: 'folder', children: [
                    { id: 'bab1_pengantar_gambaran', label: '1. Gambaran Umum Kantor Imigrasi Kelas II TPI Pematang Siantar', type: 'file' },
                    { id: 'bab1_pengantar_wilayah', label: '2. Wilayah Kerja Kantor Imigrasi Kelas II TPI Pematang Siantar', type: 'file' },
                    { id: 'bab1_pengantar_tugas', label: '3. Pelaksanaan Tugas', type: 'file' },
                ]
            },
            { id: 'bab1_dasar_hukum', label: 'B. DASAR HUKUM', type: 'file' },
            { id: 'bab1_ruang_lingkup', label: 'C. RUANG LINGKUP', type: 'file' },
        ]
    },
    {
        id: 'bab2', label: 'BAB II PELAKSANAAN TUGAS', type: 'folder', children: [
            {
                id: 'bab2_substantif', label: 'A. BIDANG SUBSTANTIF', type: 'folder', children: [
                    {
                        id: 'bab2_substantif_dokumen', label: '1. PENERBITAN DOKUMEN PERJALANAN REPUBLIK INDONESIA', type: 'folder', children: [
                            { id: 'bab2_substantif_dokumen_paspor48_siantar', label: 'a. Paspor 48 Hal pada Kantor Imigrasi Kelas II TPI Pematang Siantar', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor48_tebing', label: 'b. Paspor 48 Hal pada Unit Layanan Paspor (ULP) Tebing Tinggi', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor48_uuk', label: 'c. Paspor 48 Hal pada Unit Kerja Kantor (UKK) Dolok Sanggul', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor24_siantar', label: 'd. Paspor 24 Hal pada Kantor Imigrasi Kelas II TPI Pematang Siantar', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor24_tebing', label: 'e. Paspor 24 Hal pada Unit Layanan Paspor (ULP) Tebing Tinggi', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor24_uuk', label: 'f. Paspor 24 Hal pada Unit Kerja Kantor (UKK) Dolok Sanggul', type: 'file' },
                            { id: 'bab2_substantif_dokumen_plb', label: 'g. Pas Lintas Batas (PLB)', type: 'file' },
                            { id: 'bab2_substantif_dokumen_splp', label: 'h. Surat Perjalanan Laksana Paspor (SPLP)', type: 'file' },
                        ]
                    },
                    {
                        id: 'bab2_substantif_izintinggal', label: '2. PENERBITAN IZIN TINGGAL', type: 'folder', children: [
                            { id: 'bab2_substantif_izintinggal_itk', label: 'a. Izin Kunjungan (ITK)', type: 'file' },
                            { id: 'bab2_substantif_izintinggal_itas', label: 'b. Izin Tinggal Terbatas (ITAS)', type: 'file' },
                            { id: 'bab2_substantif_izintinggal_itap', label: 'c. Izin Tinggal Tetap (ITAP)', type: 'file' },
                            { id: 'bab2_substantif_izintinggal_lain', label: 'd. Lain-lain', type: 'file' },
                        ]
                    },
                    { id: 'bab2_substantif_rekapitulasi', label: '3. REKAPITULASI DATA PERLINTASAN', type: 'file' },
                    {
                        id: 'bab2_substantif_intel', label: '4. INTELIJEN DAN PENINDAKAN KEIMIGRASIAN', type: 'folder', children: [
                            { id: 'bab2_substantif_intel_yustisia', label: 'a. Projustisia', type: 'file' },
                            { id: 'bab2_substantif_intel_admin', label: 'b. Tindakan Administratif Keimigrasian', type: 'file' },
                            { id: 'bab2_substantif_intel_timpora', label: 'c. Timpora', type: 'file' },
                        ]
                    },
                    { id: 'bab2_substantif_infokim', label: '5. INFORMASI DAN KOMUNIKASI', type: 'file' },
                    { id: 'bab2_substantif_pengaduan', label: '6. PENGADUAN MASYARAKAT', type: 'file' },
                ]
            },
            {
                id: 'bab2_fasilitatif', label: 'B. BIDANG FASILITATIF', type: 'folder', children: [
                    {
                        id: 'bab2_fasilitatif_keuangan', label: '1. URUSAN KEUANGAN', type: 'folder', children: [
                            {
                                id: 'bab2_fasilitatif_keuangan_realisasi', label: '1.1. Laporan Realisasi Penyerapan Anggaran (Berdasarkan Jenis Belanja)', type: 'folder', children: [
                                    { id: 'bab2_fasilitatif_keuangan_rm', label: 'a. Rupiah Murni (RM)', type: 'file' },
                                    { id: 'bab2_fasilitatif_keuangan_pnp', label: 'b. Pendapatan Non Pajak (PNP)', type: 'file' },
                                    { id: 'bab2_fasilitatif_keuangan_gabungan', label: 'c. Rupiah Murni + PNBP', type: 'file' },
                                ]
                            },
                            { id: 'bab2_fasilitatif_keuangan_pnbp', label: '2. Laporan Penerimaan Negara Bukan Pajak (PNBP)', type: 'file' },
                        ]
                    },
                    {
                        id: 'bab2_fasilitatif_kepegawaian', label: '2. URUSAN KEPEGAWAIAN', type: 'folder', children: [
                            { id: 'bab2_fasilitatif_kepegawaian_bezetting', label: '1. Laporan Bezetting Pegawai', type: 'file' },
                            { id: 'bab2_fasilitatif_kepegawaian_rekap', label: '2. Rekapitulasi Pegawai', type: 'file' },
                            { id: 'bab2_fasilitatif_kepegawaian_cuti', label: '3. Data Cuti Pegawai', type: 'file' },
                            { id: 'bab2_fasilitatif_kepegawaian_pembinaan', label: '4. Pembinaan Pegawai', type: 'file' },
                            { id: 'bab2_fasilitatif_kepegawaian_persuratan', label: '5. Tata Usaha (Persuratan)', type: 'file' },
                        ]
                    },
                    {
                        id: 'bab2_fasilitatif_umum', label: '3. URUSAN UMUM', type: 'folder', children: [
                            { id: 'bab2_fasilitatif_umum_kendaraan', label: 'a. Kendaraan Operasional', type: 'file' },
                            { id: 'bab2_fasilitatif_umum_sarana', label: 'b. Sarana dan Prasarana', type: 'file' },
                            { id: 'bab2_fasilitatif_umum_gedung', label: 'c. Gedung dan Bangunan', type: 'file' },
                        ]
                    },
                ]
            }
        ]
    },
    {
        id: 'bab3', label: 'BAB III PERMASALAHAN', type: 'folder', children: [
            { id: 'bab3_kepegawaian', label: '1. Urusan Kepegawaian', type: 'file' },
            { id: 'bab3_keuangan', label: '2. Urusan Keuangan', type: 'file' },
            { id: 'bab3_umum', label: '3. Urusan Umum', type: 'file' },
            { id: 'bab3_lalintalkim', label: '4. Seksi Lalu Lintas dan Izin Tinggal Keimigrasian', type: 'file' },
        ]
    },
    {
        id: 'bab4', label: 'BAB IV PENUTUP', type: 'folder', children: [
            {
                id: 'bab4_saran', label: 'A. SARAN', type: 'folder', children: [
                    { id: 'bab4_saran_kepegawaian', label: '1. Urusan Kepegawaian', type: 'file' },
                    { id: 'bab4_saran_keuangan', label: '2. Urusan Keuangan', type: 'file' },
                ]
            },
            { id: 'bab4_kesimpulan', label: 'B. KESIMPULAN', type: 'file' },
        ]
    },
    {
        id: 'bab5', label: 'BAB V LAMPIRAN STRUKTUR ORGANISASI KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR', type: 'file'
    }
];

// Cover Letter Preview Component (for preview mode)
const CoverLetterPreview = () => {
    const { coverLetterData } = useReport();

    if (!coverLetterData || Object.keys(coverLetterData).length === 0) return null;

    return (
        <div className="mb-16 pb-16 border-b-4 border-black page-break-after" style={{ fontFamily: 'Times New Roman, serif' }}>
            {/* Kop Surat */}
            <div className="flex items-start gap-4 border-b-2 border-black pb-4 mb-6">
                {/* Logo Kementerian Imigrasi dan Pemasyarakatan */}
                <div className="flex-shrink-0">
                    <img
                        src={logoKementerian}
                        alt="Logo Kementerian Imigrasi dan Pemasyarakatan"
                        width="70"
                        height="70"
                        className="object-contain"
                    />
                </div>

                {/* Header Text */}
                <div className="flex-1 text-center" style={{ lineHeight: '1.3' }}>
                    <div style={{ fontSize: '9pt', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                        KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA<br />
                        <span style={{ fontSize: '8.5pt' }}>DIREKTORAT JENDERAL IMIGRASI</span><br />
                        <span style={{ fontSize: '8.5pt' }}>KANTOR WILAYAH SUMATERA UTARA</span><br />
                        <span style={{ fontSize: '11pt', marginTop: '2px', display: 'inline-block' }}>
                            KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR
                        </span>
                    </div>
                    <div style={{ fontSize: '7.5pt', marginTop: '4px', fontWeight: 'normal' }}>
                        Jalan Raya Medan Km. 11,5, Purbasetan, Tanjung Dolok, Simalungun<br />
                        <span>Laman: imigrasiSiantar.id, Surel: kanim.siantar@gmail.id Faks: kanim@kemenkumham.go.id</span>
                    </div>
                </div>
            </div>

            {/* Tanggal (di kanan atas, setelah kop surat, sebelum nomor) */}
            <div className="text-right text-sm mb-6">{coverLetterData.tanggal || ''}</div>

            {/* Content */}
            <div className="grid grid-cols-[100px,1fr] gap-x-2 gap-y-1 mb-4 text-sm">
                <div>Nomor</div>
                <div>: {coverLetterData.nomor || ''}</div>
                <div>Sifat</div>
                <div>: {coverLetterData.sifat || ''}</div>
                <div>Lampiran</div>
                <div>: {coverLetterData.lampiran || ''}</div>
                <div>Hal</div>
                <div className="whitespace-pre-line">: {coverLetterData.hal || ''}</div>
            </div>

            <div className="text-sm whitespace-pre-line mb-6">{coverLetterData.tujuan || ''}</div>
            <div className="text-sm text-justify leading-relaxed whitespace-pre-line mb-12">{coverLetterData.isi || ''}</div>

            <div className="text-center text-sm">
                <div className="mb-16">Kepala Kantor,</div>
                <div className="font-bold">{coverLetterData.penandatangan || ''}</div>
            </div>

            <div className="mt-12 text-xs">
                <div className="font-bold mb-1">Tembusan :</div>
                <div className="pl-4">
                    1. Sekretaris Direktorat Jenderal Imigrasi<br />
                    Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia.
                </div>
            </div>
        </div>
    );
};

// Cover Page Preview Component (for preview mode)
const CoverPagePreview = () => {
    const { coverPageData } = useReport();

    if (!coverPageData || Object.keys(coverPageData).length === 0) {
        // Show default values if no data
        return (
            <div className="mb-16 pb-16 border-b-4 border-black page-break-after flex flex-col items-center justify-between min-h-[900px]" style={{ fontFamily: 'Times New Roman, serif' }}>
                {/* Header */}
                <div className="w-full text-center pt-12">
                    <h1 className="text-xl font-bold" style={{ letterSpacing: '0.5px' }}>
                        KANTOR IMIGRASI KELAS II TPI<br />
                        PEMATANG SIANTAR
                    </h1>
                </div>

                {/* Middle Section */}
                <div className="flex flex-col items-center justify-center">
                    {/* Title */}
                    <div className="text-lg mb-4" style={{ color: '#1a3a52' }}>
                        LAPORAN BULANAN
                    </div>

                    {/* Month/Year */}
                    <div className="text-base font-bold mb-16">
                        DESEMBER 2025
                    </div>

                    {/* Logos */}
                    <div className="flex items-center justify-center mb-12">
                        <img
                            src={logosCombined}
                            alt="Logo Kementerian dan Direktorat Jenderal Imigrasi"
                            style={{ height: '120px' }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="w-full text-center pb-12" style={{ lineHeight: '1.6' }}>
                    <div className="text-sm font-bold">
                        KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN<br />
                        REPUBLIK INDONESIA<br />
                        DIREKTORAT JENDERAL IMIGRASI<br />
                        2025
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-16 pb-16 border-b-4 border-black page-break-after flex flex-col items-center justify-between min-h-[900px]" style={{ fontFamily: 'Times New Roman, serif' }}>
            {/* Header */}
            <div className="w-full text-center pt-12">
                <h1 className="text-xl font-bold" style={{ letterSpacing: '0.5px' }}>
                    KANTOR IMIGRASI KELAS II TPI<br />
                    PEMATANG SIANTAR
                </h1>
            </div>

            {/* Middle Section */}
            <div className="flex flex-col items-center justify-center">
                {/* Title */}
                <div className="text-lg mb-4" style={{ color: '#1a3a52' }}>
                    {coverPageData.reportTitle || 'LAPORAN BULANAN'}
                </div>

                {/* Month/Year */}
                <div className="text-base font-bold mb-16">
                    {coverPageData.month || 'DESEMBER'} {coverPageData.year || '2025'}
                </div>

                {/* Logos */}
                <div className="flex items-center justify-center mb-12">
                    <img
                        src={logosCombined}
                        alt="Logo Kementerian dan Direktorat Jenderal Imigrasi"
                        style={{ height: '120px' }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="w-full text-center pb-12" style={{ lineHeight: '1.6' }}>
                <div className="text-sm font-bold">
                    KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN<br />
                    REPUBLIK INDONESIA<br />
                    DIREKTORAT JENDERAL IMIGRASI<br />
                    2025
                </div>
            </div>
        </div>
    );
};

// Foreword Preview Component (for preview mode)
const ForewordPreview = () => {
    const { forewordData } = useReport();

    const defaultContent = `Puji Syukur kami panjatkan kepada Tuhan Yang Maha Esa sehingga Laporan bulanan ini dapat selesai tepat pada waktunya. Ucapan terima kasih juga kami sampaikan kepada semua pihak yang telah membantu dalam penyajian dan penyusunan laporan bulanan ini sehingga laporan bulanan ini dapat disajikan sesuai dengan lengkap dan benar.

Kantor Imigrasi Kelas II TPI Pematang Siantar adalah salah satu unit pelaksana teknis di bidang keimigrasian yang berada di bawah Kantor Wilayah Kementerian Hukum dan Hak Asasi Manusia Sumatera Utara yang memiliki kewajiban menyusun Laporan Bulanan yang berisi seluruh kegiatan yang telah dilaksanakan dan kendala yang dialami oleh seluruh seksi dan bagian yang ada selama satu periode. Sebagai bentuk pertanggung jawaban segala bentuk kegiatan yang telah dilaksanakan maka disusunlah Laporan bulanan ini sebagai laporan kepada Kepala Kantor Wilayah Kementerian Hukum dan HAM Sumatera Utara.

Laporan ini diharapkan dapat memberikan informasi yang berguna kepada para pemakai laporan khususnya sebagai sarana untuk meningkatkan kinerja, akuntabilitas / pertanggung jawaban dan transparansi pelaksanaan tugas pokok dan fungsi Kantor Imigrasi Kelas II TPI Pematang Siantar. Disamping itu, laporan bulanan ini juga dimaksudkan untuk memberikan informasi manajemen dalam pengambilan keputusan dalam usaha untuk mewujudkan tata kelola pemerintahan yang baik (good government).`;

    const content = forewordData?.content || defaultContent;

    return (
        <div className="mb-16 pb-16 border-b-4 border-black page-break-after" style={{ fontFamily: 'Times New Roman, serif' }}>
            <h2 className="text-2xl font-bold text-center mb-8">KATA PENGANTAR</h2>
            <div style={{ textAlign: 'justify', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
                {content}
            </div>
        </div>
    );
};

// Table of Contents Preview Component (for preview mode)
const TableOfContentsPreview = () => {
    const { reportData } = useReport();

    const tocContent = reportData?.['toc'] || '';

    // Only render if there's content
    if (!tocContent) return null;

    return (
        <div className="mb-16 pb-16 border-b-4 border-black page-break-after" style={{ fontFamily: 'Times New Roman, serif' }}>
            <div
                className="toc-preview"
                dangerouslySetInnerHTML={{ __html: tocContent }}
                style={{ fontSize: '12pt', lineHeight: '1.15' }}
            />
        </div>
    );
};

const MonthlyReport = ({ sectionFilter = null }) => {
    const { reportData, updateSection, clearSection, reportAttachments, addAttachment, removeAttachment, getAttachments, coverLetterData, coverPageData, forewordData } = useReport();
    const { showNotification } = useNotification();
    const quillRef = useRef(null);

    // State
    const [activeSection, setActiveSection] = useState('cover_letter');
    const [expandedNodes, setExpandedNodes] = useState(['bab1', 'bab1_pengantar', 'bab2', 'bab2_substantif']);
    const [viewMode, setViewMode] = useState(sectionFilter ? 'edit' : 'dashboard'); // Default to dashboard if no section filter
    const [isSaving, setIsSaving] = useState(false);
    const [history, setHistory] = useState({});



    // TOC Filtering Logic
    const filteredToc = useMemo(() => {
        if (!sectionFilter) return toc;

        const allowedIds = SECTION_TOC_MAPPING[sectionFilter] || [];

        const filterNodes = (nodes) => {
            return nodes.reduce((acc, node) => {
                // Check if this node is explicitly allowed
                const isExplicitlyAllowed = allowedIds.includes(node.id);

                if (isExplicitlyAllowed) {
                    // If explicitly allowed, include it and ALL its children
                    acc.push(node);
                    return acc;
                }

                // If not explicitly allowed, check if it has children that might be allowed
                if (node.children) {
                    const filteredChildren = filterNodes(node.children);
                    if (filteredChildren.length > 0) {
                        // Cloning the node to avoid mutating original TOC structure references
                        acc.push({ ...node, children: filteredChildren });
                    }
                }

                return acc;
            }, []);
        };

        return filterNodes(toc);
    }, [toc, sectionFilter]);

    // Initialize special sections content if empty (TOC and BAB III)
    useEffect(() => {
        // Only run if reportData and updateSection are available
        if (!reportData || !updateSection) return;

        const initializeSpecialSections = async () => {
            // DAFTAR ISI (Table of Contents) content - compact format to fit on 1 page
            const tocContent = `<p style="text-align: center;"><strong>DAFTAR ISI</strong></p>
<p><strong>BAB I PENDAHULUAN</strong>..............................................................................................................................5</p>
<p class="ql-indent-1">A. PENGANTAR.....................................................................................................................................5</p>
<p class="ql-indent-2">1. Gambaran Umum Kantor Imigrasi Kelas II TPI Pematang Siantar.................................................5</p>
<p class="ql-indent-2">2. Wilayah Kerja Kantor Imigrasi Kelas II TPI Pematang Siantar......................................................5</p>
<p class="ql-indent-2">3. Pelaksanaan Tugas.........................................................................................................................7</p>
<p class="ql-indent-1">B. DASAR HUKUM................................................................................................................................7</p>
<p class="ql-indent-1">C. RUANG LINGKUP.............................................................................................................................8</p>
<p><strong>BAB II PELAKSANAAN TUGAS</strong>............................................................................................................9</p>
<p class="ql-indent-1">A. BIDANG SUBSTANTIF.....................................................................................................................9</p>
<p class="ql-indent-2">1. PENERBITAN DOKUMEN PERJALANAN REPUBLIK INDONESIA...........................................9</p>
<p class="ql-indent-3">a. Paspor 48 Hal pada Kantor Imigrasi Kelas II TPI Pematang Siantar...........................................9</p>
<p class="ql-indent-3">b. Paspor 48 Hal pada Unit Layanan Paspor (ULP) Tebing Tinggi.................................................9</p>
<p class="ql-indent-3">c. Paspor 48 Hal pada Unit Kerja Kantor (UKK) Dolok Sanggul...................................................10</p>
<p class="ql-indent-3">d. Paspor 24 hal pada Kantor Imigrasi Kelas II TPI Pematang Siantar.........................................10</p>
<p class="ql-indent-3">e. Paspor 24 hal pada Unit Layanan Paspor (ULP) Tebing Tinggi...............................................11</p>
<p class="ql-indent-3">f. Paspor 24 hal pada Unit Kerja Kantor (UKK) Dolok Sanggul....................................................11</p>
<p class="ql-indent-3">g. Pas Lintas Batas (PLB)..............................................................................................................12</p>
<p class="ql-indent-3">h. Surat Perjalanan Laksana Paspor (SPLP).................................................................................12</p>
<p class="ql-indent-2">2. PENERBITAN IZIN TINGGAL......................................................................................................13</p>
<p class="ql-indent-3">a. Izin Kunjungan (ITK)..................................................................................................................13</p>
<p class="ql-indent-3">b. Izin Tinggal Terbatas (ITAS)......................................................................................................13</p>
<p class="ql-indent-3">c. Izin Tinggal Tetap (ITAP)...........................................................................................................14</p>
<p class="ql-indent-3">d. Lain-lain.....................................................................................................................................14</p>
<p class="ql-indent-2">3. REKAPITULASI DATA PERLINTASAN......................................................................................15</p>
<p class="ql-indent-2">4. INTELIJEN DAN PENINDAKAN KEIMIGRASIAN......................................................................16</p>
<p class="ql-indent-3">a. Projustisia..................................................................................................................................16</p>
<p class="ql-indent-3">b. Tindakan Administratif Keimigrasian.........................................................................................16</p>
<p class="ql-indent-3">c. Timpora......................................................................................................................................17</p>
<p class="ql-indent-2">5. INFORMASI DAN KOMUNIKASI................................................................................................18</p>
<p class="ql-indent-2">6. PENGADUAN MASYARAKAT....................................................................................................18</p>
<p class="ql-indent-1">B. BIDANG FASILITATIF....................................................................................................................19</p>
<p class="ql-indent-2">1. URUSAN KEUANGAN.................................................................................................................19</p>
<p class="ql-indent-3">1. Laporan Realisasi Penyerapan Anggaran (Berdasarkan Jenis Belanja)....................................19</p>
<p class="ql-indent-4">a. Rupiah Murni (RM)....................................................................................................................19</p>
<p class="ql-indent-4">b. Pendapatan Non Pajak (PNP)...................................................................................................19</p>
<p class="ql-indent-4">c. Rupiah Murni + PNBP................................................................................................................20</p>
<p class="ql-indent-3">2. Laporan Penerimaan Negara Bukan Pajak (PNBP)...................................................................20</p>
<p class="ql-indent-2">2. URUSAN KEPEGAWAIAN..........................................................................................................24</p>
<p class="ql-indent-3">1. Laporan Bazetting Pegawai.........................................................................................................24</p>
<p class="ql-indent-3">2. Rekapitulasi Pegawai..................................................................................................................29</p>
<p class="ql-indent-3">3. Data Cuti Pegawai.......................................................................................................................29</p>
<p class="ql-indent-3">4. Pembinaan Pegawai....................................................................................................................29</p>
<p class="ql-indent-3">5. Tata Usaha (Persuratan)..............................................................................................................29</p>
<p class="ql-indent-2">3. URUSAN UMUM..........................................................................................................................30</p>
<p class="ql-indent-3">a. Kendaraan Operasional.............................................................................................................30</p>
<p class="ql-indent-3">b. Sarana dan Prasarana...............................................................................................................30</p>
<p class="ql-indent-3">c. Gedung dan Bangunan..............................................................................................................31</p>
<p><strong>BAB III PERMASALAHAN</strong>.................................................................................................................32</p>
<p class="ql-indent-2">1. Urusan Kepegawaian..................................................................................................................32</p>
<p class="ql-indent-2">2. Urusan Keuangan........................................................................................................................32</p>
<p class="ql-indent-2">3. Urusan Umum..............................................................................................................................32</p>
<p class="ql-indent-2">4. Seksi Lalu Lintas dan Izin Tinggal Keimigrasian.........................................................................33</p>
<p><strong>BAB IV PENUTUP</strong>.............................................................................................................................33</p>
<p class="ql-indent-1">A. Saran...............................................................................................................................................33</p>
<p class="ql-indent-2">1. Urusan Kepegawaian..................................................................................................................33</p>
<p class="ql-indent-2">2. Urusan Keuangan........................................................................................................................33</p>
<p class="ql-indent-1">B. Kesimpulan......................................................................................................................................33</p>
<p><strong>BAB V LAMPIRAN STRUKTUR ORGANISASI KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR</strong>..............................................................................................................................................34</p>`;

            // BAB III sections content
            const bab3Sections = {
                'bab3_kepegawaian': `<p><strong>1. Urusan Kepegawaian</strong></p><p class="ql-indent-1">a. Dengan adanya Unit Layanan Paspor (ULP) Tebing Tinggi, Tempat Pemeriksaan Imigrasi (TPI) di Bandara Internasional Silangit, Kawasan Ekonomi Khusus (KEK) Sei Mangkei dan terbentuknya Unit Kerja Kantor (UKK) Imigrasi Kelas II TPI di Humbang Hasundutan serta wilayah kerja yang luas dan untuk kelancaran tugas dan fungsi Keimigrasian dipandang perlu penambahan Sumber Daya Manusia (Pejabat/Pegawai) pada Kantor Imigrasi Kelas II TPI Pematang Siantar;</p>`,
                'bab3_keuangan': `<p><strong>2. Urusan Keuangan</strong></p><p class="ql-indent-1">Dalam rangka memenuhi sarana dan prasarana serta tugas pokok dan fungsi masing-masing seksi pada Kantor Imigrasi Kelas II TPI Pematang Siantar, maka diperlukan penambahan anggaran dan belanja modal.</p>`,
                'bab3_umum': `<p><strong>3. Urusan Umum</strong></p><p class="ql-indent-1">a. <strong>Proses Penghapusan BMN terhambat dikarenakan Fisik BMN tidak sesuai dengan yang ada diaplikasi.</strong></p><p class="ql-indent-1">b. <strong>Ada satu Rumah Dinas masih belum direnovasi terletak dijalan Dahlia Pematang Siantar;</strong></p><p class="ql-indent-1">c. <strong>Kantor lama yang saat ini digunakan sebagai gudang untuk penyimpanan Barang Milik Negara dan BMN.</strong></p>`,
                'bab3_lalintalkim': `<p><strong>4. Seksi Lalu Lintas dan Izin Tinggal Keimigrasian</strong></p><p class="ql-indent-1">Bandara Internasional Silangit ditetapkan menjadi Tempat Pemeriksaan Imigrasi (TPI), namun dikarenakan Surat Edaran Dirjen Imigrasi Nomor IMI-0058.GR.01.01 Tahun 2023 Tentang Kebijakan Keimigrasian Mengenai Layanan Visa Kunjungan Saat Kedatangan Elektronik (Electronic Visa On Arrival/E-VOA), dan Visa Kunjungan Saat Kedatangan ( Visa On Arrival), dan Bebas Visa Kunjungan Untuk Mendukung Pariwisata Berkelanjutan sehingga tidak bisa melayani BVK dan e-VoA.</p>`
            };

            // Initialize TOC if empty, has old format, or needs compact format update
            const existingToc = reportData['toc'] || '';
            const hasOldTableFormat = existingToc.includes('<table') || existingToc.includes('<tbody');
            const hasOldMarginFormat = existingToc.includes('margin-left:');
            const hasOldFormat = existingToc.includes('<br>'); // Old format has <br> between sections
            const needsTocUpdate = !existingToc || existingToc.trim() === '' || hasOldTableFormat || hasOldMarginFormat || hasOldFormat || !existingToc.includes('ql-indent');
            if (needsTocUpdate) {
                await updateSection('toc', tocContent);
            }

            // Only initialize BAB III sections if sections are empty
            for (const [sectionId, content] of Object.entries(bab3Sections)) {
                if (!reportData[sectionId] || reportData[sectionId].trim() === '') {
                    await updateSection(sectionId, content);
                }
            }
        };

        // Run initialization after a short delay to ensure reportData is loaded
        const timer = setTimeout(() => {
            initializeSpecialSections();
        }, 1000); // Increased to 1 second

        return () => clearTimeout(timer);
    }, [reportData, updateSection]); // Added proper dependencies

    // Set initial active section based on filtered TOC
    useEffect(() => {
        if (sectionFilter && filteredToc.length > 0) {
            // Find first file in filtered TOC to set as active
            const findFirstFile = (nodes) => {
                for (const node of nodes) {
                    if (node.type === 'file') return node.id;
                    if (node.children) {
                        const found = findFirstFile(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const firstId = findFirstFile(filteredToc);
            if (firstId) {
                setActiveSection(firstId);
                // Also expand the parent folders
                const expandParents = (nodes, targetId, path = []) => {
                    for (const node of nodes) {
                        if (node.id === targetId) return path;
                        if (node.children) {
                            const foundPath = expandParents(node.children, targetId, [...path, node.id]);
                            if (foundPath) return foundPath;
                        }
                    }
                    return null;
                };

                // Note: This expand logic is a bit complex to reverse engineer properly without a flat map, 
                // but usually just expanding top levels is enough or we rely on user interaction.
                // For now let's ensuring at least top levels are expanded if they are in filtered view.
                const topLevelIds = filteredToc.map(n => n.id);
                setExpandedNodes(prev => [...new Set([...prev, ...topLevelIds])]);
            }
        }
    }, [filteredToc, sectionFilter]);

    // Undo/History logic
    const addToHistory = (sectionId, content) => {
        setHistory(prev => ({
            ...prev,
            [sectionId]: [...(prev[sectionId] || []), content].slice(-20)
        }));
    };

    // Image Upload Handler
    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            // Show loading state
            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            const range = quill.getSelection(true);
            quill.insertText(range.index, 'Mengupload gambar...');
            quill.setSelection(range.index + 'Mengupload gambar...'.length);

            try {
                // Upload to Supabase Storage
                const fileName = `${Date.now()}_${file.name}`;
                const filePath = `reports/${activeSection}/${fileName}`;

                const { data, error } = await supabase.storage
                    .from('report-images')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    throw error;
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('report-images')
                    .getPublicUrl(filePath);

                // Remove loading text and insert image
                quill.deleteText(range.index, 'Mengupload gambar...'.length);
                quill.insertEmbed(range.index, 'image', publicUrl);
                quill.setSelection(range.index + 1);

                showNotification('Gambar berhasil diupload', 'success');
            } catch (error) {
                console.error('Error uploading image:', error);

                // Remove loading text
                quill.deleteText(range.index, 'Mengupload gambar...'.length);

                showNotification('Gagal upload gambar: ' + error.message, 'error');
            }
        };
    };

    const handleUndo = () => {
        const sectionStack = history[activeSection] || [];
        if (sectionStack.length <= 1) {
            showNotification('Tidak ada perubahan untuk dibatalkan', 'warning');
            return;
        }
        const previousContent = sectionStack[sectionStack.length - 2];
        setHistory(prev => ({ ...prev, [activeSection]: sectionStack.slice(0, -1) }));
        updateSection(activeSection, previousContent);
        showNotification('Undo berhasil', 'info');
    };

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        const currentContent = reportData[activeSection] || '';
        if (newContent !== currentContent) {
            if (currentContent) addToHistory(activeSection, currentContent);
            updateSection(activeSection, newContent);
        }
    };

    const handleManualSave = async () => {
        setIsSaving(true);
        const res = await updateSection(activeSection, reportData[activeSection]);
        setIsSaving(false);
        if (res.error) showNotification('Gagal menyimpan', 'error');
        else showNotification('Tersimpan', 'success');
    };

    // File Content Extraction Handler
    const handleFileUploadWithExtract = async (file) => {
        try {
            const extension = file.name.split('.').pop().toLowerCase();
            let extractedContent = null;

            // Show loading notification
            showNotification('⏳ Mengekstrak konten dari file...', 'info');

            if (extension === 'txt') {
                // Extract plain text files
                const text = await file.text();
                // Convert line breaks to paragraphs
                const paragraphs = text.split('\n').filter(line => line.trim());
                extractedContent = paragraphs.map(p => `<p>${p}</p>`).join('');

                if (extractedContent) {
                    updateSection(activeSection, extractedContent);
                    showNotification('✅ Konten berhasil diekstrak dari file .txt', 'success');
                }
            } else if (extension === 'docx') {
                // Extract Word files using mammoth.js from CDN
                try {
                    // Load mammoth.js dynamically from CDN
                    if (!window.mammoth) {
                        showNotification('📥 Loading library...', 'info');
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
                        await new Promise((resolve, reject) => {
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });
                    }

                    // Read file as ArrayBuffer
                    const arrayBuffer = await file.arrayBuffer();

                    // Extract content using mammoth
                    const result = await window.mammoth.convertToHtml({ arrayBuffer });

                    if (result.value && result.value.trim()) {
                        extractedContent = result.value;
                        updateSection(activeSection, extractedContent);
                        showNotification('✅ Konten berhasil diekstrak dari file Word!', 'success');

                        // Log any warnings
                        if (result.messages && result.messages.length > 0) {
                            console.log('Mammoth warnings:', result.messages);
                        }
                    } else {
                        throw new Error('Tidak ada konten ditemukan dalam file Word');
                    }
                } catch (wordError) {
                    console.error('Word extraction error:', wordError);
                    showNotification('⚠️ Gagal ekstrak Word. Silakan copy-paste konten ke editor', 'warning');
                }
            } else if (extension === 'pdf') {
                // Extract PDF files using pdf.js from CDN
                try {
                    // Load pdf.js dynamically from CDN
                    if (!window.pdfjsLib) {
                        showNotification('📥 Loading PDF library...', 'info');
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
                        await new Promise((resolve, reject) => {
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });

                        // Set worker source
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
                    }

                    // Read file as ArrayBuffer
                    const arrayBuffer = await file.arrayBuffer();

                    // Load PDF document
                    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                    let fullText = '';
                    // Extract text from all pages
                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n\n';
                    }

                    if (fullText.trim()) {
                        // Convert to HTML paragraphs
                        const paragraphs = fullText.split('\n').filter(line => line.trim());
                        extractedContent = paragraphs.map(p => `<p>${p}</p>`).join('');
                        updateSection(activeSection, extractedContent);
                        showNotification(`✅ Konten PDF berhasil diekstrak (${pdf.numPages} halaman)!`, 'success');
                    } else {
                        throw new Error('Tidak ada teks ditemukan dalam PDF');
                    }
                } catch (pdfError) {
                    console.error('PDF extraction error:', pdfError);
                    showNotification('⚠️ Gagal ekstrak PDF. PDF mungkin berupa gambar/scan. Silakan copy-paste manual.', 'warning');
                }
            } else if (extension === 'doc') {
                // .doc (old Word format) not supported
                showNotification('� File .doc: Silakan simpan sebagai .docx atau copy-paste konten ke editor', 'info');
            } else {
                showNotification('⚠️ Format file tidak didukung untuk ekstraksi otomatis', 'warning');
            }

            // Always save file as attachment for reference/backup
            await addAttachment(activeSection, file);

        } catch (error) {
            console.error('File extraction error:', error);
            showNotification('❌ Gagal mengekstrak konten. File disimpan sebagai lampiran.', 'error');
            // Still try to save as attachment
            try {
                await addAttachment(activeSection, file);
            } catch (attachError) {
                console.error('Attachment error:', attachError);
                showNotification('Gagal menyimpan file: ' + attachError.message, 'error');
            }
        }
    };



    // Quill Configuration - Enhanced with MS Word-like features
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                // Row 1: Font and Size
                [{ 'font': ['arial', 'times-new-roman', 'courier', 'georgia', 'verdana'] }],
                [{ 'size': ['8px', '10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px', '72px'] }],
                // Row 2: Headers
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                // Row 3: Basic formatting
                ['bold', 'italic', 'underline', 'strike'],
                // Row 4: Superscript & Subscript (like MS Word)
                [{ 'script': 'sub' }, { 'script': 'super' }],
                // Row 5: Colors
                [{ 'color': [] }, { 'background': [] }],
                // Row 6: Alignment (left, center, right, justify)
                [{ 'align': [] }],
                // Row 7: Lists and indentation
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                // Row 8: Direction (for RTL text support)
                [{ 'direction': 'rtl' }],
                // Row 9: Block elements
                ['blockquote', 'code-block'],
                // Row 10: Media and links
                ['link', 'image', 'video'],
                // Row 11: Clear formatting
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
        clipboard: {
            matchVisual: false
        }
    }), []);

    const formats = [
        'font', 'size', 'header',
        'bold', 'italic', 'underline', 'strike',
        'script',
        'color', 'background',
        'align', 'direction',
        'list', 'indent',
        'blockquote', 'code-block',
        'link', 'image', 'video'
    ];

    const handleClear = async (id) => {
        if (window.confirm('Kosongkan konten bagian ini?')) {
            await clearSection(id);
            showNotification('Konten dihapus', 'info');
        }
    };

    const handleExportWord = async () => {
        showNotification('Mempersiapkan ekspor Word...', 'info');

        try {
            // Extract chapters from filteredToc with heading levels
            const skipSections = ['cover_letter', 'cover_page', 'foreword', 'toc'];
            const chapters = [];
            let tocItems = [];

            // Build TOC items with proper heading levels
            // Level 0 = BAB, Level 1 = Sub BAB, Level 2 = Sub-Sub BAB
            const buildTocItems = (nodes, depth = 0) => {
                if (!nodes) return;
                nodes.forEach(node => {
                    if (skipSections.includes(node.id)) return;

                    if (node.type === 'folder') {
                        const isBab = node.label.startsWith('BAB ');
                        const level = isBab ? 0 : Math.min(depth, 2);

                        tocItems.push({
                            title: node.label,
                            level: level,
                        });

                        if (node.children) {
                            buildTocItems(node.children, isBab ? 1 : depth + 1);
                        }
                    } else {
                        // Content items at sub-sub level
                        tocItems.push({
                            title: node.label,
                            level: Math.min(depth + 1, 2),
                        });
                    }
                });
            };
            buildTocItems(filteredToc, 0);

            // Build chapters with section hierarchy
            const buildChapters = (nodes) => {
                if (!nodes) return;
                nodes.forEach(node => {
                    if (skipSections.includes(node.id)) return;

                    if (node.type === 'folder' && node.label.startsWith('BAB ')) {
                        const chapter = {
                            title: node.label,
                            sections: [],
                        };

                        // Collect sections with proper levels
                        const collectSections = (children, sectionLevel = 2) => {
                            if (!children) return;
                            children.forEach(child => {
                                if (child.type === 'folder') {
                                    // Sub BAB or Sub-Sub BAB based on depth
                                    chapter.sections.push({
                                        title: child.label,
                                        level: sectionLevel,
                                        content: '',
                                    });
                                    collectSections(child.children, Math.min(sectionLevel + 1, 3));
                                } else {
                                    // Content item
                                    const htmlContent = reportData[child.id] || '';
                                    if (htmlContent && htmlContent.trim() && !htmlContent.includes('[Belum ada konten]')) {
                                        chapter.sections.push({
                                            title: child.label,
                                            level: sectionLevel,
                                            content: htmlContent,
                                        });
                                    }
                                }
                            });
                        };

                        collectSections(node.children, 2);
                        chapters.push(chapter);
                    }
                });
            };
            buildChapters(filteredToc);

            // Generate DOCX with hierarchical structure and logos
            await generateDocx({
                coverLetterData: coverLetterData,
                coverPageData: coverPageData,
                forewordData: forewordData,
                tocItems: tocItems,
                chapters: chapters,
                filename: `Laporan_Bulanan_${coverPageData?.month || 'Master'}_${new Date().toISOString().split('T')[0]}.docx`,
                logoPath: logoKementerian,      // Logo for cover letter KOP
                coverLogoPath: logosCombined,   // Logo for cover page
            });

            showNotification('Ekspor Word berhasil! File DOCX telah diunduh.', 'success');
        } catch (error) {
            console.error('Word export error:', error);
            showNotification('Gagal ekspor Word: ' + error.message, 'error');
        }
    };

    // PDF Export - Captures live Preview DOM for accurate export with images
    const handleExportPDF = async () => {
        // Switch to preview mode first to ensure content is rendered
        if (viewMode !== 'preview') {
            setViewMode('preview');
            showNotification('Beralih ke mode Preview... Mohon tunggu.', 'info');

            // Wait longer for preview to fully render including images
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        showNotification('Memproses PDF... Mohon tunggu.', 'info');

        // Get the preview container element
        const previewContainer = document.getElementById('preview-container');
        if (!previewContainer) {
            showNotification('Error: Preview container tidak ditemukan. Pastikan dalam mode Preview.', 'error');
            return;
        }

        // Find the A4 paper div inside the preview container
        const paperDiv = previewContainer.querySelector('div > div');
        if (!paperDiv) {
            showNotification('Error: Paper container tidak ditemukan', 'error');
            return;
        }

        // Clone only the paper content for cleaner export
        const clone = paperDiv.cloneNode(true);

        // Remove any buttons or interactive elements from clone
        clone.querySelectorAll('button, .no-print').forEach(el => el.remove());

        // Apply print-friendly styles for proper A4 format
        clone.style.cssText = `
            width: 210mm;
            min-height: auto;
            margin: 0;
            padding: 20mm 25mm 20mm 30mm;
            background: white;
            box-shadow: none;
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
        `;

        // Ensure all images inside are visible
        clone.querySelectorAll('img').forEach(img => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
        });

        // Create a wrapper for the clone
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 210mm;';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // Wait a bit more for any async content
        await new Promise(resolve => setTimeout(resolve, 500));

        // PDF options optimized for government report format
        // Margins: 4cm left, 3cm others (converted to mm)
        const opt = {
            margin: [30, 30, 30, 40], // mm: top, right, bottom, left (4cm left = 40mm)
            filename: `Laporan_Bulanan_${coverPageData?.month || 'Master'}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                width: 794,
                windowWidth: 794,
                backgroundColor: '#ffffff',
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true,
            },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.page-break-before, .bab-header, .chapter-header',
                after: '.page-break-after, .page-break',
                avoid: ['img', 'tr', 'td', '.sub-bab-header', '.section-title', 'h2', 'h3'],
            },
        };

        try {
            showNotification('Menghasilkan PDF multi-halaman...', 'info');
            await html2pdf().set(opt).from(clone).save();
            showNotification('PDF berhasil diexport! Silakan cek folder Downloads.', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            showNotification('Gagal export PDF: ' + error.message, 'error');
        } finally {
            document.body.removeChild(wrapper);
        }
    };

    // Recursive Render for Preview
    const renderPreviewNodes = (nodes) => {
        // Safety check: return empty array if nodes is undefined or not an array
        if (!nodes || !Array.isArray(nodes)) {
            return [];
        }

        return nodes.map(node => (
            <div key={node.id} className={node.type === 'folder' ? 'mt-4' : 'mb-4'}>
                <h4 className={`font - bold ${node.type === 'folder' ? 'text-lg text-imigrasi-navy underline' : 'text-md text-gray-800'} `}>
                    {node.label}
                </h4>
                {node.type === 'file' ? (
                    <div
                        className="preview-content text-justify leading-relaxed mt-2 text-gray-700 break-words overflow-wrap-anywhere"
                        style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            maxWidth: '100%'
                        }}
                        dangerouslySetInnerHTML={{
                            __html: reportData[node.id] || '<span class="text-gray-300 italic">[Belum ada konten]</span>'
                        }}
                    />
                ) : (
                    <div className="pl-4 border-l border-gray-100 mt-2 space-y-4">
                        {node.children && renderPreviewNodes(node.children)}
                    </div>
                )}
            </div>
        ));
    };

    // Components
    const DashboardView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
            {filteredToc.map(chapter => (
                <div key={chapter.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden group hover:shadow-xl transition-all duration-300">
                    <div className="bg-imigrasi-navy p-4 flex justify-between items-center text-white">
                        <h3 className="font-bold truncate pr-2">{chapter.label}</h3>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
                            {chapter.children?.length || 0}
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="space-y-2">
                            {chapter.children?.slice(0, 3).map(sub => (
                                <div key={sub.id} className="flex items-center justify-between text-xs text-gray-600 border-b border-gray-50 pb-1">
                                    <span className="truncate flex-1">{sub.label}</span>
                                    {reportData[sub.id] ? (
                                        <span className="text-green-500 font-bold ml-2 whitespace-nowrap">✓ Terisi</span>
                                    ) : (
                                        <span className="text-gray-300 italic ml-2 whitespace-nowrap">Kosong</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setActiveSection(chapter.children?.[0]?.id || chapter.id);
                                    setViewMode('edit');
                                }}
                                className="flex-1 py-2 bg-imigrasi-gold text-white rounded-lg text-xs font-bold hover:bg-yellow-600"
                            >
                                Edit Laporan
                            </button>
                            <button
                                onClick={() => handleClear(chapter.id)}
                                className="p-2 border border-gray-200 text-gray-400 hover:text-red-500 rounded-lg"
                                title="Kosongkan BAB"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const TreeItem = ({ node, level = 0 }) => {
        const isExpanded = expandedNodes.includes(node.id);
        const isActive = activeSection === node.id;
        const paddingLeft = `${level * 1.5 + 1}rem`;

        return (
            <div>
                <div
                    className={`flex items-center gap-2 py-2 pr-4 cursor-pointer hover:bg-white/5 transition-colors border-l-4 ${isActive ? 'border-imigrasi-gold bg-white/10 text-imigrasi-gold font-bold' : 'border-transparent text-gray-400'}`}
                    style={{ paddingLeft }}
                    onClick={() => {
                        if (node.type === 'folder') {
                            setExpandedNodes(prev => prev.includes(node.id) ? prev.filter(n => n !== node.id) : [...prev, node.id]);
                        } else {
                            setActiveSection(node.id);
                            setViewMode('edit');
                        }
                    }}
                >
                    {node.type === 'folder' && (
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    )}
                    {node.type === 'file' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    <span className="truncate text-sm">{node.label}</span>
                </div>
                {node.type === 'folder' && isExpanded && node.children?.map(child => (
                    <TreeItem key={child.id} node={child} level={level + 1} />
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 animate-fade-in">
            {/* Main Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-sm z-10 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-imigrasi-navy font-serif">Modul Laporan Bulanan</h1>
                    {!sectionFilter && (
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {['dashboard', 'edit', 'preview'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-all ${viewMode === mode ? 'bg-white text-imigrasi-navy shadow-sm' : 'text-gray-500'}`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportWord}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 text-sm font-bold transition-colors"
                        title="Export ke Microsoft Word"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Ekspor Word
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md flex items-center gap-2 text-sm font-bold transition-colors"
                        title="Export ke PDF (akan membuka dialog print)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        Ekspor PDF
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* TOC Sidebar */}
                {viewMode !== 'dashboard' && (
                    <div className="w-80 bg-[#1e293b] flex-shrink-0 overflow-y-auto border-r border-gray-700 custom-scrollbar">
                        <div className="p-4 space-y-1">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-4">Daftar Isi</div>
                            {filteredToc.map(node => <TreeItem key={node.id} node={node} />)}
                        </div>
                    </div>
                )}

                {/* Main Action Area */}
                <div className="flex-1 overflow-y-auto">
                    {viewMode === 'dashboard' ? (
                        <DashboardView />
                    ) : viewMode === 'edit' ? (
                        activeSection === 'cover_letter' ? (
                            <CoverLetter />
                        ) : activeSection === 'cover_page' ? (
                            <CoverPage />
                        ) : activeSection === 'foreword' ? (
                            <Foreword />
                        ) : activeSection === 'toc' ? (
                            <TableOfContents />
                        ) : (
                            <div className="p-8 max-w-5xl mx-auto">
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[700px] flex flex-col">
                                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                        <h2 className="font-bold text-imigrasi-navy">{activeSection.toUpperCase().replace(/_/g, ' ')}</h2>
                                        <div className="flex gap-2">
                                            <button onClick={handleUndo} className="p-2 hover:bg-gray-200 rounded" title="Undo"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                                            <button onClick={handleManualSave} className="px-4 py-1 bg-imigrasi-navy text-white rounded text-sm font-bold flex items-center gap-2">
                                                {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div>}
                                                Simpan
                                            </button>
                                        </div>
                                    </div>
                                    <div className="quill-editor-container flex-1">
                                        <ReactQuill
                                            ref={quillRef}
                                            theme="snow"
                                            value={reportData[activeSection] || ''}
                                            onChange={(content) => {
                                                const currentContent = reportData[activeSection] || '';
                                                // Only update if content actually changed
                                                if (content !== currentContent) {
                                                    updateSection(activeSection, content);
                                                }
                                            }}
                                            modules={modules}
                                            formats={formats}
                                            placeholder="Ketik konten laporan di sini..."
                                        />
                                    </div>

                                    {/* File Attachments Section */}
                                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                Lampiran File ({(reportAttachments[activeSection] || []).length})
                                            </h3>
                                            <label className="px-4 py-2 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 cursor-pointer text-xs font-bold flex items-center gap-2 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                Upload File
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            // Max 10MB
                                                            if (file.size > 10 * 1024 * 1024) {
                                                                showNotification('Ukuran file maksimal 10MB', 'error');
                                                                return;
                                                            }
                                                            // Use new extraction handler
                                                            handleFileUploadWithExtract(file);
                                                            e.target.value = ''; // Reset input
                                                        }
                                                    }}
                                                    accept=".txt,.docx,.doc,.pdf"
                                                />
                                            </label>
                                        </div>

                                        {/* File List */}
                                        {reportAttachments[activeSection] && reportAttachments[activeSection].length > 0 ? (
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {reportAttachments[activeSection].map((file) => (
                                                    <div key={file.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-imigrasi-blue transition-colors group">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                                                                <svg className="w-4 h-4 text-imigrasi-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                                                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <a
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 text-imigrasi-blue hover:bg-blue-50 rounded transition-colors"
                                                                title="Pratinjau"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            </a>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('Hapus file ini?')) {
                                                                        removeAttachment(activeSection, file.id);
                                                                        showNotification('File dihapus', 'success');
                                                                    }
                                                                }}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                title="Hapus"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                                                <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                <p className="text-sm text-gray-400">Belum ada file dilampirkan</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between text-[10px] text-gray-400">
                                        <span>HTML Content Length: {(reportData[activeSection] || '').length}</span>
                                        <span>Draft Tersimpan di Supabase</span>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        // PREVIEW MODE
                        <div id="preview-container" className="p-8 bg-gray-200 min-h-full print:bg-white print:p-0">
                            <div className="max-w-[210mm] mx-auto bg-white shadow-2xl p-[30mm] min-h-[297mm] font-serif print:p-0 print:shadow-none">
                                {/* Cover Letter Preview */}
                                <CoverLetterPreview />

                                {/* Cover Page Preview */}
                                <CoverPagePreview />

                                {/* Foreword Preview */}
                                <ForewordPreview />

                                {/* Table of Contents Preview */}
                                <TableOfContentsPreview />

                                {/* Removed duplicate header - already shown in cover page */}

                                {filteredToc && filteredToc.filter(chapter => chapter.id !== 'cover_letter' && chapter.id !== 'cover_page' && chapter.id !== 'foreword' && chapter.id !== 'toc').map(chapter => (
                                    <div key={chapter.id} className="mb-12">
                                        <h3 className="text-2xl font-bold uppercase text-center mb-8 bg-gray-100 py-2 border-y border-black">{chapter.label}</h3>
                                        {/* Recursive Preview Logic */}
                                        <div className="space-y-6">
                                            {renderPreviewNodes(chapter.children)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonthlyReport;
