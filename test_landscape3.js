import { Document, Packer, Paragraph, SectionType, PageOrientation } from 'docx';
import fs from 'fs';

const margin = { top: 1134, bottom: 1134, left: 1134, right: 1134 };

const doc = new Document({
    sections: [
        {
            properties: {
                type: SectionType.NEXT_PAGE,
                page: {
                    margin: margin,
                    size: {
                        orientation: PageOrientation.LANDSCAPE,
                        width: 11906, 
                        height: 16838, 
                    },
                },
            },
            children: [new Paragraph("This is page 1 (landscape)")],
        },
        {
            properties: {
                type: SectionType.NEXT_PAGE,
                page: {
                    margin: margin,
                    size: {
                        orientation: PageOrientation.PORTRAIT,
                        width: 11906, 
                        height: 16838, 
                    },
                },
            },
            children: [new Paragraph("This is page 2 (portrait)")],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync('test_landscape3.docx', buffer);
    console.log("Created test_landscape3.docx");
});
