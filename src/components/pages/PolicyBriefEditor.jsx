import { useState, useRef, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { usePolicyBrief } from '../../contexts/PolicyBriefContext';

const PolicyBriefEditor = () => {
    const { showNotification } = useNotification();

    // Policy Brief Context for auto-save
    const {
        getSectionContent,
        updateSection,
        getAttachments,
        addAttachment: addAttachmentToContext,
        removeAttachment: removeAttachmentFromContext,
        lastSaved,
        isSaving,
        loading
    } = usePolicyBrief();

    const [activeSection, setActiveSection] = useState('umum');
    const [showTableModal, setShowTableModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const contentRef = useRef(null);
    const fileInputRef = useRef(null);
    const isUpdatingFromDB = useRef(false);

    const scrollToSection = (id) => {
        // Find label/name for the section
        const sectionLabels = {
            'umum': '1. Umum',
            'maksud': '2. Maksud dan Tujuan',
            'ruang_lingkup': '3. Ruang Lingkup',
            'dasar_hukum': '4. Dasar Hukum',
            'program': '5. Program Dilaksanakan',
            'hasil': '6. Hasil Dicapai',
            'simpulan': '7. Simpulan dan Saran',
            'penutup': '8. Penutup',
            'lampiran': '9. Lampiran'
        };
        const sectionName = sectionLabels[id] || 'Bagian Terpilih';

        if (activeSection === id) {
            showNotification(`Anda sudah berada di bagian ${sectionName}`, 'warning');
            // We still allow scroll in case user scrolled away manually without clicking
        } else {
            showNotification(`Menuju ke ${sectionName}`, 'info');
        }

        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportWord = async () => {
        // Show loading
        showNotification('Sedang membuat file Word...', 'info');

        try {
            // Helper to convert image to base64
            const getBase64FromUrl = async (url) => {
                const data = await fetch(url);
                const blob = await data.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        resolve(reader.result);
                    }
                });
            };

            // Get content
            const contentElement = contentRef.current;

            // Create a clone to manipulate
            const clone = contentElement.cloneNode(true);

            // Remove no-print elements from clone
            clone.querySelectorAll('.no-print').forEach(el => el.remove());

            // Process all images in the clone to use Base64
            const images = clone.querySelectorAll('img');
            for (const img of images) {
                if (img.src && !img.src.startsWith('data:')) {
                    try {
                        const base64 = await getBase64FromUrl(img.src);
                        img.src = base64;
                        // Ensure size attributes are set for Word
                        if (!img.getAttribute('width') && img.width) img.setAttribute('width', img.width);
                        if (!img.getAttribute('height') && img.height) img.setAttribute('height', img.height);
                    } catch (e) {
                        console.error('Failed to convert image:', e);
                    }
                }
            }

            // RECONSTRUCT HEADER FOR WORD (Flexbox doesn't work well in Word)
            // We look for the header div which contains the logo and text
            // The header in JSX has: flex items-center gap-4 mb-2 pb-4 border-b-4 border-double border-black
            // We'll replace the first child div (which assumes it is the header) with a table

            // Find the header div - it's usually the first major container
            const originalHeader = clone.querySelector('.border-double');

            if (originalHeader) {
                // Get the logo src from the image inside
                const logoImg = originalHeader.querySelector('img');
                const logoSrc = logoImg ? logoImg.src : '';

                // Create new table-based header
                const tableHeader = document.createElement('div');
                tableHeader.innerHTML = `
                    <table style="width: 100%; border-bottom: 3px double black; margin-bottom: 20px; padding-bottom: 10px; border-collapse: collapse;">
                        <tr>
                            <td style="width: 100px; text-align: center; vertical-align: middle; padding-right: 15px; border: none;">
                                <img src="${logoSrc}" width="90" height="90" style="width: 90px; height: 90px;" />
                            </td>
                            <td style="text-align: center; vertical-align: middle; border: none;">
                                <p style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia</p>
                                <p style="margin: 0; font-size: 13pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Direktorat Jenderal Imigrasi</p>
                                <p style="margin: 0; font-size: 13pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Kantor Wilayah Sumatera Utara</p>
                                <p style="margin: 5px 0 0 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Kantor Imigrasi Kelas II TPI Pematang Siantar</p>
                                <p style="margin: 5px 0 0 0; font-size: 10pt; font-weight: normal; line-height: 1.2;">Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun</p>
                                <p style="margin: 0; font-size: 10pt; font-weight: normal; line-height: 1.2;">Laman: pematangsiantar.imigrasi.go.id, Pos-el: kanim_pematangsiantar@imigrasi.go.id</p>
                            </td>
                        </tr>
                    </table>
                `;

                // Replace the original header with this new table
                originalHeader.parentNode.replaceChild(tableHeader, originalHeader);
            }

            // ADD PAGE BREAKS BEFORE EACH MAJOR SECTION
            // Find all major sections (A. Pendahuluan, B. Isi Laporan, C. Penutup, D. Lampiran)
            const majorSectionIds = ['program', 'simpulan', 'lampiran'];

            majorSectionIds.forEach((sectionId) => {
                const section = clone.querySelector(`#${sectionId}`);
                if (section) {
                    // Add page break style to the section
                    section.style.pageBreakBefore = 'always';
                    section.style.breakBefore = 'page';
                }
            });

            // Also add chapter titles with better formatting
            const chapterHeaders = clone.querySelectorAll('h3');
            chapterHeaders.forEach(header => {
                header.style.pageBreakAfter = 'avoid';
                header.style.breakAfter = 'avoid';
                header.style.marginTop = '24pt';
                header.style.marginBottom = '12pt';
                header.style.fontSize = '14pt';
                header.style.fontWeight = 'bold';
                header.style.textTransform = 'uppercase';
            });

            // Word-specific styles
            const header = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset='utf-8'>
    <title>Laporan Bulanan</title>
    <style>
        @page {
            size: 21cm 29.7cm;
            margin: 2.54cm 2.54cm 2.54cm 2.54cm;
            mso-header-margin: 1.27cm;
            mso-footer-margin: 1.27cm;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000000;
        }
        
        p {
            margin: 0 0 10pt 0;
            text-align: justify;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12pt;
        }
        
        td, th {
            border: 1px solid #000;
            padding: 5px;
            vertical-align: top;
        }
        
        h1 {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            margin: 12pt 0;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 14pt;
            font-weight: bold;
            margin: 12pt 0;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 24pt 0 12pt 0;
            page-break-after: avoid;
        }
        
        h4 {
            font-size: 12pt;
            font-weight: bold;
            margin: 10pt 0 6pt 0;
            page-break-after: avoid;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .underline { text-decoration: underline; }
        .italic { font-style: italic; }
        
        /* Page break classes */
        .page-break-before {
            page-break-before: always;
        }
        
        .page-break-after {
            page-break-after: always;
        }
        
        /* Prevent orphans and widows */
        p, h1, h2, h3, h4, h5, h6 {
            orphans: 2;
            widows: 2;
        }
    </style>
</head>
<body>
`;
            const footer = `</body></html>`;

            const sourceHTML = header + clone.innerHTML + footer;

            const blob = new Blob(['\ufeff', sourceHTML], {
                type: 'application/msword'
            });

            const url = URL.createObjectURL(blob);
            const fileDownload = document.createElement("a");
            document.body.appendChild(fileDownload);
            fileDownload.href = url;
            fileDownload.download = `Laporan_Kegiatan_${new Date().toISOString().split('T')[0]}.doc`;
            fileDownload.click();
            document.body.removeChild(fileDownload);
            URL.revokeObjectURL(url);

            showNotification('File Word berhasil didownload', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showNotification('Gagal membuat file Word: ' + error.message, 'error');
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            try {
                await addAttachmentToContext('lampiran', file);
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }
    };

    const removeAttachment = (id) => {
        removeAttachmentFromContext('lampiran', id);
    };

    const triggerFileUpload = () => {
        fileInputRef.current.click();
    };

    const insertTable = (rows, cols) => {
        let tableHTML = '<table class="border-collapse border border-gray-300 w-full my-4"><tbody>';
        for (let i = 0; i < rows; i++) {
            tableHTML += '<tr>';
            for (let j = 0; j < cols; j++) {
                tableHTML += '<td class="border border-gray-300 p-2">&nbsp;</td>';
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</tbody></table><p><br/></p>';
        document.execCommand('insertHTML', false, tableHTML);
        setShowTableModal(false);
    };

    // Manual save all sections
    const handleManualSave = async () => {
        try {
            const htmlContent = contentRef.current.innerHTML;
            await updateSection('full_content', htmlContent);
            showNotification('Laporan berhasil disimpan', 'success');
        } catch (error) {
            showNotification('Gagal menyimpan laporan', 'error');
        }
    };

    // Toggle preview modal
    const handlePreview = () => {
        setShowPreview(!showPreview);
    };

    return (
        <div className="space-y-6">
            <style>{`
        @media print {
            body * {
                visibility: hidden;
            }
            #report-content, #report-content * {
                visibility: visible;
            }
            #report-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 40px;
                background: white;
            }
            @page {
                size: A4;
                margin: 2.54cm;
            }
            aside, header, nav, .no-print {
                display: none !important;
            }
        }
      `}</style>

            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 no-print">
                <div>
                    <h2 className="text-2xl font-bold text-imigrasi-navy">Penyusunan Laporan Kegiatan</h2>
                    <p className="text-gray-500">Susun laporan kegiatan lengkap sesuai standar tata naskah dinas.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePreview}
                        className="px-4 py-2 text-sm border border-imigrasi-blue text-imigrasi-blue rounded-lg hover:bg-blue-50 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Preview
                    </button>
                    <button
                        onClick={handleManualSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm bg-imigrasi-gold text-white rounded-lg hover:bg-yellow-600 shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar / Outline */}
                <div className="lg:col-span-1 space-y-4 no-print">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sticky top-4 h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                        <h3 className="font-bold text-gray-800 mb-4 px-2 border-b border-gray-100 pb-2">Struktur Naskah</h3>

                        {/* A. PENDAHULUAN */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-imigrasi-navy uppercase px-2 mb-2">A. Pendahuluan</p>
                            <nav className="space-y-1">
                                {[
                                    { id: 'umum', label: '1. Umum' },
                                    { id: 'maksud', label: '2. Maksud dan Tujuan' },
                                    { id: 'ruang_lingkup', label: '3. Ruang Lingkup' },
                                    { id: 'dasar_hukum', label: '4. Dasar Hukum' }
                                ].map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${activeSection === item.id ? 'bg-blue-50 text-imigrasi-blue' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                            </nav>
                        </div>

                        {/* B. ISI LAPORAN */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-imigrasi-navy uppercase px-2 mb-2">B. Isi Laporan</p>
                            <nav className="space-y-1">
                                {[
                                    { id: 'program', label: '5. Program Dilaksanakan' },
                                    { id: 'hasil', label: '6. Hasil Dicapai' }
                                ].map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${activeSection === item.id ? 'bg-blue-50 text-imigrasi-blue' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                            </nav>
                        </div>

                        {/* C. PENUTUP */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-imigrasi-navy uppercase px-2 mb-2">C. Penutup</p>
                            <nav className="space-y-1">
                                {[
                                    { id: 'simpulan', label: '7. Simpulan dan Saran' },
                                    { id: 'penutup', label: '8. Penutup' }
                                ].map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${activeSection === item.id ? 'bg-blue-50 text-imigrasi-blue' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                            </nav>
                        </div>

                        {/* D. LAMPIRAN */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-imigrasi-navy uppercase px-2 mb-2">D. Lampiran</p>
                            <nav className="space-y-1">
                                {[
                                    { id: 'lampiran', label: '9. Lampiran / Dokumentasi' }
                                ].map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${activeSection === item.id ? 'bg-blue-50 text-imigrasi-blue' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                            </nav>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">Asisten Penyusunan</h4>
                            <button className="w-full mb-2 bg-blue-50 text-imigrasi-blue border border-blue-200 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Import Data Program Kerja
                            </button>
                        </div>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 min-h-[800px] flex flex-col">
                        {/* Enhanced Toolbar */}
                        <div className="border-b border-gray-200 p-2 bg-gray-50 flex flex-wrap items-center gap-2 sticky top-0 z-10 no-print transition-all">

                            {/* Font Family */}
                            <select
                                onChange={(e) => document.execCommand('fontName', false, e.target.value)}
                                className="h-8 px-2 text-sm border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-blue-500 cursor-pointer"
                                title="Font Type"
                            >
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Arial">Arial</option>
                                <option value="Calibri">Calibri</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Verdana">Verdana</option>
                            </select>

                            {/* Font Size */}
                            <select
                                onChange={(e) => document.execCommand('fontSize', false, e.target.value)}
                                className="h-8 px-2 text-sm border border-gray-300 rounded w-16 hover:border-gray-400 focus:outline-none focus:border-blue-500 cursor-pointer"
                                title="Font Size"
                            >
                                <option value="3">12</option>
                                <option value="1">8</option>
                                <option value="2">10</option>
                                <option value="4">14</option>
                                <option value="5">18</option>
                                <option value="6">24</option>
                                <option value="7">36</option>
                            </select>

                            <div className="h-6 w-px bg-gray-300 mx-1"></div>

                            {/* Basic Formatting */}
                            <button onClick={() => document.execCommand('bold')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 font-bold w-8" title="Bold">B</button>
                            <button onClick={() => document.execCommand('italic')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 italic w-8" title="Italic">I</button>
                            <button onClick={() => document.execCommand('underline')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 underline w-8" title="Underline">U</button>
                            <button onClick={() => document.execCommand('strikeThrough')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 line-through w-8" title="Strikethrough">S</button>

                            {/* Subscript/Superscript */}
                            <button onClick={() => document.execCommand('subscript')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8 text-xs" title="Subscript">X₂</button>
                            <button onClick={() => document.execCommand('superscript')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8 text-xs" title="Superscript">X²</button>

                            {/* Text Color */}
                            <div className="relative group w-8 h-8">
                                <button className="absolute inset-0 flex items-center justify-center hover:bg-gray-200 rounded text-red-600 font-bold border-b-2 border-red-500" title="Text Color">A</button>
                                <input
                                    type="color"
                                    onChange={(e) => document.execCommand('foreColor', false, e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                            </div>

                            {/* Highlight Color */}
                            <div className="relative group w-8 h-8">
                                <button className="absolute inset-0 flex items-center justify-center hover:bg-gray-200 rounded text-gray-700 font-bold" title="Highlight">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                </button>
                                <input
                                    type="color"
                                    onChange={(e) => document.execCommand('hiliteColor', false, e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                            </div>

                            <div className="h-6 w-px bg-gray-300 mx-1"></div>

                            {/* Alignment */}
                            <button onClick={() => document.execCommand('justifyLeft')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8" title="Align Left">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" /></svg>
                            </button>
                            <button onClick={() => document.execCommand('justifyCenter')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8" title="Align Center">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                            <button onClick={() => document.execCommand('justifyRight')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8" title="Align Right">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" /></svg>
                            </button>
                            <button onClick={() => document.execCommand('justifyFull')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8" title="Justify">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>

                            <div className="h-6 w-px bg-gray-300 mx-1"></div>

                            {/* Lists & Indent */}
                            <button onClick={() => document.execCommand('insertUnorderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8" title="Bullet List">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M4 6h-1m1 6h-1m1 6h-1" /></svg>
                            </button>
                            <button onClick={() => document.execCommand('insertOrderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8" title="Numbered List">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            </button>
                            <button onClick={() => document.execCommand('outdent')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8" title="Decrease Indent">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            </button>
                            <button onClick={() => document.execCommand('indent')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8" title="Increase Indent">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                            </button>

                            <div className="h-6 w-px bg-gray-300 mx-1"></div>

                            {/* Table Insert */}
                            <button
                                onClick={() => setShowTableModal(true)}
                                className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8"
                                title="Insert Table"
                            >
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>

                            {/* Link */}
                            <button
                                onClick={() => {
                                    const url = prompt('Enter URL:');
                                    if (url) document.execCommand('createLink', false, url);
                                }}
                                className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8"
                                title="Insert Link"
                            >
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </button>

                            {/* Clear Formatting */}
                            <button
                                onClick={() => document.execCommand('removeFormat')}
                                className="p-1.5 hover:bg-gray-200 rounded text-gray-700 w-8"
                                title="Clear Formatting"
                            >
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="h-6 w-px bg-gray-300 mx-1"></div>

                            {/* Line Spacing Mock */}
                            <select
                                onChange={(e) => {
                                    if (contentRef.current) {
                                        contentRef.current.style.lineHeight = e.target.value;
                                    }
                                }}
                                className="h-8 px-2 text-sm border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-blue-500 w-24 cursor-pointer"
                                title="Line Spacing (Global)"
                            >
                                <option value="1.5">1.5 Spasi</option>
                                <option value="1.0">1.0 Spasi</option>
                                <option value="1.15">1.15 Spasi</option>
                                <option value="2.0">2.0 Spasi</option>
                            </select>

                            <span className="text-xs text-gray-400 ml-auto hidden xl:inline">Draft</span>
                        </div>

                        {/* Content - Mocking a continuous document */}
                        <div
                            id="report-content"
                            ref={contentRef}
                            contentEditable={!loading}
                            suppressContentEditableWarning={true}
                            className="p-12 flex-1 outline-none font-serif text-lg leading-relaxed space-y-12 bg-white"
                            onInput={(e) => {
                                // Auto-save on input change
                                if (!isUpdatingFromDB.current) {
                                    const htmlContent = e.currentTarget.innerHTML;
                                    // We save the entire content as one section for simplicity
                                    // In production, you might want to save per section
                                    updateSection('full_content', htmlContent);
                                }
                            }}
                        >
                            {/* Kop Surat */}
                            <div className="flex items-center gap-4 mb-2 pb-4 border-b-4 border-double border-black">
                                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                                    <img
                                        src="/logo_kemenimipas.png"
                                        alt="Logo Imigrasi"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex-1 text-center font-serif text-black leading-tight">
                                    <h3 className="text-base font-medium uppercase tracking-wide">Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia</h3>
                                    <h3 className="text-base font-medium uppercase tracking-wide">Direktorat Jenderal Imigrasi</h3>
                                    <h3 className="text-base font-medium uppercase tracking-wide">Kantor Wilayah Sumatera Utara</h3>
                                    <h2 className="text-xl font-bold uppercase tracking-wider mt-1">Kantor Imigrasi Kelas II TPI Pematang Siantar</h2>
                                    <p className="text-sm font-normal mt-1">Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun</p>
                                    <p className="text-sm font-normal">Laman: pematangsiantar.imigrasi.go.id, Pos-el: kanim_pematangsiantar@imigrasi.go.id</p>
                                </div>
                            </div>

                            <div className="text-center mb-12 mt-8">
                                <h1 className="text-xl font-bold uppercase text-black underline mb-2">Laporan Kegiatan</h1>
                                <p className="text-gray-600 font-medium">Periode: Januari 2026</p>
                            </div>

                            {/* A. Pendahuluan */}
                            <div id="umum" className="scroll-mt-24">
                                <h3 className="text-xl font-bold text-black mb-4 border-b border-gray-200 pb-2">A. Pendahuluan</h3>

                                <div className="mb-6">
                                    <h4 className="font-bold text-black mb-2">1. Umum</h4>
                                    <p className="text-gray-600 text-justify">
                                        Kantor Imigrasi Kelas II TPI Pematangsiantar sebagai Unit Pelaksana Teknis di bawah Kementerian Hukum dan HAM memiliki tugas...
                                        <span className="text-gray-300 italic">[Ketik uraian umum di sini...]</span>
                                    </p>
                                </div>

                                <div id="maksud" className="mb-6 scroll-mt-24">
                                    <h4 className="font-bold text-black mb-2">2. Maksud dan Tujuan</h4>
                                    <p className="text-gray-600 text-justify">
                                        Maksud penyusunan laporan ini adalah untuk memberikan gambaran capaian kinerja...
                                        Tujuan laporan ini adalah sebagai bentuk pertanggungjawaban...
                                    </p>
                                </div>

                                <div id="ruang_lingkup" className="mb-6 scroll-mt-24">
                                    <h4 className="font-bold text-black mb-2">3. Ruang Lingkup</h4>
                                    <p className="text-gray-600 text-justify">
                                        Ruang lingkup laporan ini meliputi kegiatan pelayanan keimigrasian, pengawasan, dan penindakan di wilayah kerja...
                                    </p>
                                </div>

                                <div id="dasar_hukum" className="mb-6 scroll-mt-24">
                                    <h4 className="font-bold text-black mb-2">4. Dasar Hukum</h4>
                                    <ol className="list-decimal pl-5 text-gray-600 space-y-1">
                                        <li>Undang-Undang Nomor 6 Tahun 2011 tentang Keimigrasian.</li>
                                        <li>Peraturan Menteri Hukum dan HAM Nomor...</li>
                                        <li className="text-gray-300 italic">[Tambahkan dasar hukum lainnya...]</li>
                                    </ol>
                                </div>
                            </div>

                            {/* B. Isi Laporan */}
                            <div id="program" className="scroll-mt-24">
                                <h3 className="text-xl font-bold text-black mb-4 border-b border-gray-200 pb-2">B. Isi Laporan</h3>

                                <div className="mb-6">
                                    <h4 className="font-bold text-black mb-2">5. Program yang Dilaksanakan</h4>
                                    <p className="text-gray-600 mb-4">Berikut adalah matriks rencana program kerja bulan ini:</p>

                                    {/* Mock Table */}
                                    <div className="border border-gray-300 rounded mb-4 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 border-b border-gray-300">
                                                <tr>
                                                    <th className="px-3 py-2 text-left border-r border-gray-300 w-12">No</th>
                                                    <th className="px-3 py-2 text-left border-r border-gray-300">Nama Program</th>
                                                    <th className="px-3 py-2 text-left">Target</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-300">
                                                <tr>
                                                    <td className="px-3 py-2 border-r border-gray-300">1</td>
                                                    <td className="px-3 py-2 border-r border-gray-300">Layanan Eazy Passport</td>
                                                    <td className="px-3 py-2">50 Pemohon</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-3 py-2 border-r border-gray-300">2</td>
                                                    <td className="px-3 py-2 border-r border-gray-300">Operasi Gabungan Timpora</td>
                                                    <td className="px-3 py-2">1 Lokasi</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div id="hasil" className="mb-6 scroll-mt-24">
                                    <h4 className="font-bold text-black mb-2">6. Hasil yang Dicapai</h4>
                                    <p className="text-gray-600 text-justify">
                                        Diharapkan dengan terlaksananya program di atas, pelayanan keimigrasian dapat menjangkau masyarakat lebih luas...
                                        <span className="text-gray-300 italic">[Uraikan hasil yang diharapkan...]</span>
                                    </p>
                                </div>
                            </div>

                            {/* C. Penutup */}
                            <div id="simpulan" className="scroll-mt-24">
                                <h3 className="text-xl font-bold text-black mb-4 border-b border-gray-200 pb-2">C. Penutup</h3>

                                <div className="mb-6">
                                    <h4 className="font-bold text-black mb-2">7. Simpulan dan Saran</h4>
                                    <p className="text-gray-600 text-justify">
                                        <span className="font-semibold block mb-1">Simpulan:</span>
                                        Berdasarkan uraian di atas, dapat disimpulkan bahwa...
                                        <br /><br />
                                        <span className="font-semibold block mb-1">Saran:</span>
                                        Disarankan agar anggaran untuk pemeliharaan perangkat dapat ditingkatkan pada periode berikutnya...
                                    </p>
                                </div>

                                <div id="penutup" className="mb-6 scroll-mt-24">
                                    <h4 className="font-bold text-black mb-2">8. Penutup</h4>
                                    <p className="text-gray-600 text-justify">
                                        Demikian laporan bulanan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas dan fungsi...
                                    </p>
                                </div>
                            </div>

                            {/* D. Lampiran */}
                            <div id="lampiran" className="scroll-mt-24">
                                <h3 className="text-xl font-bold text-black mb-4 border-b border-gray-200 pb-2">D. Lampiran</h3>

                                <div className="mb-6">
                                    <h4 className="font-bold text-black mb-2">9. Lampiran / Dokumentasi</h4>
                                    <p className="text-gray-600 mb-4">
                                        Dokumentasi kegiatan (Foto/PDF) dan lampiran pendukung lainnya.
                                    </p>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, application/pdf"
                                        multiple
                                        onChange={handleFileUpload}
                                    />

                                    <div
                                        onClick={triggerFileUpload}
                                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group no-print"
                                    >
                                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6 text-imigrasi-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">Klik untuk upload foto atau PDF</p>
                                        <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, PDF (Max. 5MB)</p>
                                    </div>

                                    {/* Gallery Preview */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                                        {getAttachments('lampiran').map((file) => (
                                            <div key={file.id} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                                {file.type.includes('image') ? (
                                                    <div className="aspect-video bg-gray-200 relative">
                                                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 no-print">
                                                            <button onClick={() => removeAttachment(file.id)} className="p-1 bg-white rounded-full text-red-500 hover:bg-red-50" title="Hapus">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video flex flex-col items-center justify-center p-4 bg-gray-100 text-gray-600">
                                                        <svg className="w-10 h-10 mb-2 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                                        <span className="text-xs font-medium text-center truncate w-full px-2">{file.name}</span>
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                                            <button onClick={() => removeAttachment(file.id)} className="p-1 bg-white rounded-full text-red-500 hover:bg-red-50 shadow-sm" title="Hapus">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="p-2 text-xs text-gray-500 truncate bg-white border-t border-gray-100">
                                                    {file.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Footer Toolbar */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center sticky bottom-0 z-10 no-print">
                            <span className="text-xs text-gray-500">
                                Status:
                                {isSaving ? (
                                    <span className="font-bold text-blue-600">Menyimpan...</span>
                                ) : lastSaved ? (
                                    <span className="font-bold text-green-600">
                                        Tersimpan otomatis {new Date(lastSaved).toLocaleTimeString('id-ID')}
                                    </span>
                                ) : (
                                    <span className="font-bold text-gray-600">Draft baru</span>
                                )}
                            </span>
                            <div className="flex gap-3">
                                <button
                                    onClick={handlePrint}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    Print / Save PDF
                                </button>
                                <button
                                    onClick={handleExportWord}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md text-sm font-bold transition-all transform active:scale-95 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Export to Word
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Insert Modal */}
            {showTableModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">Insert Table</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Rows:</label>
                                <input type="number" id="table-rows" defaultValue="3" min="1" max="20" className="w-full border border-gray-300 rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Columns:</label>
                                <input type="number" id="table-cols" defaultValue="3" min="1" max="10" className="w-full border border-gray-300 rounded px-3 py-2" />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button onClick={() => setShowTableModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button
                                    onClick={() => {
                                        const rows = parseInt(document.getElementById('table-rows').value);
                                        const cols = parseInt(document.getElementById('table-cols').value);
                                        insertTable(rows, cols);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Insert
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-imigrasi-navy">Preview Laporan</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                            <div className="bg-white shadow-lg p-12 min-h-[800px] w-full mx-auto max-w-[21cm]">
                                {/* Render Content Here */}
                                <div
                                    className="prose max-w-none font-serif"
                                    dangerouslySetInnerHTML={{
                                        __html: contentRef.current ? contentRef.current.innerHTML : ''
                                    }}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white text-gray-700 font-medium"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={() => {
                                    handlePrint();
                                    setShowPreview(false);
                                }}
                                className="px-4 py-2 bg-imigrasi-blue text-white rounded-lg hover:bg-blue-700 shadow-md font-medium flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Cetak PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PolicyBriefEditor;
