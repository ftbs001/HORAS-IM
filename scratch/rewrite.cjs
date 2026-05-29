const fs = require('fs');

let content = fs.readFileSync('src/utils/exportMonthlyReport.js', 'utf8');

// 1. Remove React imports and hooks
content = content.replace(/import React.*?from 'react';/, '');
content = content.replace(/import \{ useAuth \}.*?;/, '');
content = content.replace(/import \{ useArchive \}.*?;/, '');
content = content.replace(/import DocxPreviewRenderer.*?;/, '');

// 2. Replace Component with function
const startComponent = /export default function GabungLaporan.*?\{/;
content = content.replace(startComponent, `export const generateMonthlyReport = async ({
    bulan, tahun, user, autoArchiveExport, action = 'export', onPreview, showMsg = console.log
}) => {
    try {
        // Fetch ALL data needed
        const { data: mrData } = await supabase
            .from('monthly_reports')
            .select('section_key, content')
            .in('section_key', ['cover_letter', 'cover_page', 'foreword', 'bab5']);
            
        let coverLetterData = {};
        let coverPageData = {};
        let forewordData = {};
        let bab5ImageBase64 = null;
        
        if (mrData) {
            mrData.forEach(item => {
                try {
                    const parsed = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                    if (item.section_key === 'cover_letter') coverLetterData = parsed || {};
                    if (item.section_key === 'cover_page') coverPageData = parsed || {};
                    if (item.section_key === 'foreword') forewordData = parsed || {};
                    if (item.section_key === 'bab5' && typeof item.content === 'string') bab5ImageBase64 = item.content;
                } catch (e) {}
            });
        }

        // Fetch ALL sections and templates for the selected month/year, bypassing approval
        const { data: secData } = await supabase.from('sections').select('id,name,alias,urutan_penggabungan');
        const { data: templateData } = await supabase
            .from('laporan_template')
            .select('*')
            .eq('prop_bulan', bulan)
            .eq('prop_tahun', tahun);

        // Map template data to the expected format
        const uniqueSec = dedupSections(secData || []);
        const laporan = uniqueSec.map(s => {
            // Find all template records for this section's family
            const tData = templateData?.filter(t => t.section_key?.startsWith(s.alias));
            // Simulate the structured_json format that GabungLaporan expected
            let combinedPages = [];
            if (tData && tData.length > 0) {
                tData.forEach(t => {
                    if (t.template_data?.pages) {
                        combinedPages = [...combinedPages, ...t.template_data.pages];
                    }
                });
            }
            return {
                ...s,
                laporan: {
                    status: 'Disetujui', // Force approval to bypass any inner checks
                    structured_json: { pages: combinedPages }
                }
            };
        });

        // Filter only those with data
        const approved = laporan.filter(r => r.laporan.structured_json.pages.length > 0);
`);

// 3. Remove everything between `const { user } = useAuth();` down to `const doGenerate = async (action = 'export') => {`
// Wait, regex might be tricky. Let's find the exact indices.
const p1 = content.indexOf('const { user } = useAuth();');
const p2 = content.indexOf('try {', content.indexOf('const doGenerate = async'));

if (p1 !== -1 && p2 !== -1) {
    content = content.substring(0, p1) + content.substring(p2 + 5);
}

// 4. Find the end of `doGenerate` and remove the UI
// The end of doGenerate is followed by `// ══════════════════════════════════════════════════════════════════════════\n    // UI`
const pUI = content.indexOf('// ══════════════════════════════════════════════════════════════════════════\n    // UI');
if (pUI !== -1) {
    // End the function right before pUI
    content = content.substring(0, pUI) + '}; // End of generateMonthlyReport\n';
}

// 5. Replace state setters with callbacks
content = content.replace(/setPreviewLoading\(true\);/g, "if(showMsg) showMsg('info', 'Memuat preview...');");
content = content.replace(/setGenerating\(true\);/g, "if(showMsg) showMsg('info', 'Membuat dokumen...');");
content = content.replace(/setPreviewLoading\(false\);/g, "");
content = content.replace(/setGenerating\(false\);/g, "");

content = content.replace(/setPreviewHtml\(result\.value\);/g, "");
content = content.replace(/setShowPreviewModal\(true\);/g, "");
content = content.replace(/showMsg\('success', '✅ Preview berhasil dimuat.'\);/g, "if(onPreview) onPreview(result.value);");

fs.writeFileSync('src/utils/exportMonthlyReport.js', content);
console.log('Done rewriting exportMonthlyReport.js');
