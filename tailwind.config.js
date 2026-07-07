/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        kairos: {
          navy: "#16266B",
          royal: "#2743B0",
          sky: "#EEF2FB",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Archivo", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
