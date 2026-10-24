/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './apps/mobile/index.html',
    './apps/mobile/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e67e22',
          50: '#fef3e2',
          100: '#fde6c4',
          200: '#facc87',
          300: '#f7b34a',
          400: '#f5991d',
          500: '#e67e22',
          600: '#d35400',
          700: '#b04600',
          800: '#8b3800',
          900: '#672a00',
        },
        'primary-container': '#fff4e6',
        'on-primary': '#ffffff',

        secondary: {
          DEFAULT: '#27ae60',
          50: '#e8f8f0',
          100: '#d1f0e1',
          200: '#a3e1c3',
          300: '#75d1a5',
          400: '#52c28a',
          500: '#27ae60',
          600: '#1e8449',
          700: '#185538',
          800: '#123b28',
          900: '#0c2218',
        },
        'secondary-container': '#e8f8f0',
        'on-secondary': '#ffffff',

        surface: {
          DEFAULT: '#ffffff',
          light: '#f8f9fa',
          dark: '#1a1a2e',
        },
        'surface-container': {
          lowest: '#ffffff',
          low: '#f5f6fa',
          DEFAULT: '#eef1f8',
          high: '#e2e6ed',
          highest: '#d6dbe4',
        },
        'on-surface': {
          DEFAULT: '#1a1a2e',
          variant: '#4a4a5a',
        },
        'on-surface-variant': '#4a5568',
        outline: '#c4cad4',
        'outline-variant': '#e2e6ed',

        error: '#dc2626',
        'error-container': '#fef2f2',
        'on-error': '#ffffff',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.06)',
        medium: '0 4px 12px rgba(0, 0, 0, 0.08)',
        strong: '0 8px 24px rgba(0, 0, 0, 0.12)',
        glow: '0 0 20px rgba(230, 126, 34, 0.3)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
};
