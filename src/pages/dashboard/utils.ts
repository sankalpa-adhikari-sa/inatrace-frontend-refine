import { getLocale, t } from "@/lib/i18n";

export type Aggregation = "DAY" | "WEEK" | "MONTH" | "YEAR";

export type ExportType = "EXCEL" | "PDF" | "CSV";

// Categorical slots 1–2 of the reference palette, stepped per theme and
// validated (CVD ΔE ≥ 24, contrast ≥ 3:1) against this app's surfaces.
export const SERIES_1 = { light: "#2a78d6", dark: "#3987e5" };

export const SERIES_2 = { light: "#eb6834", dark: "#d95926" };


export const MAX_DELIVERY_POINTS = 24;

export const MAX_PERFORMANCE_POINTS = 12;

export function unitLabel(unit: string | undefined, year: number | undefined, aggregation: Aggregation) {
  if (aggregation === "WEEK") return `${t("dashboard.fields.week", { week: unit })} ${year}`;
  if (aggregation === "MONTH") {
    const month = Number(unit);
    if (!(month >= 1 && month <= 12)) return `${unit} ${year}`;
    // Month names in the UI language.
    return `${new Intl.DateTimeFormat(getLocale(), { month: "short" }).format(new Date(2000, month - 1, 1))} ${year}`;
  }
  return unit ?? "";
}

export function defaultAggregation(from: string, to: string): Aggregation {
  const days = Math.ceil(Math.abs(new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
  if (days < 7) return "DAY";
  if (days < 30) return "WEEK";
  if (days < 900) return "MONTH";
  return "YEAR";
}

export function twoYearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

export const EXT: Record<ExportType, string> = { EXCEL: "xlsx", PDF: "pdf", CSV: "csv" };

export const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
