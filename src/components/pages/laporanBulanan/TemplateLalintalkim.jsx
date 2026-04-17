/**
 * TemplateLalintalkim.jsx
 * Template editable untuk Seksi Lalintalkim — BAB II
 * 
 * Mengembalikan seluruh tabel kompleks asli dari laporan bulanan sebelumnya:
 *   - Tabel A, B, C, D, E, F (Paspor)
 *   - Tabel G, H, ITK, ITAS, ITAP, Lain-lain (Izin Tinggal)
 *   - Tabel Perlintasan Udara, Laut, Darat
 * 
 * Disajikan menggunakan UI standar baru (toolbar abu-abu gelap, selector bulan/tahun, dan tab navigasi).
 */
import React, { useState, useEffect, useCallback } from 'react';
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

const FONT = '"Times New Roman", Georgia, serif';
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
const SEKSI_ID = 2; // Lalintalkim

/* ── Format helper ──────────────────────────────────────────────────────── */
const useMsg = () => {
    const [msg, setMsg] = useState(null);
    const show = useCallback((type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 5000);
    }, []);
    return [msg, show];
};

/* ══════════════════════════════════════════════════════════════════════════════
   INPUT CELL — numeric, only digits
══════════════════════════════════════════════════════════════════════════════ */
const InputCell = ({ value, onChange, disabled, isPreview }) => {
    const n = Number(value) || 0;
    if (isPreview) {
        return (
            <td style={{
                border: '1px solid #000', padding: '3px 6px',
                textAlign: 'center', fontFamily: FONT, fontSize: '10pt',
                background: '#fff', minWidth: '32px',
            }}>
                {n === 0 ? '-' : n}
            </td>
        );
    }
    return (
        <td style={{ border: '1px solid #aaa', padding: '2px', textAlign: 'center' }}>
            <input
                type="number" min={0}
                value={value === 0 ? '' : value}
                onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={disabled}
                placeholder="0"
                style={{
                    width: '100%', minWidth: '36px',
                    border: 'none', outline: 'none',
                    textAlign: 'center', fontSize: '11px',
                    background: disabled ? '#f1f5f9' : '#fff',
                    fontFamily: FONT, padding: '2px 0',
                }}
            />
        </td>
    );
};

