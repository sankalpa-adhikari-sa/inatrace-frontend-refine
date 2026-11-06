import { useTranslate } from "@refinedev/core";
import { Check, HelpCircle, QrCode, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { ApiProductLabelAnalytics } from "@/client/types.gen";
import { SimpleSelect } from "@/components/app/controls";
import { PageLoader, Section } from "@/components/app/page";
import { MapView } from "@/components/app/map-view";
import { TableEmptyRow } from "@/components/app/table-empty-row";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ep } from "@/lib/endpoints";
import { useApi } from "@/lib/http";
import { t } from "@/lib/i18n";
import { LabelPageHeader, useLabelParams } from "./shared";

/** `/product-labels/:id/labels/:labelId/statistics` (ProductLabelStatisticsPageComponent) */
export function LabelStatistics() {
  const translate = useTranslate();
  const { labelId } = useLabelParams();
  const { data: label } = useApi(ep.getProductLabel, { path: { id: labelId } });
  const { data: stats, isLoading } = useApi(
    ep.getProductLabelAnalytics,
    { path: { uid: label?.uuid ?? "" } },
    { enabled: !!label?.uuid }
  );

  return (
    <>
      <LabelPageHeader title={translate("products.labelPages.titles.statistics")} />
      {isLoading || !stats ? (
        <PageLoader />
      ) : (
        <>
          <Section title={translate("products.labelPages.titles.pageVisits")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile icon={<QrCode />} label={translate("products.labelPages.fields.visitsThroughQrCode")} value={stats.visits} />
            </div>
          </Section>
          <Section title={translate("products.labelPages.titles.checkAuthenticity")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                icon={<HelpCircle />}
                label={translate("products.labelPages.fields.authenticityChecks")}
                value={(stats.authTrue ?? 0) + (stats.authFalse ?? 0)}
              />
              <StatTile icon={<Check />} label={translate("products.labelPages.fields.authentic")} value={stats.authTrue} />
              <StatTile icon={<X />} label={translate("products.labelPages.fields.counterfeit")} value={stats.authFalse} />
            </div>
          </Section>
          <Section title={translate("products.labelPages.titles.traceOrigin")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                icon={<HelpCircle />}
                label={translate("products.labelPages.fields.traceOriginChecks")}
                value={(stats.originTrue ?? 0) + (stats.originFalse ?? 0)}
              />
              <StatTile icon={<Check />} label={translate("products.labelPages.fields.successful")} value={stats.originTrue} />
              <StatTile icon={<X />} label={translate("products.labelPages.fields.unsuccessful")} value={stats.originFalse} />
            </div>
          </Section>
          <ScanLocations stats={stats} />
        </>
      )}
    </>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value?: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-semibold tabular-nums">{(value ?? 0).toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

// Categorical slots 1–3 of the shared chart palette, in fixed order.
const SCAN_KINDS = [
  {
    key: "visits",
    get label() { return t("products.labelPages.fields.pageVisits"); },
    color: "#2a78d6",
    locations: (s: ApiProductLabelAnalytics) => s.visitsLocations,
  },
  {
    key: "auth",
    get label() { return t("products.labelPages.fields.checkAuthenticityClicks"); },
    color: "#eb6834",
    locations: (s: ApiProductLabelAnalytics) => s.authLocations,
  },
  {
    key: "origin",
    get label() { return t("products.labelPages.fields.traceOriginClicks"); },
    color: "#1baf7a",
    locations: (s: ApiProductLabelAnalytics) => s.originLocations,
  },
] as const;

function ScanMap({ stats }: { stats: ApiProductLabelAnalytics }) {
  const [shown, setShown] = useState<Record<string, boolean>>({ visits: true, auth: false, origin: false });
  const markers = SCAN_KINDS.filter((k) => shown[k.key]).flatMap((k) =>
    Object.entries(k.locations(stats) ?? {})
      .filter(([key]) => key !== "unknown")
      .map(([key, count]) => {
        const [lat, lng] = key.split(":").map(Number);
        return { id: `${k.key}-${key}`, lat, lng, color: k.color, label: String(count), popup: `${k.label}: ${count}` };
      })
  );
  return (
    <div className="flex flex-col gap-2">
      <MapView markers={markers} fitKey={JSON.stringify(shown)} />
      <div className="flex flex-wrap gap-4">
        {SCAN_KINDS.map((k) => (
          <label key={k.key} className="flex items-center gap-2 text-xs">
            <Checkbox checked={!!shown[k.key]} onCheckedChange={(c) => setShown((v) => ({ ...v, [k.key]: !!c }))} />
            <span className="size-2.5 rounded-full" style={{ backgroundColor: k.color }} />
            {k.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Scan counts by country and by location, next to the map. */
function ScanLocations({ stats }: { stats: ApiProductLabelAnalytics }) {
  const translate = useTranslate();
  const kinds = [
    {
      key: "visits",
      label: translate("products.labelPages.fields.pageVisits"),
      countries: stats.visitsCountries,
      locations: stats.visitsLocations,
    },
    {
      key: "auth",
      label: translate("products.labelPages.fields.authenticityChecks"),
      countries: stats.authCountries,
      locations: stats.authLocations,
    },
    {
      key: "origin",
      label: translate("products.labelPages.fields.traceOriginChecks"),
      countries: stats.originCountries,
      locations: stats.originLocations,
    },
  ] as const;
  const [kind, setKind] = useState<(typeof kinds)[number]["key"]>("visits");
  const current = kinds.find((k) => k.key === kind)!;
  const sorted = (m?: Record<string, number>) => Object.entries(m ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <Section plain
      title={translate("products.labelPages.titles.scanLocations")}
      actions={
        <SimpleSelect
          options={kinds.map((k) => ({ value: k.key, label: k.label }))}
          value={kind}
          onChange={(v) => v && setKind(v)}
          className="w-52"
        />
      }
    >
      <ScanMap stats={stats} />
      <div className="grid gap-6 md:grid-cols-2">
        <CountTable heading={translate("common.fields.country")} rows={sorted(current.countries)} />
        <CountTable
          heading={translate("products.labelPages.fields.locationLatLng")}
          rows={sorted(current.locations).map(([k, v]) => [k === "unknown" ? translate("products.labelPages.fields.unknown") : k.split(":").join(", "), v])}
        />
      </div>
    </Section>
  );
}

function CountTable({ heading, rows }: { heading: string; rows: [string, number][] }) {
  const translate = useTranslate();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{heading}</TableHead>
          <TableHead className="text-right">{translate("products.labelPages.fields.count")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableEmptyRow colSpan={2} title={translate("products.labelPages.titles.noData")} />
        )}
        {rows.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell>
              {k === "unknown"
                ? translate("products.labelPages.fields.unknown")
                : k}
            </TableCell>
            <TableCell className="text-right tabular-nums">{v}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
