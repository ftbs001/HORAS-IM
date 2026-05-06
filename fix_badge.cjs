const fs = require('fs');
const path = require('path');

// Fix GabungLaporan.jsx — lines 383-408 block
const gabungPath = path.join(__dirname, 'src/components/pages/laporanBulanan/GabungLaporan.jsx');
let gabung = fs.readFileSync(gabungPath, 'utf8').replace(/\r\n/g, '\n');

// The exact content we want to replace (lines 397-408)
const oldGen = "            // Generate BSrE badge PNG — gunakan logo TTD yang diupload user\n            try {\n                const { getBsreBadgePngBuffer } = await import('../../../components/common/BsreBadge.jsx');\n                const esignLogoUrl = coverLetterData?.esignLogoUrl || null;\n                bsreBadgePngBuf = await getBsreBadgePngBuffer(380, esignLogoUrl);\n            } catch (e) {\n                console.warn('BSrE badge PNG gagal dibuat, fallback ke bsre_shield:', e);\n                try {\n                    const r = await fetch(coverLetterData?.esignLogoUrl || '/bsre_shield.png');\n                    if (r.ok) bsreBadgePngBuf = await r.arrayBuffer();\n                } catch {}\n            }";

const newGen = "            // Fetch TTD logo langsung (user-uploaded atau default shield)\n            let esignLogoBuf = null;\n            try {\n                const esignUrl = coverLetterData?.esignLogoUrl || '/bsre_shield.png';\n                const re = await fetch(esignUrl);\n                if (re.ok) esignLogoBuf = await re.arrayBuffer();\n            } catch (e) {\n                try {\n                    const re2 = await fetch('/bsre_shield.png');\n                    if (re2.ok) esignLogoBuf = await re2.arrayBuffer();\n                } catch {}\n            }";

if (gabung.includes(oldGen)) {
    gabung = gabung.replace(oldGen, newGen);
    fs.writeFileSync(gabungPath, gabung, 'utf8');
    console.log('GabungLaporan: badge gen REPLACED');
} else {
    console.log('NOT FOUND. Checking char by char...');
    // Check partial match
    const partial = "// Generate BSrE badge PNG";
    const idx = gabung.indexOf(partial);
    console.log('Partial found at:', idx);
    if (idx >= 0) {
        console.log('Context:', JSON.stringify(gabung.slice(idx, idx+500)));
    }
}

// Fix templateDocxExporter.js — find and replace badge section
const exporterPath = path.join(__dirname, 'src/utils/templateDocxExporter.js');
let exporter = fs.readFileSync(exporterPath, 'utf8').replace(/\r\n/g, '\n');

// Find the badge section using unique string
const showEsignIdx = exporter.indexOf("    if (showEsign && logoKemenBuf) {");
if (showEsignIdx >= 0) {
    // Find end of the if-else block
    const elseStr = "    } else {\n        rightCellChildren.push(new Paragraph({ spacing: { before: 600 } }));";
    const elseIdx = exporter.indexOf(elseStr, showEsignIdx);
    const endIdx = exporter.indexOf('\n    }', elseIdx) + 6;
    const oldSlice = exporter.slice(showEsignIdx, endIdx);
    console.log('Found templateDocxExporter badge block length:', oldSlice.length);
    console.log('First 100 chars:', JSON.stringify(oldSlice.slice(0, 100)));
    
    const newBadge = `    if (showEsign) {
        // BSrE badge as docx TABLE — matches BsreBadge.jsx preview exactly
        const NB_B = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const bdBord = { top: NB_B, bottom: NB_B, left: NB_B, right: NB_B };
        const badgeImgRun = logoKemenBuf
            ? new ImageRun({ data: logoKemenBuf, transformation: { width: 70, height: 74 }, type: 'png' })
            : new TextRun({ text: '', font: FONT_NAME });
        const badgeDocxTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: { top: NB_B, bottom: NB_B, left: NB_B, right: NB_B, insideV: NB_B, insideH: NB_B },
            rows: [new TableRow({
                children: [
                    new TableCell({
                        width: { size: 22, type: WidthType.PERCENTAGE },
                        borders: bdBord,
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({ children: [badgeImgRun], spacing: { after: 0, before: 0 } })],
                    }),
                    new TableCell({
                        width: { size: 78, type: WidthType.PERCENTAGE },
                        borders: bdBord,
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: 'KEMENIMIPAS', font: 'Arial Black', size: 26, bold: true, color: '0D0D0D' })],
                                spacing: { after: 50, before: 0 },
                            }),
                            new Paragraph({
                                children: [new TextRun({ text: 'Ditandatangani secara elektronik oleh:', font: FONT_NAME, size: 16, color: '555555' })],
                                spacing: { after: 0, before: 0 },
                                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB', space: 4 } },
                            }),
                        ],
                    }),
                ],
            })],
        });
        rightCellChildren.push(badgeDocxTable);
        rightCellChildren.push(new Paragraph({ spacing: { before: 60, after: 0 } }));
    } else {
        rightCellChildren.push(new Paragraph({ spacing: { before: 600 } })); // 4 lines gap for physical signature
    }`;
    
    exporter = exporter.slice(0, showEsignIdx) + newBadge + exporter.slice(endIdx);
    fs.writeFileSync(exporterPath, exporter, 'utf8');
    console.log('templateDocxExporter: badge REPLACED');
} else {
    console.log('templateDocxExporter: showEsign block NOT FOUND');
    // Also check alternate
    const alt = exporter.indexOf("showEsign && logoKemenBuf");
    console.log('showEsign && logoKemenBuf at:', alt);
}

console.log('Done');
