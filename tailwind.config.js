/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#B32635',
          darkRed: '#8F1D2C',
          gold: '#B99A65',
          goldLight: '#E5D6B8',
          charcoal: '#252525',
          secondary: '#777777',
          border: '#E9E7E3',
          canvas: '#F7F7F5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

