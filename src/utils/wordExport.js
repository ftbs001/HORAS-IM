/**
 * Professional Word Export Utility for Monthly Reports
 * Generates clean, thesis-style Word documents
 */

import { generateLetterheadHTML } from './letterheadGenerator';
import { LETTERHEAD_FONT, LETTERHEAD_LOGO, LETTERHEAD_BORDER } from './letterheadConfig';

export const generateProfessionalWordDocument = async ({
    coverLetterData,
    coverPageData,
    forewordData,
    reportData,
    tocStructure,
    logoUrl = LETTERHEAD_LOGO.DEFAULT_URL
}) => {
    // Word-compatible HTML header with professional styling
    const header = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<!--[if gte mso 9]>
<xml>
    <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
</xml>
<![endif]-->
<style>
/* =====================================================
   STRICT FORMAT ENFORCEMENT — LOCKED v2
   Font   : Arial
   Margin : 2cm all sides
   Body   : 11pt, 1.5 line-height, justify, black
   BAB    : 14pt bold center uppercase, thick underline
   Sub-BAB: 12pt bold left
   Para   : 6pt after spacing
   ===================================================== */
@page { size: A4; margin: 2cm 2cm 2cm 2cm; }
@page :first { margin: 2cm 2cm 2cm 2cm; }

* { font-family: Arial, sans-serif !important; color: #000 !important; }

body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    text-align: justify;
}

/* ---- Page breaks ---- */
.page-break { page-break-after: always; clear: both; }

/* ---- Letterhead ---- */
.letterhead-container { font-family: Arial, sans-serif; }
.letterhead-line-1-3  { font-size: 10pt; font-weight: normal; line-height: 1.3; text-align: center; }
.letterhead-line-4    { font-size: 11pt; font-weight: bold;   line-height: 1.3; text-align: center; }
.letterhead-line-5    { font-size:  9pt; font-weight: normal; line-height: 1.3; text-align: center; }
.letterhead-line-6    { font-size:  8pt; font-weight: normal; line-height: 1.3; text-align: center; }
.letterhead-border    { border-bottom: 1pt solid #000; margin-bottom: 15pt; }

.surat-info td        { padding: 2pt 0; vertical-align: top; font-size: 12pt; }
.surat-info .label    { width: 80px; }
.surat-info .colon    { width: 10px; }

/* ---- Cover Page ---- */
.cover-page               { text-align: center; padding-top: 80pt; }
.cover-page .judul-kantor { font-size: 14pt; font-weight: bold; margin-bottom: 50pt; line-height: 1.5; }
.cover-page .judul-laporan{ font-size: 20pt; font-weight: bold; margin-bottom: 20pt; line-height: 1.5; }
.cover-page .periode      { font-size: 16pt; font-weight: bold; margin-bottom: 80pt; line-height: 1.5; }
.cover-page .footer-instansi { font-size: 12pt; font-weight: bold; line-height: 1.5; margin-top: 80pt; }

/* ---- Kata Pengantar ---- */
.kata-pengantar .judul  { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20pt; line-height: 1.5; }
.kata-pengantar .isi    { text-align: justify; text-indent: 1.25cm; line-height: 1.5; }
.kata-pengantar .paragraf { margin-bottom: 12pt; }

/* ---- Daftar Isi ---- */
.daftar-isi            { font-size: 12pt; line-height: 1.2; }
.daftar-isi .judul     { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 12pt; }
.daftar-isi .item      { margin: 0; padding: 1pt 0; line-height: 1.2; }
.daftar-isi .level-0   { font-weight: bold; }
.daftar-isi .level-1   { padding-left: 1.5em; }
.daftar-isi .level-2   { padding-left: 3.0em; }
.daftar-isi .level-3   { padding-left: 4.5em; }
.daftar-isi .level-4   { padding-left: 6.0em; }

/* ---- BAB Title (Heading 1) ---- */
/* 14pt, Bold, Uppercase, Center, thick bottom border, page-break before */
.bab-title {
    font-weight: bold;
    font-size: 14pt;
    text-align: center;
    text-transform: uppercase;
    border-bottom: 3px solid #000;
    padding-bottom: 4pt;
    margin: 0 0 18pt 0;
    line-height: 1.5;
    page-break-before: always;
}
.bab-title:first-of-type { page-break-before: avoid; }

/* ---- Sub-BAB (Heading 2) A., B., C. ---- */
.section-a {
    font-weight: bold;
    font-size: 12pt;
    text-align: left;
    margin: 12pt 0 4pt 0;
    line-height: 1.5;
}


/* ---- Sub-Sub-BAB (Heading 3) 1., 2., 3. ---- */
.section-num {
    font-weight: bold;
    font-size: 12pt;
    text-align: left;
    margin: 12pt 0 4pt 0;
    line-height: 1.5;
}

/* ---- Detail point a., b., c. ---- */
.section-alpha {
    font-size: 12pt;
    text-align: left;
    margin: 8pt 0 4pt 0;
    line-height: 1.5;
}

/* ---- Body content ---- */
.content    { text-align: justify; margin-bottom: 6pt; line-height: 1.5; text-indent: 1.25cm; }
.content p  { margin: 0 0 6pt 0; text-align: justify; line-height: 1.5; text-indent: 1.25cm; }


/* ---- Signature ---- */
.ttd          { text-align: right; margin-top: 40pt; }
.ttd .jabatan { margin-bottom: 60pt; }
.ttd .nama    { font-weight: bold; }

table  { border-collapse: collapse; width: 100%; }
td, th { padding: 4pt 6pt; vertical-align: top; font-size: 12pt; }
</style>
</head>
<body>`;

    const footer = `</body></html>`;
    let content = '';

    // Helper: Convert image URL to base64
    const getBase64 = async (url) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    };

    const logoBase64 = await getBase64(logoUrl);

    // ===================== SURAT PENGANTAR =====================
    if (coverLetterData && Object.keys(coverLetterData).length > 0) {
        content += `<div class="surat-pengantar">`;

        // Use global letterhead generator
        content += generateLetterheadHTML(logoBase64);

        // Tanggal (right-aligned, after letterhead, before nomor)
        content += `<div style="text-align:right; margin-bottom:15pt;">${coverLetterData.tanggal || ''}</div>`;

        // Info Surat
        content += `<table class="surat-info" style="margin-bottom:15pt;">
            <tr><td class="label">Nomor</td><td class="colon">:</td><td>${coverLetterData.nomor || '-'}</td></tr>
            <tr><td class="label">Sifat</td><td class="colon">:</td><td>${coverLetterData.sifat || '-'}</td></tr>
            <tr><td class="label">Lampiran</td><td class="colon">:</td><td>${coverLetterData.lampiran || '-'}</td></tr>
            <tr><td class="label">Hal</td><td class="colon">:</td><td>${(coverLetterData.hal || '-').replace(/\n/g, '<br/>')}</td></tr>
        </table>`;

        // Tujuan
        content += `<div style="margin-bottom:20pt;">${(coverLetterData.tujuan || '').replace(/\n/g, '<br/>')}</div>`;

        // Isi Surat
        const isiParagraphs = (coverLetterData.isi || '').split('\n\n');
        isiParagraphs.forEach(p => {
            if (p.trim()) {
                content += `<div style="text-indent:40pt; text-align:justify; margin-bottom:10pt;">${p.replace(/\n/g, ' ')}</div>`;
            }
        });

        // Tanda Tangan
        content += `<div class="ttd">
            <div class="jabatan">Kepala Kantor,</div>
            <div class="nama">${coverLetterData.penandatangan || ''}</div>
        </div>`;

        // Tembusan
        content += `<div style="margin-top:30pt; font-size:11pt;">
            <b>Tembusan:</b><br/>
            <div style="padding-left:15pt;">1. Sekretaris Direktorat Jenderal Imigrasi<br/>&nbsp;&nbsp;&nbsp;&nbsp;Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia.</div>
        </div>`;

        content += `</div><div class="page-break"></div>`;
    }

    // ===================== HALAMAN JUDUL =====================
    if (coverPageData) {
        content += `<div class="cover-page">
            <div class="judul-kantor">KANTOR IMIGRASI KELAS II TPI<br/>PEMATANG SIANTAR</div>
            <div class="judul-laporan">${coverPageData.reportTitle || 'LAPORAN BULANAN'}</div>
            <div class="periode">${coverPageData.month || ''} ${coverPageData.year || ''}</div>
            <div style="margin:40pt 0;">${logoBase64 ? `<img src="${logoBase64}" width="100" height="100"/>` : ''}</div>
            <div class="footer-instansi">KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN<br/>REPUBLIK INDONESIA<br/>DIREKTORAT JENDERAL IMIGRASI<br/>${coverPageData.year || new Date().getFullYear()}</div>
        </div><div class="page-break"></div>`;
    }

    // ===================== KATA PENGANTAR =====================
    if (forewordData && forewordData.content) {
        content += `<div class="kata-pengantar">
            <div class="judul">KATA PENGANTAR</div>`;

        const paragraphs = forewordData.content.split('\n\n');
        paragraphs.forEach(p => {
            if (p.trim()) {
                content += `<div class="isi paragraf">${p.replace(/\n/g, ' ')}</div>`;
            }
        });

        content += `</div><div class="page-break"></div>`;
    }

    // ===================== DAFTAR ISI =====================
    const tocDataStr = reportData?.['toc_data'];
    if (tocDataStr) {
        try {
            const tocItems = JSON.parse(tocDataStr);
            content += `<div class="daftar-isi"><div class="judul">DAFTAR ISI</div>`;

            tocItems.forEach(item => {
                const level = item.level || 0;
                const text = item.text || '';
                const page = item.page || '';
                const boldStyle = item.bold ? 'font-weight:bold;' : '';
                const dots = '.'.repeat(Math.max(3, 65 - text.length - (level * 2)));

                content += `<div class="item level-${level}" style="${boldStyle}">${text}${dots}${page}</div>`;
            });

            content += `</div><div class="page-break"></div>`;
        } catch (e) {
            // Use HTML TOC as fallback
            if (reportData?.['toc']) {
                content += `<div class="daftar-isi">${reportData['toc']}</div><div class="page-break"></div>`;
            }
        }
    }

    // ===================== ISI LAPORAN =====================
    const skipSections = ['cover_letter', 'cover_page', 'foreword', 'toc'];

    const getSectionClass = (label) => {
        if (label.startsWith('BAB ')) return 'bab-title';
        if (/^[A-Z]\./.test(label)) return 'section-a';
        if (/^\d+\./.test(label)) return 'section-num';
        if (/^[a-z]\./.test(label)) return 'section-alpha';
        return 'section-num';
    };

    const traverseNodes = (nodes) => {
        if (!nodes || !Array.isArray(nodes)) return;

        nodes.forEach(node => {
            if (skipSections.includes(node.id)) return;

            if (node.type === 'folder') {
                const cls = getSectionClass(node.label);
                content += `<div class="${cls}">${node.label}</div>`;
                if (node.children) traverseNodes(node.children);
            } else {
                const htmlContent = reportData[node.id] || '';
                if (htmlContent && htmlContent.trim() && !htmlContent.includes('[Belum ada konten]')) {
                    const cls = getSectionClass(node.label);
                    content += `<div class="${cls}">${node.label}</div>`;
                    content += `<div class="content">${htmlContent}</div>`;
                }
            }
        });
    };

    traverseNodes(tocStructure);

    // Generate blob and return download info
    const fullHtml = header + content + footer;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });

    return {
        blob,
        filename: `Laporan_Bulanan_${coverPageData?.month || 'Master'}_${new Date().toISOString().split('T')[0]}.doc`
    };
};

export default generateProfessionalWordDocument;
