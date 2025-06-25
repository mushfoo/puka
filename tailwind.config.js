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
        secondary: {
          green: '#22c55e',
          blue: '#3b82f6',
          purple: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      scale: {
        '98': '0.98',
      },
      animation: {
        'spin-slow': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}