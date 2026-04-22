/**
 * templateDocxExporter.js
 * Export tabel template paspor & izin tinggal ke DOCX
 * using library docx (https://docx.js.org)
 *
 * Perbaikan v2:
 *  - Kolom lebar ditentukan secara eksplisit dengan DXA agar proporsional
 *  - Multi-header (rowSpan/colSpan) dibangun dengan benar
 *  - Tabel perlintasan disederhanakan agar tidak overflow di landscape A4
 */
import { Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, ImageRun, WidthType, AlignmentType, VerticalAlign,
    ShadingType, HeightRule, BorderStyle, PageOrientation, TableLayoutType } from 'docx';
import {
    BULAN_NAMES,
    TABEL_A_ROWS, TABEL_B_ROWS, TABEL_C_ROWS,
    TABEL_D_ROWS, TABEL_E_ROWS, TABEL_F_ROWS,
    TABEL_D_COLS, TABEL_D_COL_LABELS,
    TABEL_G_ROWS, TABEL_H_ROWS, TABEL_ITK_ROWS,
    TABEL_ITAS_ROWS, TABEL_ITAP_ROWS, TABEL_LAIN_ROWS,
    TABEL_PERLINTASAN_COLS, TABEL_PERLINTASAN_ROWS,
    TABEL_SIMPLE_COLS, TABEL_SIMPLE_COL_LABELS,
    calculateTotals,
} from './templateSchema';
import {
    PROJUS_COLS, PROJUS_COL_LABELS, PROJUS_DEFAULT_ROWS,
    TAK_COLS, TAK_COL_LABELS, TAK_DEFAULT_ROWS,
    TIMPORA_ROWS,
    calcProjusTotals, calcTAKTotals,
} from './inteldakimSchema';
import {
    INFOKIM_ROWS, PENGADUAN_COLS,
} from './infokimSchema';
import {
    REALISASI_ROWS, BENDAHARA_ROWS,
    getDefaultRealisasiData, getDefaultBendaharaData,
    calcRealisasiTotals, calcGabungan, calcBendaharaTotals
} from './keuanganSchema';
import {
    getEmptyPegawaiRow, getEmptyPPPKRow, getEmptyNonAsnRow, GOLONGAN_ROWS, JABATAN_ROWS,
    PENDIDIKAN_ROWS, GENDER_ROWS, STATUS_ROWS,
    calcAllTotals, getDefaultKepegawaianData
} from './kepegawaianSchema';
import { getDefaultUmumData } from './umumSchema';

/* ── Gaya Konstanta ─────────────────────────────────────────────────────────── */
const FONT_NAME = 'Times New Roman';
const FONT_SIZE = 20;   // half-points → 10pt
const FONT_SM   = 18;   // 9pt
const FONT_XS   = 16;   // 8pt
const HEADER_BG = 'bdd7ee';
const TOTAL_BG  = 'e8f5e9';
const GRAND_BG  = 'c6efce';
const BORDER    = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const ALL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
const clr = (hex) => ({ fill: hex, type: ShadingType.CLEAR, color: 'auto' });

/**
 * Creates a TableCell with text content.
 * @param {string} text
 * @param {object} opts - bold, center, bg, colSpan, rowSpan, sz, vAlign, w (width in DXA)
 */
const cell = (text, opts = {}) => {
    const {
        bold = false, center = false, bg = null,
        colSpan = 1, rowSpan = 1, sz = FONT_SIZE,
        vAlign = VerticalAlign.CENTER, w = null,
    } = opts;
    return new TableCell({
        children: [new Paragraph({
            alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [new TextRun({ text: String(text ?? ''), bold, font: FONT_NAME, size: sz })],
            spacing: { before: 20, after: 20 },
        })],
        shading: bg ? clr(bg) : undefined,
        columnSpan: colSpan,
        rowSpan,
        borders: ALL_BORDERS,
        verticalAlign: vAlign,
        width: w ? { size: w, type: WidthType.DXA } : undefined,
        margins: { top: 30, bottom: 30, left: 80, right: 80 },
    });
};

const numCell = (val, opts = {}) => {
    const n = Number(val) || 0;
    return cell(n === 0 ? '-' : String(n), { center: true, ...opts });
};

const heading = (text) => new Paragraph({
    children: [new TextRun({ text, bold: true, font: FONT_NAME, size: 24 })],
    spacing: { before: 200, after: 80 },
});

const subHeading = (text) => new Paragraph({
    children: [new TextRun({ text, bold: true, font: FONT_NAME, size: FONT_SIZE })],
    spacing: { before: 160, after: 80 },
    indent: { left: 360 },
});

const spacer = () => new Paragraph({ children: [new TextRun('')], spacing: { before: 60, after: 60 } });

// Total page width in landscape A4 minus margins (approx 14400 DXA usable at 1.7cm margins)
const PAGE_W = 14400;

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL A — Kanim Pematangsiantar
   Kolom: JENIS PASPOR | JENIS PERMOHONAN | L | P | GRAND TOTAL
══════════════════════════════════════════════════════════════════════════════ */
function buildTabelA(data) {
    const totals = calculateTotals('a', data, TABEL_A_ROWS);
    const getV = (id, f) => totals[id]?.[f] ?? 0;

    // Column widths: label1(30%), label2(40%), L(10%), P(10%), total(10%)
    const W = [PAGE_W * 0.30, PAGE_W * 0.40, PAGE_W * 0.10, PAGE_W * 0.10, PAGE_W * 0.10].map(Math.round);

    const headerRow = new TableRow({
        tableHeader: true,
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: [
            cell('JENIS PASPOR',     { bold: true, center: true, bg: HEADER_BG, w: W[0] }),
            cell('JENIS PERMOHONAN', { bold: true, center: true, bg: HEADER_BG, w: W[1] }),
            cell('L',               { bold: true, center: true, bg: HEADER_BG, w: W[2] }),
            cell('P',               { bold: true, center: true, bg: HEADER_BG, w: W[3] }),
            cell('GRAND TOTAL',     { bold: true, center: true, bg: HEADER_BG, w: W[4] }),
        ],
    });

    const rows = TABEL_A_ROWS.map(row => {
        const isGrand = row.isGrandTotal;
        const isTotal = row.isTotalRow;
        const bg = isGrand ? GRAND_BG : isTotal ? TOTAL_BG : (row.isGroupStart ? 'dce6f1' : null);
        const l = getV(row.id, 'l');
        const p = getV(row.id, 'p');
        return new TableRow({
            children: [
                cell(row.jenisPaspor    || '', { bold: row.isGroupStart, bg, w: W[0] }),
                cell(row.jenisPermohonan|| '', { bold: isTotal, bg, w: W[1] }),
                numCell(l, { bg, w: W[2] }),
                numCell(p, { bg, w: W[3] }),
                numCell(l + p, { bg, bold: isTotal, w: W[4] }),
            ],
        });
    });

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [headerRow, ...rows] });
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL B — ULP Tebing Tinggi
══════════════════════════════════════════════════════════════════════════════ */
function buildTabelB(data) {
    const totals = calculateTotals('b', data, TABEL_B_ROWS);
    const getV   = (id, f) => totals[id]?.[f] ?? 0;
    const W = [PAGE_W * 0.30, PAGE_W * 0.40, PAGE_W * 0.10, PAGE_W * 0.10, PAGE_W * 0.10].map(Math.round);

    const headerRow = new TableRow({
        tableHeader: true,
        children: [
            cell('JENIS PASPOR',    { bold: true, center: true, bg: HEADER_BG, w: W[0] }),
            cell('JENIS PERMOHONAN',{ bold: true, center: true, bg: HEADER_BG, w: W[1] }),
            cell('L',              { bold: true, center: true, bg: HEADER_BG, w: W[2] }),
            cell('P',              { bold: true, center: true, bg: HEADER_BG, w: W[3] }),
            cell('TOTAL',          { bold: true, center: true, bg: HEADER_BG, w: W[4] }),
        ],
    });

    const rows = TABEL_B_ROWS.map(row => {
        const isGrand = row.isGrandTotal;
        const isTotal = row.isTotalRow;
        const bg = isGrand ? GRAND_BG : isTotal ? TOTAL_BG : (row.isGroupStart ? 'dce6f1' : null);
        const l = getV(row.id, 'l');
        const p = getV(row.id, 'p');
        return new TableRow({
            children: [
                cell(row.jenisPaspor    || '', { bold: row.isGroupStart, bg, w: W[0] }),
                cell(row.jenisPermohonan|| '', { bold: isTotal, bg, w: W[1] }),
                numCell(l, { bg, w: W[2] }),
                numCell(p, { bg, w: W[3] }),
                numCell(l + p, { bg, bold: isTotal, w: W[4] }),
            ],
        });
    });

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [headerRow, ...rows] });
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL C — UKK Dolok Sanggul
   Kolom: KETERANGAN | L | P | TOTAL
══════════════════════════════════════════════════════════════════════════════ */
function buildTabelC(data) {
    const totals = calculateTotals('c', data, TABEL_C_ROWS);
    const getV   = (id, f) => totals[id]?.[f] ?? 0;
    const W = [PAGE_W * 0.55, PAGE_W * 0.15, PAGE_W * 0.15, PAGE_W * 0.15].map(Math.round);

    const headerRow = new TableRow({
        tableHeader: true,
        children: [
            cell('KETERANGAN', { bold: true, center: true, bg: HEADER_BG, w: W[0] }),
            cell('L',          { bold: true, center: true, bg: HEADER_BG, w: W[1] }),
            cell('P',          { bold: true, center: true, bg: HEADER_BG, w: W[2] }),
            cell('TOTAL',      { bold: true, center: true, bg: HEADER_BG, w: W[3] }),
        ],
    });

    const rows = TABEL_C_ROWS.map(row => {
        const isGrand = row.isGrandTotal;
        const bg = isGrand ? GRAND_BG : null;
        const l = getV(row.id, 'l');
        const p = getV(row.id, 'p');
        return new TableRow({
            children: [
                cell(row.keterangan || '', { bold: isGrand, bg, w: W[0] }),
                numCell(l, { bg, w: W[1] }),
                numCell(p, { bg, w: W[2] }),
                numCell(l + p, { bg, bold: isGrand, w: W[3] }),
            ],
        });
    });

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [headerRow, ...rows] });
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL MULTI-HEADER (D, E, F) — UKK Tarutung
   Header Row 1: NO | JENIS PERMOHONAN | col1 L/P | col2 L/P | ...
   Header Row 2: (cont)                | L | P     | L | P    | ...
