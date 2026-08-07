"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial: Theme = stored ?? "dark";
    const raf = requestAnimationFrame(() => {
      setTheme(initial);
      document.documentElement.dataset.theme = initial;
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card-muted text-muted transition-colors hover:border-border-strong hover:text-primary"
    >
      <Sun
        size={16}
        className={`absolute transition-all duration-300 ${
          theme === "light"
            ? "rotate-0 opacity-100"
            : "-rotate-90 opacity-0"
        }`}
      />
      <Moon
        size={16}
        className={`absolute transition-all duration-300 ${
          theme === "dark"
            ? "rotate-0 opacity-100"
            : "rotate-90 opacity-0"
        }`}
      />
    </button>
  );
}
