/**
 * KopSurat.jsx — Komponen Kop Surat Global
 *
 * SINGLE SOURCE OF TRUTH untuk tampilan kop surat di:
 *  - Surat Pengantar edit form  (editable=true)
 *  - Preview Surat Pengantar    (editable=false)
 *
 * Layout persis seperti gambar referensi:
 *  Logo  |  Baris 1-3: 10pt normal (KEMENTERIAN, DITJEN, KANWIL)
 *        |  Baris 4:   11pt BOLD   (KANTOR IMIGRASI KELAS II TPI)
 *        |  Baris 5:    9pt normal (Alamat)
 *        |  Baris 6:    8pt normal (Laman & Pos-el)
 * ─────────────────────────────────────────── (garis 3pt, langsung rapat)
 * ─────────────────────────────────────────── (garis 1pt, langsung rapat)
 */

import logoKementerian from '../../assets/logo-kementerian-imigrasi.png';

// Teks default persis sesuai gambar
const DEFAULT_TEXT = {
    letterhead1: 'KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA',
    letterhead2: 'DIREKTORAT JENDERAL IMIGRASI',
    letterhead3: 'KANTOR WILAYAH SUMATERA UTARA',
    letterhead4: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR',
    letterhead5: 'Jl. Raya Medan Km. 11,5, Purbasari, Tapian Dolok, Simalungun',
    letterhead6: 'Laman: imigrasipematangsiantar.kemenkumham.go.id, Pos-el: knm.pematangsiantar@kemenkumham.go.id',
};

// Definisi baris kop surat: key, ukuran font, berat
const LINES = [
    { key: 'letterhead1', fontSize: '10pt', fontWeight: 'normal' },
    { key: 'letterhead2', fontSize: '10pt', fontWeight: 'normal' },
    { key: 'letterhead3', fontSize: '10pt', fontWeight: 'normal' },
    { key: 'letterhead4', fontSize: '11pt', fontWeight: 'bold' },
    { key: 'letterhead5', fontSize: '9pt', fontWeight: 'normal' },
    { key: 'letterhead6', fontSize: '8pt', fontWeight: 'normal' },
];

/**
 * @param {object}   data      - Objek berisi letterhead1-6 (dari formData atau coverLetterData)
 * @param {boolean}  editable  - true = tampilkan input field, false = tampilkan teks statis
 * @param {function} onChange  - Handler saat input berubah: (key, value) => void
 */
const KopSurat = ({ data = {}, editable = false, onChange }) => {
    // Merge data prop dengan DEFAULT_TEXT (data menang)
    const text = { ...DEFAULT_TEXT, ...data };

    // Style container
    const wrapStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        margin: 0,
        padding: 0,
        fontFamily: 'Arial, sans-serif',
    };

    // Style kolom teks
    const textColStyle = {
        flex: 1,
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
    };

    // Style garis bawah (3pt tebal)
    const line1Style = {
        borderTop: '3px solid #000',
        margin: '1px 0 0 0',
        padding: 0,
        height: 0,
        lineHeight: 0,
    };

    // Style garis bawah (1pt tipis)
    const line2Style = {
        borderTop: '1px solid #000',
        margin: '1.5px 0 0 0',
        padding: 0,
        height: 0,
        lineHeight: 0,
    };

    return (
        <div>
            <div style={wrapStyle}>
                {/* Logo */}
                <div style={{ flexShrink: 0 }}>
                    <img
                        src={logoKementerian}
                        alt="Logo Kementerian Imigrasi"
                        style={{ width: '83px', height: '83px', objectFit: 'contain', display: 'block' }}
                    />
                </div>

                {/* Kolom teks */}
                <div style={textColStyle}>
                    {LINES.map(({ key, fontSize, fontWeight }) => (
                        editable ? (
                            /* Mode edit: input transparan dengan highlight saat fokus */
                            <input
                                key={key}
                                type="text"
                                value={text[key]}
                                onChange={(e) => onChange && onChange(key, e.target.value)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'center',
                                    border: 'none',
                                    outline: 'none',
                                    background: 'transparent',
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize,
                                    fontWeight,
                                    lineHeight: '1.35',
                                    padding: 0,
                                    margin: 0,
                                    cursor: 'text',
                                    color: '#000',
                                }}
                                onFocus={(e) => (e.target.style.background = '#eff6ff')}
                                onBlur={(e) => (e.target.style.background = 'transparent')}
                            />
                        ) : (
                            /* Mode preview: teks statis */
                            <div
                                key={key}
                                style={{
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize,
                                    fontWeight,
                                    lineHeight: '1.35',
                                    margin: 0,
                                    padding: 0,
                                }}
                            >
                                {text[key]}
                            </div>
                        )
                    ))}
                </div>
            </div>

            {/* Garis ganda rapat — langsung di bawah baris terakhir, tanpa jarak */}
            <div style={line1Style}></div>
            <div style={line2Style}></div>
        </div>
    );
};

export default KopSurat;