══════════════════════════════════════════════════════════════════════════════ */
function buildTabelMultiHeader(tableName, data, schemaRows) {
    const totals = calculateTotals(tableName, data, schemaRows);
    const getV   = (id, col, f) => totals[id]?.[col]?.[f] ?? 0;

    // 2 fixed cols + N*2 data cols. Give fixed cols more space.
    const nCols = TABEL_D_COLS.length;
    const fixedW = [PAGE_W * 0.06, PAGE_W * 0.26].map(Math.round); // NO, JENIS
    const dataColW = Math.round((PAGE_W - fixedW[0] - fixedW[1]) / (nCols * 2)); // L and P per col

    const hr1 = new TableRow({
        tableHeader: true,
        height: { value: 300, rule: HeightRule.ATLEAST },
        children: [
            cell('NO',               { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, sz: FONT_SM, w: fixedW[0] }),
            cell('JENIS PERMOHONAN', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, sz: FONT_SM, w: fixedW[1] }),
            ...TABEL_D_COLS.map(col =>
                cell(TABEL_D_COL_LABELS[col], { bold: true, center: true, bg: HEADER_BG, colSpan: 2, sz: FONT_SM, w: dataColW * 2 })
            ),
        ],
    });

    const hr2 = new TableRow({
        tableHeader: true,
        children: TABEL_D_COLS.flatMap(() => [
            cell('L', { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: dataColW }),
            cell('P', { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: dataColW }),
        ]),
    });

    const dataRows = schemaRows.map(row => {
        const isGrand = row.isGrandTotal;
        const isTotal = row.isTotalRow;
        const bg = isGrand ? GRAND_BG : isTotal ? TOTAL_BG : null;

        return new TableRow({
            children: [
                cell(row.no    || '', { center: true, bg, sz: FONT_SM, w: fixedW[0] }),
                cell(row.label || '', { bold: isTotal, bg, sz: FONT_SM, w: fixedW[1] }),
                ...TABEL_D_COLS.flatMap(col => [
                    numCell(getV(row.id, col, 'l'), { bg, sz: FONT_SM, bold: isTotal, w: dataColW }),
                    numCell(getV(row.id, col, 'p'), { bg, sz: FONT_SM, bold: isTotal, w: dataColW }),
                ]),
            ],
        });
    });

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr1, hr2, ...dataRows] });
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL SIMPLE (G, H, ITK, ITAS, ITAP, LAIN)
   Header: NO | JENIS PERMOHONAN | col1 L/P | col2 L/P | JUMLAH
══════════════════════════════════════════════════════════════════════════════ */
function buildTabelSimple(tableName, data, schemaRows) {
    const totals = calculateTotals(tableName, data, schemaRows);
    const getV   = (id, col, f) => totals[id]?.[col]?.[f] ?? 0;

    const nCols = TABEL_SIMPLE_COLS.length;
    const fixedW = [PAGE_W * 0.06, PAGE_W * 0.30].map(Math.round);
    const jumlahW = Math.round(PAGE_W * 0.10);
    const dataColW = Math.round((PAGE_W - fixedW[0] - fixedW[1] - jumlahW) / (nCols * 2));

    const hr1 = new TableRow({
        tableHeader: true,
        height: { value: 300, rule: HeightRule.ATLEAST },
        children: [
            cell('NO.',              { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, sz: FONT_SM, w: fixedW[0] }),
            cell('JENIS PERMOHONAN', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, sz: FONT_SM, w: fixedW[1] }),
            ...(TABEL_SIMPLE_COLS.map(col => TABEL_SIMPLE_COL_LABELS[col] || col)).map(label =>
                cell(label, { bold: true, center: true, bg: HEADER_BG, colSpan: 2, sz: FONT_SM, w: dataColW * 2 })
            ),
            cell('JUMLAH', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, sz: FONT_SM, w: jumlahW }),
        ],
    });

    const hr2 = new TableRow({
        tableHeader: true,
        children: TABEL_SIMPLE_COLS.flatMap(() => [
            cell('L', { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: dataColW }),
            cell('P', { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: dataColW }),
        ]),
    });

    const dataRows = schemaRows.map(row => {
        const isGrand = row.isGrandTotal;
        const isTotal = row.isTotalRow;
        const bg = isGrand ? GRAND_BG : isTotal ? TOTAL_BG : null;

        let sumTotal = 0;
        const inputs = TABEL_SIMPLE_COLS.flatMap(col => {
            const l = getV(row.id, col, 'l');
            const p = getV(row.id, col, 'p');
            sumTotal += l + p;
            return [
                numCell(l, { bg, sz: FONT_SM, bold: isTotal, w: dataColW }),
                numCell(p, { bg, sz: FONT_SM, bold: isTotal, w: dataColW }),
            ];
        });

        return new TableRow({
            children: [
                cell(row.no    || '', { center: true, bg, sz: FONT_SM, w: fixedW[0] }),
                cell(row.label || '', { bold: isTotal, bg, sz: FONT_SM, w: fixedW[1] }),
                ...inputs,
                numCell(sumTotal, { bg, sz: FONT_SM, bold: true, w: jumlahW }),
            ],
        });
    });

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr1, hr2, ...dataRows] });
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL PERLINTASAN (Udara / Laut / Darat)
   Simplified clean structure for landscape A4:
   Header: NO | NAMA | KED-PENUMPANG(WNI L/P) | KED-PENUMPANG(WNA L/P) | KED-CREW(WNI L/P) | KED-CREW(WNA L/P) |
           KEB-PENUMPANG(WNI L/P) | KEB-PENUMPANG(WNA L/P) | KEB-CREW(WNI L/P) | KEB-CREW(WNA L/P) | JUMLAH
══════════════════════════════════════════════════════════════════════════════ */
function buildTabelPerlintasan(tableName, data, schemaRows, customHeader) {
    const totals = calculateTotals(tableName, data, schemaRows);
    const getV   = (id, col, f) => totals[id]?.[col]?.[f] ?? 0;

    // 4 groups × 2 subgroups × 2 L/P + JUMLAH
    // Groups: [KED-PNP, KED-CREW, KEB-PNP, KEB-CREW] × [WNI, WNA] × [L, P]
    const colGroups = [
        { key: 'ked_p', label: 'PENUMPANG KEDATANGAN', subs: ['ked_p_wni', 'ked_p_wna'] },
        { key: 'ked_c', label: 'CREW KEDATANGAN',      subs: ['ked_c_wni', 'ked_c_wna'] },
        { key: 'keb_p', label: 'PENUMPANG KMBALI',     subs: ['keb_p_wni', 'keb_p_wna'] },
        { key: 'keb_c', label: 'CREW KMBALI',          subs: ['keb_c_wni', 'keb_c_wna'] },
    ];

    // Width allocation: name(8%), each L/P data col(~4.5%), jumlah(4%)
    const nameW = Math.round(PAGE_W * 0.08);
    const jumlahW = Math.round(PAGE_W * 0.05);
    const remaining = PAGE_W - nameW - jumlahW;
    const dataW = Math.round(remaining / (colGroups.length * 2 * 2)); // L and P per sub per group

    // Header row 0: full title span
    const totalCols = 1 + colGroups.length * 4 + 1; // name + (4 groups × 2 wni/wna × L/P) + jumlah
    const hr0 = new TableRow({
        tableHeader: true,
        children: [cell(customHeader, { bold: true, center: true, bg: HEADER_BG, colSpan: totalCols, sz: FONT_SIZE })],
    });

    // Header row 1: NAMA | grouped headers × colSpan 4 each | JUMLAH
    const hr1 = new TableRow({
        tableHeader: true,
        children: [
            cell('NO./NAMA', { bold: true, center: true, bg: HEADER_BG, rowSpan: 3, sz: FONT_XS, w: nameW }),
            ...colGroups.map(g => cell(g.label, { bold: true, center: true, bg: HEADER_BG, colSpan: 4, sz: FONT_XS, w: dataW * 4 })),
            cell('TOTAL', { bold: true, center: true, bg: HEADER_BG, rowSpan: 3, sz: FONT_XS, w: jumlahW }),
        ],
    });

    // Header row 2: WNI / WNA per group
    const hr2 = new TableRow({
        tableHeader: true,
        children: colGroups.flatMap((g) => [
            cell('WNI', { bold: true, center: true, bg: HEADER_BG, colSpan: 2, sz: FONT_XS, w: dataW * 2 }),
            cell('WNA', { bold: true, center: true, bg: HEADER_BG, colSpan: 2, sz: FONT_XS, w: dataW * 2 }),
        ]),
    });

    // Header row 3: L / P
    const hr3 = new TableRow({
        tableHeader: true,
        children: colGroups.flatMap(() => [
            cell('L', { bold: true, center: true, bg: HEADER_BG, sz: FONT_XS, w: dataW }),
            cell('P', { bold: true, center: true, bg: HEADER_BG, sz: FONT_XS, w: dataW }),
            cell('L', { bold: true, center: true, bg: HEADER_BG, sz: FONT_XS, w: dataW }),
            cell('P', { bold: true, center: true, bg: HEADER_BG, sz: FONT_XS, w: dataW }),
        ]),
    });

    const dataRows = schemaRows.map(row => {
        const isTotal = row.isTotalRow;
        const bg = isTotal ? GRAND_BG : null;

        let total = 0;
        const dataCells = colGroups.flatMap(g =>
            g.subs.flatMap(subKey => {
                const l = getV(row.id, subKey, 'l');
                const p = getV(row.id, subKey, 'p');
                total += l + p;
                return [
                    numCell(l, { bg, sz: FONT_XS, bold: isTotal, w: dataW }),
                    numCell(p, { bg, sz: FONT_XS, bold: isTotal, w: dataW }),
                ];
            })
        );

        return new TableRow({
            children: [
                cell(row.label || '', { bold: isTotal, bg, sz: FONT_XS, w: nameW }),
                ...dataCells,
                numCell(total, { bg, sz: FONT_XS, bold: true, w: jumlahW }),
            ],
        });
    });

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr0, hr1, hr2, hr3, ...dataRows] });
}


