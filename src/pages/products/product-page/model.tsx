import { createContext } from "react";
import { type Control } from "react-hook-form";
import type { ApiBusinessToCustomerSettings, ApiProduct, ApiProductLabel, ApiProductLabelCompanyDocument, ApiProductLabelContent, ApiProductLabelField } from "@/client/types.gen";
import { Label } from "@/components/ui/label";
import { useSelectedCompany } from "@/hooks/use-session";
import { t } from "@/lib/i18n";

export type Language = NonNullable<ApiProductLabel["language"]>;
export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "EN", get label() { return t("products.productPage.fields.english"); } },
  { value: "DE", get label() { return t("products.productPage.fields.deutsch"); } },
  { value: "RW", get label() { return t("products.productPage.fields.kinyarwanda"); } },
  { value: "ES", get label() { return t("products.productPage.fields.espaOl"); } },
];
export const GRAPHIC_OPTIONS = [
  { value: "DISABLED", get label() { return t("products.productPage.fields.disabled"); } },
  { value: "PER_CONTAINER", get label() { return t("products.productPage.fields.perContainer"); } },
  { value: "PER_KG", get label() { return t("products.productPage.fields.perKg"); } },
  { value: "PERCENT_VALUE", get label() { return t("products.productPage.fields.value"); } },
];
export const SOCIAL = ["facebook", "instagram", "twitter", "youtube", "other"] as const;


export const LABEL_FIELDS: { name: string; section: string; defaultVisible?: boolean }[] = [
  { name: "name", section: "product", defaultVisible: true },
  { name: "photo", section: "product", defaultVisible: true },
  { name: "description", section: "product", defaultVisible: true },
  { name: "origin", section: "product", defaultVisible: true },
  { name: "journeyMarkers", section: "product", defaultVisible: true },
  { name: "process.production", section: "process" },
  { name: "responsibility.laborPolicies", section: "responsibility" },
  { name: "sustainability.production", section: "sustainability" },
  { name: "sustainability.packaging", section: "sustainability" },
  { name: "sustainability.co2Footprint", section: "sustainability" },
  { name: "settings.language", section: "settings" },
  { name: "settings.gdprText", section: "settings" },
  { name: "settings.privacyPolicyText", section: "settings" },
  { name: "settings.termsOfUseText", section: "settings" },
  { name: "company.name", section: "company" },
  { name: "company.logo", section: "company" },
  { name: "company.headquarters", section: "company" },
  { name: "company.about", section: "company" },
  { name: "company.manager", section: "company" },
  { name: "company.email", section: "company" },
  { name: "company.phone", section: "company" },
  { name: "company.webPage", section: "company" },
  ...SOCIAL.map((s) => ({ name: `company.mediaLinks.${s}`, section: "company" })),
];

// Visibility keys use "_" because react-hook-form treats "." as nesting.
export const visKey = (name: string) => name.replace(/\./g, "_");

export type Media = {
  video: ApiProductLabelCompanyDocument[];
  farmers: ApiProductLabelCompanyDocument[];
  productionRecord: ApiProductLabelCompanyDocument[];
};
export type FormValues = ApiProduct & {
  visibility: Record<string, boolean>;
  media: Media;
};

export const DEFAULT_B2C: ApiBusinessToCustomerSettings = {
  primaryColor: "#25265E",
  secondaryColor: "#5DBCCF",
  tertiaryColor: "#F7F7F7",
  quaternaryColor: "#25265E",
  headingColor: "#000000",
  textColor: "#000000",
  tabFairPrices: true,
  tabProducers: true,
  tabQuality: true,
  tabFeedback: true,
  orderFairPrices: 1,
  orderProducers: 2,
  orderQuality: 3,
  orderFeedback: 4,
  graphicFairPrices: true,
  graphicIncreaseOfIncome: true,
  graphicQuality: true,
};

export function visibilityOf(fields?: ApiProductLabelField[]) {
  const out: Record<string, boolean> = {};
  for (const f of LABEL_FIELDS) {
    const saved = fields?.find((x) => x.name === f.name);
    out[visKey(f.name)] = saved ? !!saved.visible : !fields && !!f.defaultVisible;
  }
  return out;
}

export function labelFields(visibility: Record<string, boolean>, saved?: ApiProductLabelField[]): ApiProductLabelField[] {
  const rank = (name: string) => {
    const i = saved?.findIndex((x) => x.name === name) ?? -1;
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...LABEL_FIELDS]
    .sort((a, b) => rank(a.name) - rank(b.name))
    .map((f) => ({
      name: f.name,
      section: f.section,
      visible: f.name === "journeyMarkers" ? true : !!visibility[visKey(f.name)],
    }));
}

export function mediaOf(docs?: ApiProductLabelCompanyDocument[]): Media {
  const by = (c: ApiProductLabelCompanyDocument["category"]) => (docs ?? []).filter((d) => d.category === c);
  return { video: by("VIDEO"), farmers: by("MEET_THE_FARMER"), productionRecord: by("PRODUCTION_RECORD") };
}

export function toForm(
  p: ApiProduct | ApiProductLabelContent,
  fields?: ApiProductLabelField[],
  docs?: ApiProductLabelCompanyDocument[]
): FormValues {
  return {
    ...(p as ApiProduct),
    origin: { text: p.origin?.text ?? "", locations: p.origin?.locations ?? [] },
    journeyMarkers: p.journeyMarkers ?? [],
    company: {
      ...p.company,
      mediaLinks: { ...Object.fromEntries(SOCIAL.map((s) => [s, ""])), ...p.company?.mediaLinks },
    },
    businessToCustomerSettings: p.businessToCustomerSettings ?? {},
    visibility: visibilityOf(fields),
    media: mediaOf(docs),
  };
}

/** The product body without form-only fields; empty social links are dropped. */
export function productBody(v: FormValues): ApiProduct {
  const { visibility: _v, media: _m, ...product } = v;
  const mediaLinks = Object.fromEntries(Object.entries(product.company?.mediaLinks ?? {}).filter(([, x]) => !!x));
  return { ...product, company: { ...product.company, mediaLinks } };
}

// Label mode: each field gets a "show on label" toggle.
export const LabelMode = createContext<{ control: Control<FormValues> } | null>(null);

export function useIsOwner(product?: ApiProduct) {
  const { companyId } = useSelectedCompany();
  return !!product?.associatedCompanies?.some((c) => c.type === "OWNER" && c.company?.id === companyId);
}
