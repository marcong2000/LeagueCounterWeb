import type { Config } from 'tailwindcss';

/**
 * Original visual identity for Counterforge.
 * Palette: deep "abyss" navy backgrounds, an "ember" amber primary accent,
 * and a "frost" teal secondary. Deliberately distinct from CounterStats.net.
 */
const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        abyss: {
          900: '#0a0e17',
          800: '#11161f',
          700: '#1a212e',
          600: '#252e3f',
          500: '#36425a',
        },
        ember: {
          DEFAULT: '#f5a623',
          400: '#ffb84d',
          600: '#d98a12',
        },
        frost: {
          DEFAULT: '#3ad6c5',
          400: '#5fe7d8',
          600: '#1fae9f',
        },
        rose: {
          DEFAULT: '#ef5d6b',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px -6px rgba(245, 166, 35, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