/* ══════════════════════════════════════════════════════════════════════════════
   INTELDAKIM DOCX BUILDERS
══════════════════════════════════════════════════════════════════════════════ */
function buildProjusDocx(projusData) {
    const totals = calcProjusTotals(projusData || {});
    const noW   = Math.round(PAGE_W * 0.05);
    const pasW  = Math.round(PAGE_W * 0.25);
    const jumlW = Math.round(PAGE_W * 0.07);
    const colW  = Math.round((PAGE_W - noW - pasW - jumlW) / (PROJUS_COLS.length * 2));

    const hr1 = new TableRow({ tableHeader: true, children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, rowSpan: 3, sz: FONT_SM, w: noW }),
        cell('PASAL YANG DILANGGAR', { bold: true, center: true, bg: HEADER_BG, rowSpan: 3, sz: FONT_SM, w: pasW }),
        cell('PELANGGARAN KEIMIGRASIAN', { bold: true, center: true, bg: HEADER_BG, colSpan: PROJUS_COLS.length * 2 + 1, sz: FONT_SM }),
    ]});
    const hr2 = new TableRow({ tableHeader: true, children: [
        cell('PROJUSTITIA', { bold: true, center: true, bg: HEADER_BG, colSpan: PROJUS_COLS.length * 2 + 1, sz: FONT_SM }),
    ]});
    const hr3 = new TableRow({ tableHeader: true, children: [
        ...PROJUS_COLS.map(col => cell(PROJUS_COL_LABELS[col], { bold: true, center: true, bg: HEADER_BG, colSpan: 2, sz: FONT_SM, w: colW * 2 })),
        cell('JUMLAH', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, sz: FONT_SM, w: jumlW }),
    ]});
    const hr4 = new TableRow({ tableHeader: true, children: [
        ...PROJUS_COLS.flatMap(() => [
            cell('L', { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: colW }),
            cell('P', { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: colW }),
        ]),
    ]});

    const allZero = PROJUS_DEFAULT_ROWS.every(row =>
        PROJUS_COLS.every(c => !(projusData?.[row.id]?.[c]?.l) && !(projusData?.[row.id]?.[c]?.p))
    );
    const dataRows = allZero
        ? [new TableRow({ children: [cell('NIHIL', { center: true, colSpan: PROJUS_COLS.length * 2 + 3, sz: FONT_SM })] })]
        : PROJUS_DEFAULT_ROWS.map(defRow => {
            const t = totals[defRow.id] || {};
            return new TableRow({ children: [
                cell(defRow.no, { center: true, sz: FONT_SM, w: noW }),
                cell(t.pasal || '', { sz: FONT_SM, w: pasW }),
                ...PROJUS_COLS.flatMap(col => [
                    numCell(t[col]?.l, { sz: FONT_SM, w: colW }),
                    numCell(t[col]?.p, { sz: FONT_SM, w: colW }),
                ]),
                numCell(t.jumlah, { sz: FONT_SM, w: jumlW }),
            ]});
        });
    const totalRow = new TableRow({ children: [
        cell('JUMLAH', { bold: true, center: true, bg: GRAND_BG, colSpan: 2, sz: FONT_SM }),
        ...PROJUS_COLS.flatMap(col => [
            numCell(totals.total?.[col]?.l, { bg: GRAND_BG, bold: true, sz: FONT_SM }),
            numCell(totals.total?.[col]?.p, { bg: GRAND_BG, bold: true, sz: FONT_SM }),
        ]),
        numCell(totals.total?.jumlah, { bg: GRAND_BG, bold: true, sz: FONT_SM }),
    ]});
    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr1, hr2, hr3, hr4, ...dataRows, totalRow] });
}

function buildTAKDocx(takData) {
    const totals = calcTAKTotals(takData || {});
    const noW   = Math.round(PAGE_W * 0.04);
    const pasW  = Math.round(PAGE_W * 0.20);
    const jumlW = Math.round(PAGE_W * 0.06);
    const colW  = Math.round((PAGE_W - noW - pasW - jumlW) / (TAK_COLS.length * 2));

    const hr1 = new TableRow({ tableHeader: true, children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, rowSpan: 3, sz: FONT_XS, w: noW }),
        cell('PASAL YANG DILANGGAR', { bold: true, center: true, bg: HEADER_BG, rowSpan: 3, sz: FONT_XS, w: pasW }),
        cell('PELANGGARAN KEIMIGRASIAN', { bold: true, center: true, bg: HEADER_BG, colSpan: TAK_COLS.length * 2 + 1, sz: FONT_XS }),
    ]});
    const hr2 = new TableRow({ tableHeader: true, children: [
        cell('TINDAKAN ADMINISTRATIF KEIMIGRASIAN', { bold: true, center: true, bg: HEADER_BG, colSpan: TAK_COLS.length * 2 + 1, sz: FONT_XS }),
    ]});
    const hr3 = new TableRow({ tableHeader: true, children: [
        ...TAK_COLS.map(col => cell(TAK_COL_LABELS[col], { bold: true, center: true, bg: HEADER_BG, colSpan: 2, sz: FONT_XS, w: colW * 2 })),
        cell('JUMLAH', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, sz: FONT_XS, w: jumlW }),
    ]});
    const hr4 = new TableRow({ tableHeader: true, children: [
        ...TAK_COLS.flatMap(() => [
            cell('L', { bold: true, center: true, bg: HEADER_BG, sz: FONT_XS, w: colW }),
            cell('P', { bold: true, center: true, bg: HEADER_BG, sz: FONT_XS, w: colW }),
        ]),
    ]});

    const allZero = TAK_DEFAULT_ROWS.every(row =>
        TAK_COLS.every(c => !(takData?.[row.id]?.[c]?.l) && !(takData?.[row.id]?.[c]?.p))
    );
    const dataRows = allZero
        ? [new TableRow({ children: [cell('NIHIL', { center: true, colSpan: TAK_COLS.length * 2 + 3, sz: FONT_XS })] })]
        : TAK_DEFAULT_ROWS.map(defRow => {
            const t = totals[defRow.id] || {};
            return new TableRow({ children: [
                cell(defRow.no, { center: true, sz: FONT_XS, w: noW }),
                cell(t.pasal || '', { sz: FONT_XS, w: pasW }),
                ...TAK_COLS.flatMap(col => [
                    numCell(t[col]?.l, { sz: FONT_XS, w: colW }),
                    numCell(t[col]?.p, { sz: FONT_XS, w: colW }),
                ]),
                numCell(t.jumlah, { sz: FONT_XS, w: jumlW }),
            ]});
        });
    const totalRow = new TableRow({ children: [
        cell('JUMLAH', { bold: true, center: true, bg: GRAND_BG, colSpan: 2, sz: FONT_XS }),
        ...TAK_COLS.flatMap(col => [
            numCell(totals.total?.[col]?.l, { bg: GRAND_BG, bold: true, sz: FONT_XS }),
            numCell(totals.total?.[col]?.p, { bg: GRAND_BG, bold: true, sz: FONT_XS }),
        ]),
        numCell(totals.total?.jumlah, { bg: GRAND_BG, bold: true, sz: FONT_XS }),
    ]});
    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr1, hr2, hr3, hr4, ...dataRows, totalRow] });
}

function buildTimporaDocx(timporaData, bulanName, tahun) {
    const noW  = Math.round(PAGE_W * 0.06);
    const namW = Math.round(PAGE_W * 0.22);
    const colW = Math.round((PAGE_W - noW - namW) / 4);

    const allEmpty = TIMPORA_ROWS.every(row =>
        !timporaData?.[row.id]?.rapat_waktu && !timporaData?.[row.id]?.rapat_ket &&
        !timporaData?.[row.id]?.ops_waktu   && !timporaData?.[row.id]?.ops_ket
    );
    const titleRow = new TableRow({ children: [
        cell(`TIMPORA BULAN ${(bulanName || '').toUpperCase()} ${tahun || ''}`, { bold: true, center: true, bg: HEADER_BG, colSpan: 6, sz: FONT_SIZE }),
    ]});
    const hr1 = new TableRow({ tableHeader: true, children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, rowSpan: 3, sz: FONT_SM, w: noW }),
        cell('TIM PORA', { bold: true, center: true, bg: HEADER_BG, rowSpan: 3, sz: FONT_SM, w: namW }),
        cell('KEGIATAN', { bold: true, center: true, bg: HEADER_BG, colSpan: 4, sz: FONT_SM }),
    ]});
    const hr2 = new TableRow({ tableHeader: true, children: [
        cell('RAPAT KOORDINASI',  { bold: true, center: true, bg: HEADER_BG, colSpan: 2, sz: FONT_SM }),
        cell('OPERASI GABUNGAN',  { bold: true, center: true, bg: HEADER_BG, colSpan: 2, sz: FONT_SM }),
    ]});
    const hr3 = new TableRow({ tableHeader: true, children: [
        cell('WAKTU PELAKSANAAN', { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: colW }),
        cell('KETERANGAN',        { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: colW }),
        cell('WAKTU PELAKSANAAN', { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: colW }),
        cell('KETERANGAN',        { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: colW }),
    ]});
    const dataRows = allEmpty
        ? [new TableRow({ children: [cell('NIHIL', { center: true, colSpan: 6, sz: FONT_SM })] })]
        : TIMPORA_ROWS.map(row => {
            const d = timporaData?.[row.id] || {};
            const bg = row.isHeader ? 'dce6f1' : null;
            if (row.isHeader) {
                return new TableRow({ children: [
                    cell(row.no,    { center: true, bold: true, bg, sz: FONT_SM, w: noW }),
                    cell(row.label, { bold: true,   bg,         sz: FONT_SM, w: namW }),
                    cell('', { bg, colSpan: 4, sz: FONT_SM }),
                ]});
            }
            return new TableRow({ children: [
                cell(row.no,               { center: true, bg, sz: FONT_SM, w: noW }),
                cell(d.label || row.label, { bg, sz: FONT_SM, w: namW }),
                cell(d.rapat_waktu || '-', { center: true, bg, sz: FONT_SM, w: colW }),
                cell(d.rapat_ket   || '-', { center: true, bg, sz: FONT_SM, w: colW }),
                cell(d.ops_waktu   || '-', { center: true, bg, sz: FONT_SM, w: colW }),
                cell(d.ops_ket     || '-', { center: true, bg, sz: FONT_SM, w: colW }),
            ]});
        });
    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [titleRow, hr1, hr2, hr3, ...dataRows] });
}

