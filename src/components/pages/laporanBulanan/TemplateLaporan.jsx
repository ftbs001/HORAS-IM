/**
 * TemplateLaporan.jsx
 * BAB II — Pelaksanaan Tugas: Template Tetap Penerbitan Paspor
 *
 * Fitur:
 *   - 4 tabel editable sesuai format dokumen asli
 *   - Auto-hitung total (L+P=Total, baris jumlah otomatis)
 *   - NIHIL jika 0/kosong di Preview
 *   - Selector bulan/tahun dengan Save/Load Supabase
 *   - Copy data bulan sebelumnya
 *   - Mode EDIT / PREVIEW
 *   - Export DOCX + PDF (browser print)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import {
    BULAN_NAMES,
    TABEL_A_ROWS, TABEL_B_ROWS, TABEL_C_ROWS, TABEL_D_ROWS,
    TABEL_D_COLS, TABEL_D_COL_LABELS, TABEL_DEF_INPUT_COLS,
    TABEL_E_ROWS, TABEL_F_ROWS,
    TABEL_G_ROWS, TABEL_H_ROWS, TABEL_ITK_ROWS,
    TABEL_ITAS_ROWS, TABEL_ITAP_ROWS, TABEL_LAIN_ROWS,
    TABEL_PERLINTASAN_COLS, TABEL_PERLINTASAN_ROWS,
    TABEL_SIMPLE_COLS,
    getDefaultTemplateData, calculateTotals,
} from '../../../utils/templateSchema';
import { exportTemplateToDOCX } from '../../../utils/templateDocxExporter';

/* ── Constants ─────────────────────────────────────────────────────────────── */
const FONT = '"Times New Roman", Georgia, serif';
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 5000);
    }, []);
    return [msg, show];
};

/* ── Format helper ──────────────────────────────────────────────────────── */
const fmt = (v, isPreview) => {
    const n = Number(v) || 0;
    if (isPreview) return n === 0 ? '-' : n;
    return n === 0 ? '' : String(n);
};

/* ══════════════════════════════════════════════════════════════════════════════
   INPUT CELL — numeric, only digits
══════════════════════════════════════════════════════════════════════════════ */
const InputCell = ({ value, onChange, disabled, isPreview, center }) => {
    const n = Number(value) || 0;
    if (isPreview) {
        return (
            <td style={{
                border: '1px solid #000', padding: '3px 6px',
                textAlign: 'center', fontFamily: FONT, fontSize: '10pt',
                background: n === 0 ? '#fff' : '#fff',
                minWidth: '32px',
            }}>
                {n === 0 ? '-' : n}
            </td>
        );
    }
    return (
        <td style={{ border: '1px solid #aaa', padding: '2px', textAlign: 'center' }}>
            <input
                type="number"
                min={0}
                value={value === 0 ? '' : value}
                onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={disabled}
                placeholder="0"
                style={{
                    width: '100%', minWidth: '36px',
                    border: 'none', outline: 'none',
                    textAlign: 'center', fontSize: '11px',
                    background: disabled ? '#f1f5f9' : '#fff',
                    fontFamily: FONT,
                    padding: '2px 0',
                }}
            />
        </td>
    );
};

