"use client";

import { useTheme } from "next-themes";
import clsx from "clsx";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={clsx(
        "rounded-md border border-[var(--notion-border)] bg-[var(--notion-bg)] text-xs text-[var(--notion-secondary)] hover:bg-[var(--notion-hover)]",
        compact ? "px-2 py-1" : "px-3 py-2"
      )}
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
