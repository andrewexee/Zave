/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      animation: {
        'diagonal-move': 'diagonal-move 40s linear infinite',
      },
      keyframes: {
        'diagonal-move': {
          '0%': { transform: 'translate(0, 0) rotate(-12deg)' },
          '100%': { transform: 'translate(-50vw, 50vh) rotate(-12deg)' },
        },
      },
    },
  },
  plugins: [],
}