import type { I18nProvider } from "@refinedev/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { changeLocale, getLocale } from "@/lib/i18n";

/**
 * Refine i18n provider (https://refine.dev/core/docs/guides-concepts/i18n/), backed by i18next.
 * Built in a hook so a language change gives Refine a new provider and the app re-renders.
 */
export function useI18nProvider(): I18nProvider {
  const { t, i18n } = useTranslation();
  return useMemo(
    () => ({
      translate: (key: string, options?: unknown, defaultMessage?: string) => {
        const [vars, fallback] =
          typeof options === "string" ? [undefined, options] : [options as Record<string, unknown>, defaultMessage];
        return t(key, { ...vars, defaultValue: fallback ?? key }) as string;
      },
      changeLocale: (lang: string) => changeLocale(lang),
      getLocale: () => getLocale(),
    }),
    // `t` changes identity when the language changes.
    [t, i18n.resolvedLanguage],
  );
}
