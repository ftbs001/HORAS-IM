import fs from 'fs';
import { Document, Packer, Paragraph, ImageRun, SectionType, PageOrientation } from 'docx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase config");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Fetching BAB V from DB...");
  const { data, error } = await supabase
      .from('monthly_reports')
      .select('content')
      .eq('section_key', 'bab5')
      .single();

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  const bab5Raw = data?.content;
  console.log("BAB V Raw data starts with:", bab5Raw ? bab5Raw.substring(0, 50) : "empty");

  let strukturOrgImageBuf = null;
  let bab5ImgType = 'png';

  if (bab5Raw && bab5Raw.startsWith('http')) {
    console.log("Fetching url...");
    const res = await fetch(bab5Raw);
    console.log("Status:", res.status);
    
    // Extract type from Content-Type or URL extension
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) bab5ImgType = 'jpeg';
    else if (contentType.includes('png')) bab5ImgType = 'png';
    else if (bab5Raw.toLowerCase().includes('.jpg') || bab5Raw.toLowerCase().includes('.jpeg')) bab5ImgType = 'jpeg';
    
    console.log("Detected MIME Type:", bab5ImgType, "from Content-Type:", contentType);
    
    const blob = await res.blob();
    strukturOrgImageBuf = await blob.arrayBuffer();
    console.log("Buffer size:", strukturOrgImageBuf.byteLength);
  }

  console.log("Building docx...");
  const cm = (v) => Math.round(v * 567);
  const doc = new Document({
    sections: [
      {
        properties: { type: SectionType.NEXT_PAGE },
        children: [new Paragraph("BAB IV")]
      },
      {
        properties: {
            type: SectionType.NEXT_PAGE,
            page: {
                margin: { top: cm(2), bottom: cm(2), left: cm(2), right: cm(2) },
                size: {
                    width: cm(29.7),
                    height: cm(21),
                    orientation: PageOrientation.LANDSCAPE,
                },
            },
        },
        children: [
            new Paragraph("BAB V"),
            ...(strukturOrgImageBuf ? [
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: strukturOrgImageBuf,
                            type: bab5ImgType,
                            transformation: {
                                width: 940,
                                height: 660,
                            }
                        })
                    ]
                }),
            ] : [
                new Paragraph("Image buf was null")
            ]),
        ]
      }
    ]
  });

  const b64 = await Packer.toBase64String(doc);
  fs.writeFileSync('test-bab5.docx', Buffer.from(b64, 'base64'));
  console.log("Wrote test-bab5.docx");
}

runTest().catch(console.error);
