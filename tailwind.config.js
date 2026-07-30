/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fbf7ed",
        forest: "#123b2a",
        leaf: "#1f6f4a",
        gold: "#b98b4b",
        cocoa: "#6f4d38",
        charcoal: "#1f2723"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(31, 39, 35, 0.10)"
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "Segoe UI", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};
