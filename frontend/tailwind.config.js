/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Olive / sage-green palette — inspired by the luxury reference
        warm: {
          950: '#1e2016',   // deepest — bottom nav
          900: '#272b1d',   // page background
          800: '#343828',   // card / sidebar
          700: '#424638',   // hover / input bg
          600: '#5c6050',   // border subtle
          500: '#787c68',   // border medium
          400: '#989b88',   // muted text
          300: '#b4b7a4',
          200: '#cccebc',   // secondary text (sage-tinted off-white)
          100: '#e0e2d4',
          50:  '#f2ede6',   // primary text (warm cream)
        },
        // Terracotta — action buttons, pops off the green nicely
        terra: {
          700: '#7a2e1e',
          600: '#a84c35',
          500: '#bf5a40',
          400: '#d4704e',
        },
        // Warm gold — visited / done highlights
        gold: {
          600: '#9a7a50',
          500: '#b89060',
          400: '#c9a46a',
          300: '#d9b880',
        },
      },
    },
  },
  plugins: [],
}
