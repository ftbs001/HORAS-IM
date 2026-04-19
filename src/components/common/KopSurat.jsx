/**
 * KopSurat.jsx — Komponen Kop Surat Global
 *
 * SINGLE SOURCE OF TRUTH untuk tampilan kop surat di:
 *  - Surat Pengantar edit form  (editable=true)
 *  - Preview Surat Pengantar    (editable=false)
 *
 * Layout persis seperti gambar referensi:
 *  Logo  |  Baris 1-3: 10pt normal (KEMENTERIAN, DITJEN, KANWIL)
 *        |  Baris 4:   12pt BOLD   (KANTOR IMIGRASI KELAS II TPI)
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
    letterhead6: 'Laman: pematangsiantar.imigrasi.go.id, Pos-el: kanim_pematangsiantar@imigrasi.go.id',
};

// Definisi baris kop surat: key, ukuran font, berat
const LINES = [
    { key: 'letterhead1', fontSize: '10pt', fontWeight: 'normal' },
    { key: 'letterhead2', fontSize: '10pt', fontWeight: 'normal' },
    { key: 'letterhead3', fontSize: '10pt', fontWeight: 'normal' },
    { key: 'letterhead4', fontSize: '12pt', fontWeight: 'bold' },
    { key: 'letterhead5', fontSize: '9pt',  fontWeight: 'normal' },
    { key: 'letterhead6', fontSize: '8pt',  fontWeight: 'normal' },
];

/**
 * @param {object}   data      - Objek berisi letterhead1-6 (dari formData atau coverLetterData)
 * @param {boolean}  editable  - true = tampilkan input field, false = tampilkan teks statis
 * @param {function} onChange  - Handler saat input berubah: (key, value) => void
 */
const KopSurat = ({ data = {}, editable = false, onChange }) => {
    // Merge data prop dengan DEFAULT_TEXT (data menang)
    const text = { ...DEFAULT_TEXT, ...data };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
            {/* Logo + Text row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, padding: 0 }}>
                {/* Logo tunggal di kiri */}
                <div style={{ flexShrink: 0 }}>
                    <img
                        src={logoKementerian}
                        alt="Logo Kementerian Imigrasi"
                        style={{ width: '83px', height: '83px', objectFit: 'contain', display: 'block' }}
                    />
                </div>

                {/* Kolom teks tengah */}
                <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
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

            {/* Garis tunggal tipis rapat — persis seperti gambar referensi pengguna */}
            <div style={{ borderTop: '0.5px solid #000', margin: '1px 0 0 0', padding: 0, height: 0, lineHeight: 0 }} />
        </div>
    );
};

export default KopSurat;
