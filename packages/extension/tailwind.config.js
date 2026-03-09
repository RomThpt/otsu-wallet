/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{vue,ts,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        eva: {
          deepest: '#1a0a2e',
          surface: '#2d1547',
          elevated: '#3d1f5c',
          higher: '#4a2670',
          border: '#5f2a62',
          text: '#e8d5f5',
          muted: '#a976c3',
          accent: '#a0de59',
          warning: '#f5c024',
          danger: '#e81900',
        },
      },
      fontFamily: {
        'eva-body': ['"Barlow Condensed"', 'sans-serif'],
        'eva-mono': ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-down': 'slide-down 200ms ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
      },
      width: {
        popup: '360px',
      },
      height: {
        popup: '600px',
      },
    },
  },
  plugins: [],
}
