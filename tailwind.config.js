/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef1ff',
          100: '#e0e5ff',
          200: '#c6cdff',
          300: '#a0abfd',
          400: '#7c82f7',
          500: '#5b5ef2',
          600: '#4241d6',
          700: '#332fb0',
          800: '#27227d',
          900: '#1d1a5c',
          950: '#100e35',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Matches the hex values of Tailwind's stock rose-600/700 exactly, so
        // migrating Button.tsx's danger variant onto this token is a pure
        // rename with zero visual difference.
        danger: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        // Distinct from `warning` — used for PR/streak highlights, which are
        // a "you did something great" signal, not a caution state.
        celebration: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f6752e',
          600: '#e35a1a',
          700: '#c2410c',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        elevated: '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)',
        modal: '0 -8px 30px -6px rgb(15 23 42 / 0.18)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        pop: 'pop 240ms ease-out',
      },
    },
  },
  plugins: [],
};
