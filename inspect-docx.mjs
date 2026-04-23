import fs from 'fs';
import JSZip from 'jszip';

fs.readFile('test-sections.docx', (err, data) => {
  if (err) throw err;
  JSZip.loadAsync(data).then(zip => zip.file('word/document.xml').async('string')).then(xml => {
    const sects = xml.match(/<w:sectPr(.*?)\/w:sectPr>/g);
    console.log("Sections found:");
    console.log(sects);
  }).catch(console.error);
});
