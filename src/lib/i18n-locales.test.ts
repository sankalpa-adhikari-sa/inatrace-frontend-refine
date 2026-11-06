import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Locale file consistency. `bun run i18n:check` compares src/ with en; this compares the other
 * locales with en. Missing translations fall back to English, so they're only reported.
 */
type Tree = { [key: string]: string | Tree };

const LOCALES_DIR = new URL("../../public/locales/", import.meta.url);
const load = (lng: string): Tree => JSON.parse(readFileSync(new URL(`${lng}/common.json`, LOCALES_DIR), "utf8"));

function flatten(tree: Tree, prefix = "", out: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === "string") out[prefix + key] = value;
    else flatten(value, `${prefix}${key}.`, out);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(",");

/**
 * Translations that drop a placeholder, so the value isn't shown in that language. Known gaps waiting
 * for a translator; remove an entry once it's fixed. New entries fail the test.
 */
const KNOWN_PLACEHOLDER_GAPS: Record<string, string[]> = {
  rw: [
    "b2c.texts.yourCoffeePackageIsPart",
    "companies.descriptions.mergeCompanyTo",
    "products.descriptions.areYouSureYouWantToRemoveFinal",
  ],
};

const en = flatten(load("en"));
const others = readdirSync(LOCALES_DIR).filter((lng) => lng !== "en");

describe.each(others)("locale %s", (lng) => {
  const translated = flatten(load(lng));

  it("uses the same {{placeholders}} as en", () => {
    const known = KNOWN_PLACEHOLDER_GAPS[lng] ?? [];
    const broken = Object.keys(translated).filter((k) => k in en && placeholders(translated[k]) !== placeholders(en[k]));
    expect(broken.filter((k) => !known.includes(k)).map((k) => `${k}: "${translated[k]}" (en: "${en[k]}")`)).toEqual([]);
    // Keep the list honest: a fixed translation must leave it.
    expect(known.filter((k) => !broken.includes(k))).toEqual([]);
  });

  it("has no keys that en lacks", () => {
    expect(Object.keys(translated).filter((k) => !(k in en))).toEqual([]);
  });

  it("reports untranslated keys", () => {
    const missing = Object.keys(en).filter((k) => !(k in translated));
    if (missing.length) console.info(`[${lng}] ${missing.length} of ${Object.keys(en).length} keys fall back to en`);
  });
});
