import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: "#1a1a2e",
        accent: "#3498db",
      },
    },
  },
  plugins: [],
};

export default config;
