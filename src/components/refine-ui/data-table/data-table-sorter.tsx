"use client";

import { useTranslate } from "@refinedev/core";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** A column header whose whole label sorts the table (a click cycles ascending → descending → off). */
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
      onClick={() => column.toggleSorting(undefined, true)}
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
export const sortable = (label: string | (() => string)) =>
  function Header<TData>({ column }: { column: Column<TData> }) {
    return <SortableHeader column={column} label={typeof label === "function" ? label() : label} />;
  };