/**
 * Build native DOCX elements for Inteldakim section.
 * @param {'projus'|'tak'|'timpora'} part
 * @param {object} templateData  — full inteldakim template_data from Supabase
 * @param {string} bulanName     — e.g. 'April'
 * @param {string|number} tahun
 */
export function getInteldakimDocxElements(part, templateData, bulanName, tahun) {
    const data = templateData || {};
    if (part === 'projus')  return [buildProjusDocx(data.projus   || {}), spacer()];
    if (part === 'tak')     return [buildTAKDocx(data.tak          || {}), spacer()];
    if (part === 'timpora') return [buildTimporaDocx(data.timpora  || {}, bulanName, tahun), spacer()];
    return [];
}


/* ══════════════════════════════════════════════════════════════════════════════
   INFOKIM & PENGADUAN DOCX BUILDERS
══════════════════════════════════════════════════════════════════════════════ */

function buildInfokimDocx(infokimData, bulanName, tahun) {
    const noW  = Math.round(PAGE_W * 0.07);
    const ketW = Math.round(PAGE_W * 0.73);
    const jmlW = Math.round(PAGE_W * 0.20);
    const titleRow = new TableRow({ children: [
        cell(`5. INFORMASI DAN KOMUNIKASI`, { bold: true, center: true, bg: HEADER_BG, colSpan: 3, sz: FONT_SIZE }),
    ]});
    const subTitleRow = new TableRow({ children: [
        cell(`${(bulanName || '').toUpperCase()} ${tahun || ''}`, { center: true, bg: HEADER_BG, colSpan: 3, sz: FONT_SM }),
    ]});
    const headerRow = new TableRow({ tableHeader: true, children: [
        cell('NO.',         { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: noW }),
        cell('KETERANGAN',  { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: ketW }),
        cell('JUMLAH',      { bold: true, center: true, bg: HEADER_BG, sz: FONT_SM, w: jmlW }),
    ]});
    const dataRows = INFOKIM_ROWS.map(row => {
        const val = Number(infokimData?.[row.id]?.jumlah) || 0;
        return new TableRow({ children: [
            cell(row.no, { center: true, sz: FONT_SM, w: noW }),
            cell(row.label, { sz: FONT_SM, w: ketW }),
            cell(val > 0 ? String(val) : '-', { center: true, sz: FONT_SM, w: jmlW }),
        ]});
    });
    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [titleRow, subTitleRow, headerRow, ...dataRows] });
}

function buildPengaduanDocx(pgRows, bulanName, tahun) {
    const rows = pgRows || [];
    // Landscape page width is ~14400 DXA. Fixed No(4%) + 13cols even split
    const noCW  = Math.round(PAGE_W * 0.04);
    const colCW = Math.round((PAGE_W - noCW) / PENGADUAN_COLS.length);

    const titleRow = new TableRow({ children: [
        cell(`6. PENGADUAN MASYARAKAT`, { bold: true, center: true, bg: HEADER_BG, colSpan: PENGADUAN_COLS.length + 1, sz: FONT_SIZE }),
    ]});
    const subTitleRow = new TableRow({ children: [
        cell(`${(bulanName || '').toUpperCase()} ${tahun || ''}`, { center: true, bg: HEADER_BG, colSpan: PENGADUAN_COLS.length + 1, sz: FONT_SM }),
    ]});

    const headerRow = new TableRow({ tableHeader: true, children: [
        cell('No', { bold: true, center: true, bg: HEADER_BG, sz: FONT_XS, w: noCW }),
        ...PENGADUAN_COLS.map(col => cell(col.label, { bold: true, center: true, bg: HEADER_BG, sz: FONT_XS, w: colCW })),
    ]});

    const dataRows = rows.length === 0
        ? [new TableRow({ children: [cell('NIHIL', { center: true, colSpan: PENGADUAN_COLS.length + 1, sz: FONT_SM })] })]
        : rows.map((row, idx) => new TableRow({ children: [
            cell(String(idx + 1), { center: true, sz: FONT_XS, w: noCW }),
            ...PENGADUAN_COLS.map(col => cell(row[col.key] || '-', { sz: FONT_XS, w: colCW })),
        ]}));

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [titleRow, subTitleRow, headerRow, ...dataRows] });
}

/**
 * Build DOCX elements for Infokim (Section 5) or Pengaduan (Section 6).
 * @param {'infokim'|'pengaduan'} part
 * @param {object|Array} templateData  — template_data from Supabase
 * @param {string} bulanName
 * @param {string|number} tahun
 */
export function getInfokimDocxElements(part, templateData, bulanName, tahun) {
    if (part === 'infokim') {
        return [buildInfokimDocx(templateData?.infokim || {}, bulanName, tahun), spacer()];
    }
    if (part === 'pengaduan') {
        return [buildPengaduanDocx(templateData?.pengaduan || [], bulanName, tahun), spacer()];
    }
    return [];
}





/* ══════════════════════════════════════════════════════════════════════════════
   RAW DOCX ELEMENTS BUILDER
   For integration into the main Gabung Laporan export pipeline.
══════════════════════════════════════════════════════════════════════════════ */
export function getLalintalkimDocxElements(part, templateData) {
    const {
        tabel_a = {}, tabel_b = {}, tabel_c = {}, tabel_d = {},
        tabel_e = {}, tabel_f = {}, tabel_g = {}, tabel_h = {},
        tabel_itk = {}, tabel_itas = {}, tabel_itap = {}, tabel_lain = {},
        tabel_udara = {}, tabel_laut = {}, tabel_darat = {}
    } = templateData || {};

    if (!part || part === 'all') {
        const parts = [
            'bab2_substantif_dokumen_paspor', 'bab2_substantif_dokumen_paspor_b', 
            'bab2_substantif_dokumen_paspor_c', 'bab2_substantif_dokumen_paspor_d',
            'bab2_substantif_dokumen_paspor_e', 'bab2_substantif_dokumen_paspor_f',
            'bab2_substantif_dokumen_paspor_g', 'bab2_substantif_dokumen_paspor_h',
            'bab2_substantif_rekapitulasi',
            'bab2_substantif_dokumen_izintinggal_itk', 'bab2_substantif_dokumen_izintinggal_itas',
            'bab2_substantif_dokumen_izintinggal_itap', 'bab2_substantif_dokumen_izintinggal_lain'
        ];
        const allElems = [];
        parts.forEach(p => allElems.push(...getLalintalkimDocxElements(p, templateData)));
        return allElems;
    }

    switch (part) {
        case 'bab2_substantif_dokumen_paspor':
            return [
                subHeading('a. Data Penerbitan Paspor pada Kantor Imigrasi Kelas II TPI Pematang Siantar'),
                buildTabelA(tabel_a),
                spacer()
            ];
        case 'bab2_substantif_dokumen_paspor_b':
            return [
                subHeading('b. Paspor pada Unit Layanan Paspor (ULP) Tebing Tinggi'),
                buildTabelB(tabel_b),
                spacer()
            ];
        case 'bab2_substantif_dokumen_paspor_c':
            return [
                subHeading('c. Paspor pada Unit Kerja Kantor (UKK) Dolok Sanggul'),
                buildTabelC(tabel_c),
                spacer()
            ];
        case 'bab2_substantif_dokumen_paspor_d':
            return [
                subHeading('d. Paspor pada UKK Tarutung — Paspor 48H'),
                buildTabelMultiHeader('d', tabel_d, TABEL_D_ROWS),
                spacer()
            ];
        case 'bab2_substantif_dokumen_paspor_e':
            return [
                subHeading('e. Paspor pada ULP Tebing Tinggi — Paspor 24H'),
                buildTabelMultiHeader('e', tabel_e, TABEL_E_ROWS),
                spacer()
            ];
        case 'bab2_substantif_dokumen_paspor_f':
            return [
                subHeading('f. Paspor pada UKK Tarutung — Paspor 24H'),
                buildTabelMultiHeader('f', tabel_f, TABEL_F_ROWS),
                spacer()
            ];
        case 'bab2_substantif_dokumen_paspor_g':
            return [
                subHeading('g. Pas Lintas Batas (PLB)'),
                buildTabelSimple('g', tabel_g, TABEL_G_ROWS),
                spacer()
            ];
        case 'bab2_substantif_dokumen_paspor_h':
             return [
                subHeading('h. Surat Perjalanan Laksana Paspor (SPLP)'),
                buildTabelSimple('h', tabel_h, TABEL_H_ROWS),
                spacer()
            ];
        case 'bab2_substantif_dokumen_izintinggal_itk':
            return [
                subHeading('a. Izin Tinggal Kunjungan (ITK)'),
                buildTabelSimple('itk', tabel_itk, TABEL_ITK_ROWS),
                spacer()
            ];
        case 'bab2_substantif_dokumen_izintinggal_itas':
            return [
                subHeading('b. Izin Tinggal Terbatas (ITAS)'),
                buildTabelSimple('itas', tabel_itas, TABEL_ITAS_ROWS),
                spacer()
            ];
        case 'bab2_substantif_dokumen_izintinggal_itap':
            return [
                subHeading('c. Izin Tinggal Tetap (ITAP)'),
                buildTabelSimple('itap', tabel_itap, TABEL_ITAP_ROWS),
                spacer()
            ];
        case 'bab2_substantif_dokumen_izintinggal_lain':
            return [
                subHeading('d. LAIN-LAIN'),
                buildTabelSimple('lain', tabel_lain, TABEL_LAIN_ROWS),
                spacer()
            ];
        case 'bab2_substantif_rekapitulasi':
            return [
                buildTabelPerlintasan('udara', tabel_udara, TABEL_PERLINTASAN_ROWS, 'TPI UDARA SILANGIT'),
                spacer(),
                buildTabelPerlintasan('laut', tabel_laut, TABEL_PERLINTASAN_ROWS, 'TPI LAUT'),
                spacer(),
                buildTabelPerlintasan('darat', tabel_darat, TABEL_PERLINTASAN_ROWS, 'TPI DARAT / POS LINTAS BATAS'),
                spacer()
            ];
        default:
            return [];
    }
}


