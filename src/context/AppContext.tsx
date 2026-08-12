import React, { createContext, useContext, useState, useEffect } from "react";
import enTranslations from "../locales/en.json";
import hiTranslations from "../locales/hi.json";

export type Language = "en" | "hi";
export type Theme = "light" | "dark";

const locales = {
  en: enTranslations,
  hi: hiTranslations,
};

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string, defaultValue?: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Theme state
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("locastay_theme") as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
    // Fallback to system settings
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  // Language state
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("locastay_language") as Language | null;
    if (saved === "en" || saved === "hi") return saved;
    // Fallback to browser language
    const browserLang = navigator.language.slice(0, 2);
    if (browserLang === "hi") return "hi";
    return "en";
  });

  // Apply theme to HTML class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("locastay_theme", newTheme);
  };

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem("locastay_language", newLang);
  };

  // Nested translation resolver (e.g., t("app.name"))
  const t = (key: string, defaultValue?: string): string => {
    const keys = key.split(".");
    let current: any = locales[language];
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return defaultValue || key;
      }
    }
    return typeof current === "string" ? current : defaultValue || key;
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, theme, setTheme, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
