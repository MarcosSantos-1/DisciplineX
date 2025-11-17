import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta principal estilo "joia" azul-esverdeado
        jagger: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#155e75",
          900: "#0f172a",
        },
      },
      backgroundImage: {
        "jagger-gradient":
          "radial-gradient(circle at top, #0f172a 0, #020617 40%, #022c22 100%)",
      },
      boxShadow: {
        "soft-elevated":
          "0 18px 45px rgba(0,0,0,0.45), 0 0 0 1px rgba(24,24,27,0.75)",
      },
      borderRadius: {
        "3xl": "1.75rem",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;



