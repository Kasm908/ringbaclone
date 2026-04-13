/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#08090d",
          800: "#0b0d14",
          700: "#0f1117",
          600: "#1a1d2e",
          500: "#2a2d3a",
          400: "#3a3d4a",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};