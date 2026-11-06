import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

/**
 * i18next set up as in Refine's i18n guide (https://refine.dev/core/docs/guides-concepts/i18n/).
 * Translations live in public/locales/<lng>/common.json as nested keys (`stock.fields.quantity`);
 * en is the source language and the fallback for missing keys. Interpolation is `{{name}}`.
 * The chosen language is kept in localStorage ("inatraceLocale").
 */
export const LOCALES = ["en", "de", "rw", "es"] as const;
export type Locale = (typeof LOCALES)[number];

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: [...LOCALES],
    fallbackLng: "en",
    load: "languageOnly",
    ns: ["common"],
    defaultNS: "common",
    backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: "inatraceLocale",
      caches: ["localStorage"],
    },
    // React escapes rendered values already.
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

/** Translate outside React components (helpers, labels in module-level getters). */
export const t = (key: string, options?: Record<string, unknown>): string => i18n.t(key, options) as string;

/** The current language. */
export function getLocale(): Locale {
  const lng = (i18n.resolvedLanguage ?? i18n.language ?? "en").toLowerCase();
  return (LOCALES as readonly string[]).includes(lng) ? (lng as Locale) : "en";
}

/** Switch language (also remembered in localStorage); the UI re-renders in place. */
export async function changeLocale(locale: string): Promise<void> {
  const next = locale.toLowerCase();
  if (next !== getLocale()) await i18n.changeLanguage(next);
}

/** Resolves once the current language's translations are loaded (call before rendering). */
export function i18nReady(): Promise<void> {
  return new Promise((resolve) => {
    if (i18n.isInitialized && i18n.hasLoadedNamespace("common")) return resolve();
    i18n.on("initialized", () => resolve());
    // A missing / unreachable locale file still renders the app (keys fall back to English).
    i18n.on("failedLoading", () => resolve());
  });
}

export default i18n;
