import { ChevronDown, Download, Table2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useUrlFilters } from "@/hooks/use-url-state";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { today } from "../stock/shared";
import { useTranslate } from "@refinedev/core";
import { type Aggregation, defaultAggregation, type ExportType, twoYearsAgo } from "./utils";

export type DashboardRange = { from: string; to: string; aggregation: Aggregation };

const AGGREGATIONS: readonly Aggregation[] = ["DAY", "WEEK", "MONTH", "YEAR"];

/**
 * The dashboard's date range and grouping, shared by its panels and kept in the URL (`?from=&to=&grouping=`)
 * so a reload or a shared link shows the same view. A new range also picks a fitting grouping (days for a
 * week, months for a year, …); the user can change the grouping afterwards.
 */
export function useDashboardRange() {
  const url = useUrlFilters(["from", "to", "grouping"] as const);
  const from = url.values.from || twoYearsAgo();
  const to = url.values.to || today();
  const grouping = url.values.grouping as Aggregation;
  const aggregation = AGGREGATIONS.includes(grouping) ? grouping : defaultAggregation(from, to);
  return {
    range: { from, to, aggregation } satisfies DashboardRange,
    setRange: (f: string, t: string) => url.set({ from: f, to: t, grouping: f && t ? defaultAggregation(f, t) : "" }),
    setAggregation: (a: Aggregation) => url.set({ grouping: a }),
  };
}

export function RangeControls({
  range: { from, to, aggregation },
  setRange,
  setAggregation,
}: {
  range: DashboardRange;
  setRange: (from: string, to: string) => void;
  setAggregation: (a: Aggregation) => void;
}) {
  const translate = useTranslate();
  return (
    <>
      <DateRangePicker
        from={from}
        to={to}
        max={today()}
        onChange={setRange}
      />
      <ToggleGroup
        variant="outline"
        spacing={0}
        value={[aggregation]}
        onValueChange={(v) => v[0] && setAggregation(v[0] as Aggregation)}
      >
        <ToggleGroupItem value="DAY">
          {translate("dashboard.buttons.daily")}
        </ToggleGroupItem>
        <ToggleGroupItem value="WEEK">
          {translate("dashboard.buttons.weekly")}
        </ToggleGroupItem>
        <ToggleGroupItem value="MONTH">
          {translate("dashboard.buttons.monthly")}
        </ToggleGroupItem>
        <ToggleGroupItem value="YEAR">
          {translate("dashboard.buttons.yearly")}
        </ToggleGroupItem>
      </ToggleGroup>
    </>
  );
}

/** Pick one or more of a list (e.g. facilities); at least one stays ticked. */
export function MultiPick({
  prefix,
  options,
  value,
  onChange,
}: {
  prefix: string;
  options: { value: number; label: string }[];
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const translate = useTranslate();
  const chosen = options.filter((o) => value.includes(o.value));
  const summary =
    chosen.length === 1
      ? chosen[0].label
      : chosen.length === options.length && options.length > 1
        ? translate("dashboard.texts.allCount", { count: options.length })
        : translate("dashboard.texts.selectedCount", { count: chosen.length });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button
            variant="outline"
            size="sm"
            // Looks like the select inputs next to it, not like an action button.
            className="h-7 max-w-72 justify-start border-input bg-input/20 font-normal text-foreground hover:bg-input/30 hover:text-foreground"
          />}>
        <span className="text-muted-foreground">{prefix}</span>
        <span className="truncate">{summary}</span>
        <ChevronDown className="ml-auto opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={on}
              closeOnClick={false}
              disabled={on && value.length === 1}
              onCheckedChange={(c) => onChange(c ? [...value, o.value] : value.filter((v) => v !== o.value))}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ExportButton({ onExport }: { onExport: (type: ExportType) => Promise<void> }) {
  const translate = useTranslate();
  const [busy, setBusy] = useState(false);
  const run = async (type: ExportType) => {
    setBusy(true);
    try {
      await onExport(type);
    } finally {
      setBusy(false);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={busy} />}>
        {busy ? <Spinner /> : <Download />}
        {translate("dashboard.buttons.exportData")}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("EXCEL")}>{translate("dashboard.buttons.excel")} (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("PDF")}>{translate("dashboard.buttons.pdf")} (.pdf)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("CSV")}>{translate("dashboard.buttons.csv")} (.csv)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One headline figure above a chart: label, value and an optional note (unit, period). */
export function StatTile({ label, value, note }: { label: ReactNode; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-foreground/8 bg-muted/30 px-3 py-2.5">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-xl leading-tight font-semibold text-foreground">{value}</span>
      {note && <span className="truncate text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>;
}

/** Chart with a table-view toggle (the accessible alternative to the plot), and its loading / error / empty states. */
export function ChartFrame({
  children,
  table,
  empty,
  emptyText,
  loading,
  error,
  onRetry,
  truncated,
}: {
  children: ReactNode;
  table: ReactNode;
  empty: boolean;
  /** Why there's nothing to show, when it's more specific than "no data for these filters". */
  emptyText?: ReactNode;
  /** First load: a placeholder of the chart's size instead of an empty frame. */
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  truncated?: number;
}) {
  const translate = useTranslate();
  const [asTable, setAsTable] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setAsTable(!asTable)} aria-pressed={asTable}>
          <Table2 />
          {asTable ? translate("dashboard.buttons.showChart") : translate("dashboard.buttons.showTable")}
        </Button>
      </div>
      {error ? (
        <ErrorState onRetry={onRetry} />
      ) : loading ? (
        <Skeleton className="h-72 w-full" aria-label={translate("common.texts.loading")} />
      ) : empty ? (
        <p className="py-10 text-center text-xs text-muted-foreground">
          {emptyText ?? translate("dashboard.texts.noDataForTheSelected")}
        </p>
      ) : asTable ? (
        table
      ) : (
        children
      )}
      {truncated != null && (
        <p className="text-xs text-muted-foreground italic">
          {translate("dashboard.texts.onlyTheLatestPeriodsAre", { truncated })}
        </p>
      )}
    </div>
  );
}

export function DataTableView({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r[0]}>
              {r.map((c, i) => (
                <TableCell key={i} className={i > 0 ? "text-right tabular-nums" : undefined}>
                  {c}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
