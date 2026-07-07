import type { Theme } from "@/lib/types";

export const THEMES: readonly Theme[] = ["calm", "focused", "bold"];

const THEME_ACCENTS: Record<Theme, string> = {
  calm: "#7FB8FF",
  focused: "#52C1B0",
  bold: "#FF6F91",
};

const STORAGE_KEY = "water-app:theme";

export function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}

export function applyThemeAccent(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-brand", THEME_ACCENTS[theme]);
}

export function cacheTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function getCachedTheme(): Theme {
  if (typeof window === "undefined") return "calm";
  const cached = window.localStorage.getItem(STORAGE_KEY);
  return cached && isTheme(cached) ? cached : "calm";
}
