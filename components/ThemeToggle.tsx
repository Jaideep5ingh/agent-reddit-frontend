"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  // Sync with the class the no-flash script already set on <html>.
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("theme", next); } catch {}
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative flex items-center justify-center h-7 w-7 rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground hover:bg-foreground/[0.04]"
    >
      {/* Render nothing theme-specific until mounted to avoid hydration mismatch */}
      {theme !== null && (
        isDark
          ? <Moon className="h-3.5 w-3.5" />
          : <Sun className="h-3.5 w-3.5" style={{ color: "var(--reddit)" }} />
      )}
    </button>
  );
}
