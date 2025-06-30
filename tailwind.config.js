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
        accent: {
          DEFAULT: '#FF6B6B',
          light: '#FF8787',
        },
        success: '#4CAF50',
        warning: '#FFA726',
        error: '#EF4444',
        surface: '#FFFFFF',
        background: '#FAF9F7',
        text: {
          primary: '#212121',
          secondary: '#666666',
        },
        border: '#E0E0E0',
        // Status-specific colors for better semantic meaning
        status: {
          'want-to-read': {
            DEFAULT: '#EBF8FF',
            foreground: '#1E40AF',
          },
          'currently-reading': {
            DEFAULT: '#FED7AA', 
            foreground: '#C2410C',
          },
          'finished': {
            DEFAULT: '#D1FAE5',
            foreground: '#059669',
          },
        },
        // Neutral colors to replace gray usage
        neutral: {
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          800: '#262626',
        },
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