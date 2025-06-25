/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5B4636',
          dark: '#3D2F24',
        },
        accent: '#FF6B6B',
        success: '#4CAF50',
        warning: '#FFA726',
        surface: '#FFFFFF',
        background: '#FAF9F7',
        text: {
          primary: '#212121',
          secondary: '#666666',
        },
        border: '#E0E0E0',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.1)',
        fab: '0 4px 12px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}