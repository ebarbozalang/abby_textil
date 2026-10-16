/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        textil: {
          primary: '#2563EB',    // Azul textil
          'primary-dark': '#1D4ED8',
          accent: '#F59E0B',     // Naranja vibrante
          'accent-dark': '#D97706',
          success: '#10B981',    // Verde éxito
          danger: '#EF4444',     // Rojo error
          bg: '#F9FAFB',         // Fondo limpio
          dark: '#111827',       // Texto oscuro principal
          card: '#FFFFFF',
          border: '#E5E7EB'
        }
      }
    },
  },
  plugins: [],
}
