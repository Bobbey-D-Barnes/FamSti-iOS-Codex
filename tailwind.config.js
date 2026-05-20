/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // FamSti Brand Colors – iOS 26 Liquid Glass inspired
        primary: {
          DEFAULT: '#6C5CE7',
          50: '#F0EDFD',
          100: '#E1DBFB',
          200: '#C3B7F7',
          300: '#A593F3',
          400: '#876FEF',
          500: '#6C5CE7',
          600: '#4A3AC5',
          700: '#382CA3',
          800: '#261E81',
          900: '#14105F',
          foreground: '#FFFFFF',
        },
        background: {
          DEFAULT: '#F8F7FC',
          dark: '#0F0D1A',
        },
        foreground: {
          DEFAULT: '#1A1625',
          dark: '#F0EEF6',
        },
        card: {
          DEFAULT: 'rgba(255, 255, 255, 0.85)',
          dark: 'rgba(25, 22, 40, 0.85)',
        },
        muted: {
          DEFAULT: '#F0EEF6',
          foreground: '#6E6A85',
          dark: '#1F1B33',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        // Zone colors
        rosenheim: '#4F8AE6',
        haidholzen: '#8B5CF6',
        prutting: '#10B981',
      },
      borderRadius: {
        xl: 16,
        '2xl': 20,
        '3xl': 24,
      },
    },
  },
  plugins: [],
};
