/**
 * tabMapper.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Auto-mapping utility: mendeteksi judul/heading dokumen dan memetakan ke
 * tab laporan yang sesuai berdasarkan struktur TOC HORAS-IM.
 *
 * Returns: { tabId, tabLabel, confidence, matchedHeading } | null
 */

// ── Mapping rules (urutan prioritas — lebih spesifik dulu) ───────────────────
const MAPPING_RULES = [
    // BAB II — Bidang Substantif — sub-seksi
    { tabId: 'bab2_substantif_dokumen_paspor48_siantar', tabLabel: 'Paspor 48H — Siantar', patterns: [/paspor\s+48.{0,10}siantar/i, /paspor\s+48.{0,10}kantor\s+imigrasi/i] },
    { tabId: 'bab2_substantif_dokumen_paspor48_tebing',  tabLabel: 'Paspor 48H — ULP Tebing Tinggi', patterns: [/paspor\s+48.{0,10}tebing/i, /ulp.{0,10}tebing/i] },
    { tabId: 'bab2_substantif_dokumen_paspor48_uuk',     tabLabel: 'Paspor 48H — UKK Dolok Sanggul', patterns: [/paspor\s+48.{0,10}dolok/i, /ukk.{0,10}dolok/i] },
    { tabId: 'bab2_substantif_dokumen_paspor24_siantar', tabLabel: 'Paspor 24H — Siantar', patterns: [/paspor\s+24.{0,10}siantar/i, /paspor\s+24.{0,10}kantor\s+imigrasi/i] },
    { tabId: 'bab2_substantif_dokumen_paspor24_tebing',  tabLabel: 'Paspor 24H — ULP Tebing Tinggi', patterns: [/paspor\s+24.{0,10}tebing/i] },
    { tabId: 'bab2_substantif_dokumen_paspor24_uuk',     tabLabel: 'Paspor 24H — UKK Dolok Sanggul', patterns: [/paspor\s+24.{0,10}dolok/i] },
    { tabId: 'bab2_substantif_dokumen_plb',              tabLabel: 'Pas Lintas Batas (PLB)', patterns: [/pas\s+lintas\s+batas/i, /\bplb\b/i] },
    { tabId: 'bab2_substantif_dokumen_splp',             tabLabel: 'Surat Perjalanan Laksana Paspor', patterns: [/surat\s+perjalanan\s+laksana/i, /\bsplp\b/i] },

    // BAB II — Bidang Substantif — izin tinggal
    { tabId: 'bab2_substantif_izintinggal_itk',  tabLabel: 'Izin Kunjungan (ITK)',  patterns: [/izin\s+kunjungan/i, /\bitk\b/i] },
    { tabId: 'bab2_substantif_izintinggal_itas',  tabLabel: 'Izin Tinggal Terbatas (ITAS)', patterns: [/izin\s+tinggal\s+terbatas/i, /\bitas\b/i] },
    { tabId: 'bab2_substantif_izintinggal_itap',  tabLabel: 'Izin Tinggal Tetap (ITAP)',   patterns: [/izin\s+tinggal\s+tetap/i, /\bitap\b/i] },
    { tabId: 'bab2_substantif_rekapitulasi',       tabLabel: 'Rekapitulasi Data Perlintasan', patterns: [/rekap.{0,10}perlintasan/i, /data\s+perlintasan/i] },

    // BAB II — Bidang Substantif — intelijen
    { tabId: 'bab2_substantif_intel_yustisia', tabLabel: 'Projustisia',   patterns: [/projustisia/i, /pro\s+justisia/i] },
    { tabId: 'bab2_substantif_intel_admin',    tabLabel: 'Tindakan Administratif Keimigrasian', patterns: [/tindakan\s+administratif/i, /\btak\b/i] },
    { tabId: 'bab2_substantif_intel_timpora',  tabLabel: 'Timpora',       patterns: [/timpora/i, /tim\s+pengawasan\s+orang\s+asing/i] },
    { tabId: 'bab2_substantif_infokim',        tabLabel: 'Informasi & Komunikasi', patterns: [/informasi.{0,10}komunikasi/i, /infokim/i] },
    { tabId: 'bab2_substantif_pengaduan',      tabLabel: 'Pengaduan Masyarakat', patterns: [/pengaduan\s+masyarakat/i] },

    // BAB II — Bidang Fasilitatif — keuangan
    { tabId: 'bab2_fasilitatif_keuangan_rm',     tabLabel: 'Rupiah Murni (RM)',      patterns: [/rupiah\s+murni/i, /\brm\b/i] },
    { tabId: 'bab2_fasilitatif_keuangan_pnp',    tabLabel: 'Pendapatan Non Pajak',   patterns: [/pendapatan\s+non\s+pajak/i, /\bpnp\b/i] },
    { tabId: 'bab2_fasilitatif_keuangan_gabungan', tabLabel: 'Rupiah Murni + PNBP',  patterns: [/rm\s*\+\s*pnbp/i, /rupiah\s+murni.{0,10}pnbp/i] },
    { tabId: 'bab2_fasilitatif_keuangan_pnbp',   tabLabel: 'PNBP',                  patterns: [/penerimaan\s+negara\s+bukan\s+pajak/i, /\bpnbp\b/i] },

    // BAB II — Bidang Fasilitatif — kepegawaian
    { tabId: 'bab2_fasilitatif_kepegawaian_bezetting', tabLabel: 'Bezetting Pegawai', patterns: [/bezetting/i, /laporan\s+bezet/i] },
    { tabId: 'bab2_fasilitatif_kepegawaian_rekap',     tabLabel: 'Rekapitulasi Pegawai', patterns: [/rekap.{0,10}pegawai/i] },
    { tabId: 'bab2_fasilitatif_kepegawaian_cuti',      tabLabel: 'Data Cuti Pegawai',    patterns: [/data\s+cuti/i, /cuti\s+pegawai/i] },
    { tabId: 'bab2_fasilitatif_kepegawaian_pembinaan', tabLabel: 'Pembinaan Pegawai',    patterns: [/pembinaan\s+pegawai/i] },
    { tabId: 'bab2_fasilitatif_kepegawaian_persuratan',tabLabel: 'Tata Usaha (Persuratan)', patterns: [/tata\s+usaha/i, /persuratan/i] },

    // BAB II — Bidang Fasilitatif — umum
    { tabId: 'bab2_fasilitatif_umum_kendaraan', tabLabel: 'Kendaraan Operasional', patterns: [/kendaraan\s+operasional/i] },
    { tabId: 'bab2_fasilitatif_umum_sarana',    tabLabel: 'Sarana dan Prasarana',  patterns: [/sarana.{0,10}prasarana/i] },
    { tabId: 'bab2_fasilitatif_umum_gedung',    tabLabel: 'Gedung dan Bangunan',   patterns: [/gedung.{0,10}bangunan/i] },

    // BAB II — broad categories
    { tabId: 'bab2_substantif_dokumen', tabLabel: 'Penerbitan DPRI', patterns: [
        /penerbitan\s+dokumen\s+perjalanan/i,
        /penerbitan\s+dpri/i,
        /data\s+penerbitan\s+paspor/i,
        /penerbitan\s+paspor/i,
        /data\s+penerbitan\s+paspor\s+pada/i,
        /rekapitulasi\s+paspor/i,
    ] },
    { tabId: 'bab2_substantif_izintinggal', tabLabel: 'Penerbitan Izin Tinggal', patterns: [/penerbitan\s+izin\s+tinggal/i, /izin\s+tinggal/i] },
    { tabId: 'bab2_substantif_intel', tabLabel: 'Intelijen & Penindakan', patterns: [/intelijen.{0,10}penindakan/i, /penindakan\s+keimigrasian/i] },
    { tabId: 'bab2_substantif', tabLabel: 'Bidang Substantif', patterns: [/bidang\s+substantif/i] },
    { tabId: 'bab2_fasilitatif_keuangan', tabLabel: 'Urusan Keuangan', patterns: [/urusan\s+keuangan/i, /keuangan\b/i] },
    { tabId: 'bab2_fasilitatif_kepegawaian', tabLabel: 'Urusan Kepegawaian', patterns: [/urusan\s+kepegawaian/i, /kepegawaian\b/i] },
    { tabId: 'bab2_fasilitatif_umum', tabLabel: 'Urusan Umum', patterns: [/urusan\s+umum/i] },
    { tabId: 'bab2_fasilitatif', tabLabel: 'Bidang Fasilitatif', patterns: [/bidang\s+fasilitatif/i] },

    // BAB II general — Termasuk pola "PELAKSANAAN TUGAS BULAN [NAMA_BULAN] [TAHUN]"
    { tabId: 'bab2', tabLabel: 'BAB II — Pelaksanaan Tugas', patterns: [
        /bab\s+ii\s+pelaksanaan/i,
        /bab\s+2\s+pelaksanaan/i,
        /pelaksanaan\s+tugas\s+bulan/i,
        /pelaksanaan\s+tugas\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i,
        /laporan\s+bulanan\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i,
    ] },

    // BAB I
    { tabId: 'bab1_pengantar_gambaran', tabLabel: 'Gambaran Umum Kantor', patterns: [/gambaran\s+umum/i] },
    { tabId: 'bab1_pengantar_wilayah', tabLabel: 'Wilayah Kerja', patterns: [/wilayah\s+kerja/i] },
    { tabId: 'bab1_pengantar_tugas', tabLabel: 'Pelaksanaan Tugas', patterns: [/pelaksanaan\s+tugas\b/i] },
    { tabId: 'bab1_dasar_hukum', tabLabel: 'Dasar Hukum', patterns: [/dasar\s+hukum/i] },
    { tabId: 'bab1_ruang_lingkup', tabLabel: 'Ruang Lingkup', patterns: [/ruang\s+lingkup/i] },
    { tabId: 'bab1', tabLabel: 'BAB I — Pendahuluan', patterns: [/bab\s+i\s+pendahuluan/i, /bab\s+1\s+pendahuluan/i, /pendahuluan/i] },

    // BAB III
    { tabId: 'bab3_kepegawaian', tabLabel: 'Permasalahan — Kepegawaian', patterns: [/permasalahan.{0,15}kepegawaian/i] },
    { tabId: 'bab3_keuangan',    tabLabel: 'Permasalahan — Keuangan',    patterns: [/permasalahan.{0,15}keuangan/i] },
    { tabId: 'bab3_umum',        tabLabel: 'Permasalahan — Umum',        patterns: [/permasalahan.{0,15}umum/i] },
    { tabId: 'bab3',             tabLabel: 'BAB III — Permasalahan',     patterns: [/bab\s+iii\s+permasalahan/i, /bab\s+3\s+permasalahan/i, /permasalahan/i] },

    // BAB IV
    { tabId: 'bab4_kesimpulan', tabLabel: 'Kesimpulan', patterns: [/kesimpulan/i] },
    { tabId: 'bab4_saran',      tabLabel: 'Saran',       patterns: [/\bsaran\b/i] },
    { tabId: 'bab4',            tabLabel: 'BAB IV — Penutup', patterns: [/bab\s+iv\s+penutup/i, /bab\s+4\s+penutup/i, /penutup/i] },

    // BAB V
    { tabId: 'bab5', tabLabel: 'BAB V — Lampiran / Struktur Organisasi', patterns: [/bab\s+v\b/i, /bab\s+5\b/i, /lampiran\b/i, /struktur\s+organisasi/i] },

    // Cover & surat
    { tabId: 'cover_letter', tabLabel: 'Surat Pengantar', patterns: [/surat\s+pengantar/i, /cover\s+letter/i] },
    { tabId: 'cover_page',   tabLabel: 'Halaman Judul',   patterns: [/halaman\s+judul/i, /cover\s+page/i, /laporan\s+bulanan$/i] },
    { tabId: 'foreword',     tabLabel: 'Kata Pengantar',  patterns: [/kata\s+pengantar/i] },
    { tabId: 'toc',          tabLabel: 'Daftar Isi',      patterns: [/daftar\s+isi/i, /table\s+of\s+contents/i] },
];

