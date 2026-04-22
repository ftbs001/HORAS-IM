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
                        width: 11906,
                        height: 16838,
                        orientation: PageOrientation.PORTRAIT,
                    },
                },
            },
            children: [new Paragraph("This is page 1 (portrait)")],
        },
        {
            properties: {
                type: SectionType.NEXT_PAGE,
                page: {
                    margin: margin,
                    size: {
                        width: 16838,
                        height: 11906,
                        orientation: PageOrientation.LANDSCAPE,
                    },
                },
            },
            children: [new Paragraph("This is page 2 (landscape)")],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync('test_landscape.docx', buffer);
    console.log("Created test_landscape.docx");
});
