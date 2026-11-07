import { useGetLocale, useSetLocale, useTranslate } from "@refinedev/core";
import { Languages } from "lucide-react";
import { type Option, SimpleCombobox } from "@/components/app/controls";
import { useIdentity, useRefreshIdentity } from "@/hooks/use-session";
import { ep } from "@/lib/endpoints";
import { call, useApiMutation } from "@/lib/http";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Each language in its own name, so it reads the same whatever the UI language is. */
export const LANGUAGE_OPTIONS: Option<Locale>[] = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "rw", label: "Kinyarwanda" },
];

type ApiLanguage = "EN" | "DE" | "RW" | "ES";

/**
 * Switches the UI language in place and saves the choice as the user's profile language (the same field
 * as My profile), which the app applies at login.
 */
export function useChangeLanguage() {
  const locale = useGetLocale()() as Locale;
  const setLocale = useSetLocale();
  const { user } = useIdentity();
  const refreshIdentity = useRefreshIdentity();
  // Also refetches the app's data: the backend localises some responses by the `language` header.
  const save = useApiMutation({
    mutationFn: (language: ApiLanguage) =>
      call(ep.updateProfile, { body: { name: user?.name, surname: user?.surname, language } }),
    onSuccess: () => refreshIdentity(),
  });

  const change = async (value: Locale | null) => {
    if (!value || value === locale) return;
    await setLocale(value);
    const language = value.toUpperCase() as ApiLanguage;
    if (user && user.language !== language) save.mutate(language);
  };

  return { locale, change, pending: save.isPending };
}

/** Header language switcher. */
export function LanguageSelect({ className }: { className?: string }) {
  const translate = useTranslate();
  const { locale, change, pending } = useChangeLanguage();
  const label = translate("common.fields.language");
  return (
    <div className={cn("w-36", className)} title={label}>
      <SimpleCombobox<Locale>
        options={LANGUAGE_OPTIONS}
        value={locale}
        onChange={change}
        placeholder={label}
        clearable={false}
        disabled={pending}
        prefix={<Languages aria-hidden />}
      />
    </div>
  );
}
