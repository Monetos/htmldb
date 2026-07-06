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
        // Movement-pattern loop animations (Phase 15) — one keyframe pair per
        // body-part group, shared across the 9 MovementPattern variants by
        // MovementPatternAnimation.tsx.
        'mp-squat-legs': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.78)' },
        },
        'mp-squat-upper': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(11px)' },
        },
        'mp-hinge-torso': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(48deg)' },
        },
        'mp-push-h-arms': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(9px)' },
        },
        'mp-pull-h-arms': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-9px)' },
        },
        'mp-push-v-arms': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(-58deg)' },
        },
        'mp-pull-v-body': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'mp-lunge-front-leg': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.75)' },
        },
        'mp-lunge-back-leg': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(-18deg)' },
        },
        'mp-lunge-upper': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        'mp-carry-brace': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        'mp-isolation-limb': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(-40deg)' },
        },
      },
      animation: {
        pop: 'pop 240ms ease-out',
        'mp-squat-legs': 'mp-squat-legs 2.4s ease-in-out infinite',
        'mp-squat-upper': 'mp-squat-upper 2.4s ease-in-out infinite',
        'mp-hinge-torso': 'mp-hinge-torso 2.6s ease-in-out infinite',
        'mp-push-h-arms': 'mp-push-h-arms 2s ease-in-out infinite',
        'mp-pull-h-arms': 'mp-pull-h-arms 2s ease-in-out infinite',
        'mp-push-v-arms': 'mp-push-v-arms 2.2s ease-in-out infinite',
        'mp-pull-v-body': 'mp-pull-v-body 2.4s ease-in-out infinite',
        'mp-lunge-front-leg': 'mp-lunge-front-leg 2.6s ease-in-out infinite',
        'mp-lunge-back-leg': 'mp-lunge-back-leg 2.6s ease-in-out infinite',
        'mp-lunge-upper': 'mp-lunge-upper 2.6s ease-in-out infinite',
        'mp-carry-brace': 'mp-carry-brace 3s ease-in-out infinite',
        'mp-isolation-limb': 'mp-isolation-limb 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
