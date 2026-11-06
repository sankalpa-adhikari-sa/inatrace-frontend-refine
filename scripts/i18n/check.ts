/**
 * Checks src/ against public/locales/<lng>/common.json.
 *
 *   bun run i18n:check            # fails on keys used in code but missing from en
 *   bun run i18n:check --verbose  # also lists keys missing per language and unused keys
 *
 * Errors: a key used in src/ that en/common.json doesn't have; a translation using a
 * {{placeholder}} the English text doesn't have. Missing de/rw/es keys fall back to English
 * and are only reported.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const VERBOSE = process.argv.includes("--verbose");
const LANGS = ["de", "rw", "es"];

function flatten(o: Record<string, unknown>, prefix = "", out = new Map<string, string>()) {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out);
  }
  return out;
}
const load = (lng: string) => flatten(JSON.parse(readFileSync(`public/locales/${lng}/common.json`, "utf8")));

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (p !== "src/client") yield* files(p);
    } else if (/\.tsx?$/.test(p)) yield p;
  }
}

// translate("a.b") / t("a.b"), plus Refine-ui's lookup tables ({ i18nKey: "table.filter.operator.eq" }).
const CALL = /\b(?:translate|t)\(\s*(["'`])([^"'`$\s]+)\1/g;
const TABLE = /\bi18nKey:\s*"([^"]+)"/g;
const DYNAMIC = /\b(?:translate|t)\(\s*`[^`]*\$\{/g;

const used = new Map<string, string>(); // key → first file:line
const dynamic: string[] = [];
for (const file of files("src")) {
  const src = readFileSync(file, "utf8");
  const lineOf = (i: number) => `${file}:${src.slice(0, i).split("\n").length}`;
  for (const m of src.matchAll(CALL)) if (m[2].includes(".") && !used.has(m[2])) used.set(m[2], lineOf(m.index!));
  for (const m of src.matchAll(TABLE)) if (!used.has(m[1])) used.set(m[1], lineOf(m.index!));
  for (const m of src.matchAll(DYNAMIC)) dynamic.push(lineOf(m.index!));
}

const en = load("en");
const errors: string[] = [];
for (const [key, at] of used) if (!en.has(key)) errors.push(`missing in en: ${key} (${at})`);

const vars = (s: string) => new Set([...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]));
for (const lng of LANGS) {
  const tr = load(lng);
  const missing = [...en.keys()].filter((k) => !tr.has(k));
  for (const [key, text] of tr) {
    if (!en.has(key)) errors.push(`${lng}: ${key} is not in en`);
    else for (const v of vars(text)) if (!vars(en.get(key)!).has(v)) errors.push(`${lng}: ${key} uses {{${v}}}, en doesn't`);
  }
  console.log(`${lng}: ${en.size - missing.length}/${en.size} translated`);
  if (VERBOSE) for (const k of missing) console.log(`  missing: ${k} — ${en.get(k)}`);
}

// enums.* are looked up by value (humanize in components/app/controls.tsx).
const unused = [...en.keys()].filter((k) => !used.has(k) && !k.startsWith("enums."));
console.log(`en: ${en.size} keys, ${used.size} used in src, ${unused.length} unused`);
if (VERBOSE) for (const k of unused) console.log(`  unused: ${k}`);
if (dynamic.length) console.log(`keys built at runtime (not checked):\n  ${dynamic.join("\n  ")}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
