/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1E1730',
          dark: '#14102A',
          accent: '#e5305e',
          accentDark: '#d02854',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#0f0b1a',
          muted: '#f9fafb',
          mutedDark: '#1b1530',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
