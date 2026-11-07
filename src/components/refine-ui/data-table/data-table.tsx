"use client";

import type { HttpError, BaseRecord } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import type { Cell, Column, ColumnDef, Row, RowData } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { ArrowDownUp, ChevronRight, Columns3, Inbox, type LucideIcon, SearchX } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/refine-ui/data-table/data-table-pagination";
import { headerLabel, isSortableHeader } from "@/components/refine-ui/data-table/data-table-sorter";
import { useIsMobile } from "@/hooks/use-mobile";
import { ErrorState } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-aligned with tabular figures: quantities, amounts, counts. */
    align?: "right";
    /** The row's main cell: rendered as the link to the row (with `getRowHref`). */
    primary?: boolean;
    /**
     * Where the cell goes in the phone card (see `CardRole`). Default: `title` for the primary cell, `stat`
     * for right-aligned ones, `field` otherwise. Card cells are called as plain functions (to leave out empty
     * ones), so a column's `cell` must not call hooks; render a component from it instead.
     */
    card?: CardRole;
    /** The cell's icon in the phone card: in front of a `meta` value (instead of its label) or a `stat`'s label. */
    icon?: LucideIcon;
  }
}

/**
 * - `title`: the card's heading (several are joined with spaces, e.g. first and last name)
 * - `subtitle`: muted line under the title (also the heading when the title cell is empty)
 * - `badge`: top right; plain text is shown as a badge
 * - `meta`: icon + value in a wrapping line (dates, places); the label is the tooltip
 * - `stat`: label over a prominent value in a tinted strip (quantities, amounts)
 * - `body`: a paragraph of longer text
 * - `field`: label over value in a two-column grid
 * - `hidden`: left out of the card
 */
export type CardRole = "title" | "subtitle" | "badge" | "meta" | "stat" | "body" | "field" | "hidden";

type DataTableProps<TData extends BaseRecord> = {
  table: UseTableReturnType<TData, HttpError>;
  /**
   * Filters the page applies outside Refine's filter state (permanent filters built from its own controls).
   * Changing them returns to page 1, like changing a Refine filter.
   */
  filterKey?: unknown;
  /** Whether the user has narrowed the list (for the "no results" state); computed from Refine's filters if omitted. */
  isFiltered?: boolean;
  /** Clears the page's own filters; defaults to restoring Refine's initial filters. */
  onClearFilters?: () => void;
  /** Where a row leads: the whole row is clickable and its `primary` cell is a link. */
  getRowHref?: (row: TData) => string | undefined;
  /** Replaces the default "this table is empty" state, e.g. with a create button. */
  empty?: { title?: ReactNode; description?: ReactNode; action?: ReactNode };
  /** On phones each row is a card (label: value) instead of a sideways-scrolling table row. Default on. */
  cards?: boolean;
  /**
   * Offer a "Columns" menu to hide columns, remembered in this browser under this key. For wide tables;
   * the selection, actions and primary columns can't be hidden.
   */
  columnsKey?: string;
};

/** Columns that aren't data: they keep their place in the card's corners, without a label. */
const SELECT = "select";
const ACTIONS = "actions";

/** Clicks on these inside a row act on their own, not as "open the row". */
const INTERACTIVE = "a, button, input, select, textarea, label, [role=checkbox], [role=menuitem], [role=combobox]";

