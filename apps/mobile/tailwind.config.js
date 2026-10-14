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
        primary: '#8d4b00',
        'primary-container': '#b15f00',
        'primary-fixed': '#ffdcc3',
        'primary-fixed-dim': '#ffb77d',
        'on-primary': '#ffffff',
        'on-primary-fixed': '#2f1500',
        'on-primary-fixed-variant': '#6e3900',

        secondary: '#006c4a',
        'secondary-container': '#82f5c1',
        'secondary-fixed': '#85f8c4',
        'on-secondary': '#ffffff',
        'on-secondary-fixed': '#002114',
        'on-secondary-fixed-variant': '#005137',

        tertiary: '#bb0112',
        'tertiary-container': '#e02928',
        'tertiary-fixed': '#ffdad6',
        'on-tertiary': '#ffffff',

        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        surface: '#f9f9ff',
        'surface-dim': '#cfdaf2',
        'surface-bright': '#f9f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f0f3ff',
        'surface-container': '#e7eeff',
        'surface-container-high': '#dee8ff',
        'surface-container-highest': '#d8e3fb',
        'surface-variant': '#d8e3fb',

        'on-surface': '#111c2d',
        'on-surface-variant': '#554336',
        outline: '#887364',
        'outline-variant': '#dbc2b0',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
