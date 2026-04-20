import fs from 'fs';
import { generateDocx } from './src/utils/docxExporter.js';
import { Packer } from 'docx';

// Mock `import` dependencies used in docxExporter
import { getPenutupDocxElements } from './src/utils/templateDocxExporter.js';

async function run() {
    const chapters = [
        { title: 'BAB I PENDAHULUAN', sections: [{ title: 'Intro', content: '<p>Test</p>' }] },
        { title: 'BAB II PELAKSANAAN TUGAS', sections: [{ title: 'Tugas', content: '<p>Test</p>' }] },
        { title: 'BAB III PERMASALAHAN', sections: [{ title: 'Masalah', content: '<p>Test</p>' }] },
    ];
    try {
        await generateDocx({
            coverLetterData: {},
            coverPageData: { month: '4', year: '2026' },
            forewordData: 'Foreword',
            tocItems: [],
            chapters,
            filename: 'test.docx',
            penutupData: null,
            bulan: 4,
            tahun: 2026
        });
        console.log("Success");
    } catch(err) {
        console.error(err);
    }
}
run();