export function DataTable<TData extends BaseRecord>({
  table,
  filterKey,
  isFiltered: isFilteredProp,
  onClearFilters,
  getRowHref,
  empty,
  cards = true,
  columnsKey,
}: DataTableProps<TData>) {
  const translate = useTranslate();
  const asCards = useIsMobile() && cards;
  useStoredColumnVisibility(table, columnsKey);
  const navigate = useNavigate();
  const {
    reactTable: { getHeaderGroups, getRowModel, getAllColumns },
    refineCore: {
      tableQuery,
      sorters,
      currentPage,
      setCurrentPage,
      pageCount,
      pageSize,
      setPageSize,
      filters,
      setFilters,
    },
  } = table;

  // Filters present on mount (permanent/initial ones) aren't the user's doing.
  const initialFilters = useRef(filters);
  const isFiltered =
    isFilteredProp ??
    filters.some(
      (f) => hasValue(f.value) && !initialFilters.current.some((i) => JSON.stringify(i) === JSON.stringify(f))
    );

  // A new filter, search or sort starts again from the first page; otherwise page 3 of the old results can
  // be past the end of the new ones (or an arbitrary slice of the new order).
  const filterSignature = JSON.stringify([filters, filterKey ?? null, sorters]);
  const lastSignature = useRef(filterSignature);
  useEffect(() => {
    if (lastSignature.current === filterSignature) return;
    lastSignature.current = filterSignature;
    if (currentPage !== 1) setCurrentPage(1);
  }, [filterSignature, currentPage, setCurrentPage]);

  const columns = getAllColumns();
  const leafColumns = table.reactTable.getAllLeafColumns();
  const isLoading = tableQuery.isLoading;
  const isError = tableQuery.isError && !tableQuery.data;
  // Refetching (new page, sort or filter) while the previous rows stay on screen.
  const isRefetching = tableQuery.isFetching && !isLoading;
  const rows = getRowModel().rows ?? [];

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [isOverflowing, setIsOverflowing] = useState({
    horizontal: false,
    vertical: false,
  });

  useEffect(() => {
    const checkOverflow = () => {
      if (tableRef.current && tableContainerRef.current) {
        const table = tableRef.current;
        const container = tableContainerRef.current;

        const horizontalOverflow = table.offsetWidth > container.clientWidth;
        const verticalOverflow = table.offsetHeight > container.clientHeight;

        setIsOverflowing({
          horizontal: horizontalOverflow,
          vertical: verticalOverflow,
        });
      }
    };

    checkOverflow();

    // Check on window resize
    window.addEventListener("resize", checkOverflow);

    // Check when table data changes
    const timeoutId = setTimeout(checkOverflow, 100);

    return () => {
      window.removeEventListener("resize", checkOverflow);
      clearTimeout(timeoutId);
    };
  }, [tableQuery.data?.data, pageSize]);

  const openRow = (e: MouseEvent<HTMLElement>, href: string | undefined) => {
    if (!href || (e.target as HTMLElement).closest(INTERACTIVE)) return;
    // Text selection in a row shouldn't navigate.
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
    else navigate(href);
  };

  const renderCell = (cell: Cell<TData, unknown>, href: string | undefined) => {
    const meta = cell.column.columnDef.meta;
    const content = flexRender(cell.column.columnDef.cell, cell.getContext());
    const value = cell.getValue();
    // Cells are truncated to keep rows one line high: show the full text on hover.
    const title = typeof value === "string" || typeof value === "number" ? String(value) : undefined;
    return (
      <div className={cn("truncate", meta?.align === "right" && "text-right tabular-nums")} title={title}>
        {meta?.primary && href ? (
          <Link to={href} className="font-medium hover:underline">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    );
  };

  if (isError) {
    return <ErrorState onRetry={() => void tableQuery.refetch()} />;
  }

  const clearFilters = onClearFilters ?? (() => setFilters(initialFilters.current, "replace"));
  const pagination = !isLoading && (rows.length > 0 || currentPage > 1) && (
    <DataTablePagination
      currentPage={currentPage}
      pageCount={pageCount}
      setCurrentPage={setCurrentPage}
      pageSize={pageSize}
      setPageSize={setPageSize}
      total={tableQuery.data?.total}
    />
  );

  if (asCards) {
    const sortHeaders = getHeaderGroups()[0]?.headers.filter((h) =>
      isSortableHeader(h.column.columnDef as ColumnDef<unknown, unknown>)
    );
    return (
      <div className="flex flex-col gap-3">
        {!!sortHeaders?.length && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <ArrowDownUp aria-hidden className="size-3.5" />
            {sortHeaders.map((h) => (
              <span key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</span>
            ))}
          </div>
        )}
        <div className={cn("transition-opacity", isRefetching && "opacity-60")} aria-busy={tableQuery.isFetching || undefined}>
          {isLoading ? (
            <ul aria-hidden className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex flex-col gap-2.5 rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </li>
              ))}
            </ul>
          ) : rows.length ? (
            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <RowCard key={row.original?.id ?? row.id} row={row} href={getRowHref?.(row.original)} onOpen={openRow} />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border bg-card py-10">
              <NoDataContent isFiltered={isFiltered} onClearFilters={clearFilters} empty={empty} />
            </div>
          )}
        </div>
        {pagination}
      </div>
    );
  }

  return (
    <div className={cn("flex", "flex-col", "flex-1", "gap-4")}>
      {columnsKey && <ColumnsMenu table={table} />}
      <div ref={tableContainerRef} className={cn("relative overflow-hidden rounded-md border bg-card")}>
        {isRefetching && (
          <div
            role="progressbar"
            aria-label={translate("common.texts.loading")}
            className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-primary"
          />
        )}
        <Table ref={tableRef} style={{ tableLayout: "fixed", width: "100%" }} aria-busy={tableQuery.isFetching || undefined}>
          <TableHeader>
            {getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPlaceholder = header.isPlaceholder;
                  const right = header.column.columnDef.meta?.align === "right";

                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        ...getCommonStyles({
                          column: header.column,
                          isOverflowing: isOverflowing,
                        }),
                      }}
                    >
                      {isPlaceholder ? null : (
                        <div className={cn("flex", "items-center", "gap-1", right && "justify-end")}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={cn("transition-opacity", isRefetching && "opacity-60")}>
            {isLoading ? (
              Array.from({ length: Math.min(Math.max(pageSize, 1), 10) }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`} aria-hidden="true">
                  {leafColumns.map((column) => (
                    <TableCell
                      key={`skeleton-cell-${rowIndex}-${column.id}`}
                      style={{
                        ...getCommonStyles({
                          column,
                          isOverflowing: isOverflowing,
                        }),
                      }}
                    >
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => {
                const href = getRowHref?.(row.original);
                return (
                  <TableRow
                    key={row.original?.id ?? row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(href && "cursor-pointer")}
                    onClick={href ? (e) => openRow(e, href) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          ...getCommonStyles({
                            column: cell.column,
                            isOverflowing: isOverflowing,
                          }),
                        }}
                      >
                        {renderCell(cell, href)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <DataTableNoData
                isOverflowing={isOverflowing}
                columnsLength={columns.length}
                isFiltered={isFiltered}
                onClearFilters={clearFilters}
                empty={empty}
              />
            )}
          </TableBody>
        </Table>
      </div>
      {/* Also when a page past the end comes back empty, so there's a way back. */}
      {pagination}
    </div>
  );
}

function DataTableNoData({
  isOverflowing,
  columnsLength,
  isFiltered,
  onClearFilters,
  empty,
}: {
  isOverflowing: { horizontal: boolean; vertical: boolean };
  columnsLength: number;
  isFiltered: boolean;
  onClearFilters: () => void;
  empty?: DataTableProps<BaseRecord>["empty"];
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={columnsLength}
        className={cn("relative", "text-center")}
        style={{ height: "280px" }}
      >
        <div
          className={cn(
            "absolute",
            "inset-0",
            "flex",
            "flex-col",
            "items-center",
            "justify-center",
            "gap-2"
          )}
          style={{
            position: isOverflowing.horizontal ? "sticky" : "absolute",
            left: isOverflowing.horizontal ? "50%" : "50%",
            transform: "translateX(-50%)",
            zIndex: isOverflowing.horizontal ? 2 : 1,
            width: isOverflowing.horizontal ? "fit-content" : "100%",
            minWidth: "300px",
          }}
        >
          <NoDataContent isFiltered={isFiltered} onClearFilters={onClearFilters} empty={empty} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function NoDataContent({
  isFiltered,
  onClearFilters,
  empty,
}: {
  isFiltered: boolean;
  onClearFilters: () => void;
  empty?: DataTableProps<BaseRecord>["empty"];
}) {
  const translate = useTranslate();
  return isFiltered ? (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>{translate("common.titles.noResultsFound")}</EmptyTitle>
        <EmptyDescription>{translate("common.descriptions.noRecordsMatchYourSearch")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          {translate("buttons.clearFilters")}
        </Button>
      </EmptyContent>
    </Empty>
  ) : (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{empty?.title ?? translate("common.titles.noDataToDisplay")}</EmptyTitle>
        <EmptyDescription>{empty?.description ?? translate("common.descriptions.thisTableIsEmptyFor")}</EmptyDescription>
      </EmptyHeader>
      {empty?.action && <EmptyContent>{empty.action}</EmptyContent>}
    </Empty>
  );
}

/** A cell's content for the card, or undefined when there's nothing to show. */
function cardContent<TData>(cell: Cell<TData, unknown>): ReactNode | undefined {
  const def = cell.column.columnDef;
  const content = (typeof def.cell === "function" ? def.cell(cell.getContext()) : (def.cell ?? cell.getValue())) as ReactNode;
  if (content == null || typeof content === "boolean") return undefined;
  if (typeof content === "string" && !content.trim()) return undefined;
  return content;
}

function cardRole<TData>(cell: Cell<TData, unknown>): CardRole {
  const meta = cell.column.columnDef.meta;
  return meta?.card ?? (meta?.primary ? "title" : meta?.align === "right" ? "stat" : "field");
}

const STAT_COLUMNS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-2"];

/**
 * One row on a phone: a card with the row's title (and subtitle) and badges at the top, then icon-led meta
 * (dates, places), the figures as stats, and anything else as label / value fields. Columns choose their
 * place with `meta.card`; empty cells are left out.
 */
function RowCard<TData>({
  row,
  href,
  onOpen,
}: {
  row: Row<TData>;
  href: string | undefined;
  onOpen: (e: MouseEvent<HTMLElement>, href: string | undefined) => void;
}) {
  const cells = row.getVisibleCells();
  const select = cells.find((c) => c.column.id === SELECT);
  const actions = cells.find((c) => c.column.id === ACTIONS);
  const data = cells.filter((c) => c !== select && c !== actions);
  // Without a title column, a subtitle becomes the heading (below); failing that, the first column.
  const hasTitle = data.some((c) => cardRole(c) === "title" || cardRole(c) === "subtitle");
  const parts = data
    .map((cell, i) => ({
      cell,
      role: !hasTitle && i === 0 && cardRole(cell) !== "hidden" ? ("title" as const) : cardRole(cell),
      content: cardContent(cell),
      label: headerLabel(cell.column.columnDef as ColumnDef<TData, unknown>) ?? "",
      Icon: cell.column.columnDef.meta?.icon,
    }))
    .filter((p) => p.role !== "hidden" && p.content !== undefined);
  const of = (role: CardRole) => parts.filter((p) => p.role === role);
  let titles = of("title");
  let subtitles = of("subtitle");
  // An empty title (a payment to a company has no farmer) gives way to the subtitle.
  if (!titles.length && subtitles.length) [titles, subtitles] = [subtitles.slice(0, 1), subtitles.slice(1)];
  const badges = of("badge");
  const metas = of("meta");
  const stats = of("stat");
  const bodies = of("body");
  const fields = of("field");

  const title = titles.map((p, i) => (
    <span key={p.cell.id}>
      {i > 0 && " "}
      {p.content}
    </span>
  ));

  return (
    <li
      data-state={row.getIsSelected() ? "selected" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-3 shadow-xs transition-colors",
        "data-[state=selected]:border-primary/50 data-[state=selected]:bg-primary/5",
        href && "cursor-pointer active:bg-muted/60"
      )}
      onClick={href ? (e) => onOpen(e, href) : undefined}
    >
      {select && <div className="pt-0.5">{flexRender(select.column.columnDef.cell, select.getContext())}</div>}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {titles.length > 0 && (
              <div className="text-sm leading-snug font-semibold break-words">
                {href ? (
                  <Link to={href} className="hover:underline">
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </div>
            )}
            {subtitles.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
                {subtitles.map((p, i) => (
                  <span key={p.cell.id} className="min-w-0 truncate" title={p.label}>
                    {i > 0 && <span aria-hidden className="mr-1.5">·</span>}
                    {p.content}
                  </span>
                ))}
              </div>
            )}
          </div>
          {badges.length > 0 && (
            <div className="flex max-w-[50%] flex-wrap justify-end gap-1 pt-px">
              {badges.map((p) =>
                typeof p.content === "string" || typeof p.content === "number" ? (
                  <Badge key={p.cell.id} variant="secondary" title={p.label}>
                    {p.content}
                  </Badge>
                ) : (
                  <span key={p.cell.id} className="contents">
                    {p.content}
                  </span>
                )
              )}
            </div>
          )}
          {actions ? (
            <div className="-my-1 -mr-1">{flexRender(actions.column.columnDef.cell, actions.getContext())}</div>
          ) : (
            href && <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
        </div>
        {metas.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {metas.map(({ cell, content, label, Icon }) => (
              <li key={cell.id} className="flex min-w-0 items-center gap-1.5" title={label}>
                {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" /> : <span>{label}:</span>}
                {Icon && <span className="sr-only">{label}: </span>}
                <span className="truncate text-foreground/80">{content}</span>
              </li>
            ))}
          </ul>
        )}
        {bodies.map((p) => (
          <p key={p.cell.id} className="line-clamp-3 text-xs break-words text-muted-foreground">
            {p.content}
          </p>
        ))}
        {stats.length > 0 && (
          <dl
            className={cn(
              "grid gap-px overflow-hidden rounded-lg border bg-border",
              STAT_COLUMNS[stats.length] ?? "grid-cols-3"
            )}
          >
            {stats.map(({ cell, content, label, Icon }) => (
              <div key={cell.id} className="min-w-0 bg-muted/40 px-2.5 py-1.5">
                <dt className="flex items-center gap-1 truncate text-[0.6875rem] text-muted-foreground">
                  {Icon && <Icon aria-hidden className="size-3 shrink-0" />}
                  {label}
                </dt>
                <dd className="text-sm font-semibold break-words tabular-nums">{content}</dd>
              </div>
            ))}
          </dl>
        )}
        {fields.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {fields.map(({ cell, content, label }) => (
              <div key={cell.id} className="min-w-0">
                <dt className="truncate text-muted-foreground">{label}</dt>
                <dd className="truncate font-medium">{content}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}

const hideable = <TData,>(column: Column<TData>) =>
  column.id !== SELECT && column.id !== ACTIONS && !column.columnDef.meta?.primary && column.getCanHide();

const storageKey = (key: string) => `inatrace.columns.${key}`;

/** Restores the hidden columns saved for this table, and saves changes. Storage may be unavailable. */
function useStoredColumnVisibility<TData extends BaseRecord>(
  table: UseTableReturnType<TData, HttpError>,
  key: string | undefined
) {
  const visibility = table.reactTable.getState().columnVisibility;
  const restored = useRef(false);
  useEffect(() => {
    if (!key || restored.current) return;
    restored.current = true;
    try {
      const saved = localStorage.getItem(storageKey(key));
      if (saved) table.reactTable.setColumnVisibility(JSON.parse(saved));
    } catch {
      // No storage (private window, blocked): all columns stay visible.
    }
  }, [key, table.reactTable]);
  useEffect(() => {
    if (!key || !restored.current) return;
    try {
      localStorage.setItem(storageKey(key), JSON.stringify(visibility));
    } catch {
      // Not remembered; the choice still applies on this page.
    }
  }, [key, visibility]);
}

function ColumnsMenu<TData extends BaseRecord>({ table }: { table: UseTableReturnType<TData, HttpError> }) {
  const translate = useTranslate();
  const columns = table.reactTable.getAllLeafColumns().filter(hideable);
  const hidden = columns.filter((c) => !c.getIsVisible()).length;
  return (
    <div className="-mb-2 hidden justify-end md:flex">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
          <Columns3 />
          {translate("table.buttons.columns")}
          {hidden > 0 && <span className="text-muted-foreground">({translate("table.texts.hiddenCount", { count: hidden })})</span>}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{translate("table.texts.showColumns")}</DropdownMenuLabel>
            {columns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={c.getIsVisible()}
                onCheckedChange={(v) => c.toggleVisibility(!!v)}
                closeOnClick={false}
              >
                {headerLabel(c.columnDef as ColumnDef<TData, unknown>) ?? c.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function hasValue(value: unknown) {
  return value != null && value !== "" && !(Array.isArray(value) && value.length === 0);
}

export function getCommonStyles<TData>({
  column,
  isOverflowing,
}: {
  column: Column<TData>;
  isOverflowing: {
    horizontal: boolean;
    vertical: boolean;
  };
}): React.CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn =
    isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right");

  return {
    boxShadow:
      isOverflowing.horizontal && isLastLeftPinnedColumn
        ? "-4px 0 4px -4px var(--border) inset"
        : isOverflowing.horizontal && isFirstRightPinnedColumn
        ? "4px 0 4px -4px var(--border) inset"
        : undefined,
    left:
      isOverflowing.horizontal && isPinned === "left"
        ? `${column.getStart("left")}px`
        : undefined,
    right:
      isOverflowing.horizontal && isPinned === "right"
        ? `${column.getAfter("right")}px`
        : undefined,
    opacity: 1,
    position: isOverflowing.horizontal && isPinned ? "sticky" : "relative",
    background: isOverflowing.horizontal && isPinned ? "var(--card)" : "",
    borderTopRightRadius:
      isOverflowing.horizontal && isPinned === "right"
        ? "var(--radius)"
        : undefined,
    borderBottomRightRadius:
      isOverflowing.horizontal && isPinned === "right"
        ? "var(--radius)"
        : undefined,
    borderTopLeftRadius:
      isOverflowing.horizontal && isPinned === "left"
        ? "var(--radius)"
        : undefined,
    borderBottomLeftRadius:
      isOverflowing.horizontal && isPinned === "left"
        ? "var(--radius)"
        : undefined,
    width: column.getSize(),
    zIndex: isOverflowing.horizontal && isPinned ? 1 : 0,
  };
}

DataTable.displayName = "DataTable";
