/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        imigrasi: {
          navy: '#0a192f',     // Dark Navy Background
          blue: '#1e3a8a',     // Primary Blue
          gold: '#cda45e',     // Gold Accent
          goldHover: '#d4af37', // Brighter Gold for hover
          light: '#e2e8f0',    // Light text
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
