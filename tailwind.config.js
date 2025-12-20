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
          DEFAULT: '#FF9933',
          50: '#FFF4E6',
          100: '#FFE8CC',
          200: '#FFD199',
          300: '#FFBA66',
          400: '#FFA333',
          500: '#FF9933',
          600: '#FF8800',
          700: '#E67700',
          800: '#CC6600',
          900: '#B35500',
        },
        dark: {
          DEFAULT: '#3D3D3D',
          50: '#F5F5F5',
          100: '#E8E8E8',
          200: '#D1D1D1',
          300: '#B9B9B9',
          400: '#7A7A7A',
          500: '#5C5C5C',
          600: '#3D3D3D',
          700: '#2E2E2E',
          800: '#1F1F1F',
          900: '#0F0F0F',
        },
      },
    },
  },
  plugins: [],
  // Enable RTL support for Arabic
  corePlugins: {
    preflight: true,
  },
}