/* ══════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT FUNCTION (standalone from TemplateLaporan page)
══════════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════════
   KEUANGAN & PNBP (SECTION 4 - TU)
══════════════════════════════════════════════════════════════════════════════ */
const formatRpDocx = (num) => {
    if (!num) return '-';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

const formatPctDocx = (num) => {
    if (!num) return '-';
    return Number(num).toFixed(2).replace('.', ',') + '%';
};

function buildRealisasiDocx(dataArray) {
    const { rows, total } = calcRealisasiTotals(dataArray || []);

    // Table widths in dxa
    const wJenis = 3000, wPagu = 1800, wTargRp = 1800, wTargPct = 800, wRealRp = 1800, wRealPct = 800, wSisa = 1800, wKet = 2500;
    
    const h1 = new TableRow({ children: [
        cell('JENIS BELANJA', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: wJenis }),
        cell('PAGU', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: wPagu }),
        cell('TARGET', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('REALISASI', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('SISA DANA', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: wSisa }),
        cell('KETERANGAN', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: wKet })
    ], tableHeader: true });

    const h2 = new TableRow({ children: [
        cell('Rp.', { bold: true, center: true, bg: HEADER_BG, w: wTargRp }),
        cell('(%)', { bold: true, center: true, bg: HEADER_BG, w: wTargPct }),
        cell('Rp.', { bold: true, center: true, bg: HEADER_BG, w: wRealRp }),
        cell('(%)', { bold: true, center: true, bg: HEADER_BG, w: wRealPct })
    ], tableHeader: true });

    const dataRows = (rows || []).map(r => {
        const pt = r.pagu === 0;
        return new TableRow({ children: [
            cell(r.label || '', {}),
            numCell(r.pagu, { bg: pt ? 'fafafa' : null }),
            pt ? cell('-', { center: true }) : numCell(r.target_rp),
            pt ? cell('-', { center: true }) : cell(formatPctDocx(r.target_pct), { center: true }),
            pt ? cell('-', { center: true }) : numCell(r.realisasi_rp),
            pt ? cell('-', { center: true }) : cell(formatPctDocx(r.realisasi_pct), { center: true }),
            pt ? cell('-', { center: true }) : numCell(r.sisa_dana),
            cell(r.keterangan || '')
        ]});
    });

    const totalRow = new TableRow({ children: [
        cell('JUMLAH', { bold: true, center: true }),
        cell(formatRpDocx(total?.pagu), { bold: true, center: true }),
        cell(formatRpDocx(total?.target_rp), { bold: true, center: true }),
        cell(formatPctDocx(total?.target_pct), { bold: true, center: true }),
        cell(formatRpDocx(total?.realisasi_rp), { bold: true, center: true }),
        cell(formatPctDocx(total?.realisasi_pct), { bold: true, center: true }),
        cell(formatRpDocx(total?.sisa_dana), { bold: true, center: true }),
        cell('', {})
    ]});

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [h1, h2, ...dataRows, totalRow] });
}

function buildGabunganDocx(rmData, pnpData) {
    const data = calcGabungan(rmData || [], pnpData || []);
    const { rows, total } = data; // use already computed data

    // Re-pack it as if it's normal data for the builder code block format
    const tempRows = (rows || []).map(r => {
        const pt = r.pagu === 0;
        return new TableRow({ children: [
            cell(r.label || '', {}),
            numCell(r.pagu, { bg: pt ? 'fafafa' : null }),
            pt ? cell('-', { center: true }) : numCell(r.target_rp),
            pt ? cell('-', { center: true }) : cell(formatPctDocx(r.target_pct), { center: true }),
            pt ? cell('-', { center: true }) : numCell(r.realisasi_rp),
            pt ? cell('-', { center: true }) : cell(formatPctDocx(r.realisasi_pct), { center: true }),
            pt ? cell('-', { center: true }) : numCell(r.sisa_dana),
            cell(r.keterangan || '')
        ]});
    });

    const wJenis = 3000, wPagu = 1800, wTargRp = 1800, wTargPct = 800, wRealRp = 1800, wRealPct = 800, wSisa = 1800, wKet = 2500;
    const h1 = new TableRow({ children: [
        cell('JENIS BELANJA', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: wJenis }),
        cell('PAGU', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: wPagu }),
        cell('TARGET', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('REALISASI', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('SISA DANA', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: wSisa }),
        cell('KETERANGAN', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: wKet })
    ], tableHeader: true });

    const h2 = new TableRow({ children: [
        cell('Rp.', { bold: true, center: true, bg: HEADER_BG, w: wTargRp }),
        cell('(%)', { bold: true, center: true, bg: HEADER_BG, w: wTargPct }),
        cell('Rp.', { bold: true, center: true, bg: HEADER_BG, w: wRealRp }),
        cell('(%)', { bold: true, center: true, bg: HEADER_BG, w: wRealPct })
    ], tableHeader: true });

    const totalRow = new TableRow({ children: [
        cell('JUMLAH', { bold: true, center: true }),
        cell(formatRpDocx(total?.pagu), { bold: true, center: true }),
        cell(formatRpDocx(total?.target_rp), { bold: true, center: true }),
        cell(formatPctDocx(total?.target_pct), { bold: true, center: true }),
        cell(formatRpDocx(total?.realisasi_rp), { bold: true, center: true }),
        cell(formatPctDocx(total?.realisasi_pct), { bold: true, center: true }),
        cell(formatRpDocx(total?.sisa_dana), { bold: true, center: true }),
        cell('', {})
    ]});

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [h1, h2, ...tempRows, totalRow] });
}

function buildBendaharaDocx(dataArray) {
    const { rows, total } = calcBendaharaTotals(dataArray || []);

    const cw = [800, 1500, 5000, 2000, 2500, 2500];
    const headerRow = new TableRow({ children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, w: cw[0] }),
        cell('KODE AKUN', { bold: true, center: true, bg: HEADER_BG, w: cw[1] }),
        cell('JENIS PENDAPATAN', { bold: true, center: true, bg: HEADER_BG, w: cw[2] }),
        cell('TARGET', { bold: true, center: true, bg: HEADER_BG, w: cw[3] }),
        cell('REALISASI SIMPONI', { bold: true, center: true, bg: HEADER_BG, w: cw[4] }),
        cell('REALISASI SPAN', { bold: true, center: true, bg: HEADER_BG, w: cw[5] })
    ], tableHeader: true });

    const dataRows = (rows || []).map(r => new TableRow({ children: [
        cell(r.no || '', { center: true }),
        cell(r.akun || '', { center: true }),
        cell(r.label || '', {}),
        numCell(r.target, {}),
        numCell(r.realisasi_simponi, {}),
        numCell(r.realisasi_span, {})
    ]}));

    const totalRow = new TableRow({ children: [
        cell('TOTAL', { bold: true, center: true, colSpan: 3 }),
        cell(formatRpDocx(total?.target), { bold: true, center: true }),
        cell(formatRpDocx(total?.realisasi_simponi), { bold: true, center: true }),
        cell(formatRpDocx(total?.realisasi_span), { bold: true, center: true })
    ]});

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [headerRow, ...dataRows, totalRow] });
}

/**
 * Build DOCX elements for Keuangan (Section 4).
 * @param {'rm'|'pnp'|'gabungan'|'bendahara'} part
 * @param {object|Array} templateData  — template_data from Supabase
 * @param {string} bulanName
 * @param {string|number} tahun
 */
export function getKeuanganDocxElements(part, templateData, bulanName, tahun) {
    let kData = templateData?.keuangan;
    if (!kData || Object.keys(kData).length === 0) {
        kData = {
            rm: getDefaultRealisasiData(),
            pnp: getDefaultRealisasiData(),
            bendahara: getDefaultBendaharaData()
        };
    }

    if (part === 'rm') {
        return [
            subHeading('1) URUSAN KEUANGAN'),
            subHeading('1. LAPORAN REALISASI PENYERAPAN ANGGARAN (BERDASARKAN JENIS BELANJA)'),
            spacer(),
            subHeading('a. Rupiah Murni (RM)'),
            buildRealisasiDocx(kData.rm || []),
            spacer()
        ];
    }
    if (part === 'pnp') {
        return [
            subHeading('b. Penerimaan Non Pajak (PNBP)'),
            buildRealisasiDocx(kData.pnp || []),
            spacer()
        ];
    }
    if (part === 'gabungan') {
        return [
            subHeading('c. Rupiah Murni + PNBP'),
            buildGabunganDocx(kData.rm || [], kData.pnp || []),
            spacer()
        ];
    }
    if (part === 'bendahara') {
        return [
            subHeading('2. PENERIMAAN NEGARA BUKAN PAJAK (PNBP)'),
            subHeading('LAPORAN BENDAHARA PENERIMA'),
            spacer(),
            buildBendaharaDocx(kData.bendahara || []),
            spacer()
        ];
    }
    return [];
}


