/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{jsx,js,html}'],
  theme: {
    extend: {
      colors: {
        // COR DO LOGO — trocar pelo hex exato quando SVG chegar
        brand: {
          DEFAULT: '#2563EB',
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          900: '#1E3A8A',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
