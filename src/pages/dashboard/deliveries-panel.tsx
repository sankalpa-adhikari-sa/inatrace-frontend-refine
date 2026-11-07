import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ApiUserCustomer } from "@/client/types.gen";
import { FilterPopover, SimpleCombobox } from "@/components/app/controls";
import { Section } from "@/components/app/page";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { personName, toApiDay, today } from "../stock/shared";
import { download, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useTranslate } from "@refinedev/core";
import { ChartFrame, DataTableView, ExportButton, RangeControls, StatRow, StatTile, useRangeAggregation } from "./controls";
import { type Aggregation, compact, defaultAggregation, EXT, MAX_DELIVERY_POINTS, nf, SERIES_1, twoYearsAgo, unitLabel } from "./utils";

export function DeliveriesPanel({ companyId }: { companyId: number }) {
  const translate = useTranslate();
  const [from, setFrom] = useState(twoYearsAgo);
  const [to, setTo] = useState(today);
  const [aggregation, setAggregation] = useState<Aggregation>(() => defaultAggregation(twoYearsAgo(), today()));
  const [facilityIds, setFacilityIds] = useState<number[] | null>(null);
  const [semiProductId, setSemiProductId] = useState<number | null>(null);
  const [farmerId, setFarmerId] = useState<number | null>(null);
  const [collectorId, setCollectorId] = useState<number | null>(null);
  const [organic, setOrganic] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [inDeposit, setInDeposit] = useState(false);
  useRangeAggregation(from, to, setAggregation);

  const list = { requestType: "FETCH" as const, limit: 1000 };
  const { data: facilities = [], isSuccess: facilitiesLoaded } = useApi(
    ep.listCollectingFacilitiesByCompany,
    { path: { id: companyId }, query: list },
    { select: (r) => r?.items ?? [] }
  );
  const people = (type: "FARMER" | "COLLECTOR") =>
    ({ path: { companyId, type }, query: { ...list, sortBy: "BY_NAME", sort: "ASC" as const } } as const);
  const items = { select: (r?: { items?: ApiUserCustomer[] }) => r?.items ?? [] };
  const { data: farmers = [] } = useApi(ep.getUserCustomersForCompanyAndType, people("FARMER"), items);
  const { data: collectors = [] } = useApi(ep.getUserCustomersForCompanyAndType, people("COLLECTOR"), items);

  useEffect(() => {
    if (facilityIds == null && facilities.length) {
      setFacilityIds([facilities[0].id!]);
      setSemiProductId(facilities[0].facilitySemiProductList?.[0]?.id ?? null);
    }
  }, [facilities, facilityIds]);

  const selectedFacilities = facilities.filter((f) => facilityIds?.includes(f.id!));
  const semiProducts = [
    ...new Map(selectedFacilities.flatMap((f) => f.facilitySemiProductList ?? []).map((s) => [s.id, s])).values(),
  ];

  const params = {
    companyId,
    facilityIds: facilityIds ?? undefined,
    semiProductId: semiProductId ?? undefined,
    farmerId: farmerId ?? undefined,
    collectorId: collectorId ?? undefined,
    isWomenShare: womenOnly || undefined,
    organicOnly: organic || undefined,
    priceDeterminedLater: inDeposit || undefined,
    productionDateStart: toApiDay(from),
    productionDateEnd: toApiDay(to),
    aggregationType: aggregation,
  };
  const { data, isFetching, isLoading, isError, refetch } = useApi(
    ep.getDeliveriesAggregatedData,
    { query: params },
    { enabled: facilityIds != null, select: (r) => r }
  );

  const totals = data?.totals ?? [];
  // The latest periods when there are too many to plot (the series runs oldest → newest).
  const rows = totals
    .slice(-MAX_DELIVERY_POINTS)
    .map((t) => ({ label: unitLabel(t.unit, t.year, aggregation), quantity: t.totalQuantity ?? 0 }));
  const sum = totals.reduce((s, t) => s + (t.totalQuantity ?? 0), 0);
  const busiest = totals.reduce<(typeof totals)[number] | undefined>(
    (best, t) => ((t.totalQuantity ?? 0) > (best?.totalQuantity ?? -1) ? t : best),
    undefined
  );
  const unit = semiProducts.find((s) => s.id === semiProductId)?.measurementUnitType?.label ?? "";
  const config: ChartConfig = {
    quantity: {
      label: translate("dashboard.fields.delivered", { unit: unit ? ` (${unit})` : "" }),
      theme: SERIES_1,
    },
  };

  return (
    <Section
      title={translate("common.titles.deliveries")}
      description={translate("dashboard.descriptions.deliveredQuantityPerPeriod", { unit: unit ? ` (${unit})` : "" })}
      actions={
        <ExportButton
          onExport={(type) =>
            download(ep.exportDeliveriesData, { query: { ...params, exportType: type } }, `deliveries.${EXT[type]}`)
          }
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <RangeControls
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          aggregation={aggregation}
          setAggregation={setAggregation}
        />
        <SimpleCombobox
          className="w-60"
          clearable={false}
          prefix={translate("common.fields.facility")}
          options={facilities.map((f) => ({ value: f.id!, label: f.name ?? "" }))}
          value={facilityIds?.[0] ?? null}
          onChange={(id) => {
            setFacilityIds(id ? [id] : []);
            setSemiProductId(facilities.find((f) => f.id === id)?.facilitySemiProductList?.[0]?.id ?? null);
          }}
        />
        <SimpleCombobox
          className="w-60"
          clearable={false}
          prefix={translate("dashboard.fields.semiProduct")}
          options={semiProducts.map((s) => ({ value: s.id!, label: s.name ?? "" }))}
          value={semiProductId}
          onChange={setSemiProductId}
        />
        <FilterPopover
          count={[farmerId, collectorId, organic || null, womenOnly || null, inDeposit || null].filter(Boolean).length}
          onReset={() => {
            setFarmerId(null);
            setCollectorId(null);
            setOrganic(false);
            setWomenOnly(false);
            setInDeposit(false);
          }}
        >
          <Field>
            <FieldLabel>{translate("common.fields.farmer")}</FieldLabel>
            <SimpleCombobox
              placeholder={translate("dashboard.placeholders.allFarmers")}
              options={farmers.map((u) => ({ value: u.id!, label: personName(u) }))}
              value={farmerId}
              onChange={setFarmerId}
            />
          </Field>
          <Field>
            <FieldLabel>{translate("common.fields.collector")}</FieldLabel>
            <SimpleCombobox
              placeholder={translate("dashboard.placeholders.allCollectors")}
              options={collectors.map((u) => ({ value: u.id!, label: personName(u) }))}
              value={collectorId}
              onChange={setCollectorId}
            />
          </Field>
          <div className="flex flex-col gap-2">
            {(
              [
                ["organic", translate("dashboard.fields.organic"), organic, setOrganic],
                ["women", translate("dashboard.fields.womensOnly"), womenOnly, setWomenOnly],
                ["deposit", translate("dashboard.fields.productInDeposit"), inDeposit, setInDeposit],
              ] as const
            ).map(([id, label, value, set]) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox id={`dash-${id}`} checked={value} onCheckedChange={(c) => set(!!c)} />
                <Label htmlFor={`dash-${id}`}>{label}</Label>
              </div>
            ))}
          </div>
        </FilterPopover>
      </div>
      {totals.length > 0 && (
        <StatRow>
          <StatTile
            label={translate("dashboard.fields.totalDelivered")}
            value={compact.format(sum)}
            note={unit || undefined}
          />
          <StatTile
            label={translate("dashboard.fields.averagePerPeriod")}
            value={compact.format(sum / totals.length)}
            note={unit || undefined}
          />
          {busiest && (
            <StatTile
              label={translate("dashboard.fields.busiestPeriod")}
              value={unitLabel(busiest.unit, busiest.year, aggregation)}
              note={`${nf.format(busiest.totalQuantity ?? 0)} ${unit}`.trim()}
            />
          )}
        </StatRow>
      )}
      <ChartFrame
        loading={isLoading || (!facilitiesLoaded && facilityIds == null)}
        error={isError}
        onRetry={() => void refetch()}
        emptyText={facilitiesLoaded && facilities.length === 0 ? translate("dashboard.texts.noCollectingFacilitiesYet") : undefined}
        empty={(!isFetching && rows.length === 0) || (facilitiesLoaded && facilities.length === 0)}
        truncated={totals.length > MAX_DELIVERY_POINTS ? MAX_DELIVERY_POINTS : undefined}
        table={
          <DataTableView
            headers={[translate("dashboard.fields.period"), translate("dashboard.fields.delivered", { unit: unit ? ` (${unit})` : "" })]}
            rows={rows.map((r) => [r.label, nf.format(r.quantity)])}
          />
        }
      >
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => nf.format(v)} />
            <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<ChartTooltipContent />} />
            <Bar dataKey="quantity" fill="var(--color-quantity)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ChartContainer>
      </ChartFrame>
    </Section>
  );
}