/* ══════════════════════════════════════════════════════════════════════════════
   KEPEGAWAIAN (SECTION 4 - TU - BEZETTING)
══════════════════════════════════════════════════════════════════════════════ */
function buildPegawaiDetailDocx(detail) {
    const cw = [600, 2000, 1600, 900, 1500, 800, 800, 800, 1500, 1200, 1200, 1000];
    const headerRow = new TableRow({ children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, w: cw[0] }),
        cell('NAMA', { bold: true, center: true, bg: HEADER_BG, w: cw[1] }),
        cell('NIP', { bold: true, center: true, bg: HEADER_BG, w: cw[2] }),
        cell('JENIS\nKELAMIN', { bold: true, center: true, bg: HEADER_BG, w: cw[3] }),
        cell('JABATAN', { bold: true, center: true, bg: HEADER_BG, w: cw[4] }),
        cell('ESELON', { bold: true, center: true, bg: HEADER_BG, w: cw[5] }),
        cell('PANGKAT\n/ GOL', { bold: true, center: true, bg: HEADER_BG, w: cw[6] }),
        cell('TMT\nGOL', { bold: true, center: true, bg: HEADER_BG, w: cw[7] }),
        cell('PENDIDIKAN', { bold: true, center: true, bg: HEADER_BG, w: cw[8] }),
        cell('DIKLAT\nTEKNIS', { bold: true, center: true, bg: HEADER_BG, w: cw[9] }),
        cell('DIKLAT\nLAINNYA', { bold: true, center: true, bg: HEADER_BG, w: cw[10] }),
        cell('KET', { bold: true, center: true, bg: HEADER_BG, w: cw[11] })
    ], tableHeader: true });

    const rows = (detail || []).length > 0 ? (detail || []) : [getEmptyPegawaiRow()];
    const dataRows = rows.map((r, idx) => new TableRow({ children: [
        cell(String(idx + 1).padStart(2, '0'), { center: true }),
        cell(r.nama || '', {}),
        cell(r.nip || '', { center: true }),
        cell(r.jenis_kelamin || '', { center: true }),
        cell(r.jabatan || '', {}),
        cell(r.eselon || '', { center: true }),
        cell(r.pangkat_gol || '', { center: true }),
        cell(r.tmt_gol || '', { center: true }),
        cell(r.pendidikan || '', { center: true }),
        cell(r.diklat_teknis || '', { center: true }),
        cell(r.diklat_lainnya || '', { center: true }),
        cell(r.keterangan || '', { center: true })
    ]}));

    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [headerRow, ...dataRows] });
}

function buildSummaryDocx(title, dataArray, totalKey) {
    const cw = [800, 3000, 1500];
    const headerRow = new TableRow({ children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, w: cw[0] }),
        cell('URAIAN', { bold: true, center: true, bg: HEADER_BG, w: cw[1] }),
        cell('JUMLAH', { bold: true, center: true, bg: HEADER_BG, w: cw[2] })
    ], tableHeader: true });

    const dataRows = (dataArray || []).map((r, idx) => new TableRow({ children: [
        cell(idx + 1, { center: true }),
        cell(r.label || '', {}),
        numCell(r.value || 0, {})
    ]}));

    const totalRow = new TableRow({ children: [
        cell('JUMLAH TOTAL', { bold: true, center: true, colSpan: 2 }),
        cell(totalKey, { bold: true, center: true, bg: TOTAL_BG })
    ]});

    return new Table({ width: { size: 5300, type: WidthType.DXA }, rows: [headerRow, ...dataRows, totalRow], margins: { bottom: 200 } });
}

function buildPegawaiPPPKDocx(data) {
    const cw = [500, 2500, 800, 1500, 1000, 800, 800, 1800, 800, 1500, 2500];

    const headerRow1 = new TableRow({ children: [
        cell('No.', { bold: true, center: true, bg: HEADER_BG, w: cw[0], rowSpan: 2 }),
        cell('Nama Lengkap\n(Tanpa Gelar)', { bold: true, center: true, bg: HEADER_BG, w: cw[1], rowSpan: 2 }),
        cell('TEMPAT LAHIR', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('Tanggal Lahir\n(dd-mm-yyyy)', { bold: true, center: true, bg: HEADER_BG, w: cw[4], rowSpan: 2 }),
        cell('Jenis\nKelamin\n(P/L)', { bold: true, center: true, bg: HEADER_BG, w: cw[5], rowSpan: 2 }),
        cell('PENDIDIKAN TERAKHIR', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('JABATAN TERAKHIR', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('Unit Kerja', { bold: true, center: true, bg: HEADER_BG, w: cw[10], rowSpan: 2 })
    ], tableHeader: true });

    const headerRow2 = new TableRow({ children: [
        // No., Nama skipped (rowspan)
        cell('Kode', { bold: true, center: true, bg: HEADER_BG, w: cw[2] }),
        cell('Nama\n(Daerah Tingkat 2)', { bold: true, center: true, bg: HEADER_BG, w: cw[3] }),
        // Tgl, JK skipped
        cell('Kode', { bold: true, center: true, bg: HEADER_BG, w: cw[6] }),
        cell('Nama', { bold: true, center: true, bg: HEADER_BG, w: cw[7] }),
        // Jabatan
        cell('Kode', { bold: true, center: true, bg: HEADER_BG, w: cw[8] }),
        cell('Nama', { bold: true, center: true, bg: HEADER_BG, w: cw[9] })
        // Unit kerja skipped
    ], tableHeader: true });

    const rows = (data || []).length > 0 ? (data || []) : [getEmptyPPPKRow()];
    const dataRows = rows.map((r, idx) => new TableRow({ children: [
        cell(idx + 1, { center: true }),
        cell(r.nama_lengkap || '', {}),
        cell(r.tl_kode || '', { center: true }),
        cell(r.tl_nama || '', {}),
        cell(r.tgl_lahir || '', { center: true }),
        cell(r.jk || '', { center: true }),
        cell(r.pend_kode || '', { center: true }),
        cell(r.pend_nama || '', {}),
        cell(r.jab_kode || '', { center: true }),
        cell(r.jab_nama || '', {}),
        cell(r.unit_kerja || '', {})
    ]}));

    const titlePara = new Paragraph({
        children: [
            new TextRun({ text: 'DAFTAR NAMA PEGAWAI PPPK', bold: true, size: 20 }),
            new TextRun({ text: '\nKANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR', bold: true, size: 20 })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 }
    });

    return [titlePara, new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [headerRow1, headerRow2, ...dataRows] })];
}

function buildPegawaiNonASNDocx(data) {
    const cw = [500, 2500, 800, 1500, 1000, 800, 800, 1800, 800, 1500, 2500];

    const headerRow1 = new TableRow({ children: [
        cell('No.', { bold: true, center: true, bg: HEADER_BG, w: cw[0], rowSpan: 2 }),
        cell('Nama Lengkap\n(Tanpa Gelar)', { bold: true, center: true, bg: HEADER_BG, w: cw[1], rowSpan: 2 }),
        cell('TEMPAT LAHIR', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('Tanggal Lahir\n(dd-mm-yyyy)', { bold: true, center: true, bg: HEADER_BG, w: cw[4], rowSpan: 2 }),
        cell('Jenis\nKelamin\n(P/L)', { bold: true, center: true, bg: HEADER_BG, w: cw[5], rowSpan: 2 }),
        cell('PENDIDIKAN TERAKHIR', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('JABATAN TERAKHIR', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('Unit Kerja', { bold: true, center: true, bg: HEADER_BG, w: cw[10], rowSpan: 2 })
    ], tableHeader: true });

    const headerRow2 = new TableRow({ children: [
        // No., Nama skipped (rowspan)
        cell('Kode', { bold: true, center: true, bg: HEADER_BG, w: cw[2] }),
        cell('Nama\n(Daerah Tingkat 2)', { bold: true, center: true, bg: HEADER_BG, w: cw[3] }),
        // Tgl, JK skipped
        cell('Kode', { bold: true, center: true, bg: HEADER_BG, w: cw[6] }),
        cell('Nama', { bold: true, center: true, bg: HEADER_BG, w: cw[7] }),
        // Jabatan
        cell('Kode', { bold: true, center: true, bg: HEADER_BG, w: cw[8] }),
        cell('Nama', { bold: true, center: true, bg: HEADER_BG, w: cw[9] })
        // Unit kerja skipped
    ], tableHeader: true });

    const rows = (data || []).length > 0 ? (data || []) : [getEmptyNonAsnRow()];
    const dataRows = rows.map((r, idx) => new TableRow({ children: [
        cell(idx + 1, { center: true }),
        cell(r.nama_lengkap || '', {}),
        cell(r.tl_kode || '', { center: true }),
        cell(r.tl_nama || '', {}),
        cell(r.tgl_lahir || '', { center: true }),
        cell(r.jk || '', { center: true }),
        cell(r.pend_kode || '', { center: true }),
        cell(r.pend_nama || '', {}),
        cell(r.jab_kode || '', { center: true }),
        cell(r.jab_nama || '', {}),
        cell(r.unit_kerja || '', {})
    ]}));

    const titlePara = new Paragraph({
        children: [
            new TextRun({ text: 'DAFTAR NAMA TENAGA NON ASN', bold: true, size: 20 }),
            new TextRun({ text: '\nKANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR', bold: true, size: 20 })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 }
    });

    return [titlePara, new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [headerRow1, headerRow2, ...dataRows] })];
}

function buildRekapitulasiPegawaiDocx(data) {
    const tblKeys = ['pangkat_a', 'pangkat_b', 'pangkat_c', 'pangkat_d', 'teknis_lk', 'teknis_pr', 'non_teknis_lk', 'non_teknis_pr', 'struktural_lk', 'struktural_pr', 'non_struktural_lk', 'non_struktural_pr'];
    const calcC = (field) => data.reduce((s, r) => s + (parseInt(r[field]) || 0), 0);

    const hr1 = new TableRow({ children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: 400 }),
        cell('GOLONGAN', { bold: true, center: true, bg: HEADER_BG, rowSpan: 2, w: 1000 }),
        cell('PANGKAT', { bold: true, center: true, bg: HEADER_BG, colSpan: 4 }),
        cell('TEKNIS', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('NON TEKNIS', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('STRUKTURAL', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 }),
        cell('NON STRUKTURAL', { bold: true, center: true, bg: HEADER_BG, colSpan: 2 })
    ], tableHeader: true });

    const hr2 = new TableRow({ children: [
        ...['A', 'B', 'C', 'D'].map(k => cell(k, { bold: true, center: true, bg: HEADER_BG, w: 500 })),
        ...Array(8).fill(null).map((_, i) => cell(i % 2 === 0 ? 'LK' : 'PR', { bold: true, center: true, bg: HEADER_BG, w: 600 }))
    ], tableHeader: true });

    const rows = data.length === 0
        ? [new TableRow({ children: [
            cell('01.', { center: true }),
            cell('Nihil', { center: true, colSpan: 13 })
        ]})]
        : data.map((r, i) => new TableRow({ children: [
            cell(String(i + 1).padStart(2, '0') + '.', { center: true }),
            cell(r.name, { center: true }),
            ...tblKeys.map(k => cell(r[k] || 0, { center: true }))
        ]}));

    const sumRow = new TableRow({ children: [
        cell('JUMLAH', { bold: true, center: true, colSpan: 2, bg: '#f1f5f9' }),
        ...tblKeys.map(k => cell(calcC(k), { bold: true, center: true, bg: '#f1f5f9' }))
    ]});

    return [
        subHeading('2. Rekapitulasi Pegawai'),
        spacer(),
        new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr1, hr2, ...rows, sumRow] })
    ];
}

