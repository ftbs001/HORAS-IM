import { Document, Packer, Paragraph, ImageRun } from 'docx';
import fs from 'fs';

async function testExport() {
    console.log("Downloading image...");
    const url = 'https://hbrlbecsbriiicsenlwi.supabase.co/storage/v1/object/public/report-images/bab5/struktur_organisasi_1776914646517.jpg';
    
    // Simulate our new logic
    const res = await fetch(url);
    const blob = await res.blob();
    const type = blob.type === 'image/png' ? 'png' : 'jpeg';
    const buffer = await blob.arrayBuffer();

    console.log("Image type:", type, "Buffer size:", buffer.byteLength);

    const doc = new Document({
        sections: [
            {
                children: [
                    new Paragraph("Test Bab 5 Image"),
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: buffer,
                                type: type,
                                transformation: { width: 940, height: 660 }
                            })
                        ]
                    })
                ]
            }
        ]
    });

    try {
        console.log("Packing docx...");
        const dst = await Packer.toBuffer(doc);
        fs.writeFileSync('test-bab5.docx', dst);
        console.log("Successfully wrote test-bab5.docx");
    } catch(e) {
        console.error("Packer failed:", e);
    }
}
testExport();
