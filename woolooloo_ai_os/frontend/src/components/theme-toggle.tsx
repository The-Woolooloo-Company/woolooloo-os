"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-center h-12 w-12 rounded-full text-md-on-surface hover:bg-md-on-surface/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className="material-symbols-rounded text-24">
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