const TotalCell = ({ value, isPreview, grand }) => {
    const n = Number(value) || 0;
    return (
        <td style={{
            border: isPreview ? '1px solid #000' : '1px solid #aaa',
            padding: '3px 6px', textAlign: 'center', fontWeight: 'bold',
            background: grand ? '#c6efce' : '#e8f5e9',
            fontFamily: FONT, fontSize: isPreview ? '10pt' : '11px',
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
    const totals = calculateTotals('a', data, TABEL_A_ROWS);
    const set = (rowId, field, value) => onChange({ ...data, [rowId]: { ...data[rowId], [field]: value } });
    const getVal = (rowId, field) => totals[rowId]?.[field] ?? 0;

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
        onChange({ ...data, [rowId]: { ...prev, [col]: { ...(prev[col] || {}), [field]: value } } });
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
                <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'center', fontFamily: FONT, fontSize: '9pt', minWidth: '22px' }}>{v === 0 ? '-' : v}</td>
            );
        }
        return (
            <td style={{ border: '1px solid #aaa', padding: '1px', textAlign: 'center', minWidth: '28px' }}>
                <input
                    type="number" min={0} value={v === 0 ? '' : v}
                    onChange={e => set(rowId, col, f, Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={disabled} placeholder="0"
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
                        {TABEL_D_COLS.map(col => <th key={col} style={{ ...thStyle }} colSpan={2}>{TABEL_D_COL_LABELS[col]}</th>)}
                    </tr>
                    <tr>
                        {TABEL_D_COLS.map(col => <React.Fragment key={col}><th style={thStyle}>L</th><th style={thStyle}>P</th></React.Fragment>)}
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
                                {TABEL_D_COLS.map(col => col === 'jumlah' ? totalSubCell(row.id, col, false) : <React.Fragment key={col}>{miniInput(row.id, col, 'l', disabled)}{miniInput(row.id, col, 'p', disabled)}</React.Fragment>)}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TABEL SIMPLE (Tabel G, H, ITK, dll)
══════════════════════════════════════════════════════════════════════════════ */
function TabelSimple({ data, onChange, isPreview, loading, tableName, schemaRows }) {
    const totals = calculateTotals(tableName, data, schemaRows);
    const set = (rowId, col, field, value) => {
        const prev = data[rowId] || {};
        onChange({ ...data, [rowId]: { ...prev, [col]: { ...(prev[col] || {}), [field]: value } } });
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
        if (isPreview) return <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontFamily: FONT, fontSize: '10pt' }}>{v === 0 ? '-' : v}</td>;
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
        const sumAll = TABEL_SIMPLE_COLS.reduce((acc, c) => acc + val(rowId, c, 'l') + val(rowId, c, 'p'), 0);
        const bg = grand ? '#c6efce' : '#e8f5e9';
        if (isPreview) return <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontFamily: FONT, fontSize: '10pt', background: bg, fontWeight: 'bold' }}>{sumAll === 0 ? '-' : sumAll}</td>;
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
                    <tr><th style={thStyle}>L</th><th style={thStyle}>P</th><th style={thStyle}>L</th><th style={thStyle}>P</th></tr>
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
                                {TABEL_SIMPLE_COLS.map(col => <React.Fragment key={col}>{miniInput(row.id, col, 'l', disabled)}{miniInput(row.id, col, 'p', disabled)}</React.Fragment>)}
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
   TABEL PERLINTASAN (Udara, Laut, Darat)
══════════════════════════════════════════════════════════════════════════════ */
function TabelPerlintasan({ data, onChange, isPreview, loading, tableName, schemaRows, customHeader }) {
    const totals = calculateTotals(tableName, data, schemaRows);
    const set = (rowId, col, field, value) => {
        const prev = data[rowId] || {};
        onChange({ ...data, [rowId]: { ...prev, [col]: { ...(prev[col] || {}), [field]: value } } });
    };
    const val = (rowId, col, f) => totals[rowId]?.[col]?.[f] ?? 0;

    const thStyle = { border: '1px solid #000', padding: '3px 5px', background: '#bdd7ee', fontFamily: FONT, fontSize: isPreview ? '8pt' : '9px', fontWeight: 'bold', textAlign: 'center' };

    const miniInput = (rowId, col, f, disabled) => {
        const v = data[rowId]?.[col]?.[f] ?? 0;
        if (isPreview) return <td style={{ border: '1px solid #000', padding: '1px 2px', textAlign: 'center', fontFamily: FONT, fontSize: '8pt' }}>{v === 0 ? '-' : v}</td>;
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
                    <tr><th colSpan={21} style={{ ...thStyle, fontSize: isPreview ? '10pt' : '12px' }}>{customHeader}</th></tr>
                    <tr>
                        <th colSpan={10} style={thStyle}>KEDATANGAN LUAR NEGERI</th>
                        <th colSpan={10} style={thStyle}>KEBERANGKATAN LUAR NEGERI</th>
                        <th rowSpan={3} style={{ ...thStyle, width: '40px' }}>JUMLAH</th>
                    </tr>
                    <tr>
                        <th colSpan={5} style={thStyle}>PENUMPANG</th><th colSpan={5} style={thStyle}>CREW</th>
                        <th colSpan={5} style={thStyle}>PENUMPANG</th><th colSpan={5} style={thStyle}>CREW</th>
                    </tr>
                    <tr>
                        <th colSpan={2} style={thStyle}>WNI</th><th colSpan={2} style={thStyle}>WNA</th><th rowSpan={2} style={thStyle}>JUMLAH</th>
                        <th colSpan={2} style={thStyle}>WNI</th><th colSpan={2} style={thStyle}>WNA</th><th rowSpan={2} style={thStyle}>JUMLAH</th>
                        <th colSpan={2} style={thStyle}>WNI</th><th colSpan={2} style={thStyle}>WNA</th><th rowSpan={2} style={thStyle}>JUMLAH</th>
                        <th colSpan={2} style={thStyle}>WNI</th><th colSpan={2} style={thStyle}>WNA</th><th rowSpan={2} style={thStyle}>JUMLAH</th>
                    </tr>
                    <tr>
                        {[...Array(8)].map((_, i) => <React.Fragment key={`lp${i}`}><th style={thStyle}>L</th><th style={thStyle}>P</th></React.Fragment>)}
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

const Section = ({ title, subtitle, children, isPreview }) => (
    <div style={{ marginBottom: '28px' }}>
        <div style={{
            fontFamily: FONT, fontSize: isPreview ? '11pt' : '13px', fontWeight: 'bold',
            marginBottom: '8px', color: isPreview ? '#000' : '#1e293b',
            borderBottom: isPreview ? 'none' : '2px solid #e2e8f0', paddingBottom: '6px',
        }}>{title}</div>
        {subtitle && <div style={{ fontFamily: FONT, fontSize: isPreview ? '10pt' : '12px', marginBottom: '8px', fontStyle: 'italic', color: isPreview ? '#000' : '#475569' }}>{subtitle}</div>}
        {children}
    </div>
);

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'paspor', label: '📄 Penerbitan Paspor' },
    { id: 'izin', label: '🪪 Izin Tinggal' },
    { id: 'perlintasan', label: '🚶 Data Perlintasan' },
];

export default function TemplateLalintalkim({ embedded = false, defaultTab = 'paspor' }) {
    const { user } = useAuth();
    const [msg, showMsg] = useMsg();

    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [isPreview, setIsPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);

    // State untuk masing-masing tabel
    const [tabelA, setTabelA] = useState({});
    const [tabelB, setTabelB] = useState({});
    const [tabelC, setTabelC] = useState({});
    const [tabelD, setTabelD] = useState({});
    const [tabelE, setTabelE] = useState({});
    const [tabelF, setTabelF] = useState({});
    const [tabelG, setTabelG] = useState({});
    const [tabelH, setTabelH] = useState({});
    const [tabelItk, setTabelItk] = useState({});
    const [tabelItas, setTabelItas] = useState({});
    const [tabelItap, setTabelItap] = useState({});
    const [tabelLain, setTabelLain] = useState({});
    const [tabelUdara, setTabelUdara] = useState({});
    const [tabelLaut, setTabelLaut] = useState({});
    const [tabelDarat, setTabelDarat] = useState({});

    const loadData = useCallback(async (b, t) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('laporan_template')
                .select('template_data')
                .eq('seksi_id', SEKSI_ID)
                .eq('bulan', b)
                .eq('tahun', t)
                .maybeSingle();

            if (error) throw error;
            const def = getDefaultTemplateData(b, t);
            const raw = data?.template_data || def;

            // Bisa dari struktur lama (raw langsung) atau struktur baru ter-nest
            const ts = (raw.lalintalkim) ? { ...raw.lalintalkim, ...raw } : raw;

            setTabelA(ts.tabel_a || def.tabel_a);
            setTabelB(ts.tabel_b || def.tabel_b);
            setTabelC(ts.tabel_c || def.tabel_c);
            setTabelD(ts.tabel_d || def.tabel_d);
            setTabelE(ts.tabel_e || def.tabel_e);
            setTabelF(ts.tabel_f || def.tabel_f);
            setTabelG(ts.tabel_g || def.tabel_g);
            setTabelH(ts.tabel_h || def.tabel_h);
            setTabelItk(ts.tabel_itk || def.tabel_itk);
            setTabelItas(ts.tabel_itas || def.tabel_itas);
            setTabelItap(ts.tabel_itap || def.tabel_itap);
            setTabelLain(ts.tabel_lain || def.tabel_lain);
            setTabelUdara(ts.tabel_udara || def.tabel_udara);
            setTabelLaut(ts.tabel_laut || def.tabel_laut);
            setTabelDarat(ts.tabel_darat || def.tabel_darat);

            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal memuat: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [showMsg]);

    useEffect(() => { loadData(bulan, tahun); }, [bulan, tahun, loadData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const newTemplateData = {
                tabel_a: tabelA, tabel_b: tabelB, tabel_c: tabelC,
                tabel_d: tabelD, tabel_e: tabelE, tabel_f: tabelF,
                tabel_g: tabelG, tabel_h: tabelH,
                tabel_itk: tabelItk, tabel_itas: tabelItas, tabel_itap: tabelItap, tabel_lain: tabelLain,
                tabel_udara: tabelUdara, tabel_laut: tabelLaut, tabel_darat: tabelDarat,
            };

            const { error } = await supabase
                .from('laporan_template')
                .upsert(
                    { seksi_id: SEKSI_ID, bulan, tahun, template_data: newTemplateData, updated_at: new Date().toISOString() },
                    { onConflict: 'seksi_id,bulan,tahun' }
                );
            if (error) throw error;
            showMsg('success', `✅ Data ${BULAN_NAMES[bulan]} ${tahun} berhasil disimpan!`);
            setHasChanges(false);
        } catch (e) {
            showMsg('error', `❌ Gagal simpan: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Helper wrap untuk state update agar trigger tombol "Ada perubahan"
    const w = (setter) => (val) => { setter(val); setHasChanges(true); };

    const tabBtnStyle = (id) => ({
        padding: '7px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
        fontFamily: FONT, fontSize: '12px', fontWeight: 'bold', transition: 'background 0.2s',
        background: activeTab === id ? '#3b82f6' : '#475569', color: '#fff',
    });

    const toolBtn = (v) => ({
        padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
        fontFamily: FONT, fontSize: '12px', fontWeight: 'bold',
        ...(v === 'primary' ? { background: '#16a34a', color: '#fff' } :
            v === 'preview' ? { background: isPreview ? '#0891b2' : '#475569', color: '#fff' } :
            v === 'edit' ? { background: !isPreview ? '#a855f7' : '#475569', color: '#fff' } :
            { background: '#475569', color: '#fff' }),
    });

    return (
        <div style={{ fontFamily: FONT, padding: embedded ? '0' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', padding: '12px 16px', background: '#1e293b', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select value={bulan} onChange={e => setBulan(parseInt(e.target.value))}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 'bold', background: '#fff', cursor: 'pointer' }}>
                        {BULAN_NAMES.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                    </select>
                    <select value={tahun} onChange={e => setTahun(parseInt(e.target.value))}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 'bold', background: '#fff', cursor: 'pointer' }}>
                        {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>📋 BAB II — {BULAN_NAMES[bulan]} {tahun}</span>
                </div>
                <div style={{ flex: 1 }} />
                <button onClick={() => setIsPreview(false)} style={toolBtn('edit')}>✏️ Edit</button>
                <button onClick={() => setIsPreview(true)} style={toolBtn('preview')}>👁 Preview</button>
                <button onClick={handleSave} disabled={saving || loading}
                    style={{ ...toolBtn('primary'), opacity: (saving || loading) ? 0.6 : 1, cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? '💾 Menyimpan...' : '💾 Simpan'}
                </button>
            </div>

            {/* ── TABS ────────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabBtnStyle(tab.id)}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
            {msg && (
                <div style={{ marginBottom: '12px', padding: '10px 16px', borderRadius: '8px', background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#15803d' : '#b91c1c', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
                    {msg.text}
                </div>
            )}
            {hasChanges && !isPreview && (
                <div style={{ marginBottom: '12px', padding: '8px 16px', borderRadius: '8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', fontSize: '12px' }}>
                    ⚠️ Ada perubahan yang belum disimpan
                </div>
            )}
            {loading && (
                <div style={{ marginBottom: '12px', padding: '8px 16px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '12px' }}>
                    ⏳ Memuat data...
                </div>
            )}

            {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
                
                {activeTab === 'paspor' && (
                    <div>
                        {isPreview && <h3 style={{ fontFamily: FONT, fontSize: '12pt', fontWeight: 'bold', marginBottom: '16px' }}>1. PENERBITAN DOKUMEN PERJALANAN INDONESIA</h3>}

                        <Section title="a. Paspor 48 Hal pada Kantor Imigrasi Kelas II TPI Pematang Siantar" isPreview={isPreview}>
                            <TabelA data={tabelA} onChange={w(setTabelA)} isPreview={isPreview} loading={loading} />
                        </Section>

                        <Section title="b. Paspor 48 Hal pada Unit Layanan Paspor (ULP) Tebing Tinggi" isPreview={isPreview}>
                            <TabelB data={tabelB} onChange={w(setTabelB)} isPreview={isPreview} loading={loading} />
                        </Section>

                        <Section title="c. Paspor 48 Hal pada Unit Kerja Kantor (UKK) Dolok Sanggul" isPreview={isPreview}>
                            <TabelC data={tabelC} onChange={w(setTabelC)} isPreview={isPreview} loading={loading} />
                        </Section>

                        <Section title="d. Paspor 48 Hal pada Unit Kerja Kantor (UKK) Tarutung" isPreview={isPreview}>
                            <TabelMultiHeader data={tabelD} onChange={w(setTabelD)} isPreview={isPreview} loading={loading} tableName="d" schemaRows={TABEL_D_ROWS} />
                        </Section>

                        <Section title="e. Paspor 24 Hal pada Unit Layanan Paspor (ULP) Tebing Tinggi" isPreview={isPreview}>
                            <TabelMultiHeader data={tabelE} onChange={w(setTabelE)} isPreview={isPreview} loading={loading} tableName="e" schemaRows={TABEL_E_ROWS} />
                        </Section>

                        <Section title="f. Paspor 24 Hal pada Unit Kerja Kantor (UKK) Tarutung" isPreview={isPreview}>
                            <TabelMultiHeader data={tabelF} onChange={w(setTabelF)} isPreview={isPreview} loading={loading} tableName="f" schemaRows={TABEL_F_ROWS} />
                        </Section>

                        <Section title="g. Pas Lintas Batas (PLB)" isPreview={isPreview}>
                            <TabelSimple data={tabelG} onChange={w(setTabelG)} isPreview={isPreview} loading={loading} tableName="g" schemaRows={TABEL_G_ROWS} />
                        </Section>

                        <Section title="h. Surat Perjalanan Laksana Paspor (SPLP)" isPreview={isPreview}>
                            <TabelSimple data={tabelH} onChange={w(setTabelH)} isPreview={isPreview} loading={loading} tableName="h" schemaRows={TABEL_H_ROWS} />
                        </Section>
                    </div>
                )}

                {activeTab === 'izin' && (
                    <div>
                        {isPreview && <h3 style={{ fontFamily: FONT, fontSize: '12pt', fontWeight: 'bold', marginBottom: '16px' }}>2. PENERBITAN IZIN TINGGAL</h3>}
                        
                        <Section title="a. Izin Kunjungan (ITK)" isPreview={isPreview}>
                            <TabelSimple data={tabelItk} onChange={w(setTabelItk)} isPreview={isPreview} loading={loading} tableName="itk" schemaRows={TABEL_ITK_ROWS} />
                        </Section>

                        <Section title="b. Izin Tinggal Terbatas (ITAS)" isPreview={isPreview}>
                            <TabelSimple data={tabelItas} onChange={w(setTabelItas)} isPreview={isPreview} loading={loading} tableName="itas" schemaRows={TABEL_ITAS_ROWS} />
                        </Section>

                        <Section title="c. Izin Tinggal Tetap (ITAP)" isPreview={isPreview}>
                            <TabelSimple data={tabelItap} onChange={w(setTabelItap)} isPreview={isPreview} loading={loading} tableName="itap" schemaRows={TABEL_ITAP_ROWS} />
                        </Section>

                        <Section title="d. Lain-lain" isPreview={isPreview}>
                            <TabelSimple data={tabelLain} onChange={w(setTabelLain)} isPreview={isPreview} loading={loading} tableName="lain" schemaRows={TABEL_LAIN_ROWS} />
                        </Section>
                    </div>
                )}

                {activeTab === 'perlintasan' && (
                    <div>
                        <Section title="3. REKAPITULASI DATA PERLINTASAN" isPreview={isPreview}>
                            <div style={{ marginBottom: '40px' }}>
                                <TabelPerlintasan data={tabelUdara} onChange={w(setTabelUdara)} isPreview={isPreview} loading={loading} tableName="udara" schemaRows={TABEL_PERLINTASAN_ROWS} customHeader="A. BANDARA SILANGIT (UDARA)" />
                            </div>
                            <div style={{ marginBottom: '40px' }}>
                                <TabelPerlintasan data={tabelLaut} onChange={w(setTabelLaut)} isPreview={isPreview} loading={loading} tableName="laut" schemaRows={TABEL_PERLINTASAN_ROWS} customHeader="B. PELABUHAN TANJUNG BALAI ASAHAN (LAUT)" />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <TabelPerlintasan data={tabelDarat} onChange={w(setTabelDarat)} isPreview={isPreview} loading={loading} tableName="darat" schemaRows={TABEL_PERLINTASAN_ROWS} customHeader="C. POS LINTAS BATAS NEGARA (DARAT)" />
                            </div>
                        </Section>
                    </div>
                )}

            </div>
        </div>
    );
}
