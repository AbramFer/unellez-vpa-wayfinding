/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        unellez: {
          orange: '#E85D04',
          amber: '#F48C06',
          blue: '#023E8A',
          dark: '#0F172A',
          colonial: '#9A3412'
        }
      }
    },
  },
  plugins: [],
}