// ── Collect candidate texts from structured_json ──────────────────────────────
function extractSearchTexts(structuredJson) {
    const texts = [];

    if (!structuredJson?.pages?.length) return texts;

    // Priority 1: headings from page 1 (most likely to have the document title)
    const firstPage = structuredJson.pages[0];
    if (firstPage?.content) {
        for (const block of firstPage.content) {
            if (['heading', 'paragraph'].includes(block.type) && block.text?.trim()) {
                texts.push({ text: block.text.trim(), weight: block.type === 'heading' ? 2 : 1 });
            }
        }
    }

    // Priority 2: headings from all pages (level 1 & 2 only)
    for (const page of structuredJson.pages) {
        for (const block of (page.content || [])) {
            if (block.type === 'heading' && block.level <= 2 && block.text?.trim()) {
                texts.push({ text: block.text.trim(), weight: 1.5 });
            }
        }
    }

    // Priority 3: document title from metadata
    if (structuredJson.metadata?.title) {
        texts.push({ text: structuredJson.metadata.title, weight: 3 });
    }

    return texts;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Detect and map document to a tab in the HORAS-IM report TOC.
 *
 * @param {object} structuredJson  — output from docxStructuredParser / pdfStructuredParser
 * @param {string} [manualTitle]   — optional: judul laporan yang diinput user
 * @returns {{ tabId, tabLabel, confidence, matchedHeading } | null}
 */
export function detectTabMapping(structuredJson, manualTitle = '') {
    const searchTexts = extractSearchTexts(structuredJson);

    // Prepend manualTitle as highest-weight candidate
    if (manualTitle?.trim()) {
        searchTexts.unshift({ text: manualTitle.trim(), weight: 4 });
    }

    if (searchTexts.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const rule of MAPPING_RULES) {
        for (const { text, weight } of searchTexts) {
            for (const pattern of rule.patterns) {
                if (pattern.test(text)) {
                    // Score = weight * specificity (longer tabId = more specific)
                    const specificity = rule.tabId.split('_').length;
                    const score = weight * specificity;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = {
                            tabId: rule.tabId,
                            tabLabel: rule.tabLabel,
                            confidence: Math.min(score / 16, 1), // normalize 0–1
                            matchedHeading: text,
                        };
                    }
                    break; // first pattern match for this rule is enough
                }
            }
        }
    }

    return bestMatch;
}

