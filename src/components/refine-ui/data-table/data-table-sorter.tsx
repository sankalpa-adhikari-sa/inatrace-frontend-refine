"use client";

import { useTranslate } from "@refinedev/core";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A column header whose whole label sorts the table by that column alone: the first click sorts ascending,
 * then each click flips the direction. Single-column on purpose: the backend list endpoints take one
 * `sortBy`, and the data provider sends only the first sorter, so a multi-sort would show an active arrow
 * on a column that isn't sorting anything. There's no "unsorted" step, so a list always has an order.
 */
export function SortableHeader<TData>({
  column,
  label,
  className,
}: {
  column: Column<TData>;
  label: string;
  className?: string;
}) {
  const translate = useTranslate();
  const sorted = column.getIsSorted();
  const description =
    sorted === "asc"
      ? translate("table.texts.sortedAscending", { column: label })
      : sorted === "desc"
        ? translate("table.texts.sortedDescending", { column: label })
        : translate("table.texts.sortBy", { column: label });
  const Icon = sorted === "desc" ? ArrowDown : sorted === "asc" ? ArrowUp : ChevronsUpDown;
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc", false)}
      aria-label={description}
      title={description}
      className={cn(
        "-mx-1 inline-flex min-w-0 items-center gap-1 rounded px-1 py-0.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      <span className="truncate">{label}</span>
      <Icon aria-hidden className={cn("size-3 shrink-0", sorted ? "text-primary" : "text-muted-foreground")} />
    </button>
  );
}

/**
 * `header` for a sortable column. Pass a getter for translated labels in module-level column definitions,
 * so the label follows a language change.
 */
export const sortable = (label: string | (() => string)) => {
  const text = () => (typeof label === "function" ? label() : label);
  function Header<TData>({ column }: { column: Column<TData> }) {
    return <SortableHeader column={column} label={text()} />;
  }
  return Object.assign(Header, { label: text });
};

/** A column's header as plain text (for card layouts), when it has one. */
export function headerLabel<TData>(def: ColumnDef<TData, unknown>): string | undefined {
  const header = def.header as unknown;
  if (typeof header === "string") return header || undefined;
  if (typeof header === "function" && "label" in header) return (header as { label: () => string }).label();
  return undefined;
}

/** Whether a header is a `sortable(...)` one (rendered as sort buttons above the card layout). */
export const isSortableHeader = (def: ColumnDef<unknown, unknown>) =>
  typeof def.header === "function" && "label" in (def.header as object);
