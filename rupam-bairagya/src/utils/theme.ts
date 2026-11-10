import { useState, useEffect } from "react";

type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "ledgerguard_theme_mode";
const THEME_EVENT_NAME = "ledgerguard_theme_changed";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Ignore storage access restrictions
  }
  return "system";
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemTheme() : mode;
}

function getActiveTheme(): "light" | "dark" {
  return resolveTheme(getStoredThemeMode());
}

function syncDomTheme(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

function applyTheme(mode: ThemeMode): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage access restrictions
  }

  const resolved = resolveTheme(mode);
  syncDomTheme(resolved);

  window.dispatchEvent(
    new CustomEvent(THEME_EVENT_NAME, {
      detail: { mode, resolved },
    })
  );

  return resolved;
}

export function useTheme() {
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">(getActiveTheme);

  useEffect(() => {
    // Sync DOM on mount from current storage/system setting without overwriting preference
    const currentMode = getStoredThemeMode();
    const resolved = resolveTheme(currentMode);
    syncDomTheme(resolved);
    setActiveTheme(resolved);

    // Live OS/device theme listener (active whenever user hasn't manually overridden)
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      const latestMode = getStoredThemeMode();
      if (latestMode === "system") {
        const sysResolved = getSystemTheme();
        syncDomTheme(sysResolved);
        setActiveTheme(sysResolved);
      }
    };
    mediaQuery.addEventListener("change", handleSystemChange);

    // Same-tab component sync
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: ThemeMode; resolved?: "light" | "dark" }>;
      const nextMode = customEvent.detail?.mode || getStoredThemeMode();
      const nextResolved = customEvent.detail?.resolved || resolveTheme(nextMode);
      setActiveTheme(nextResolved);
    };
    window.addEventListener(THEME_EVENT_NAME, handleThemeChange);

    // Cross-tab localStorage sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const nextMode = getStoredThemeMode();
        const nextResolved = resolveTheme(nextMode);
        syncDomTheme(nextResolved);
        setActiveTheme(nextResolved);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener(THEME_EVENT_NAME, handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggleTheme = () => {
    const currentResolved = resolveTheme(getStoredThemeMode());
    const nextTheme: ThemeMode = currentResolved === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setActiveTheme(nextTheme);
  };

  return {
    activeTheme,
    isDark: activeTheme === "dark",
    toggleTheme,
  };
}
