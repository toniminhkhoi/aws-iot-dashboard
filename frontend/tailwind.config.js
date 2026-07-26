/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0f18',
          800: '#111827',
          700: '#1f2937',
        },
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(6,186,212,0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(6,186,212,0.8), 0 0 30px rgba(59,130,246,0.6)' }
        }
      }
    },
  },
  plugins: [],
}