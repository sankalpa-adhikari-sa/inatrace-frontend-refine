"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * Sets the theme class on <html> with CSS transitions switched off for that moment. Elements with a colour
 * transition (hover effects on cards, buttons, tabs) would otherwise fade to the new theme ~150ms after
 * everything else, which looks like a delay. Same approach as next-themes' `disableTransitionOnChange`.
 */
function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (root.classList.contains(resolved)) return;
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode("*,*::before,*::after{-webkit-transition:none!important;transition:none!important}")
  );
  document.head.appendChild(style);
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  // Apply the new colours while transitions are off, then let them work again for hover.
  void window.getComputedStyle(document.body).opacity;
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "refine-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyTheme(theme === "system" ? (media.matches ? "dark" : "light") : theme);
    apply();
    // "System" follows the OS switching between light and dark while the app is open.
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    console.error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

ThemeProvider.displayName = "ThemeProvider";
