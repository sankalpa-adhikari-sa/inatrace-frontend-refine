import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Resolves an i18n key from public/locales/en/common.json the way the app does, so tests find elements
 * by the same text users see. Shared by Vitest and Playwright. Throws on a missing key, so a renamed key
 * fails the test instead of silently matching nothing.
 */
type Tree = { [key: string]: string | Tree };

// Tests run from the repo root (under jsdom, import.meta.url is not a file: URL).
const en: Tree = JSON.parse(readFileSync(path.join(process.cwd(), "public/locales/en/common.json"), "utf8"));

export function tr(key: string, vars: Record<string, string | number> = {}): string {
  const value = key.split(".").reduce<string | Tree | undefined>((node, part) => (typeof node === "object" ? node[part] : undefined), en);
  if (typeof value !== "string") throw new Error(`Missing i18n key in en/common.json: ${key}`);
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => String(vars[name] ?? ""));
}

/** Accessible name of a form field label: the text, plus the "*" marker when the field is required. */
export function trLabel(key: string): RegExp {
  return new RegExp(`^${tr(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\*?$`);
}

/** How `humanize()` shows a backend enum value: its `enums.<VALUE>` translation. */
export function humanizedEnum(value: string): string {
  return tr(`enums.${value}`);
}