/* ── Read-only total cell ─────────────────────────────────────────────────── */
const TotalCell = ({ value, isPreview, grand }) => {
    const n = Number(value) || 0;
    return (
        <td style={{
            border: isPreview ? '1px solid #000' : '1px solid #aaa',
            padding: '3px 6px',
            textAlign: 'center',
            fontWeight: 'bold',
            background: grand ? '#c6efce' : '#e8f5e9',
            fontFamily: FONT,
            fontSize: isPreview ? '10pt' : '11px',
            minWidth: '36px',
        }}>
            {isPreview ? (n === 0 ? '-' : n) : (n === 0 ? '0' : n)}
        </td>
    );
};

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL A — Kanim Pematangsiantar
══════════════════════════════════════════════════════════════════════════════ */
function TabelA({ data, onChange, isPreview, loading }) {
    // data = { rowId: { l, p } }
    const totals = calculateTotals('a', data, TABEL_A_ROWS);

    const set = (rowId, field, value) => {
        onChange({ ...data, [rowId]: { ...data[rowId], [field]: value } });
    };

    const getVal = (rowId, field) => totals[rowId]?.[field] ?? 0;
    const getTotal = (rowId) => (getVal(rowId, 'l') + getVal(rowId, 'p'));

    const thStyle = { border: '1px solid #000', padding: '4px 6px', background: '#bdd7ee', fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', textAlign: 'center' };
    const tdLabel = (txt, bold, bg) => (
        <td style={{ border: isPreview ? '1px solid #000' : '1px solid #aaa', padding: '3px 6px', fontFamily: FONT, fontSize: isPreview ? '10pt' : '11px', fontWeight: bold ? 'bold' : 'normal', background: bg || '#fff', whiteSpace: 'nowrap' }}>
            {txt}
        </td>
    );

    return (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px' }}>
                <thead>
                    <tr>
                        <th style={{ ...thStyle, width: '35%' }}>JENIS PASPOR</th>
                        <th style={{ ...thStyle, width: '35%' }}>JENIS PERMOHONAN</th>
                        <th style={{ ...thStyle, width: '8%' }}>L</th>
                        <th style={{ ...thStyle, width: '8%' }}>P</th>
                        <th style={{ ...thStyle, width: '10%' }}>GRAND TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {TABEL_A_ROWS.map((row) => {
                        const isTotal = row.isTotalRow;
                        const isGrand = row.isGrandTotal;
                        const bg = isGrand ? '#c6efce' : isTotal ? '#e8f5e9' : (row.isGroupStart ? '#dce6f1' : '#fff');

                        if (isTotal) {
                            return (
                                <tr key={row.id}>
                                    {tdLabel('', false, bg)}
                                    {tdLabel(row.jenisPermohonan, true, bg)}
                                    <TotalCell value={getVal(row.id, 'l')} isPreview={isPreview} grand={isGrand} />
                                    <TotalCell value={getVal(row.id, 'p')} isPreview={isPreview} grand={isGrand} />
                                    <TotalCell value={getVal(row.id, 'l') + getVal(row.id, 'p')} isPreview={isPreview} grand={isGrand} />
                                </tr>
                            );
                        }

                        return (
                            <tr key={row.id} style={{ background: bg }}>
                                {tdLabel(row.jenisPaspor, row.isGroupStart, bg)}
                                {tdLabel(row.jenisPermohonan, false, bg)}
                                <InputCell value={data[row.id]?.l ?? 0} onChange={v => set(row.id, 'l', v)} disabled={loading || isPreview} isPreview={isPreview} />
                                <InputCell value={data[row.id]?.p ?? 0} onChange={v => set(row.id, 'p', v)} disabled={loading || isPreview} isPreview={isPreview} />
                                <TotalCell value={(data[row.id]?.l ?? 0) + (data[row.id]?.p ?? 0)} isPreview={isPreview} />
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL B — ULP Tebing Tinggi
══════════════════════════════════════════════════════════════════════════════ */
function TabelB({ data, onChange, isPreview, loading }) {
    const totals = calculateTotals('b', data, TABEL_B_ROWS);
    const set = (rowId, field, value) => onChange({ ...data, [rowId]: { ...data[rowId], [field]: value } });

    const thStyle = { border: '1px solid #000', padding: '4px 6px', background: '#bdd7ee', fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', textAlign: 'center' };
    const tdLabel = (txt, bold, bg) => (
        <td style={{ border: isPreview ? '1px solid #000' : '1px solid #aaa', padding: '3px 6px', fontFamily: FONT, fontSize: isPreview ? '10pt' : '11px', fontWeight: bold ? 'bold' : 'normal', background: bg || '#fff', whiteSpace: 'nowrap' }}>
            {txt}
        </td>
    );

    return (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '550px' }}>
                <thead>
                    <tr>
                        <th style={{ ...thStyle, width: '40%' }}>JENIS PASPOR</th>
                        <th style={{ ...thStyle, width: '30%' }}>JENIS PERMOHONAN</th>
                        <th style={{ ...thStyle, width: '8%' }}>L</th>
                        <th style={{ ...thStyle, width: '8%' }}>P</th>
                        <th style={{ ...thStyle, width: '10%' }}>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {TABEL_B_ROWS.map((row) => {
                        const isTotal = row.isTotalRow;
                        const isGrand = row.isGrandTotal;
                        const bg = isGrand ? '#c6efce' : isTotal ? '#e8f5e9' : (row.isGroupStart ? '#dce6f1' : '#fff');
                        const val = (field) => totals[row.id]?.[field] ?? 0;

                        if (isTotal) {
                            return (
                                <tr key={row.id}>
                                    {tdLabel('', false, bg)}
                                    {tdLabel(row.jenisPermohonan, true, bg)}
                                    <TotalCell value={val('l')} isPreview={isPreview} grand={isGrand} />
                                    <TotalCell value={val('p')} isPreview={isPreview} grand={isGrand} />
                                    <TotalCell value={val('l') + val('p')} isPreview={isPreview} grand={isGrand} />
                                </tr>
                            );
                        }
                        return (
                            <tr key={row.id} style={{ background: bg }}>
                                {tdLabel(row.jenisPaspor, row.isGroupStart, bg)}
                                {tdLabel(row.jenisPermohonan, false, bg)}
                                <InputCell value={data[row.id]?.l ?? 0} onChange={v => set(row.id, 'l', v)} disabled={loading || isPreview} isPreview={isPreview} />
                                <InputCell value={data[row.id]?.p ?? 0} onChange={v => set(row.id, 'p', v)} disabled={loading || isPreview} isPreview={isPreview} />
                                <TotalCell value={(data[row.id]?.l ?? 0) + (data[row.id]?.p ?? 0)} isPreview={isPreview} />
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL C — UKK Dolok Sanggul (ringkas)
══════════════════════════════════════════════════════════════════════════════ */
function TabelC({ data, onChange, isPreview, loading }) {
    const totals = calculateTotals('c', data, TABEL_C_ROWS);
    const set = (rowId, field, value) => onChange({ ...data, [rowId]: { ...data[rowId], [field]: value } });

    const thStyle = { border: '1px solid #000', padding: '4px 6px', background: '#bdd7ee', fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', textAlign: 'center' };
    const tdLabel = (txt, bold, bg) => (
        <td style={{ border: isPreview ? '1px solid #000' : '1px solid #aaa', padding: '3px 6px', fontFamily: FONT, fontSize: isPreview ? '10pt' : '11px', fontWeight: bold ? 'bold' : 'normal', background: bg || '#fff' }}>
            {txt}
        </td>
    );

    return (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th style={{ ...thStyle, width: '60%' }}>KETERANGAN</th>
                        <th style={{ ...thStyle, width: '10%' }}>L</th>
                        <th style={{ ...thStyle, width: '10%' }}>P</th>
                        <th style={{ ...thStyle, width: '15%' }}>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {TABEL_C_ROWS.map((row) => {
                        const isTotal = row.isTotalRow;
                        const bg = isTotal ? '#c6efce' : '#fff';
                        const val = (f) => totals[row.id]?.[f] ?? 0;

                        if (isTotal) {
                            return (
                                <tr key={row.id}>
                                    {tdLabel(row.keterangan, true, bg)}
                                    <TotalCell value={val('l')} isPreview={isPreview} grand />
                                    <TotalCell value={val('p')} isPreview={isPreview} grand />
                                    <TotalCell value={val('l') + val('p')} isPreview={isPreview} grand />
                                </tr>
                            );
                        }
                        return (
                            <tr key={row.id}>
                                {tdLabel(row.keterangan, false, '#fff')}
                                <InputCell value={data[row.id]?.l ?? 0} onChange={v => set(row.id, 'l', v)} disabled={loading || isPreview} isPreview={isPreview} />
                                <InputCell value={data[row.id]?.p ?? 0} onChange={v => set(row.id, 'p', v)} disabled={loading || isPreview} isPreview={isPreview} />
                                <TotalCell value={(data[row.id]?.l ?? 0) + (data[row.id]?.p ?? 0)} isPreview={isPreview} />
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL MULTI-HEADER (Tabel D, E, F)
══════════════════════════════════════════════════════════════════════════════ */
function TabelMultiHeader({ data, onChange, isPreview, loading, tableName, schemaRows }) {
    const totals = calculateTotals(tableName, data, schemaRows);
    const set = (rowId, col, field, value) => {
        const prev = data[rowId] || {};
        onChange({
            ...data,
            [rowId]: { ...prev, [col]: { ...(prev[col] || {}), [field]: value } },
        });
    };
    const val = (rowId, col, f) => totals[rowId]?.[col]?.[f] ?? 0;

    const thStyle = { border: '1px solid #000', padding: '3px 5px', background: '#bdd7ee', fontFamily: FONT, fontSize: isPreview ? '9pt' : '10px', fontWeight: 'bold', textAlign: 'center' };
    const tdLabel = (txt, bold, bg) => (
        <td style={{ border: isPreview ? '1px solid #000' : '1px solid #aaa', padding: '3px 6px', fontFamily: FONT, fontSize: isPreview ? '9pt' : '10px', fontWeight: bold ? 'bold' : 'normal', background: bg || '#fff', whiteSpace: 'nowrap' }}>
            {txt}
        </td>
    );

    const miniInput = (rowId, col, f, disabled) => {
        const v = data[rowId]?.[col]?.[f] ?? 0;
        if (isPreview) {
            return (
                <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'center', fontFamily: FONT, fontSize: '9pt', minWidth: '22px' }}>
                    {v === 0 ? '-' : v}
                </td>
            );
        }
        return (
            <td style={{ border: '1px solid #aaa', padding: '1px', textAlign: 'center', minWidth: '28px' }}>
                <input
                    type="number" min={0}
                    value={v === 0 ? '' : v}
                    onChange={e => set(rowId, col, f, Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={disabled}
                    placeholder="0"
                    style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'center', fontSize: '10px', fontFamily: FONT, padding: '2px 0', background: disabled ? '#f1f5f9' : '#fff' }}
                />
            </td>
        );
    };

    const totalSubCell = (rowId, col, grand) => {
        const lv = val(rowId, col, 'l');
        const pv = val(rowId, col, 'p');
        const bg = grand ? '#c6efce' : '#e8f5e9';
        if (isPreview) {
            return (
                <>
                    <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'center', fontFamily: FONT, fontSize: '9pt', background: bg, fontWeight: 'bold' }}>{lv === 0 ? '-' : lv}</td>
                    <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'center', fontFamily: FONT, fontSize: '9pt', background: bg, fontWeight: 'bold' }}>{pv === 0 ? '-' : pv}</td>
                </>
            );
        }
        return (
            <>
                <td style={{ border: '1px solid #aaa', padding: '2px 4px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', background: bg }}>{lv}</td>
                <td style={{ border: '1px solid #aaa', padding: '2px 4px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', background: bg }}>{pv}</td>
            </>
        );
    };

    return (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px' }}>
                <thead>
                    <tr>
                        <th style={{ ...thStyle, rowSpan: 2, width: '3%' }}>NO</th>
                        <th style={{ ...thStyle, rowSpan: 2, width: '22%' }}>JENIS PERMOHONAN</th>
                        {TABEL_D_COLS.map(col => (
                            <th key={col} style={{ ...thStyle }} colSpan={2}>
                                {TABEL_D_COL_LABELS[col]}
                            </th>
                        ))}
                    </tr>
                    <tr>
                        {TABEL_D_COLS.map(col => (
                            <>
                                <th key={`${col}_l`} style={thStyle}>L</th>
                                <th key={`${col}_p`} style={thStyle}>P</th>
                            </>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {schemaRows.map((row) => {
                        const isTotal = row.isTotalRow;
                        const bg = isTotal ? '#c6efce' : '#fff';

                        if (isTotal) {
                            return (
                                <tr key={row.id} style={{ background: bg }}>
                                    {tdLabel('', false, bg)}
                                    {tdLabel(row.label, true, bg)}
                                    {TABEL_D_COLS.map(col => totalSubCell(row.id, col, true))}
                                </tr>
                            );
                        }

                        const disabled = loading || isPreview;
                        return (
                            <tr key={row.id}>
                                {tdLabel(row.no, false)}
                                {tdLabel(row.label, false)}
                                {TABEL_D_COLS.map(col => (
                                    col === 'jumlah'
                                        ? totalSubCell(row.id, col, false)
                                        : <>{miniInput(row.id, col, 'l', disabled)}{miniInput(row.id, col, 'p', disabled)}</>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL SIMPLE (Tabel G, H, ITK)
══════════════════════════════════════════════════════════════════════════════ */
function TabelSimple({ data, onChange, isPreview, loading, tableName, schemaRows }) {
    const totals = calculateTotals(tableName, data, schemaRows);
    const set = (rowId, col, field, value) => {
        const prev = data[rowId] || {};
        onChange({
            ...data,
            [rowId]: { ...prev, [col]: { ...(prev[col] || {}), [field]: value } },
        });
    };
    const val = (rowId, col, f) => totals[rowId]?.[col]?.[f] ?? 0;

    const thStyle = { border: '1px solid #000', padding: '4px 6px', background: '#bdd7ee', fontFamily: FONT, fontSize: '10pt', fontWeight: 'bold', textAlign: 'center' };
    const tdLabel = (txt, bold, bg) => (
        <td style={{ border: isPreview ? '1px solid #000' : '1px solid #aaa', padding: '3px 6px', fontFamily: FONT, fontSize: isPreview ? '10pt' : '11px', fontWeight: bold ? 'bold' : 'normal', background: bg || '#fff' }}>
            {txt}
        </td>
    );

    const miniInput = (rowId, col, f, disabled) => {
        const v = data[rowId]?.[col]?.[f] ?? 0;
        if (isPreview) {
            return <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontFamily: FONT, fontSize: '10pt' }}>{v === 0 ? '-' : v}</td>;
        }
        return (
            <td style={{ border: '1px solid #aaa', padding: '2px', textAlign: 'center' }}>
                <input
                    type="number" min={0} value={v === 0 ? '' : v}
                    onChange={e => set(rowId, col, f, Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={disabled} placeholder="0"
                    style={{ width: '100%', minWidth: '40px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '11px', fontFamily: FONT, padding: '2px 0', background: disabled ? '#f1f5f9' : '#fff' }}
                />
            </td>
        );
    };

    const totalSubCell = (rowId, col, grand) => {
        const lv = val(rowId, col, 'l');
        const pv = val(rowId, col, 'p');
        const bg = grand ? '#c6efce' : '#e8f5e9';
        if (isPreview) {
            return (
                <>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontFamily: FONT, fontSize: '10pt', background: bg, fontWeight: 'bold' }}>{lv === 0 ? '-' : lv}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontFamily: FONT, fontSize: '10pt', background: bg, fontWeight: 'bold' }}>{pv === 0 ? '-' : pv}</td>
                </>
            );
        }
        return (
            <>
                <td style={{ border: '1px solid #aaa', padding: '3px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', background: bg }}>{lv === 0 ? '0' : lv}</td>
                <td style={{ border: '1px solid #aaa', padding: '3px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', background: bg }}>{pv === 0 ? '0' : pv}</td>
            </>
        );
    };

    const overallTotalCell = (rowId, grand) => {
        // sum of L+P across all SIMPLE_COLS
        const sumAll = TABEL_SIMPLE_COLS.reduce((acc, c) => acc + val(rowId, c, 'l') + val(rowId, c, 'p'), 0);
        const bg = grand ? '#c6efce' : '#e8f5e9';
        if (isPreview) {
            return <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontFamily: FONT, fontSize: '10pt', background: bg, fontWeight: 'bold' }}>{sumAll === 0 ? '-' : sumAll}</td>;
        }
        return <td style={{ border: '1px solid #aaa', padding: '3px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', background: bg }}>{sumAll}</td>;
    };

    return (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px' }}>
                <thead>
                    <tr>
                        <th style={{ ...thStyle, rowSpan: 2, width: '5%' }}>NO.</th>
                        <th style={{ ...thStyle, rowSpan: 2, width: '40%' }}>JENIS PERMOHONAN</th>
                        <th style={{ ...thStyle }} colSpan={2}>DISETUJUI</th>
                        <th style={{ ...thStyle }} colSpan={2}>DITOLAK</th>
                        <th style={{ ...thStyle, rowSpan: 2, width: '15%' }}>JUMLAH</th>
                    </tr>
                    <tr>
                        <th style={thStyle}>L</th><th style={thStyle}>P</th>
                        <th style={thStyle}>L</th><th style={thStyle}>P</th>
                    </tr>
                </thead>
                <tbody>
                    {schemaRows.map((row) => {
                        const isTotal = row.isTotalRow;
                        const bg = isTotal ? '#c6efce' : '#fff';

                        if (isTotal) {
                            return (
                                <tr key={row.id} style={{ background: bg }}>
                                    {tdLabel('', false, bg)}
                                    {tdLabel(row.label, true, bg)}
                                    {TABEL_SIMPLE_COLS.map(col => totalSubCell(row.id, col, true))}
                                    {overallTotalCell(row.id, true)}
                                </tr>
                            );
                        }

                        const disabled = loading || isPreview;
                        return (
                            <tr key={row.id}>
                                {tdLabel(row.no, false, '#fff')}
                                {tdLabel(row.label, false, '#fff')}
                                {TABEL_SIMPLE_COLS.map(col => (
                                    <>{miniInput(row.id, col, 'l', disabled)}{miniInput(row.id, col, 'p', disabled)}</>
                                ))}
                                {overallTotalCell(row.id, false)}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL PERLINTASAN (Tabel Udara, Laut)
══════════════════════════════════════════════════════════════════════════════ */
function TabelPerlintasan({ data, onChange, isPreview, loading, tableName, schemaRows, customHeader }) {
    const totals = calculateTotals(tableName, data, schemaRows);
    const set = (rowId, col, field, value) => {
        const prev = data[rowId] || {};
        onChange({
            ...data,
            [rowId]: { ...prev, [col]: { ...(prev[col] || {}), [field]: value } },
        });
    };
    const val = (rowId, col, f) => totals[rowId]?.[col]?.[f] ?? 0;

    const thStyle = { border: '1px solid #000', padding: '3px 5px', background: '#bdd7ee', fontFamily: FONT, fontSize: isPreview ? '8pt' : '9px', fontWeight: 'bold', textAlign: 'center' };

    const miniInput = (rowId, col, f, disabled) => {
        const v = data[rowId]?.[col]?.[f] ?? 0;
        if (isPreview) {
            return <td style={{ border: '1px solid #000', padding: '1px 2px', textAlign: 'center', fontFamily: FONT, fontSize: '8pt' }}>{v === 0 ? '-' : v}</td>;
        }
        return (
            <td style={{ border: '1px solid #aaa', padding: '1px', textAlign: 'center' }}>
                <input
                    type="number" min={0} value={v === 0 ? '' : v}
                    onChange={e => set(rowId, col, f, Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={disabled} placeholder="0"
                    style={{ width: '100%', minWidth: '20px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '9px', fontFamily: FONT, padding: '1px 0', background: disabled ? '#f1f5f9' : '#fff' }}
                />
            </td>
        );
    };

    const totalSubCell = (rowId, col, grand) => {
        const lv = val(rowId, col, 'l');
        const pv = val(rowId, col, 'p');
        const bg = grand ? '#c6efce' : '#e8f5e9';
        if (isPreview) {
            return (
                <>
                    <td style={{ border: '1px solid #000', padding: '1px 2px', textAlign: 'center', fontFamily: FONT, fontSize: '8pt', background: bg, fontWeight: 'bold' }}>{lv === 0 ? '-' : lv}</td>
                    <td style={{ border: '1px solid #000', padding: '1px 2px', textAlign: 'center', fontFamily: FONT, fontSize: '8pt', background: bg, fontWeight: 'bold' }}>{pv === 0 ? '-' : pv}</td>
                </>
            );
        }
        return (
            <>
                <td style={{ border: '1px solid #aaa', padding: '2px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', background: bg }}>{lv === 0 ? '0' : lv}</td>
                <td style={{ border: '1px solid #aaa', padding: '2px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', background: bg }}>{pv === 0 ? '0' : pv}</td>
            </>
        );
    };

    const overallTotalCell = (rowId, grand) => {
        const sumAll = TABEL_PERLINTASAN_COLS.reduce((acc, c) => acc + val(rowId, c, 'l') + val(rowId, c, 'p'), 0);
        const bg = grand ? '#c6efce' : '#e8f5e9';
        if (isPreview) return <td style={{ border: '1px solid #000', padding: '1px 2px', textAlign: 'center', fontFamily: FONT, fontSize: '8pt', background: bg, fontWeight: 'bold' }}>{sumAll === 0 ? '-' : sumAll}</td>;
        return <td style={{ border: '1px solid #aaa', padding: '2px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', background: bg }}>{sumAll}</td>;
    };

    const subTotalCell = (rowId, cols, bg) => {
        const sum = cols.reduce((acc, c) => acc + val(rowId, c, 'l') + val(rowId, c, 'p'), 0);
        if (isPreview) return <td style={{ border: '1px solid #000', padding: '1px 2px', textAlign: 'center', fontFamily: FONT, fontSize: '8pt', background: bg, fontWeight: 'bold' }}>{sum === 0 ? '-' : sum}</td>;
        return <td style={{ border: '1px solid #aaa', padding: '2px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', background: bg }}>{sum}</td>;
    };

    return (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1000px', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th colSpan={21} style={{ ...thStyle, fontSize: isPreview ? '10pt' : '12px' }}>{customHeader}</th>
                    </tr>
                    <tr>
                        <th colSpan={10} style={thStyle}>KEDATANGAN LUAR NEGERI</th>
                        <th colSpan={10} style={thStyle}>KEBERANGKATAN LUAR NEGERI</th>
                        <th rowSpan={3} style={{ ...thStyle, width: '40px' }}>JUMLAH</th>
                    </tr>
                    <tr>
                        <th colSpan={5} style={thStyle}>PENUMPANG</th>
                        <th colSpan={5} style={thStyle}>CREW</th>
                        <th colSpan={5} style={thStyle}>PENUMPANG</th>
                        <th colSpan={5} style={thStyle}>CREW</th>
                    </tr>
                    <tr>
                        {/* KED PENUMPANG */}
                        <th colSpan={2} style={thStyle}>WNI</th><th colSpan={2} style={thStyle}>WNA</th><th rowSpan={2} style={thStyle}>JUMLAH</th>
                        {/* KED CREW */}
                        <th colSpan={2} style={thStyle}>WNI</th><th colSpan={2} style={thStyle}>WNA</th><th rowSpan={2} style={thStyle}>JUMLAH</th>
                        {/* KEB PENUMPANG */}
                        <th colSpan={2} style={thStyle}>WNI</th><th colSpan={2} style={thStyle}>WNA</th><th rowSpan={2} style={thStyle}>JUMLAH</th>
                        {/* KEB CREW */}
                        <th colSpan={2} style={thStyle}>WNI</th><th colSpan={2} style={thStyle}>WNA</th><th rowSpan={2} style={thStyle}>JUMLAH</th>
                    </tr>
                    <tr>
                        {/* L/P row */}
                        {[...Array(8)].map((_, i) => (
                            <React.Fragment key={`lp${i}`}>
                                <th style={thStyle}>L</th><th style={thStyle}>P</th>
                            </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {schemaRows.map((row) => {
                        const isTotal = row.isTotalRow;
                        const disabled = loading || isPreview;
                        const bg = isTotal ? '#c6efce' : '#fff';
                        const t = (c) => isTotal ? totalSubCell(row.id, c, true) : <>{miniInput(row.id, c, 'l', disabled)}{miniInput(row.id, c, 'p', disabled)}</>;
                        
                        return (
                            <tr key={row.id}>
                                {t('ked_p_wni')} {t('ked_p_wna')} {subTotalCell(row.id, ['ked_p_wni','ked_p_wna'], bg)}
                                {t('ked_c_wni')} {t('ked_c_wna')} {subTotalCell(row.id, ['ked_c_wni','ked_c_wna'], bg)}
                                {t('keb_p_wni')} {t('keb_p_wna')} {subTotalCell(row.id, ['keb_p_wni','keb_p_wna'], bg)}
                                {t('keb_c_wni')} {t('keb_c_wna')} {subTotalCell(row.id, ['keb_c_wni','keb_c_wna'], bg)}
                                {overallTotalCell(row.id, isTotal)}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}


/* ══════════════════════════════════════════════════════════════════════════════
   SECTION WRAPPER — judul sub-bagian
══════════════════════════════════════════════════════════════════════════════ */
const Section = ({ title, subtitle, children, isPreview }) => (
    <div style={{ marginBottom: '28px' }}>
        <div style={{
            fontFamily: FONT,
            fontSize: isPreview ? '11pt' : '13px',
            fontWeight: 'bold',
            marginBottom: '8px',
            textAlign: isPreview ? 'left' : 'left',
            color: isPreview ? '#000' : '#1e293b',
            borderBottom: isPreview ? 'none' : '2px solid #e2e8f0',
            paddingBottom: '6px',
        }}>
            {title}
        </div>
        {subtitle && (
            <div style={{ fontFamily: FONT, fontSize: isPreview ? '10pt' : '12px', marginBottom: '8px', fontStyle: 'italic', color: isPreview ? '#000' : '#475569' }}>
                {subtitle}
            </div>
        )}
        {children}
    </div>
);

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
/**
 * @param {boolean} [embedded] — ketika true, hapus div page-scroll (sudah di-scroll oleh parent)
 * @param {string}  [seksiAlias] — e.g. 'lalintalkim'; override seksi_id dari alias ini
 */
export default function TemplateLaporan({ embedded = false, seksiAlias = null }) {
    const { user } = useAuth();
    const [msg, showMsg] = useMsg();

    const [bulan, setBulan]   = useState(new Date().getMonth() + 1);
    const [tahun, setTahun]   = useState(new Date().getFullYear());
    const [mode, setMode]     = useState('edit');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Resolved seksi_id (from alias or from user profile)
    const [resolvedSeksiId, setResolvedSeksiId] = useState(null);

    // Template data per tabel
    const def = getDefaultTemplateData(bulan, tahun);
    const [dataA, setDataA] = useState(def.tabel_a);
    const [dataB, setDataB] = useState(def.tabel_b);
    const [dataC, setDataC] = useState(def.tabel_c);
    const [dataD, setDataD] = useState(def.tabel_d);
    const [dataE, setDataE] = useState(def.tabel_e);
    const [dataF, setDataF] = useState(def.tabel_f);
    const [dataG, setDataG] = useState(def.tabel_g);
    const [dataH, setDataH] = useState(def.tabel_h);
    const [dataITK, setDataITK] = useState(def.tabel_itk);
    const [dataITAS, setDataITAS] = useState(def.tabel_itas);
    const [dataITAP, setDataITAP] = useState(def.tabel_itap);
    const [dataLain, setDataLain] = useState(def.tabel_lain);
    const [dataUdara, setDataUdara] = useState(def.tabel_udara);
    const [dataLaut, setDataLaut] = useState(def.tabel_laut);
    const [dataDarat, setDataDarat] = useState(def.tabel_darat);

    const printRef = useRef();

    /* ── Derived ─────────────────────────────────────────────── */
    const userSeksiId  = user?.seksiId ? parseInt(user.seksiId) : null;

    /* ── Resolved seksi_id ───────────────────────────────────────────────
       - Jika seksiAlias diberikan (embedded mode): resolve dari map statis
         yang cocok dengan FALLBACK_ACCOUNTS (lalintalkim = 2)
       - Jika tidak: gunakan userSeksiId langsung dari object user
    ─────────────────────────────────────────────────────────────────── */
    const ALIAS_TO_SEKSI_ID = {
        inteldakim: 1,
        lalintalkim: 2,
        tikim: 3,
        tu: 4,
        'tata usaha': 4,
        tatausaha: 4,
    };

    useEffect(() => {
        if (seksiAlias) {
            // Cek alias dari map statis terlebih dahulu
            const aliasKey = seksiAlias.toLowerCase();
            const fromMap  = ALIAS_TO_SEKSI_ID[aliasKey];
            if (fromMap) {
                setResolvedSeksiId(fromMap);
                return;
            }
            // Fallback: coba cari dari sections yang ada di user (jika sudah login via Supabase)
            const userSectionName = (user?.seksi?.name || user?.seksi?.alias || '').toLowerCase();
            if (userSectionName.includes(aliasKey)) {
                setResolvedSeksiId(userSeksiId);
            } else {
                // Tidak ditemukan — default ke userSeksiId
                setResolvedSeksiId(userSeksiId);
            }
        } else {
            setResolvedSeksiId(userSeksiId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seksiAlias, userSeksiId]);


    /* ── Load from Supabase ──────────────────────────────────── */
    const loadData = useCallback(async (b, t) => {
        // Tunggu sampai resolvedSeksiId tersedia
        if (resolvedSeksiId === null) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('laporan_template')
                .select('*')
                .eq('seksi_id', resolvedSeksiId)
                .eq('bulan', b)
                .eq('tahun', t)
                .maybeSingle();

            if (error) throw error;

            if (data?.template_data) {
                const td = data.template_data;
                const fresh = getDefaultTemplateData(b, t);
                setDataA(td.tabel_a || fresh.tabel_a);
                setDataB(td.tabel_b || fresh.tabel_b);
                setDataC(td.tabel_c || fresh.tabel_c);
                setDataD(td.tabel_d || fresh.tabel_d);
                setDataE(td.tabel_e || fresh.tabel_e);
                setDataF(td.tabel_f || fresh.tabel_f);
                setDataG(td.tabel_g || fresh.tabel_g);
                setDataH(td.tabel_h || fresh.tabel_h);
                setDataITK(td.tabel_itk || fresh.tabel_itk);
                setDataITAS(td.tabel_itas || fresh.tabel_itas);
                setDataITAP(td.tabel_itap || fresh.tabel_itap);
                setDataLain(td.tabel_lain || fresh.tabel_lain);
                setDataUdara(td.tabel_udara || fresh.tabel_udara);
                setDataLaut(td.tabel_laut || fresh.tabel_laut);
                setDataDarat(td.tabel_darat || fresh.tabel_darat);
            } else {
                const fresh = getDefaultTemplateData(b, t);
                setDataA(fresh.tabel_a);    setDataB(fresh.tabel_b);
                setDataC(fresh.tabel_c);    setDataD(fresh.tabel_d);
                setDataE(fresh.tabel_e);    setDataF(fresh.tabel_f);
                setDataG(fresh.tabel_g);    setDataH(fresh.tabel_h);
                setDataITK(fresh.tabel_itk);setDataITAS(fresh.tabel_itas);
                setDataITAP(fresh.tabel_itap);setDataLain(fresh.tabel_lain);
                setDataUdara(fresh.tabel_udara);setDataLaut(fresh.tabel_laut);
                setDataDarat(fresh.tabel_darat);
            }
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal load: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [resolvedSeksiId, showMsg]);

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun, loadData, resolvedSeksiId]);

    /* ── Save to Supabase ────────────────────────────────────── */
    const handleSave = async () => {
        if (!resolvedSeksiId) return showMsg('error', '❌ Seksi belum terdeteksi.');
        setSaving(true);
        try {
            const payload = {
                seksi_id: resolvedSeksiId,
                bulan,
                tahun,
                template_data: { 
                    tabel_a: dataA, tabel_b: dataB, tabel_c: dataC, tabel_d: dataD,
                    tabel_e: dataE, tabel_f: dataF, tabel_g: dataG, tabel_h: dataH, 
                    tabel_itk: dataITK, tabel_itas: dataITAS, tabel_itap: dataITAP, tabel_lain: dataLain,
                    tabel_udara: dataUdara, tabel_laut: dataLaut, tabel_darat: dataDarat
                },
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('laporan_template')
                .upsert(payload, { onConflict: 'seksi_id,bulan,tahun' });

            if (error) throw error;
            showMsg('success', `✅ Data ${BULAN_NAMES[bulan]} ${tahun} berhasil disimpan!`);
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal simpan: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    /* ── Copy dari bulan sebelumnya ──────────────────────────── */
    const handleCopyPrevious = async () => {
        const prevBulan = bulan === 1 ? 12 : bulan - 1;
        const prevTahun = bulan === 1 ? tahun - 1 : tahun;
        if (!window.confirm(`Copy data dari ${BULAN_NAMES[prevBulan]} ${prevTahun} ke ${BULAN_NAMES[bulan]} ${tahun}?`)) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.from('laporan_template').select('template_data')
                .eq('seksi_id', resolvedSeksiId).eq('bulan', prevBulan).eq('tahun', prevTahun)
                .maybeSingle();
            if (error) throw error;
            if (!data?.template_data) return showMsg('info', `ℹ️ Tidak ada data di ${BULAN_NAMES[prevBulan]} ${prevTahun}.`);
            const td = data.template_data;
            const fresh = getDefaultTemplateData(bulan, tahun);
            setDataA(td.tabel_a || fresh.tabel_a);
            setDataB(td.tabel_b || fresh.tabel_b);
            setDataC(td.tabel_c || fresh.tabel_c);
            setDataD(td.tabel_d || fresh.tabel_d);
            setDataE(td.tabel_e || fresh.tabel_e);
            setDataF(td.tabel_f || fresh.tabel_f);
            setDataG(td.tabel_g || fresh.tabel_g);
            setDataH(td.tabel_h || fresh.tabel_h);
            setDataITK(td.tabel_itk || fresh.tabel_itk);
            setDataITAS(td.tabel_itas || fresh.tabel_itas);
            setDataITAP(td.tabel_itap || fresh.tabel_itap);
            setDataLain(td.tabel_lain || fresh.tabel_lain);
            setDataUdara(td.tabel_udara || fresh.tabel_udara);
            setDataLaut(td.tabel_laut || fresh.tabel_laut);
            setDataDarat(td.tabel_darat || fresh.tabel_darat);
            setHasChanges(true);
            showMsg('success', `✅ Data dari ${BULAN_NAMES[prevBulan]} ${prevTahun} berhasil disalin!`);
        } catch (e) {
            showMsg('error', `❌ Gagal copy: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    /* ── Reset to blank ──────────────────────────────────────── */
    const handleReset = () => {
        if (!window.confirm('Reset semua data?')) return;
        const fresh = getDefaultTemplateData(bulan, tahun);
        setDataA(fresh.tabel_a); setDataB(fresh.tabel_b);
        setDataC(fresh.tabel_c); setDataD(fresh.tabel_d);
        setDataE(fresh.tabel_e); setDataF(fresh.tabel_f);
        setDataG(fresh.tabel_g); setDataH(fresh.tabel_h);
        setDataITK(fresh.tabel_itk); setDataITAS(fresh.tabel_itas);
        setDataITAP(fresh.tabel_itap); setDataLain(fresh.tabel_lain);
        setDataUdara(fresh.tabel_udara); setDataLaut(fresh.tabel_laut);
        setDataDarat(fresh.tabel_darat);
        setHasChanges(true);
    };

    /* ── Export PDF (print) ──────────────────────────────────── */
    const handlePrint = () => {
        const prev = mode;
        setMode('preview');
        setTimeout(() => {
            window.print();
            setMode(prev);
        }, 400);
    };

    /* ── Export Word ─────────────────────────────────────────── */
    const [exporting, setExporting] = useState(false);
    const handleExportDocx = async () => {
        setExporting(true);
        try {
            await exportTemplateToDOCX(bulan, tahun, {
                tabel_a: dataA, tabel_b: dataB, tabel_c: dataC, tabel_d: dataD,
                tabel_e: dataE, tabel_f: dataF, tabel_g: dataG, tabel_h: dataH, 
                tabel_itk: dataITK, tabel_itas: dataITAS, tabel_itap: dataITAP, tabel_lain: dataLain,
                tabel_udara: dataUdara, tabel_laut: dataLaut, tabel_darat: dataDarat
            });
            showMsg('success', '✅ File Word berhasil diunduh!');
        } catch (e) {
            showMsg('error', `❌ Gagal export Word: ${e.message}`);
        } finally {
            setExporting(false);
        }
    };

    /* ── onChange handlers with dirty flag ────────────────────── */
    const onChangeA = (v) => { setDataA(v); setHasChanges(true); };
    const onChangeB = (v) => { setDataB(v); setHasChanges(true); };
    const onChangeC = (v) => { setDataC(v); setHasChanges(true); };
    const onChangeD = (v) => { setDataD(v); setHasChanges(true); };
    const onChangeE = (v) => { setDataE(v); setHasChanges(true); };
    const onChangeF = (v) => { setDataF(v); setHasChanges(true); };
    const onChangeG = (v) => { setDataG(v); setHasChanges(true); };
    const onChangeH = (v) => { setDataH(v); setHasChanges(true); };
    const onChangeITK = (v) => { setDataITK(v); setHasChanges(true); };
    const onChangeITAS = (v) => { setDataITAS(v); setHasChanges(true); };
    const onChangeITAP = (v) => { setDataITAP(v); setHasChanges(true); };
    const onChangeLain = (v) => { setDataLain(v); setHasChanges(true); };
    const onChangeUdara = (v) => { setDataUdara(v); setHasChanges(true); };
    const onChangeLaut = (v) => { setDataLaut(v); setHasChanges(true); };
    const onChangeDarat = (v) => { setDataDarat(v); setHasChanges(true); };

    const isPreview = mode === 'preview';

    /* ── Wrapper class ───────────────────────────────────────── */
    const wrapperClass = embedded ? 'flex flex-col min-h-full' : 'page-scroll';

    const btnPrimary = {
        padding: '7px 16px', borderRadius: '7px', border: 'none',
        background: '#2563eb', color: '#fff', fontWeight: 700,
        fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
    };
    const btnGreen = { ...btnPrimary, background: '#16a34a' };
    const btnGray  = { ...btnPrimary, background: '#475569' };
    const btnAmber = { ...btnPrimary, background: '#d97706' };
    const btnRed   = { ...btnPrimary, background: '#dc2626' };

    return (
        <div className={wrapperClass}>
            {/* ── Print style ────────────────────────────────────── */}
            <style>{`
                @media print {
                    body > *:not(#template-print-area) { display: none !important; }
                    #template-print-area { display: block !important; margin: 0; padding: 20mm 25mm 20mm 30mm; }
                    .no-print { display: none !important; }
                    thead { display: table-header-group; }
                }
            `}</style>

            {/* ── Top Toolbar (no-print) ──────────────────────────── */}
            <div className="no-print" style={{
                background: '#1e293b', padding: '12px 20px',
                display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                gap: '10px', borderBottom: '2px solid #7c3aed',
            }}>
                {/* Bulan/Tahun selector */}
                <select value={bulan} onChange={e => setBulan(parseInt(e.target.value))}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 700 }}>
                    {BULAN_NAMES.slice(1).map((b, i) => (
                        <option key={i+1} value={i+1}>{b}</option>
                    ))}
                </select>
                <select value={tahun} onChange={e => setTahun(parseInt(e.target.value))}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 700 }}>
                    {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>
                    {loading ? '⏳ Memuat...' : `📋 BAB II — ${BULAN_NAMES[bulan]} ${tahun}`}
                </span>

                <div style={{ flex: 1 }} />

                {/* Mode toggle */}
                <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #475569' }}>
                    {[['edit','✏️ Edit'], ['preview','👁️ Preview']].map(([m, label]) => (
                        <button key={m} onClick={() => setMode(m)} style={{
                            padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                            background: mode === m ? '#7c3aed' : 'transparent',
                            color: mode === m ? '#fff' : '#94a3b8',
                        }}>{label}</button>
                    ))}
                </div>

                <button onClick={handleCopyPrevious} disabled={loading} style={btnAmber} title="Copy data dari bulan sebelumnya">
                    📋 Copy Bulan Lalu
                </button>
                <button onClick={handleReset} disabled={loading} style={btnRed} title="Reset ke 0">
                    🔄 Reset
                </button>
                <button onClick={handleExportDocx} disabled={exporting} style={{ ...btnPrimary, background: '#0369a1' }}>
                    {exporting ? '⏳ Mengekspor...' : '📄 Export Word'}
                </button>
                <button onClick={handlePrint} style={btnGray}>
                    🖨️ Print / PDF
                </button>
                <button onClick={handleSave} disabled={saving || loading || !hasChanges} style={{
                    ...btnGreen,
                    background: hasChanges ? '#16a34a' : '#475569',
                    cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                }}>
                    {saving ? '⏳ Menyimpan...' : hasChanges ? '💾 Simpan' : '✓ Tersimpan'}
                </button>
            </div>

            {/* ── Message banner ─────────────────────────────────── */}
            {msg && (
                <div className="no-print" style={{
                    padding: '10px 20px', fontSize: '13px',
                    background: msg.type === 'success' ? '#dcfce7' : msg.type === 'info' ? '#eff6ff' : '#fee2e2',
                    color: msg.type === 'success' ? '#166534' : msg.type === 'info' ? '#1d4ed8' : '#b91c1c',
                    borderBottom: `1px solid ${msg.type === 'success' ? '#bbf7d0' : msg.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
                }}>
                    {msg.text}
                </div>
            )}

            {/* ── Document area ──────────────────────────────────── */}
            <div id="template-print-area" ref={printRef} style={{
                fontFamily: FONT,
                padding: isPreview ? '0' : '20px',
                maxWidth: isPreview ? '210mm' : '100%',
                margin: isPreview ? '20px auto' : '0 auto',
                background: '#fff',
                boxShadow: isPreview ? '0 4px 24px rgba(0,0,0,0.15)' : 'none',
                paddingTop: isPreview ? '2.5cm' : '20px',
                paddingBottom: isPreview ? '2.5cm' : '20px',
                paddingLeft: isPreview ? '3cm' : '20px',
                paddingRight: isPreview ? '2.5cm' : '20px',
            }}>
                {/* --- Document title --- */}
                <div style={{ textAlign: 'center', marginBottom: '20px', fontFamily: FONT }}>
                    <div style={{ fontSize: isPreview ? '12pt' : '16px', fontWeight: 'bold' }}>BAB II</div>
                    <div style={{ fontSize: isPreview ? '12pt' : '14px', fontWeight: 'bold' }}>
                        PELAKSANAAN TUGAS BULAN {BULAN_NAMES[bulan].toUpperCase()} {tahun}
                    </div>
                </div>

                {/* --- A. Bidang Substantif --- */}
                <div style={{ fontFamily: FONT, fontWeight: 'bold', fontSize: isPreview ? '11pt' : '13px', marginBottom: '6px' }}>
                    A. BIDANG SUBSTANTIF
                </div>
                <div style={{ fontFamily: FONT, fontWeight: 'bold', fontSize: isPreview ? '11pt' : '12px', marginBottom: '12px', paddingLeft: '1em' }}>
                    1. PENERBITAN DOKUMEN PERJALANAN REPUBLIK INDONESIA
                </div>

                {/* Tabel A */}
                <Section
                    title="a. Data Penerbitan Paspor pada Kantor Imigrasi Kelas II TPI Pematang Siantar"
                    isPreview={isPreview}
                >
                    <TabelA data={dataA} onChange={onChangeA} isPreview={isPreview} loading={loading} />
                </Section>

                {/* Tabel B */}
                <Section
                    title="b. Data Penerbitan Paspor pada ULP Tebing Tinggi"
                    isPreview={isPreview}
                >
                    <TabelB data={dataB} onChange={onChangeB} isPreview={isPreview} loading={loading} />
                </Section>

                {/* Tabel C */}
                <Section
                    title="c. Data Penerbitan Paspor pada UKK Dolok Sanggul"
                    isPreview={isPreview}
                >
                    <TabelC data={dataC} onChange={onChangeC} isPreview={isPreview} loading={loading} />
                </Section>

                {/* Tabel D */}
                <Section title="d. Paspor 48 Halaman pada UKK Tarutung" isPreview={isPreview}>
                    <TabelMultiHeader data={dataD} onChange={onChangeD} isPreview={isPreview} loading={loading} tableName="d" schemaRows={TABEL_D_ROWS} />
                </Section>

                {/* Tabel E */}
                <Section title="e. Paspor 24 Halaman Pada ULP Tebing Tinggi" isPreview={isPreview}>
                    <TabelMultiHeader data={dataE} onChange={onChangeE} isPreview={isPreview} loading={loading} tableName="e" schemaRows={TABEL_E_ROWS} />
                </Section>

                {/* Tabel F */}
                <Section title="f. Paspor 24 Halaman Pada UKK Tarutung" isPreview={isPreview}>
                    <TabelMultiHeader data={dataF} onChange={onChangeF} isPreview={isPreview} loading={loading} tableName="f" schemaRows={TABEL_F_ROWS} />
                </Section>

                {/* Tabel G */}
                <Section title="g. Pas Lintas Batas (PLB)" isPreview={isPreview}>
                    <TabelSimple data={dataG} onChange={onChangeG} isPreview={isPreview} loading={loading} tableName="g" schemaRows={TABEL_G_ROWS} />
                </Section>

                {/* Tabel H */}
                <Section title="h. Surat Perjalanan Laksana Paspor (SPLP)" isPreview={isPreview}>
                    <TabelSimple data={dataH} onChange={onChangeH} isPreview={isPreview} loading={loading} tableName="h" schemaRows={TABEL_H_ROWS} />
                </Section>

                {/* Izin Tinggal */}
                <div style={{ fontFamily: FONT, fontWeight: 'bold', fontSize: isPreview ? '11pt' : '13px', marginTop: '20px', marginBottom: '12px' }}>
                    a. PENERBITAN IZIN TINGGAL
                </div>

                {/* Tabel ITK */}
                <Section title="i. Izin Tinggal Kunjungan (ITK)" isPreview={isPreview}>
                    <TabelSimple data={dataITK} onChange={onChangeITK} isPreview={isPreview} loading={loading} tableName="itk" schemaRows={TABEL_ITK_ROWS} />
                </Section>

                {/* Tabel ITAS */}
                <Section title="ii. Izin Tinggal Terbatas (ITAS)" isPreview={isPreview}>
                    <TabelSimple data={dataITAS} onChange={onChangeITAS} isPreview={isPreview} loading={loading} tableName="itas" schemaRows={TABEL_ITAS_ROWS} />
                </Section>

                {/* Tabel ITAP */}
                <Section title="iii. Izin Tinggal Tetap (ITAP)" isPreview={isPreview}>
                    <TabelSimple data={dataITAP} onChange={onChangeITAP} isPreview={isPreview} loading={loading} tableName="itap" schemaRows={TABEL_ITAP_ROWS} />
                </Section>

                {/* Tabel Lain-Lain */}
                <Section title="iv. LAIN-LAIN" isPreview={isPreview}>
                    <TabelSimple data={dataLain} onChange={onChangeLain} isPreview={isPreview} loading={loading} tableName="lain" schemaRows={TABEL_LAIN_ROWS} />
                </Section>

                {/* REKAPITULASI PERLINTASAN */}
                <div style={{ fontFamily: FONT, fontWeight: 'bold', fontSize: isPreview ? '11pt' : '13px', marginTop: '20px', marginBottom: '12px' }}>
                    b. REKAPITULASI DATA PERLINTASAN
                </div>

                <Section isPreview={isPreview}>
                    <TabelPerlintasan data={dataUdara} onChange={onChangeUdara} isPreview={isPreview} loading={loading} tableName="udara" schemaRows={TABEL_PERLINTASAN_ROWS} customHeader="TPI UDARA SILANGIT" />
                    <TabelPerlintasan data={dataLaut} onChange={onChangeLaut} isPreview={isPreview} loading={loading} tableName="laut" schemaRows={TABEL_PERLINTASAN_ROWS} customHeader="TPI LAUT" />
                    <TabelPerlintasan data={dataDarat} onChange={onChangeDarat} isPreview={isPreview} loading={loading} tableName="darat" schemaRows={TABEL_PERLINTASAN_ROWS} customHeader="TPI DARAT/ POS LINTAS BATAS" />
                </Section>
            </div>

            {/* unsaved badge */}
            {hasChanges && !isPreview && (
                <div className="no-print" style={{
                    position: 'sticky', bottom: '16px', margin: '0 auto 12px',
                    maxWidth: '300px', textAlign: 'center',
                    background: '#fef9c3', border: '1px solid #fde68a',
                    borderRadius: '8px', padding: '8px 16px',
                    fontSize: '12px', color: '#92400e', fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}>
                    ⚠️ Ada perubahan yang belum disimpan
                </div>
            )}
        </div>
    );
}
