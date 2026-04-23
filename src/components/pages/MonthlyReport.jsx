import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReport, SECTION_TOC_MAPPING } from '../../contexts/ReportContext';
import { useNotification } from '../../contexts/NotificationContext';
import ReactQuill from 'react-quill-new';
import Quill from 'quill';  // Import Quill directly from the package
import 'react-quill-new/dist/quill.snow.css';
import '../../styles/quill-custom.css';
import CoverLetter from './CoverLetter';
import CoverPage from './CoverPage';
import Foreword from './Foreword';
import KopSurat from '../common/KopSurat';
import TableOfContents from './TableOfContents';
import { supabase } from '../../lib/supabaseClient';
import html2pdf from 'html2pdf.js';

// Import logos for proper bundling
import logoKementerian from '../../assets/logo-kementerian-imigrasi.png';
import logosCombined from '../../assets/logos-combined.png';

// Import DOCX exporter for template-based Word export
import { generateDocx } from '../../utils/docxExporter';

// Template Lalintalkim (Paspor, Izin Tinggal, Perlintasan — embedded in TOC)
import TemplateLalintalkim from '../pages/laporanBulanan/TemplateLalintalkim';
// Template Inteldakim (Pro Justitia, TAK, TIMPORA — embedded in TOC)
import TemplateInteldakimEmbedded from '../pages/laporanBulanan/TemplateInteldakim';
// Template Infokim & Pengaduan (Seksi 5 dan 6 — embedded in TOC)
import TemplateInfokimEmbedded from '../pages/laporanBulanan/TemplateInfokimPengaduan';
// Template Tata Usaha (Keuangan & PNBP — embedded in TOC)
import TemplateKeuanganEmbedded from '../pages/laporanBulanan/TemplateKeuangan';
// Template Kepegawaian Bezetting (TU)
import TemplateKepegawaianEmbedded from '../pages/laporanBulanan/TemplateKepegawaian';
// Template Urusan Umum (Kendaraan & Sarana - TU)
import TemplateUmumEmbedded from '../pages/laporanBulanan/TemplateUmum';
// Template BAB IV Penutup
import TemplatePenutupEmbedded from '../pages/laporanBulanan/TemplatePenutup';

// Coded Org Chart
import Bab5OrgChart from './Bab5OrgChart';

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
                            { id: 'bab2_substantif_dokumen_paspor', label: 'a. Paspor – Kanim Pematangsiantar', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor_b', label: 'b. Paspor – ULP Tebing Tinggi', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor_c', label: 'c. Paspor – UKK Dolok Sanggul', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor_d', label: 'd. Paspor – UKK Tarutung (48 Hal)', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor_e', label: 'e. Paspor – ULP Tebing Tinggi (24 Hal)', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor_f', label: 'f. Paspor – UKK Tarutung (24 Hal)', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor_g', label: 'g. Pas Lintas Batas (PLB)', type: 'file' },
                            { id: 'bab2_substantif_dokumen_paspor_h', label: 'h. Surat Perjalanan Laksana Paspor (SPLP)', type: 'file' },
                        ]
                    },
                    { id: 'bab2_substantif_rekapitulasi', label: '2. REKAPITULASI DATA PERLINTASAN', type: 'file' },
                    {
                        id: 'bab2_substantif_izintinggal', label: '3. PENERBITAN IZIN TINGGAL', type: 'folder', children: [
                            { id: 'bab2_substantif_dokumen_izintinggal_itk', label: 'a. Izin Kunjungan (ITK)', type: 'file' },
                            { id: 'bab2_substantif_dokumen_izintinggal_itas', label: 'b. Izin Tinggal Terbatas (ITAS)', type: 'file' },
                            { id: 'bab2_substantif_dokumen_izintinggal_itap', label: 'c. Izin Tinggal Tetap (ITAP)', type: 'file' },
                            { id: 'bab2_substantif_dokumen_izintinggal_lain', label: 'd. Lain-lain', type: 'file' },
                        ]
                    },
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
            { id: 'bab3_inteldakim', label: '5. Seksi Intelijen dan Penindakan Keimigrasian', type: 'file' },
            { id: 'bab3_tikim', label: '6. Seksi Teknologi Informasi dan Komunikasi Keimigrasian', type: 'file' },
        ]
    },
    {
        id: 'bab4', label: 'BAB IV PENUTUP', type: 'folder', children: [
            { id: 'bab4_penutup', label: 'Laporan Penutup', type: 'file' }
        ]
    },
    {
        id: 'bab5', label: 'BAB V LAMPIRAN STRUKTUR ORGANISASI KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR', type: 'file'
    }
];

