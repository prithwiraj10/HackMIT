"use client";

import { useCallback, useEffect, useState } from "react";
import { DARK_CLASS, THEME_STORAGE_KEY } from "./theme-boot";

function readDark() {
  return document.documentElement.classList.contains(DARK_CLASS);
}

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle(DARK_CLASS, dark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    /* private mode / storage disabled: theme still applies for this page */
  }
}

/** Site-wide dark mode, shared by the landing, /students and /admin. */
export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(readDark());
    const sync = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next = e.newValue === "dark";
      document.documentElement.classList.toggle(DARK_CLASS, next);
      setDark(next);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const toggle = useCallback(() => {
    setDark((current) => {
      const next = !current;
      applyDark(next);
      return next;
    });
  }, []);
  return { dark, toggle };
}
