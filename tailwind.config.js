/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coffee: {
          50:  '#FAF5EE',
          100: '#F2E5C8',
          200: '#E5C98F',
          300: '#D4A843',
          400: '#C4922A',
          500: '#A67A1E',
          600: '#7C5A14',
          700: '#5A3F0E',
          800: '#3A2709',
          900: '#231709',
          950: '#130D05',
        },
        surface: {
          DEFAULT: '#1C1109',
          card:    '#251609',
          border:  '#3D2510',
          hover:   '#2E1C0D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
