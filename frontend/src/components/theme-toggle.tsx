"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      className={className ? `theme-toggle ${className}` : "theme-toggle"}
      type="button"
      aria-pressed={dark}
      onClick={toggle}
    >
      <span className="theme-toggle-icon">
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </span>
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
