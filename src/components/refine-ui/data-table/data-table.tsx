"use client";

import type { HttpError, BaseRecord } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import type { Cell, Column, RowData } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { Inbox, SearchX } from "lucide-react";
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
import { ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
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
  }
}

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
};

/** Clicks on these inside a row act on their own, not as "open the row". */
const INTERACTIVE = "a, button, input, select, textarea, label, [role=checkbox], [role=menuitem], [role=combobox]";

export function DataTable<TData extends BaseRecord>({
  table,
  filterKey,
  isFiltered: isFilteredProp,
  onClearFilters,
  getRowHref,
  empty,
}: DataTableProps<TData>) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const {
    reactTable: { getHeaderGroups, getRowModel, getAllColumns },
    refineCore: {
      tableQuery,
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

  // A new filter or search starts again from the first page; otherwise page 3 of the old results can be
  // past the end of the new ones and look empty.
  const filterSignature = JSON.stringify([filters, filterKey ?? null]);
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

  const openRow = (e: MouseEvent<HTMLTableRowElement>, href: string | undefined) => {
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

  return (
    <div className={cn("flex", "flex-col", "flex-1", "gap-4")}>
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
                onClearFilters={onClearFilters ?? (() => setFilters(initialFilters.current, "replace"))}
                empty={empty}
              />
            )}
          </TableBody>
        </Table>
      </div>
      {/* Also when a page past the end comes back empty, so there's a way back. */}
      {!isLoading && (rows.length > 0 || currentPage > 1) && (
        <DataTablePagination
          currentPage={currentPage}
          pageCount={pageCount}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          total={tableQuery.data?.total}
        />
      )}
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
  const translate = useTranslate();
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
          {isFiltered ? (
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
          )}
        </div>
      </TableCell>
    </TableRow>
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