function buildDataCutiDocx(data, totalCuti) {
    const hr = new TableRow({ children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, w: 400 }),
        cell('PEGAWAI CUTI', { bold: true, center: true, bg: HEADER_BG, w: 4000 }),
        cell('JUMLAH', { bold: true, center: true, bg: HEADER_BG, w: 1000 }),
        cell('KETERANGAN', { bold: true, center: true, bg: HEADER_BG, w: 4000 })
    ], tableHeader: true });

    const rows = data.length === 0
        ? [new TableRow({ children: [
            cell('01.', { center: true }),
            cell('Nihil', { center: true }),
            cell('', {}),
            cell('', {})
        ]})]
        : data.map((r, i) => new TableRow({ children: [
            cell(String(i + 1).padStart(2, '0') + '.', { center: true }),
            cell(r.nama, {}),
            cell(r.jumlah || 0, { center: true }),
            cell(r.ket || '', {})
        ]}));

    const sumRow = new TableRow({ children: [
        cell('JUMLAH', { bold: true, center: true, colSpan: 2, bg: '#f1f5f9' }),
        cell(totalCuti, { bold: true, center: true, bg: '#f1f5f9' }),
        cell('', { bg: '#f1f5f9' })
    ]});

    return [
        subHeading('3. Data Cuti Pegawai'),
        spacer(),
        new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr, ...rows, sumRow] })
    ];
}

function buildPembinaanDocx(data) {
    const hr = new TableRow({ children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, w: 400 }),
        cell('JENIS KEGIATAN', { bold: true, center: true, bg: HEADER_BG, w: 6000 }),
        cell('KETERANGAN', { bold: true, center: true, bg: HEADER_BG, w: 3000 })
    ], tableHeader: true });

    const rows = data.length === 0
        ? [new TableRow({ children: [
            cell('01.', { center: true }),
            cell('Nihil', { center: true }),
            cell('', {})
        ]})]
        : data.map((r, i) => new TableRow({ children: [
            cell(String(i + 1).padStart(2, '0') + '.', { center: true }),
            cell(r.nama, {}),
            cell(r.ket || '', { center: true })
        ]}));

    return [
        subHeading('4. Pembinaan Pegawai'),
        spacer(),
        new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr, ...rows] })
    ];
}

function buildTataUsahaDocx(data) {
    const hr = new TableRow({ children: [
        cell('NO', { bold: true, center: true, bg: HEADER_BG, w: 400 }),
        cell('JENIS KEGIATAN', { bold: true, center: true, bg: HEADER_BG, w: 6000 }),
        cell('JUMLAH', { bold: true, center: true, bg: HEADER_BG, w: 3000 })
    ], tableHeader: true });

    const rows = data.length === 0
        ? [new TableRow({ children: [
            cell('01.', { center: true }),
            cell('Nihil', { center: true }),
            cell('', {})
        ]})]
        : data.map((r, i) => new TableRow({ children: [
            cell(String(i + 1).padStart(2, '0') + '.', { center: true }),
            cell(r.nama, {}),
            cell(r.jumlah || 0, { center: true })
        ]}));

    return [
        subHeading('5. Tata Usaha (Persuratan)'),
        spacer(),
        new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr, ...rows] })
    ];
}

export function getKepegawaianDocxElements(part, templateData, bulanName, tahun) {
    // Inject default schema if DB is completely empty for Kepegawaian
    let kData = templateData?.kepegawaian;
    if (!kData || Object.keys(kData).length === 0) {
        const defs = getDefaultKepegawaianData();
        kData = {
            detail: defs.detail,
            pppk: defs.pppk,
            non_asn: defs.non_asn,
            golongan: defs.golongan,
            jabatan: defs.jabatan,
            pendidikan: defs.pendidikan,
            gender: defs.gender,
            status: defs.status,
            rekap_pegawai: defs.rekap_pegawai,
            cuti: defs.cuti,
            pembinaan: defs.pembinaan,
            tata_usaha: defs.tata_usaha
        };
    }
    
    const t = calcAllTotals(kData);

    if (part === 'bezetting') {
        return [
            subHeading('2) URUSAN KEPEGAWAIAN'),
            subHeading('1. LAPORAN BEZETTING PEGAWAI'),
            buildPegawaiDetailDocx(kData.detail),
            spacer(),
            spacer(),
            ...buildPegawaiPPPKDocx(kData.pppk),
            spacer(),
            spacer(),
            ...buildPegawaiNonASNDocx(kData.non_asn),
            spacer(),
            spacer(),
            subHeading('1.1 REKAPITULASI BEZETTING'),
            spacer(),
            subHeading(kData.title_golongan || 'a. Berdasarkan Golongan'),
            buildSummaryDocx(kData.title_golongan, kData.golongan || [], t.golongan),
            spacer(),
            subHeading(kData.title_jabatan || 'b. Berdasarkan Jabatan'),
            buildSummaryDocx(kData.title_jabatan, kData.jabatan || [], t.jabatan),
            spacer(),
            subHeading(kData.title_pendidikan || 'c. Berdasarkan Pendidikan'),
            buildSummaryDocx(kData.title_pendidikan, kData.pendidikan || [], t.pendidikan),
            spacer(),
            subHeading(kData.title_gender || 'd. Berdasarkan Jenis Kelamin'),
            buildSummaryDocx(kData.title_gender, kData.gender || [], t.gender),
            spacer(),
            subHeading(kData.title_status || 'e. Berdasarkan Status'),
            buildSummaryDocx(kData.title_status, kData.status || [], t.status),
            spacer()
        ];
    } else if (part === 'rekap') {
        return [
            subHeading('2. Rekapitulasi Pegawai'),
            spacer(),
            ...buildRekapitulasiPegawaiDocx(kData.rekap_pegawai || []),
            spacer()
        ];
    } else if (part === 'cuti') {
        return [
            subHeading('3. Data Cuti Pegawai'),
            spacer(),
            ...buildDataCutiDocx(kData.cuti || [], t.cuti),
            spacer()
        ];
    } else if (part === 'pembinaan') {
        return [
            subHeading('4. Pembinaan Pegawai'),
            spacer(),
            ...buildPembinaanDocx(kData.pembinaan || []),
            spacer()
        ];
    } else if (part === 'persuratan') {
        return [
            ...buildTataUsahaDocx(kData.tata_usaha || []),
            spacer()
        ];
    }
    
    return [];
}


/* ══════════════════════════════════════════════════════════════════════════════
   URUSAN UMUM (KENDARAAN & SARANA) DOCX BUILDER
══════════════════════════════════════════════════════════════════════════════ */
const multiLineCell = (lines, opts = {}) => {
    const pChildren = lines.length === 0 
        ? [new Paragraph({ children: [new TextRun({ text: '', font: FONT_NAME, size: opts.sz || FONT_SIZE })], spacing: { before: 20, after: 20 }})]
        : lines.map(t => new Paragraph({
            alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [new TextRun({ text: String(t ?? ''), bold: !!opts.bold, font: FONT_NAME, size: opts.sz || FONT_SIZE })],
            spacing: { before: 20, after: 20 },
        }));

    return new TableCell({
        children: pChildren,
        shading: opts.bg ? clr(opts.bg) : undefined,
        columnSpan: opts.colSpan || 1,
        rowSpan: opts.rowSpan || 1,
        borders: ALL_BORDERS,
        verticalAlign: opts.vAlign || VerticalAlign.TOP,
        width: opts.w ? { size: opts.w, type: WidthType.DXA } : undefined,
        margins: { top: 30, bottom: 30, left: 80, right: 80 },
    });
};

function buildKendaraanDocx(data) {
    const W = [PAGE_W * 0.08, PAGE_W * 0.35, PAGE_W * 0.20, PAGE_W * 0.17, PAGE_W * 0.20].map(Math.round);

    const hr = new TableRow({
        tableHeader: true,
        children: [
            cell('NO', { bold: true, center: true, bg: HEADER_BG, w: W[0] }),
            cell('JENIS KENDERAAN', { bold: true, center: true, bg: HEADER_BG, w: W[1] }),
            cell('NO POLISI', { bold: true, center: true, bg: HEADER_BG, w: W[2] }),
            cell('TAHUN', { bold: true, center: true, bg: HEADER_BG, w: W[3] }),
            cell('KONDISI', { bold: true, center: true, bg: HEADER_BG, w: W[4] }),
        ]
    });

    const mkGroupRows = (title, items, num) => {
        const headerRow = new TableRow({ children: [
            cell(num, { center: true, bold: true, bg: '#f1f5f9' }),
            cell(title, { bold: true, colSpan: 4, bg: '#f1f5f9' })
        ]});

        if (!items || items.length === 0) {
            return [headerRow, new TableRow({ children: [
                cell('', {}),
                cell('— Nihil —', { center: true, fontStyle: 'italic', colSpan: 4, bg: '#f8fafc' })
            ]})];
        }
        
        const dataRows = items.map((r, i) => new TableRow({ children: [
            cell(i + 1, { center: true }),
            cell(r.jenis || ''),
            cell(r.nopol || '', { center: true }),
            cell(r.tahun || '', { center: true }),
            cell(r.kondisi || '', { center: true })
        ]}));

        return [headerRow, ...dataRows];
    };

    const rows = [
        ...mkGroupRows('Kendaraan Roda 2', data.roda2, '01.'),
        ...mkGroupRows('Kendaraan Roda 4', data.roda4, '02.'),
        ...mkGroupRows('Kendaraan Roda 6', data.roda6, '03.'),
        ...mkGroupRows('Kapal Patroli', data.kapal, '04.')
    ];

    return [
        subHeading('3) URUSAN UMUM'),
        subHeading('a. Kendaraan Operasional'),
        spacer(),
        new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr, ...rows] })
    ];
}

