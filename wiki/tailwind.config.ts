import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        notion: {
          bg: "#ffffff",
          sidebar: "#f7f6f3",
          text: "#37352f",
          secondary: "#787774",
          hover: "#e8e7e4",
          accent: "#2383e2",
          code: "#f7f6f3",
          border: "#e8e7e4",
        },
      },
    },
  },
  plugins: [],
};

export default config;