// Cover Letter Preview Component (for preview mode)
const CoverLetterPreview = () => {
    const { coverLetterData, form } = useReport();

    // Default template identical to CoverLetter.jsx
    const defaultData = {
        letterhead1: 'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA',
        letterhead2: 'DIREKTORAT JENDERAL IMIGRASI',
        letterhead3: 'KANTOR WILAYAH SUMATERA UTARA',
        letterhead4: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR',
        letterhead5: 'Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun',
        letterhead6: 'Laman: pematangsiantar.imigrasi.go.id, Pos-el: kanim_pematangsiantar@imigrasi.go.id',
        nomor: 'WIM.2.IMI.4-PR.04.01-3291',
        tanggal: '19 Agustus 2025',
        sifat: 'Penting',
        lampiran: '1 (satu) berkas',
        hal: 'Laporan Kegiatan Bulan Juli 2025\npada Kantor Imigrasi Kelas II TPI Pematang Siantar',
        tujuan: 'Yth. Kepala Kantor Wilayah Sumatera Utara\nDirektorat Jenderal Imigrasi\ndi tempat',
        isi: 'Menindaklanjuti surat Sekretaris Direktorat Jenderal Imigrasi No.IMI.1-TI.03-3178 tanggal 27 Agustus 2018 tentang Penggunaan Aplikasi Laporan Bulanan Online, bersama ini dengan hormat kami kirimkan Laporan Kegiatan Bulan Maret 2026 pada Kantor Imigrasi Kelas II TPI Pematang Siantar.\n\nDemikian kami sampaikan, atas perkenan dan petunjuk lebih lanjut kami ucapkan terima kasih.',
        penandatangan: 'Benyamin Kali Patembal Harahap',
        tembusan: '1  Sekretaris Direktorat Jenderal Imigrasi\n   Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia.'
    };

    // Use current data or fallback to defaults
    const data = { ...defaultData, ...(coverLetterData || {}) };

    return (
        <div className="mb-16 pb-16 border-b-4 border-black page-break-after" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Kop Surat — komponen bersama (identik dengan edit view) */}
            <KopSurat data={data} editable={false} />

            {/* Spacer setelah kop */}
            <div style={{ height: '16px' }} />

            {/* Content */}
            <div className="grid grid-cols-[100px,1fr,auto] gap-x-2 gap-y-1 mb-4 text-sm" style={{ fontFamily: 'Times New Roman, serif' }}>
                <div>Nomor</div>
                <div>: {data.nomor}</div>
                <div className="text-right whitespace-nowrap pl-8">{data.tanggal}</div>
                <div>Sifat</div>
                <div className="col-span-2">: {data.sifat}</div>
                <div>Lampiran</div>
                <div className="col-span-2">: {data.lampiran}</div>
                <div>Hal</div>
                <div className="whitespace-pre-line col-span-2">: {data.hal}</div>
            </div>

            <div className="text-sm whitespace-pre-line mb-6" style={{ fontFamily: 'Times New Roman, serif' }}>{data.tujuan}</div>
            <div className="text-sm text-justify leading-relaxed whitespace-pre-line mb-12" style={{ fontFamily: 'Times New Roman, serif' }}>{data.isi}</div>


            {/* Tanda Tangan */}
            <div className="flex justify-between text-sm mt-8" style={{ fontFamily: 'Times New Roman, serif' }}>
                {/* Empty left spacer */}
                <div className="flex-1" />

                {/* Signer section right */}
                <div className="text-center w-[350px]">
                    <div className="mb-2">Kepala Kantor,</div>
                    
                    {/* BSrE Badge Mimic */}
                    <div className="flex items-center justify-center gap-3 my-2 px-3 py-2 w-max mx-auto translate-x-[-12px]">
                        <img src="/logo_kemenimipas.png" alt="Kemenimipas" className="w-[38px] h-[38px] object-contain" />
                        <div className="text-left leading-tight">
                            <div className="font-bold text-[15px] tracking-wide text-gray-900 mb-[2px]" style={{ fontFamily: 'Arial, sans-serif' }}>KEMENIMIPAS</div>
                            <div className="text-[10px] text-gray-400 font-medium" style={{ fontFamily: 'Arial, sans-serif' }}>Ditandatangani secara elektronik oleh:</div>
                        </div>
                    </div>

                    <div className="font-bold pt-2 underline">
                        {data.penandatangan}
                    </div>
                </div>
            </div>

            <div className="mt-12 text-xs" style={{ fontFamily: 'Times New Roman, serif' }}>
                <div className="mb-1">Tembusan:</div>
                <div className="whitespace-pre-line">
                    {data.tembusan}
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
            <div className="mb-16 pb-16 border-b-4 border-black page-break-after flex flex-col items-center justify-between min-h-[900px]" style={{ fontFamily: 'Arial, sans-serif' }}>
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
        <div className="mb-16 pb-16 border-b-4 border-black page-break-after flex flex-col items-center justify-between min-h-[900px]" style={{ fontFamily: 'Arial, sans-serif' }}>
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
        <div className="mb-16 pb-16 border-b-4 border-black page-break-after" style={{ fontFamily: 'Arial, sans-serif' }}>
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
        <div className="mb-16 pb-16 border-b-4 border-black page-break-after" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div
                className="toc-preview"
                dangerouslySetInnerHTML={{ __html: tocContent }}
                style={{ fontSize: '12pt', lineHeight: '1.15' }}
            />
        </div>
    );
};

// Bab 5 Preview Component (for preview and edit modes)
const Bab5OrgChartView = ({ editMode = false }) => {
    return (
        <div className="w-full flex justify-center bg-white overflow-x-auto" style={{ minHeight: editMode ? 'auto' : '210mm' }}>
            <Bab5OrgChart editMode={editMode} />
        </div>
    );
};

