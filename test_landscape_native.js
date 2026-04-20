import fs from 'fs';
import { Document, Packer, Paragraph, SectionType, PageOrientation } from 'docx';

const MARGINS = { top: 1134, right: 1134, bottom: 850, left: 1417 };
const A4_L = { width: 16838, height: 11906, orientation: "landscape" };
const A4_P = { width: 11906, height: 16838, orientation: "portrait" };

const doc = new Document({
    sections: [
        {
            properties: { type: SectionType.NEXT_PAGE, page: { size: A4_P, margin: MARGINS } },
            children: [ new Paragraph("BAB I PENDAHULUAN - PORTRAIT") ]
        },
        {
            properties: { type: SectionType.NEXT_PAGE, page: { size: A4_L, margin: MARGINS } },
            children: [ new Paragraph("BAB II PELAKSANAAN TUGAS - LANDSCAPE") ]
        },
        {
            properties: { type: SectionType.NEXT_PAGE, page: { size: A4_P, margin: MARGINS } },
            children: [ new Paragraph("BAB IV PENUTUP - PORTRAIT") ]
        }
    ]
});

Packer.toBuffer(doc).then(buffer => fs.writeFileSync('test_landscape_native.docx', buffer));