function buildSaranaDocx(data) {
    const sarana = data.sarana || [];
    const W = [PAGE_W * 0.05, PAGE_W * 0.60, PAGE_W * 0.35].map(Math.round);

    const hr = new TableRow({
        tableHeader: true,
        children: [
            cell('NO', { bold: true, center: true, bg: HEADER_BG, w: W[0] }),
            cell('JENIS SARANA', { bold: true, center: true, bg: HEADER_BG, w: W[1] }),
            cell('KETERANGAN', { bold: true, center: true, bg: HEADER_BG, w: W[2] })
        ]
    });

    const rows = sarana.length === 0
        ? [new TableRow({ children: [
            cell('01.', { center: true }), cell('Nihil', { center: true }), cell('', {})
        ]})]
        : sarana.map((r, i) => new TableRow({ children: [
            cell(String(i + 1).padStart(2, '0') + '.', { center: true }),
            cell(r.jenis || ''),
            cell(r.keterangan || 'Ada', { center: true })
        ]}));

    return [
        subHeading('b. Sarana dan Prasarana'),
        spacer(),
        new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr, ...rows] })
    ];
}

export function getUmumDocxElements(part, templateData, bulanName, tahun) {
    // Inject default schema if DB is completely empty for Umum
    let umumData = templateData?.umum;
    if (!umumData || Object.keys(umumData).length === 0) {
        umumData = getDefaultUmumData();
    }
    
    if (part === 'kendaraan') {
        return buildKendaraanDocx(umumData);
    } else if (part === 'sarana') {
        return buildSaranaDocx(umumData);
    } else if (part === 'gedung') {
        return buildGedungDocx(umumData);
    }
    
    return [];
}

function buildGedungDocx(data) {
    const gedung = data.gedung || [];
    const W = [PAGE_W * 0.05, PAGE_W * 0.12, PAGE_W * 0.45, PAGE_W * 0.38].map(Math.round);

    const hr = new TableRow({
        tableHeader: true,
        children: [
            cell('NO', { bold: true, center: true, bg: HEADER_BG, w: W[0] }),
            cell('OBJEK', { bold: true, center: true, bg: HEADER_BG, w: W[1] }),
            cell('STATUS KEPEMILIKAN', { bold: true, center: true, bg: HEADER_BG, w: W[2] }),
            cell('KETERANGAN', { bold: true, center: true, bg: HEADER_BG, w: W[3] }),
        ]
    });

    const rows = gedung.length === 0
        ? [new TableRow({ children: [
            cell('01.', { center: true }), cell('Nihil', { center: true }),
            cell('', {}), cell('', {})
        ]})]
        : gedung.map((r, i) => new TableRow({ children: [
            cell(String(i + 1).padStart(2, '0') + '.', { center: true }),
            cell(r.objek || ''),
            multiLineCell((r.status || '').split('\n'), { center: true }),
            multiLineCell((r.keterangan || '').split('\n'), {}),
        ]}));

    return [
        subHeading('c. Gedung Dan Bangunan'),
        spacer(),
        new Table({ width: { size: PAGE_W, type: WidthType.DXA }, rows: [hr, ...rows] })
    ];
}


/* ══════════════════════════════════════════════════════════════════════════════
   STANDALONE TEMPLATE EXPORTER (PER SEKSI)
══════════════════════════════════════════════════════════════════════════════ */
export async function exportStandaloneTemplateDocx({ title, filename, bulanName, tahun, elements, isLandscape = true }) {
    const docSize = { 
         width: 11906, 
         height: 16838, 
         orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT 
    };
    const docMargin = isLandscape 
        ? { top: 1134, bottom: 1134, left: 1701, right: 1134 } 
        : { top: 1701, bottom: 1134, left: 1134, right: 1134 };

    const doc = new Document({
        sections: [{
            properties: {
                page: { size: docSize, margin: docMargin },
            },
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'BAB II', bold: true, font: FONT_NAME, size: 28 })],
                    spacing: { after: 80 },
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({
                        text: `PELAKSANAAN TUGAS BULAN ${bulanName.toUpperCase()} ${tahun}`,
                        bold: true, font: FONT_NAME, size: 24,
                    })],
                    spacing: { after: 240 },
                }),
                heading(title),
                ...elements,
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${filename}_${bulanName}_${tahun}.docx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Alias with correct casing so TemplateLalintalkim.jsx can import it.
 * Exact same function as getLalintalkimDocxElements
 */
export const getLalintalKimDocxElements = getLalintalkimDocxElements;


/* ══════════════════════════════════════════════════════════════════════════════
   PENUTUP BUILDER
══════════════════════════════════════════════════════════════════════════════ */
export function getPenutupDocxElements(data, bulanName, tahun, logoKemenBuf = null) {
    const { saran = [], kesimpulan = '' } = data || {};
    const kesimpulanParsed = kesimpulan.replace(/{Bulan}/g, bulanName).replace(/{Tahun}/g, tahun);

    const elements = [];

    // A. SARAN
    elements.push(new Paragraph({
        children: [new TextRun({ text: 'A.', font: FONT_NAME, size: 24 }), new TextRun({ text: '\tSARAN', font: FONT_NAME, size: 24 })],
        spacing: { before: 240, after: 120 },
        indent: { left: 400, hanging: 400 }
    }));

    saran.forEach((s, idx) => {
        elements.push(new Paragraph({
            children: [
                new TextRun({ text: `${idx + 1}.`, font: FONT_NAME, size: 24 }),
                new TextRun({ text: `\t${s.judul}`, font: FONT_NAME, size: 24 })
            ],
            spacing: { before: 120, after: 80 },
            indent: { left: 400, hanging: 400 },
        }));
        
        // Multi-line isi 
        const isiLines = (s.isi || '').split('\n');
        isiLines.forEach((line, lIdx) => {
            elements.push(new Paragraph({
                children: [new TextRun({ text: line, font: FONT_NAME, size: 24 })],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: lIdx === 0 ? 0 : 80, after: 0 },
                indent: { left: 800, firstLine: 400 } 
            }));
        });
    });

    // B. KESIMPULAN
    elements.push(new Paragraph({
        children: [new TextRun({ text: 'B.', font: FONT_NAME, size: 24 }), new TextRun({ text: '\tKESIMPULAN', font: FONT_NAME, size: 24 })],
        spacing: { before: 240, after: 120 },
        indent: { left: 400, hanging: 400 }
    }));

    const kesLines = kesimpulanParsed.split('\n');
    kesLines.forEach(line => {
        elements.push(new Paragraph({
            children: [new TextRun({ text: line, font: FONT_NAME, size: 24 })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 80, after: 0 },
            indent: { left: 400, firstLine: 400 } 
        }));
    });

    // TANDA TANGAN
    const jabatan = data?.ttd?.jabatan || 'Kepala Kantor,';
    const nama = data?.ttd?.nama || 'Benyamin Kali Patembal Harahap';
    const kiriTxt = data?.ttd?.kiri || '${ttd_pengirim}';
    const showEsign = data?.ttd?.showEsign !== false;

    const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const tdBorders = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

    const rightCellChildren = [
        new Paragraph({ children: [new TextRun({ text: jabatan, font: FONT_NAME, size: 24 })], spacing: { after: 120 } })
    ];

    if (showEsign && logoKemenBuf) {
        const eSignTable = new Table({
             width: { size: 100, type: WidthType.PERCENTAGE },
             layout: TableLayoutType.FIXED,
             borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideV: NO_BORDER, insideH: NO_BORDER },
             rows: [
                 new TableRow({ children: [
                    new TableCell({
                        width: { size: 15, type: WidthType.PERCENTAGE },
                        borders: tdBorders,
                        children: [new Paragraph({ children: [new ImageRun({ data: logoKemenBuf, transformation: { width: 40, height: 40 }, type: 'png' })] })]
                    }),
                    new TableCell({
                        width: { size: 85, type: WidthType.PERCENTAGE },
                        borders: tdBorders,
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            new Paragraph({ children: [new TextRun({ text: 'KEMENIMIPAS', font: 'Arial', size: 24, bold: true })], spacing: { after: 0 } }),
                            new Paragraph({ children: [new TextRun({ text: 'Ditandatangani secara elektronik oleh:', font: 'Arial', size: 16, color: '555555' })], spacing: { after: 0 } })
                        ]
                    })
                 ]})
             ]
        });
        rightCellChildren.push(eSignTable);
        rightCellChildren.push(new Paragraph({ spacing: { before: 120 } }));
    } else {
        rightCellChildren.push(new Paragraph({ spacing: { before: 1200 } })); // 1200 twips ~ 4 lines
    }

    rightCellChildren.push(new Paragraph({ children: [new TextRun({ text: nama, font: FONT_NAME, size: 24 })] }));

    const kiriLines = kiriTxt.split('\n');
    const leftCellChildren = kiriLines.map((l, i) => new Paragraph({
        children: [new TextRun({ text: l, font: FONT_NAME, size: 24 })],
        spacing: { before: i === 0 ? 600 : 0 }
    }));

    const signTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideV: NO_BORDER, insideH: NO_BORDER },
        rows: [
            new TableRow({ children: [
                new TableCell({ children: leftCellChildren, width: { size: 50, type: WidthType.PERCENTAGE }, borders: tdBorders }),
                new TableCell({ children: rightCellChildren, width: { size: 50, type: WidthType.PERCENTAGE }, borders: tdBorders })
            ]})
        ]
    });

    elements.push(new Paragraph({ spacing: { before: 600, after: 0 } }));
    elements.push(signTable);
    
    // TEMBUSAN
    const tembusan = data?.tembusan || [];
    if (tembusan.length > 0) {
        elements.push(new Paragraph({ spacing: { before: 800, after: 120 } }));
        elements.push(new Paragraph({
            children: [new TextRun({ text: 'Tembusan :', font: FONT_NAME, size: 24 })],
            spacing: { after: 120 }
        }));
        tembusan.forEach((t, i) => {
            const lines = (t.isi || '').split('\n');
            lines.forEach((line, lIdx) => {
                elements.push(new Paragraph({
                    children: [
                        new TextRun({ text: lIdx === 0 ? `${i + 1}. ` : '    ', font: FONT_NAME, size: 24 }),
                        new TextRun({ text: line, font: FONT_NAME, size: 24 })
                    ],
                    spacing: { after: 0 },
                    indent: { left: 400, hanging: 400 }
                }));
            });
        });
    }

    return elements;
}
