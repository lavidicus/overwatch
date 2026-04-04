"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:border-[#3498db]"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
