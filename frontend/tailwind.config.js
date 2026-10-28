/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        abby: {
          50: '#FDF4FD',
          100: '#FBE8FA',
          200: '#F6D0F5',
          300: '#EFAEEB',
          400: '#DF7CDB',
          500: '#B823B2',
          600: '#940E8E',
          700: '#7B0078', // Color principal exacto del logo AbbySoft
          800: '#5F005C',
          900: '#430041',
          950: '#2A0029',
        },
        textil: {
          primary: '#7B0078',    // Color principal AbbySoft
          'primary-dark': '#5F005C',
          'primary-light': '#940E8E',
          accent: '#C026D3',     // Acento violeta/fucsia
          'accent-dark': '#A21CAF',
          success: '#10B981',    // Verde éxito
          danger: '#EF4444',     // Rojo error
          bg: '#FAFAFC',         // Fondo limpio
          dark: '#111827',       // Texto oscuro principal
          card: '#FFFFFF',
          border: '#E5E7EB'
        }
      }
    },
  },
  plugins: [],
}
