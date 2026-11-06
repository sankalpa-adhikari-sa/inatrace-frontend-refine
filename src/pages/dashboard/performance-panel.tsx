import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { ApiProcessingEvidenceField } from "@/client/types.gen";
import { FilterPopover, SimpleCombobox } from "@/components/app/controls";
import { Section } from "@/components/app/page";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toApiDay, today } from "../stock/shared";
import { download, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useTranslate } from "@refinedev/core";
import { ChartFrame, DataTableView, ExportButton, RangeControls } from "./controls";
import { type Aggregation, defaultAggregation, EXT, MAX_PERFORMANCE_POINTS, nf, SERIES_1, SERIES_2, twoYearsAgo, unitLabel } from "./utils";

export function PerformancePanel({ companyId }: { companyId: number }) {
  const translate = useTranslate();
  const [from, setFrom] = useState(twoYearsAgo);
  const [to, setTo] = useState(today);
  const [aggregation, setAggregation] = useState<Aggregation>(() => defaultAggregation(twoYearsAgo(), today()));
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<Record<string, string>>({});

  const list = { requestType: "FETCH" as const, limit: 1000 };
  const { data: facilities = [] } = useApi(
    ep.listFacilitiesByCompany,
    { path: { id: companyId }, query: list },
    { select: (r) => r?.items ?? [] }
  );
  const { data: actions = [] } = useApi(
    ep.listProcessingActionsByCompany,
    { path: { id: companyId }, query: list },
    { select: (r) => (r?.items ?? []).filter((a) => a.type === "PROCESSING" || a.type === "FINAL_PROCESSING") }
  );

  useEffect(() => {
    if (facilityId == null && facilities.length) setFacilityId(facilities[0].id!);
  }, [facilities, facilityId]);
  useEffect(() => {
    if (actionId == null && actions.length) setActionId(actions[0].id!);
  }, [actions, actionId]);

  const action = actions.find((a) => a.id === actionId);
  const fields: ApiProcessingEvidenceField[] = action?.requiredEvidenceFields ?? [];

  const body = {
    companyId,
    facilityId: facilityId ?? undefined,
    processActionId: actionId ?? undefined,
    dateStart: toApiDay(from),
    dateEnd: toApiDay(to),
    aggregationType: aggregation,
    evidenceFields: fields
      .filter((f) => evidence[f.fieldName!])
      .map((f) =>
        ["NUMBER", "INTEGER", "PRICE", "EXCHANGE_RATE"].includes(f.type ?? "")
          ? { evidenceField: { fieldName: f.fieldName }, numericValue: Number(evidence[f.fieldName!]) }
          : { evidenceField: { fieldName: f.fieldName }, stringValue: evidence[f.fieldName!] }
      ),
  };
  // A POST endpoint that only reads; useCustom keys the query by its body.
  const { data, isFetching } = useApi(
    ep.calculateProcessingPerformanceData,
    { body },
    { enabled: facilityId != null && actionId != null }
  );

  const totals = data?.totals ?? [];
  const unit = data?.measureUnitType?.label ?? "";
  const rows = useMemo(
    () =>
      totals.slice(0, MAX_PERFORMANCE_POINTS).map((t) => ({
        label: unitLabel(t.unit, t.year, aggregation),
        input: t.inputQuantity ?? 0,
        output: t.outputQuantity ?? 0,
        ratio: t.ratio ?? 0,
      })),
    [totals, aggregation]
  );

  const quantityConfig: ChartConfig = {
    input: {
      label: translate("dashboard.fields.input", { unit }),
      theme: SERIES_1,
    },
    output: {
      label: translate("dashboard.fields.output", { unit }),
      theme: SERIES_2,
    },
  };
  const ratioConfig: ChartConfig = { ratio: { label: translate("dashboard.fields.outputInputRatio"), theme: SERIES_1 } };
  const empty = !isFetching && rows.length === 0;

  return (
    <Section
      title={translate("dashboard.titles.processingPerformance")}
      description={translate("dashboard.descriptions.inputAndOutputQuantitiesOf")}
      actions={
        <ExportButton
          onExport={(type) =>
            download(
              ep.exportProcessingPerformanceData,
              { body: { ...body, exportType: type } },
              `processing.${EXT[type]}`
            )
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
          value={facilityId}
          onChange={setFacilityId}
        />
        <SimpleCombobox
          className="w-60"
          clearable={false}
          prefix={translate("common.fields.processing")}
          options={actions.map((a) => ({ value: a.id!, label: a.name ?? "" }))}
          value={actionId}
          onChange={(id) => {
            setActionId(id);
            setEvidence({});
          }}
        />
        {fields.length > 0 && (
          <FilterPopover count={fields.filter((f) => evidence[f.fieldName!]).length} onReset={() => setEvidence({})}>
            {fields.map((f) => (
              <Field key={f.id}>
                <FieldLabel>{f.label}</FieldLabel>
                <Input
                  type={["NUMBER", "INTEGER", "PRICE", "EXCHANGE_RATE"].includes(f.type ?? "") ? "number" : "text"}
                  value={evidence[f.fieldName!] ?? ""}
                  onChange={(e) => setEvidence({ ...evidence, [f.fieldName!]: e.target.value })}
                />
              </Field>
            ))}
          </FilterPopover>
        )}
      </div>

      <ChartFrame
        empty={empty}
        truncated={totals.length > MAX_PERFORMANCE_POINTS ? MAX_PERFORMANCE_POINTS : undefined}
        table={
          <DataTableView
            headers={[translate("dashboard.fields.period"), translate("dashboard.fields.input", { unit }), translate("dashboard.fields.output", { unit }), translate("dashboard.fields.ratio")]}
            rows={rows.map((r) => [r.label, nf.format(r.input), nf.format(r.output), nf.format(r.ratio)])}
          />
        }
      >
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium">{translate("dashboard.titles.quantities")}</h3>
            <ChartContainer config={quantityConfig} className="aspect-auto h-72 w-full">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} strokeOpacity={0.5} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => nf.format(v)} />
                <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="input" fill="var(--color-input)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="output" fill="var(--color-output)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ChartContainer>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium">{translate("dashboard.titles.outputInputRatio")}</h3>
            <ChartContainer config={ratioConfig} className="aspect-auto h-72 w-full">
              <LineChart data={rows} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.5} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v) => nf.format(v)} />
                <ChartTooltip cursor={{ strokeOpacity: 0.4 }} content={<ChartTooltipContent />} />
                <Line
                  dataKey="ratio"
                  stroke="var(--color-ratio)"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </ChartFrame>
    </Section>
  );
}
