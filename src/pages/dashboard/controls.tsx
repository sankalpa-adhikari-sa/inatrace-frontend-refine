import { ChevronDown, Download, Table2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { today } from "../stock/shared";
import { useTranslate } from "@refinedev/core";
import { type Aggregation, defaultAggregation, type ExportType } from "./utils";

export function RangeControls({
  from,
  to,
  setFrom,
  setTo,
  aggregation,
  setAggregation,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  aggregation: Aggregation;
  setAggregation: (a: Aggregation) => void;
}) {
  const translate = useTranslate();
  return (
    <>
      <DateRangePicker
        from={from}
        to={to}
        max={today()}
        onChange={(f, t) => {
          setFrom(f);
          setTo(t);
        }}
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

/**
 * The grouping follows the date range: picking a new range regroups it (days for a week, months for a
 * year, …), so the chart neither shows two bars nor hundreds. The user can still change it afterwards.
 */
export function useRangeAggregation(from: string, to: string, setAggregation: (a: Aggregation) => void) {
  const range = `${from}|${to}`;
  const last = useRef(range);
  useEffect(() => {
    if (last.current === range) return;
    last.current = range;
    if (from && to) setAggregation(defaultAggregation(from, to));
  }, [range, from, to, setAggregation]);
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