/**
 * Get human-friendly description for a tab mapping result.
 * @param {{ tabId, tabLabel, confidence, matchedHeading }} mapping
 */
export function getMappingDescription(mapping) {
    if (!mapping) return 'Tidak terdeteksi — pilih tab manual';
    const pct = Math.round(mapping.confidence * 100);
    return `${mapping.tabLabel} (${pct}% keyakinan)`;
}

/**
 * Get all available tab options for manual selection.
 * Returns flat list of { value: tabId, label }.
 */
export const TAB_OPTIONS = [
    { value: 'cover_letter', label: 'Surat Pengantar' },
    { value: 'cover_page', label: 'Halaman Judul' },
    { value: 'foreword', label: 'Kata Pengantar' },
    { value: 'toc', label: 'Daftar Isi' },
    { value: 'bab1', label: 'BAB I — Pendahuluan' },
    { value: 'bab1_pengantar_gambaran', label: '  › Gambaran Umum Kantor' },
    { value: 'bab1_pengantar_wilayah', label: '  › Wilayah Kerja' },
    { value: 'bab1_pengantar_tugas', label: '  › Pelaksanaan Tugas' },
    { value: 'bab1_dasar_hukum', label: '  › Dasar Hukum' },
    { value: 'bab1_ruang_lingkup', label: '  › Ruang Lingkup' },
    { value: 'bab2', label: 'BAB II — Pelaksanaan Tugas' },
    { value: 'bab2_substantif', label: '  A. Bidang Substantif' },
    { value: 'bab2_substantif_dokumen', label: '    1. Penerbitan DPRI' },
    { value: 'bab2_substantif_dokumen_paspor48_siantar', label: '      a. Paspor 48H — Siantar' },
    { value: 'bab2_substantif_dokumen_paspor48_tebing', label: '      b. Paspor 48H — ULP Tebing' },
    { value: 'bab2_substantif_dokumen_paspor48_uuk', label: '      c. Paspor 48H — UKK Dolok Sanggul' },
    { value: 'bab2_substantif_dokumen_paspor24_siantar', label: '      d. Paspor 24H — Siantar' },
    { value: 'bab2_substantif_dokumen_paspor24_tebing', label: '      e. Paspor 24H — ULP Tebing' },
    { value: 'bab2_substantif_dokumen_paspor24_uuk', label: '      f. Paspor 24H — UKK Dolok Sanggul' },
    { value: 'bab2_substantif_dokumen_plb', label: '      g. Pas Lintas Batas' },
    { value: 'bab2_substantif_dokumen_splp', label: '      h. SPLP' },
    { value: 'bab2_substantif_izintinggal', label: '    2. Penerbitan Izin Tinggal' },
    { value: 'bab2_substantif_izintinggal_itk', label: '      a. Izin Kunjungan (ITK)' },
    { value: 'bab2_substantif_izintinggal_itas', label: '      b. ITAS' },
    { value: 'bab2_substantif_izintinggal_itap', label: '      c. ITAP' },
    { value: 'bab2_substantif_rekapitulasi', label: '    3. Rekapitulasi Perlintasan' },
    { value: 'bab2_substantif_intel', label: '    4. Intelijen & Penindakan' },
    { value: 'bab2_substantif_infokim', label: '    5. Informasi & Komunikasi' },
    { value: 'bab2_substantif_pengaduan', label: '    6. Pengaduan Masyarakat' },
    { value: 'bab2_fasilitatif', label: '  B. Bidang Fasilitatif' },
    { value: 'bab2_fasilitatif_keuangan', label: '    1. Urusan Keuangan' },
    { value: 'bab2_fasilitatif_kepegawaian', label: '    2. Urusan Kepegawaian' },
    { value: 'bab2_fasilitatif_umum', label: '    3. Urusan Umum' },
    { value: 'bab3', label: 'BAB III — Permasalahan' },
    { value: 'bab4', label: 'BAB IV — Penutup' },
    { value: 'bab5', label: 'BAB V — Lampiran' },
];
