/**
 * BsreBadge.jsx – Badge e-TTD KEMENIMIPAS
 * Pure inline SVG – zero image loading dependency.
 * Pixel-perfect rendition matching the official BSrE reference image.
 *
 * Props:
 *   width  – total rendered width in px (default 300)
 */
import React from 'react';

export default function BsreBadge({ width = 300 }) {
    // ViewBox: 300 wide × 96 tall
    // Shield occupies left ~92px, text on right
    const h = Math.round(width * 96 / 300);
    return (
        <svg
            width={width}
            height={h}
            viewBox="0 0 300 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
        >
            {/* ════════════════════════════════
                SHIELD
            ════════════════════════════════ */}

            {/* Gold outer border / shield shape */}
            <path
                d="M46 3
                   C 46 3 84 13 86 37
                   C 88 60 79 78 46 92
                   C 13 78 4 60 6 37
                   C 8 13 46 3 46 3 Z"
                fill="#C9992A"
            />
            {/* Dark inner fill */}
            <path
                d="M46 9
                   C 46 9 80 18 82 39
                   C 84 59 76 75 46 87
                   C 16 75 8 59 10 39
                   C 12 18 46 9 46 9 Z"
                fill="#1A2240"
            />

            {/* ════════════════════════════════
                OPEN PADLOCK
                Left shackle attached, right shackle open/raised
            ════════════════════════════════ */}

            {/* Left shackle leg — stays at normal height */}
            <path
                d="M30 44 L30 29 Q30 18 46 18 Q55 18 58 25"
                stroke="#C9992A"
                strokeWidth="5.5"
                strokeLinecap="round"
                fill="none"
            />
            {/* Right shackle — raises up and curves away (open) */}
            <path
                d="M58 25 Q62 18 63 12"
                stroke="#C9992A"
                strokeWidth="5.5"
                strokeLinecap="round"
                fill="none"
            />

            {/* Padlock body rectangle */}
            <rect x="22" y="42" width="48" height="33" rx="5" fill="#C9992A" />

            {/* Keyhole circle */}
            <circle cx="46" cy="53" r="6" fill="#1A2240" />
            {/* Keyhole stem */}
            <rect x="43" y="53" width="6" height="9" rx="2" fill="#1A2240" />

            {/* ════════════════════════════════
                GARUDA SEAL (small, lower inside padlock body)
            ════════════════════════════════ */}
            {/* Seal circle background */}
            <circle cx="46" cy="67" r="9" fill="#1A2240" />
            {/* Outer gold ring */}
            <circle cx="46" cy="67" r="8" fill="none" stroke="#C9992A" strokeWidth="1" />

            {/* Garuda body — simplified */}
            <ellipse cx="46" cy="69" rx="3" ry="4" fill="#C9992A" />
            {/* Garuda head */}
            <circle cx="46" cy="64" r="2.3" fill="#C9992A" />
            {/* Left wing feathers */}
            <path d="M43 68 Q38 62 36 58" stroke="#C9992A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M43 70 Q38 66 36 63" stroke="#C9992A" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            {/* Right wing feathers */}
            <path d="M49 68 Q54 62 56 58" stroke="#C9992A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M49 70 Q54 66 56 63" stroke="#C9992A" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            {/* Tail feathers */}
            <path d="M46 73 L44 77 M46 73 L46 77 M46 73 L48 77" stroke="#C9992A" strokeWidth="1" strokeLinecap="round" fill="none"/>

            {/* ════════════════════════════════
                TEXT SECTION (right side of badge)
            ════════════════════════════════ */}

            {/* "KEMENIMIPAS" — very bold, ~26px equivalent */}
            <text
                x="100"
                y="46"
                fontFamily="'Arial Black', 'Arial', 'Helvetica Neue', Helvetica, sans-serif"
                fontWeight="900"
                fontSize="29"
                letterSpacing="0"
                fill="#111111"
                dominantBaseline="auto"
            >
                KEMENIMIPAS
            </text>

            {/* Subtitle — "Ditandatangani secara elektronik oleh:" */}
            <text
                x="100"
                y="64"
                fontFamily="'Arial', 'Helvetica Neue', Helvetica, sans-serif"
                fontWeight="400"
                fontSize="11"
                fill="#555555"
                dominantBaseline="auto"
            >
                Ditandatangani secara elektronik oleh:
            </text>

            {/* Horizontal separator line */}
            <line x1="100" y1="71" x2="298" y2="71" stroke="#BBBBBB" strokeWidth="1" />
        </svg>
    );
}
