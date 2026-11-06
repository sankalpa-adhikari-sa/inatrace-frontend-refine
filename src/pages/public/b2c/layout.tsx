import { useTranslate } from "@refinedev/core";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { documentUrl } from "@/lib/api";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useB2c } from "./context";

const TABS = [
  {
    key: "fair-prices",
    get label() { return t("b2c.fields.fairPrices"); },
    enabled: "tabFairPrices",
    order: "orderFairPrices",
  },
  {
    key: "producers",
    get label() { return t("b2c.fields.producers"); },
    enabled: "tabProducers",
    order: "orderProducers",
  },
  {
    key: "quality",
    get label() { return t("common.fields.quality"); },
    enabled: "tabQuality",
    order: "orderQuality",
  },
  {
    key: "feedback",
    get label() { return t("b2c.fields.feedback"); },
    enabled: "tabFeedback",
    order: "orderFeedback",
  },
] as const;

/** B2cTabsComponent: product name over the tab bar; tabs follow the label's B2C settings. */
export function B2cTabs({ current }: { current: string }) {
  const translate = useTranslate();
  const { settings, productName, uuid, qrTag, textFont, productFont } = useB2c();
  const tabs = [
    { key: "journey", label: translate("b2c.fields.journey") },
    ...TABS.filter((t) => settings[t.enabled]).sort((a, b) => (settings[a.order] ?? 0) - (settings[b.order] ?? 0)),
  ];
  const background = settings.headerBackgroundImage?.storageKey
    ? `url(${documentUrl(settings.headerBackgroundImage.storageKey, true)})`
    : undefined;
  return (
    <div
      className="bg-cover bg-center text-white"
      style={{ backgroundColor: settings.primaryColor, backgroundImage: background }}
    >
      <h1 className="px-4 pt-8 pb-4 text-center text-2xl font-semibold md:text-3xl" style={productFont}>
        {productName}
      </h1>
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-1 px-4 pb-3">
        {tabs.map((t) => (
          <NavLink
            key={t.key}
            to={`/p-cd/${uuid}/${qrTag}/${t.key}`}
            className={cn(
              "border-b-2 border-transparent py-1 text-xs font-medium tracking-wider uppercase opacity-80 hover:opacity-100",
              current === t.key && "border-white opacity-100"
            )}
            style={textFont}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** The content column of a tab, with its heading. */
export function B2cMain({ title, children }: { title: string; children: ReactNode }) {
  const { settings, textFont } = useB2c();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8 text-sm/relaxed" style={textFont}>
      <h1 className="text-2xl font-semibold" style={{ color: settings.headingColor }}>
        {title}
      </h1>
      {children}
    </main>
  );
}