const MonthlyReport = ({ sectionFilter = null }) => {
    const { user } = useAuth();
    const { reportData, updateSection, clearSection, reportAttachments, addAttachment, removeAttachment, getAttachments, coverLetterData, coverPageData, forewordData } = useReport();
    const { showNotification } = useNotification();
    const quillRef = useRef(null);

    // State
    const [activeSection, setActiveSection] = useState('cover_letter');
    const [expandedNodes, setExpandedNodes] = useState(['bab1', 'bab1_pengantar', 'bab2', 'bab2_substantif']);
    const [viewMode, setViewMode] = useState(sectionFilter ? 'edit' : 'dashboard'); // Default to dashboard if no section filter
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [history, setHistory] = useState({});
    const contentAreaRef = useRef(null); // ref to the scrollable main content container
    // 'document' = HTML viewer (tables work), 'text' = Quill editor
    const [editorTab, setEditorTab] = useState('document');
    const [paperSettings, setPaperSettings] = useState({});
    const [showPaperSettings, setShowPaperSettings] = useState(false);

    const PAPER_SIZES = {
        A4:     { w: 210, h: 297 },
        A3:     { w: 297, h: 420 },
        Letter: { w: 216, h: 279 },
        Legal:  { w: 216, h: 356 },
    };

    const getPaperSettings = (sectionId) => ({
        orientation: 'portrait',
        size: 'A4',
        marginTop: 4,
        marginRight: 3,
        marginBottom: 3,
        marginLeft: 4,
        ...(paperSettings[sectionId] || {}),
    });

    const updatePaperSettings = (sectionId, updates) => {
        setPaperSettings(prev => ({ ...prev, [sectionId]: { ...getPaperSettings(sectionId), ...updates } }));
    };



    // Nodes to explicitly exclude per sectionFilter (deny-list)
    const SECTION_EXCLUDE_MAP = {};

    // TOC Filtering Logic
    const filteredToc = useMemo(() => {
        if (!sectionFilter) return toc;

        const allowedIds = SECTION_TOC_MAPPING[sectionFilter] || [];
        const excludedIds = SECTION_EXCLUDE_MAP[sectionFilter] || [];

        const filterNodes = (nodes) => {
            return nodes.reduce((acc, node) => {
                // Deny-list: explicitly excluded nodes are always hidden
                if (excludedIds.includes(node.id)) return acc;

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
                        acc.push({ ...node, children: filteredChildren });
                    }
                }

                return acc;
            }, []);
        };

        return filterNodes(toc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            // Extract reliable cursor position
            const range = quill.getSelection(true) || { index: quill.getLength() };
            // Use global notification instead of polluting editor text blocks which can shift during typing
            showNotification('⏳ Mengupload gambar ke peladen...', 'info');

            try {
                // Sanitize file name completely to avoid URL decoding or RLS issues in Supabase
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const fileName = `${Date.now()}_${safeName}`;
                // Upload strictly to a flat folder to bypass complex dynamic section RLS masks if any
                const filePath = `rich_text/${fileName}`;

                const { data, error } = await supabase.storage
                    .from('report-images')
                    .upload(filePath, file, { cacheControl: '3600', upsert: false });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('report-images')
                    .getPublicUrl(filePath);

                const currentRange = quill.getSelection() || range;
                quill.insertEmbed(currentRange.index, 'image', publicUrl);
                quill.setSelection(currentRange.index + 1);

                showNotification('✅ Gambar berhasil ditambahkan!', 'success');
            } catch (error) {
                console.error('Error uploading image:', error);
                
                // Ultimate Fallback: if server upload completely fails, embed directly as Base64. 
                // It ensures the user never fails to submit their picture inside the report itself.
                const reader = new FileReader();
                reader.onload = (e) => {
                    const currentRange = quill.getSelection() || range;
                    quill.insertEmbed(currentRange.index, 'image', e.target.result);
                    quill.setSelection(currentRange.index + 1);
                    showNotification('⚠️ Gambar gagal diupload, beralih ke mode offline (Base64).', 'warning');
                };
                reader.readAsDataURL(file);
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

            // Prepare template data for ALL seksi (case-insensitive month match)
            let allTemplateData = {};
            let finalBulan = new Date().getMonth() + 1;
            let tahunInt = new Date().getFullYear();
            try {
                const rawMonth = coverPageData?.month || '';
                const rawYear  = coverPageData?.year  || new Date().getFullYear();
                tahunInt = parseInt(rawYear) || new Date().getFullYear();

                // Case-insensitive lookup: 'APRIL' → 4, 'April' → 4
                const monthUpper = String(rawMonth).toUpperCase();
                const mIndex = BULAN_NAMES.findIndex((n, i) => i > 0 && n.toUpperCase() === monthUpper);
                finalBulan = mIndex > 0 ? mIndex : (parseInt(rawMonth) || new Date().getMonth() + 1);

                const { data: tmplRows } = await supabase
                    .from('laporan_template')
                    .select('seksi_id, template_data')
                    .eq('bulan', finalBulan)
                    .eq('tahun', tahunInt);

                if (tmplRows && tmplRows.length > 0) {
                    tmplRows.forEach(row => {
                        if (row.template_data) allTemplateData[row.seksi_id] = row.template_data;
                    });
                }
            } catch (err) {
                console.warn('Gagal memuat data laporan_template:', err);
            }
            // seksi_id 1 = Inteldakim, seksi_id 2 = Lalintalkim, seksi_id 3 = Tikim, seksi_id 4 = TU
            const templateData = allTemplateData[2] || null;
            const inteldakimTemplateData = allTemplateData[1] || null;
            const tikimTemplateData = allTemplateData[3] || null;
            const tuTemplateData = allTemplateData[4] || null;


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
                                    if (child.id === 'bab2_substantif_dokumen_paspor' || 
                                        child.id === 'bab2_substantif_dokumen_paspor_b' ||
                                        child.id === 'bab2_substantif_dokumen_paspor_c' ||
                                        child.id === 'bab2_substantif_dokumen_paspor_d' ||
                                        child.id === 'bab2_substantif_dokumen_paspor_e' ||
                                        child.id === 'bab2_substantif_dokumen_paspor_f' ||
                                        child.id === 'bab2_substantif_dokumen_paspor_g' ||
                                        child.id === 'bab2_substantif_dokumen_paspor_h' ||
                                        child.id === 'bab2_substantif_dokumen_izintinggal_itk' ||
                                        child.id === 'bab2_substantif_dokumen_izintinggal_itas' ||
                                        child.id === 'bab2_substantif_dokumen_izintinggal_itap' ||
                                        child.id === 'bab2_substantif_dokumen_izintinggal_lain' ||
                                        child.id === 'bab2_substantif_rekapitulasi') {
                                        // Specific injection for all Lalintalkim templates
                                        chapter.sections.push({
                                            title: child.label,
                                            level: sectionLevel,
                                            isLalintalkimTemplate: true,
                                            lalintalkimPart: child.id,
                                            templateData: templateData
                                        });
                                    } else if (child.id === 'bab2_substantif_intel_yustisia') {
                                        // Pro Justitia template
                                        chapter.sections.push({
                                            title: child.label,
                                            level: sectionLevel,
                                            isInteldakimTemplate: true,
                                            inteldakimPart: 'projus',
                                            templateData: inteldakimTemplateData
                                        });
                                    } else if (child.id === 'bab2_substantif_intel_admin') {
                                        // Tindakan Administratif template
                                        chapter.sections.push({
                                            title: child.label,
                                            level: sectionLevel,
                                            isInteldakimTemplate: true,
                                            inteldakimPart: 'tak',
                                            templateData: inteldakimTemplateData
                                        });
                                    } else if (child.id === 'bab2_substantif_intel_timpora') {
                                        // TIMPORA template
                                        chapter.sections.push({
                                            title: child.label,
                                            level: sectionLevel,
                                            isInteldakimTemplate: true,
                                            inteldakimPart: 'timpora',
                                            templateData: inteldakimTemplateData
                                        });
                                    } else if (child.id === 'bab2_substantif_infokim') {
                                        // Infokim template (seksi tikim)
                                        chapter.sections.push({
                                            title: child.label,
                                            level: sectionLevel,
                                            isInfokimTemplate: true,
                                            infokimPart: 'infokim',
                                            templateData: tikimTemplateData
                                        });
                                    } else if (child.id === 'bab2_substantif_pengaduan') {
                                        // Pengaduan Masyarakat (stored under tikim)
                                        chapter.sections.push({
                                            title: child.label,
                                            level: sectionLevel,
                                            isPengaduanTemplate: true,
                                            templateData: tikimTemplateData
                                        });
                                    } else if (child.id === 'bab2_fasilitatif_keuangan_rm') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKeuanganTemplate: true, keuanganPart: 'rm', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_keuangan_pnp') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKeuanganTemplate: true, keuanganPart: 'pnp', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_keuangan_gabungan') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKeuanganTemplate: true, keuanganPart: 'gabungan', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_keuangan_pnbp') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKeuanganTemplate: true, keuanganPart: 'bendahara', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_kepegawaian_bezetting') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKepegawaianTemplate: true, kepegawaianPart: 'bezetting', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_kepegawaian_rekap') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKepegawaianTemplate: true, kepegawaianPart: 'rekap', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_kepegawaian_cuti') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKepegawaianTemplate: true, kepegawaianPart: 'cuti', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_kepegawaian_pembinaan') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKepegawaianTemplate: true, kepegawaianPart: 'pembinaan', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_kepegawaian_persuratan') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isKepegawaianTemplate: true, kepegawaianPart: 'persuratan', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_umum_kendaraan') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isUmumTemplate: true, umumPart: 'kendaraan', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_umum_sarana') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isUmumTemplate: true, umumPart: 'sarana', templateData: tuTemplateData });
                                    } else if (child.id === 'bab2_fasilitatif_umum_gedung') {
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isUmumTemplate: true, umumPart: 'gedung', templateData: tuTemplateData });
                                    } else if (child.id === 'bab4_penutup') {
                                        // Inject Penutup Data, which is stored in TU row
                                        chapter.sections.push({ title: child.label, level: sectionLevel, isPenutupTemplate: true, templateData: tuTemplateData });
                                    } else if (htmlContent && htmlContent.trim() && !htmlContent.includes('[Belum ada konten]')) {
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

            // ── DIRECT INJECT: BAB IV Penutup ────────────────────────────────────────
            // Do NOT rely on filteredToc for BAB IV — filteredToc may exclude bab4_penutup
            // when a role-based sectionFilter is active. Instead, always inject BAB IV
            // directly from the fetched database data (tuTemplateData).
            const existingBab4Idx = chapters.findIndex(c => c.title && c.title.toUpperCase().startsWith('BAB IV'));
            const penutupSectionPayload = {
                title: 'Laporan Penutup',
                level: 2,
                isPenutupTemplate: true,
                templateData: tuTemplateData,
            };
            if (existingBab4Idx >= 0) {
                // BAB IV exists in chapters (from filteredToc) — ensure penutup section is there
                const hasPernutup = chapters[existingBab4Idx].sections.some(s => s.isPenutupTemplate);
                if (!hasPernutup) {
                    chapters[existingBab4Idx].sections.unshift(penutupSectionPayload);
                }
            } else {
                // BAB IV not present at all — inject it as a dedicated chapter
                // Insert before BAB V (if exists), else just push
                const bab5Idx = chapters.findIndex(c => c.title && c.title.toUpperCase().startsWith('BAB V'));
                const babIVChapter = {
                    title: 'BAB IV PENUTUP',
                    sections: [penutupSectionPayload],
                };
                if (bab5Idx >= 0) {
                    chapters.splice(bab5Idx, 0, babIVChapter);
                } else {
                    chapters.push(babIVChapter);
                }
            }

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
                // Direct BAB IV Penutup injection params
                penutupData: tuTemplateData?.penutup || null,
                bulan: finalBulan,
                tahun: tahunInt,
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

        // Retrieve the A4 paper div (the container itself)
        const paperDiv = previewContainer;
        if (!paperDiv) {
            showNotification('Error: Paper container tidak ditemukan', 'error');
            return;
        }

        // Clone the entire paper content for cleaner export
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
                width: 1122,
                windowWidth: 1122,
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

    const parsedCoverData = useMemo(() => {
        let rawMonth = '';
        let rawYear = new Date().getFullYear();
        
        try {
            const html = reportData['cover_page'] || '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            const ps = tempDiv.querySelectorAll('p');
            ps.forEach(p => {
                const text = p.innerText || '';
                if (text.toLowerCase().includes('bulan:')) {
                    rawMonth = text.split(':')[1]?.trim() || '';
                } else if (text.toLowerCase().includes('tahun:')) {
                    rawYear = text.split(':')[1]?.trim() || '';
                }
            });
        } catch(e) {}
        
        const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const monthUpper = String(rawMonth).toUpperCase();
        const mIndex = BULAN_NAMES.findIndex((n, i) => i > 0 && n.toUpperCase() === monthUpper);
        const finalBulan = mIndex > 0 ? mIndex : (parseInt(rawMonth) || new Date().getMonth() + 1);
        const tahunInt = parseInt(rawYear) || new Date().getFullYear();
        
        return { finalBulan, tahunInt };
    }, [reportData]);

    const renderTemplateForPreview = (nodeId) => {
        const { finalBulan, tahunInt } = parsedCoverData;

        if (nodeId === 'bab2_substantif_dokumen_paspor' || 
            nodeId === 'bab2_substantif_dokumen_paspor_b' ||
            nodeId === 'bab2_substantif_dokumen_paspor_c' ||
            nodeId === 'bab2_substantif_dokumen_paspor_d' ||
            nodeId === 'bab2_substantif_dokumen_paspor_e' ||
            nodeId === 'bab2_substantif_dokumen_paspor_f' ||
            nodeId === 'bab2_substantif_dokumen_paspor_g' ||
            nodeId === 'bab2_substantif_dokumen_paspor_h' ||
            nodeId === 'bab2_substantif_dokumen_izintinggal_itk' ||
            nodeId === 'bab2_substantif_dokumen_izintinggal_itas' ||
            nodeId === 'bab2_substantif_dokumen_izintinggal_itap' ||
            nodeId === 'bab2_substantif_dokumen_izintinggal_lain') {
            return <TemplateLalintalkim key={nodeId} embedded defaultTab="paspor" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_substantif_rekapitulasi') {
            return <TemplateLalintalkim key={nodeId} embedded defaultTab="perlintasan" propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_substantif_intel_yustisia' || nodeId === 'bab2_substantif_intel_admin' || nodeId === 'bab2_substantif_intel_timpora') {
            return <TemplateInteldakimEmbedded key={nodeId} embedded seksiAlias="inteldakim" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_substantif_infokim' || nodeId === 'bab2_substantif_pengaduan') {
            return <TemplateInfokimEmbedded key={nodeId} embedded defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_fasilitatif_keuangan_rm' || nodeId === 'bab2_fasilitatif_keuangan_pnp' || nodeId === 'bab2_fasilitatif_keuangan_gabungan') {
            return <TemplateKeuanganEmbedded key={nodeId} embedded defaultTab="realisasi" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_fasilitatif_keuangan_pnbp') {
            return <TemplateKeuanganEmbedded key={nodeId} embedded defaultTab="pnbp" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_fasilitatif_kepegawaian_bezetting') {
            return <TemplateKepegawaianEmbedded key={nodeId} embedded defaultTab="detail" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_fasilitatif_kepegawaian_rekap') {
            return <TemplateKepegawaianEmbedded key={nodeId} embedded defaultTab="summary" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_fasilitatif_kepegawaian_cuti' || nodeId === 'bab2_fasilitatif_kepegawaian_pembinaan' || nodeId === 'bab2_fasilitatif_kepegawaian_persuratan') {
            return <TemplateKepegawaianEmbedded key={nodeId} embedded defaultTab="lainnya" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_fasilitatif_umum_kendaraan') {
            return <TemplateUmumEmbedded key={nodeId} embedded defaultTab="kendaraan" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_fasilitatif_umum_sarana') {
            return <TemplateUmumEmbedded key={nodeId} embedded defaultTab="sarana" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab2_fasilitatif_umum_gedung') {
            return <TemplateUmumEmbedded key={nodeId} embedded defaultTab="gedung" defaultSubSection={nodeId} propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab4_penutup') {
            return <TemplatePenutupEmbedded key={nodeId} embedded propBulan={finalBulan} propTahun={tahunInt} forcePreview />;
        }
        if (nodeId === 'bab5') {
            return <Bab5OrgChartView key={nodeId} />;
        }
        return null;
    };

    // Recursive Render for Preview
    const renderPreviewNodes = (nodes) => {
        // Safety check: return empty array if nodes is undefined or not an array
        if (!nodes || !Array.isArray(nodes)) {
            return [];
        }

        return nodes.map(node => {
            const templateView = node.type === 'file' ? renderTemplateForPreview(node.id) : null;
            
            return (
                <div key={node.id} id={`preview-section-${node.id}`} className={node.type === 'folder' ? 'mt-4' : 'mb-4'}>
                    <h4 className={`font-bold ${node.type === 'folder' ? 'text-lg text-imigrasi-navy underline' : 'text-md text-gray-800'}`}>
                        {node.label}
                    </h4>
                    {node.type === 'file' ? (
                        templateView ? (
                            <div className="mt-2 preview-template-container border border-gray-200 rounded-md overflow-hidden bg-white">
                                {templateView}
                            </div>
                        ) : (
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
                        )
                    ) : (
                        <div className="pl-4 border-l border-gray-100 mt-2 space-y-4">
                            {node.children && renderPreviewNodes(node.children)}
                        </div>
                    )}
                </div>
            );
        });
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

        // Only render folders up to level 5 (BAB → Sub-BAB → Sub-Sub-BAB etc)
        // Keeps sidebar clean while still showing enough context for deep structures like Keuangan
        const MAX_VISIBLE_DEPTH = 5;

        const TEMPLATE_FOLDERS = [
            'bab2_fasilitatif_keuangan', 'bab2_fasilitatif_kepegawaian', 'bab2_fasilitatif_umum',
            'bab2_substantif_infokim', 'bab2_substantif_pengaduan'
        ];

        const scrollToTop = () => {
            // Double-attempt: first immediate, then after render
            const contentArea = document.getElementById('content-main-area');
            if (contentArea) contentArea.scrollTop = 0;
            setTimeout(() => {
                const area = document.getElementById('content-main-area');
                if (area) area.scrollTop = 0;
            }, 80);
        };

        const handleClick = () => {
            if (node.type === 'folder' && !TEMPLATE_FOLDERS.includes(node.id)) {
                // Regular folder: toggle expand
                setExpandedNodes(prev => prev.includes(node.id)
                    ? prev.filter(n => n !== node.id)
                    : [...prev, node.id]);
                // Also auto-expand and navigate to first file child if exists
            } else if (viewMode === 'preview') {
                setActiveSection(node.id);
                const el = document.getElementById(`preview-section-${node.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                setActiveSection(node.id);
                setViewMode('edit');
                scrollToTop();
                // Expand parent if it's a folder
                if (node.type === 'folder') {
                    setExpandedNodes(prev => prev.includes(node.id) ? prev : [...prev, node.id]);
                }
            }
        };

        return (
            <div>
                <div
                    className={`flex items-center gap-2 py-2 pr-4 cursor-pointer hover:bg-white/5 transition-colors border-l-4 ${isActive ? 'border-imigrasi-gold bg-white/10 text-imigrasi-gold font-bold' : 'border-transparent text-gray-400'}`}
                    style={{ paddingLeft }}
                    onClick={handleClick}
                >
                    {node.type === 'folder' && (
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    )}
                    {node.type === 'file' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    <span className="truncate text-sm">{node.label}</span>
                </div>
                {/* Only show children up to MAX_VISIBLE_DEPTH to keep sidebar clean */}
                {node.type === 'folder' && isExpanded && level < MAX_VISIBLE_DEPTH && node.children?.map(child => (
                    <TreeItem key={child.id} node={child} level={level + 1} />
                ))}
            </div>
        );

    };


    // ── Inner SectionEditor component ─────────────────────────────────────────
    const SectionEditor = () => {
        const ps = getPaperSettings(activeSection);
        const isLandscape = ps.orientation === 'landscape';
        const pzBase = PAPER_SIZES[ps.size] || PAPER_SIZES.A4;
        const pz = isLandscape ? { w: pzBase.h, h: pzBase.w } : pzBase;
        const content = reportData[activeSection] || '';
        const hasImportedContent = content.includes('docx-imported') || content.includes('pdf-imported') || /<table/i.test(content);

        return (
            <div className="flex flex-col min-h-full bg-gray-100">
                {/* ── Top Toolbar ── */}
                <div className="bg-white border-b border-gray-200 px-4 py-2 flex flex-wrap items-center gap-2 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase truncate max-w-xs">
                        {activeSection.replace(/_/g, ' ')}
                    </div>
                    <div className="flex-1" />
                    {/* Mode tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {[{ id: 'document', label: '📄 Lihat Dokumen' }, { id: 'text', label: '✏️ Edit Teks' }].map(tab => (
                            <button key={tab.id} onClick={() => setEditorTab(tab.id)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    editorTab === tab.id ? 'bg-imigrasi-navy text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {/* Paper settings toggle */}
                    <button onClick={() => setShowPaperSettings(v => !v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                            showPaperSettings ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-400'
                        }`} title="Pengaturan Kertas">📐 Kertas</button>
                    <button onClick={handleUndo} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Undo">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button onClick={handleManualSave} className="px-4 py-1.5 bg-imigrasi-navy text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-blue-900">
                        {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                        Simpan
                    </button>
                </div>

                {/* ── Paper Settings Panel ── */}
                {showPaperSettings && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div>
                                <label className="block text-[10px] font-bold text-amber-800 mb-1 uppercase">Orientasi</label>
                                <div className="flex gap-1">
                                    {['portrait', 'landscape'].map(o => (
                                        <button key={o}
                                            onClick={() => updatePaperSettings(activeSection, { orientation: o })}
                                            className={`px-2 py-1 rounded text-xs font-bold border transition-all ${
                                                ps.orientation === o ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
                                            }`}>
                                            {o === 'portrait' ? '↕ Portrait' : '↔ Landscape'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-amber-800 mb-1 uppercase">Ukuran Kertas</label>
                                <select value={ps.size} onChange={e => updatePaperSettings(activeSection, { size: e.target.value })}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:border-amber-400 focus:outline-none">
                                    {Object.entries(PAPER_SIZES).map(([s, d]) => (
                                        <option key={s} value={s}>{s} ({isLandscape ? d.h : d.w}×{isLandscape ? d.w : d.h}mm)</option>
                                    ))}
                                </select>
                            </div>
                            {[{ key: 'marginTop', label: 'Atas' }, { key: 'marginRight', label: 'Kanan' }, { key: 'marginBottom', label: 'Bawah' }, { key: 'marginLeft', label: 'Kiri' }].map(m => (
                                <div key={m.key}>
                                    <label className="block text-[10px] font-bold text-amber-800 mb-1 uppercase">{m.label} (cm)</label>
                                    <input type="number" min="0.5" max="10" step="0.5" value={ps[m.key]}
                                        onChange={e => updatePaperSettings(activeSection, { [m.key]: parseFloat(e.target.value) || 3 })}
                                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:border-amber-400 focus:outline-none" />
                                </div>
                            ))}
                            <div className="text-[10px] text-amber-700 bg-amber-100 rounded px-2 py-1">{pz.w}×{pz.h}mm</div>
                        </div>
                    </div>
                )}

                {/* ── Content Area ── */}
                <div className="flex-1 overflow-y-auto bg-gray-200 p-6 flex flex-col items-center">
                    {editorTab === 'document' ? (
                        /* DOCUMENT VIEW — renders HTML tables/images faithfully */
                        <div className="bg-white shadow-2xl"
                            style={{ width: `${pz.w}mm`, minHeight: `${pz.h}mm`, paddingTop: `${ps.marginTop}cm`, paddingRight: `${ps.marginRight}cm`, paddingBottom: `${ps.marginBottom}cm`, paddingLeft: `${ps.marginLeft}cm`, fontFamily: 'Arial, "Times New Roman", serif', fontSize: '10pt', lineHeight: 1.5, boxSizing: 'border-box' }}>
                            {content ? (
                                <div className="docx-view-content" dangerouslySetInnerHTML={{ __html: content }} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                                    <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <p className="text-sm font-medium">Belum ada konten</p>
                                    <p className="text-xs mt-1 text-center">Upload file DOCX/PDF atau tulis di tab ✏️ Edit Teks</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* TEXT EDITOR — ReactQuill for manual writing */
                        <div className="bg-white shadow-2xl" style={{ width: `${pz.w}mm`, minHeight: `${pz.h}mm` }}>
                            {hasImportedContent && (
                                <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>Konten dari DOCX/PDF tidak dapat diedit di sini — tabel akan hilang. Gunakan tab <strong>📄 Lihat Dokumen</strong> untuk melihatnya.</span>
                                </div>
                            )}
                            <div className="quill-editor-container" style={{ minHeight: `calc(${pz.h}mm - 2cm)` }}>
                                <ReactQuill ref={quillRef} theme="snow"
                                    value={hasImportedContent ? '' : content}
                                    onChange={(newContent) => { if (!hasImportedContent && newContent !== content) updateSection(activeSection, newContent); }}
                                    modules={modules} formats={formats}
                                    placeholder={hasImportedContent ? 'Konten dari file sudah ada — gunakan tab Lihat Dokumen.' : 'Ketik konten laporan di sini...'}
                                    readOnly={hasImportedContent}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Upload / Attachments strip ── */}
                    <div className="w-full mt-4 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden" style={{ maxWidth: `${pz.w}mm` }}>
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                Lampiran ({(reportAttachments[activeSection] || []).length})
                            </h3>
                            <label className="px-3 py-1.5 bg-imigrasi-navy text-white rounded-lg hover:bg-blue-900 cursor-pointer text-xs font-bold flex items-center gap-1 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                Upload DOCX / PDF
                                <input type="file" className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            if (file.size > 15 * 1024 * 1024) { showNotification('Ukuran file maksimal 15MB', 'error'); return; }
                                            handleFileUploadWithExtract(file);
                                            setEditorTab('document');
                                            e.target.value = '';
                                        }
                                    }}
                                    accept=".txt,.docx,.doc,.pdf" />
                            </label>
                        </div>
                        {(reportAttachments[activeSection] || []).length > 0 ? (
                            <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
                                {(reportAttachments[activeSection] || []).map((file) => (
                                    <div key={file.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 group">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-blue-600 uppercase">
                                                {file.name?.split('.').pop() || 'f'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                                                <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-500 hover:bg-blue-50 rounded text-xs" title="Buka">👁</a>
                                            <button onClick={() => { if (window.confirm('Hapus lampiran?')) removeAttachment(activeSection, file.id); }} className="p-1 text-red-500 hover:bg-red-50 rounded text-xs" title="Hapus">🗑</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-4 text-center text-xs text-gray-400">Upload DOCX atau PDF untuk menampilkan tabel dan gambar secara otomatis</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    // ── End SectionEditor ──────────────────────────────────────────────────────

    // Force scroll to top when preview opens
    useEffect(() => {
        if (viewMode === 'preview') {
            const resetScroll = () => {
                if (contentAreaRef.current) {
                    contentAreaRef.current.scrollTop = 0;
                }
            };
            // Immediate attempt
            resetScroll();
            // Post paint attempt (after DOM reflow)
            requestAnimationFrame(() => {
                resetScroll();
                // Final attempt after images/fonts
                setTimeout(resetScroll, 400);
            });
        }
    }, [viewMode]);

    return (
        <div className="flex flex-1 flex-col min-h-0 bg-gray-100 animate-fade-in">
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
                    {/* Super admin: full export */}
                    {user?.role === 'super_admin' && (
                        <>
                            <button
                                onClick={handleExportWord}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 text-sm font-bold transition-colors"
                                title="Export semua laporan ke Microsoft Word"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Ekspor Word
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md flex items-center gap-2 text-sm font-bold transition-colors"
                                title="Export ke PDF"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                Ekspor PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Two-column layout: sidebar + content. Sidebar stays fixed, content scrolls. */}
            <div className="flex flex-1 min-h-0">
                {/* TOC Sidebar — visible in edit AND preview modes */}
                {viewMode !== 'dashboard' && (
                    <div className="w-80 bg-[#1e293b] flex-shrink-0 overflow-y-auto border-r border-gray-700 custom-scrollbar">
                        <div className="p-4 space-y-1">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-4">Daftar Isi</div>
                            {filteredToc.map(node => <TreeItem key={node.id} node={node} />)}
                        </div>
                    </div>
                )}

                {/* Main Action Area — independent scroll so sidebar stays fixed */}
                <div
                    id="content-main-area"
                    className="flex-1 overflow-y-auto"
                    ref={contentAreaRef}
                >
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
                        ) : activeSection === 'bab2_substantif_dokumen_paspor' || 
                            activeSection === 'bab2_substantif_dokumen_paspor_b' ||
                            activeSection === 'bab2_substantif_dokumen_paspor_c' ||
                            activeSection === 'bab2_substantif_dokumen_paspor_d' ||
                            activeSection === 'bab2_substantif_dokumen_paspor_e' ||
                            activeSection === 'bab2_substantif_dokumen_paspor_f' ||
                            activeSection === 'bab2_substantif_dokumen_paspor_g' ||
                            activeSection === 'bab2_substantif_dokumen_paspor_h' ||
                            activeSection === 'bab2_substantif_dokumen_izintinggal_itk' ||
                            activeSection === 'bab2_substantif_dokumen_izintinggal_itas' ||
                            activeSection === 'bab2_substantif_dokumen_izintinggal_itap' ||
                            activeSection === 'bab2_substantif_dokumen_izintinggal_lain' ? (
                            <TemplateLalintalkim key={activeSection} embedded
                                defaultTab="paspor"
                                defaultSubSection={activeSection}
                            />
                        ) : activeSection === 'bab2_substantif_rekapitulasi' ? (
                            <TemplateLalintalkim key={activeSection} embedded defaultTab="perlintasan" />
                        ) : activeSection === 'bab2_substantif_intel_yustisia' ? (
                            <TemplateInteldakimEmbedded key={activeSection} embedded seksiAlias="inteldakim" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_substantif_intel_admin' ? (
                            <TemplateInteldakimEmbedded key={activeSection} embedded seksiAlias="inteldakim" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_substantif_intel_timpora' ? (
                            <TemplateInteldakimEmbedded key={activeSection} embedded seksiAlias="inteldakim" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_substantif_infokim' ? (
                            <TemplateInfokimEmbedded key={activeSection} embedded defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_substantif_pengaduan' ? (
                            <TemplateInfokimEmbedded key={activeSection} embedded defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_keuangan_rm' || 
                            activeSection === 'bab2_fasilitatif_keuangan_pnp' || 
                            activeSection === 'bab2_fasilitatif_keuangan_gabungan' ? (
                            <TemplateKeuanganEmbedded key={activeSection} embedded defaultTab="realisasi" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_keuangan_pnbp' ? (
                            <TemplateKeuanganEmbedded key={activeSection} embedded defaultTab="pnbp" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_kepegawaian_bezetting' ? (
                            <TemplateKepegawaianEmbedded key={activeSection} embedded defaultTab="detail" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_kepegawaian_rekap' ? (
                            <TemplateKepegawaianEmbedded key={activeSection} embedded defaultTab="summary" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_kepegawaian_cuti' ? (
                            <TemplateKepegawaianEmbedded key={activeSection} embedded defaultTab="lainnya" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_kepegawaian_pembinaan' ? (
                            <TemplateKepegawaianEmbedded key={activeSection} embedded defaultTab="lainnya" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_kepegawaian_persuratan' ? (
                            <TemplateKepegawaianEmbedded key={activeSection} embedded defaultTab="lainnya" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_umum_kendaraan' ? (
                            <TemplateUmumEmbedded key={activeSection} embedded defaultTab="kendaraan" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_umum_sarana' ? (
                            <TemplateUmumEmbedded key={activeSection} embedded defaultTab="sarana" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab2_fasilitatif_umum_gedung' ? (
                            <TemplateUmumEmbedded key={activeSection} embedded defaultTab="gedung" defaultSubSection={activeSection} />
                        ) : activeSection === 'bab4_penutup' ? (
                            <TemplatePenutupEmbedded key={activeSection} embedded />
                        ) : activeSection === 'bab5' ? (
                            <Bab5OrgChartView editMode={true} />
                        ) : (
                            <SectionEditor />
                        )
                    ) : (
                        // PREVIEW MODE — sidebar stays visible on scroll
                        // PREVIEW MODE — sidebar stays visible on scroll
                        <div id="preview-container" className="p-8 bg-gray-200 min-h-full print:bg-white print:p-0 flex flex-col gap-8 items-center">
                            
                            {/* ── PORTRAIT PAGES (Bab 1, 3, 4) ── */}
                            <div className="w-[210mm] shadow-2xl bg-white p-[25mm] min-h-[297mm] font-serif print:p-0 print:shadow-none shrink-0 border border-gray-300">
                                {/* Cover Letter Preview */}
                                <div id="preview-section-cover_letter">
                                    <CoverLetterPreview />
                                </div>

                                {/* Cover Page Preview */}
                                <div id="preview-section-cover_page">
                                    <CoverPagePreview />
                                </div>

                                {/* Foreword Preview */}
                                <div id="preview-section-foreword">
                                    <ForewordPreview />
                                </div>

                                {/* Table of Contents Preview */}
                                <div id="preview-section-toc">
                                    <TableOfContentsPreview />
                                </div>

                                {/* Bab 1, Bab 3, Bab 4 */}
                                {filteredToc && filteredToc.filter(c => ['bab1', 'bab3', 'bab4'].includes(c.id)).map(chapter => (
                                    <div key={chapter.id} id={`preview-section-${chapter.id}`} className="mb-12">
                                        <h3 className="text-2xl font-bold uppercase text-center mb-8 bg-gray-100 py-2 border-y border-black">{chapter.label}</h3>
                                        <div className="space-y-6">
                                            {renderPreviewNodes(chapter.children)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── LANDSCAPE PAGES (Bab 2, 5) ── */}
                            {filteredToc && filteredToc.filter(c => ['bab2', 'bab5'].includes(c.id)).length > 0 && (
                                <div className="w-[297mm] shadow-2xl bg-white p-[20mm] min-h-[210mm] font-serif print:p-0 print:shadow-none shrink-0 border border-gray-300 overflow-x-auto">
                                    <div className="text-center italic mb-6 font-bold text-gray-500 bg-amber-50 p-2 rounded-md outline-dashed outline-1 outline-amber-300">
                                        💡 Mode Landscape untuk menampung resolusi tabel yang lebar
                                    </div>
                                    
                                    {filteredToc.filter(c => ['bab2'].includes(c.id)).map(chapter => (
                                        <div key={chapter.id} id={`preview-section-${chapter.id}`} className="mb-12">
                                            <h3 className="text-2xl font-bold uppercase text-center mb-8 bg-gray-100 py-2 border-y border-black">{chapter.label}</h3>
                                            <div className="space-y-6">
                                                {renderPreviewNodes(chapter.children)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── BAB V LAMPIRAN — LANDSCAPE with Org Chart Image ── */}
                            {filteredToc && filteredToc.some(c => c.id === 'bab5') && (
                                <div id="preview-section-bab5" className="w-[297mm] shadow-2xl bg-white min-h-[210mm] font-serif print:p-0 print:shadow-none shrink-0 border border-gray-300">
                                    <Bab5OrgChartView editMode={false} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonthlyReport;
