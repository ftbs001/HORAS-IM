import fs from 'fs';
import { Document, Packer, Paragraph, SectionType, PageOrientation } from 'docx';

const cm = v => Math.round(v * 567);

const doc = new Document({
  sections: [
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: { width: cm(21), height: cm(29.7), orientation: PageOrientation.PORTRAIT } }
      },
      children: [new Paragraph('PORTRAIT PAGE 1 (expect narrow)')],
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: { width: cm(29.7), height: cm(21), orientation: PageOrientation.LANDSCAPE } }
      },
      children: [new Paragraph('LANDSCAPE PAGE 2 (expect wide)')],
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: { width: cm(21), height: cm(29.7), orientation: PageOrientation.PORTRAIT } }
      },
      children: [new Paragraph('PORTRAIT PAGE 3 (expect narrow)')],
    }
  ]
});

Packer.toBase64String(doc).then(b64 => {
  fs.writeFileSync('test-sections.docx', Buffer.from(b64, 'base64'));
});
