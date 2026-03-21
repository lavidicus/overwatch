import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#CC2222",
        "primary-dark": "#A81C1C",
        secondary: "#F5F0E8",
        accent: "#B8860B",
        charcoal: "#1A1A1A",
      },
    },
  },
  plugins: [],
};
export default config;
