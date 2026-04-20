import fs from 'fs';
import { generateDocx } from './src/utils/docxExporter.js';
import { getDefaultPenutupData } from './src/utils/penutupSchema.js';
import { Document, Packer, Paragraph, SectionType } from 'docx';

// Mock function to replace the actual API since we don't need real images
async function testExport() {
    const chapters = [
        {
            title: 'BAB I PENDAHULUAN',
            sections: [{ title: 'Intro', level: 2, content: '<p>Teks I</p>' }]
        },
        {
            title: 'BAB II PELAKSANAAN TUGAS',
            sections: [{ title: 'Tugas', level: 2, content: '<p>Teks II</p>' }]
        },
        {
            title: 'BAB III PERMASALAHAN',
            sections: [{ title: 'Masalah', level: 2, content: '<p>Teks III</p>' }]
        }
    ];

    try {
        await generateDocx({
            coverLetterData: {},
            coverPageData: { month: 4, year: 2026 },
            forewordData: 'Test',
            tocItems: [],
            chapters: chapters,
            filename: 'test.docx',
            logoPath: null,
            coverLogoPath: null,
            penutupData: null,
            bulan: 4,
            tahun: 2026,
        });
        console.log('Export succeeded, check file test.docx. Wait, generateDocx uses saveAs directly, which fails in Node!');
    } catch(e) {
        console.error(e);
    }
}

console.log('Testing docx...');
testExport();
