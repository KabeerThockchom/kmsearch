/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'simple-sparkle': 'simple-sparkle 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};