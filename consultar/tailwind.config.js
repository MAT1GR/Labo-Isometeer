/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // <-- AÑADIMOS ESTA LÍNEA
  theme: {
    extend: {},
  },
  plugins: [],
};
