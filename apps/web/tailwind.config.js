/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
          light: 'var(--primary-light)',
        },
        secondary: 'var(--secondary)',
        background: 'var(--background)',
        card: 'var(--card)',
        border: 'var(--border)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        purple: 'var(--purple)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
