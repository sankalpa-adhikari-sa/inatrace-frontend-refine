import type { BaseRecord, CrudFilter, HttpError } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";

/** Read/write one `eq` server filter on a Refine table. */
export function useTableFilter<T extends BaseRecord>(
  table: UseTableReturnType<T, HttpError>,
  field: string,
) {
  const { filters, setFilters } = table.refineCore;
  const current = filters.find((f): f is Extract<CrudFilter, { field: string }> => "field" in f && f.field === field);

  const set = (value: unknown) =>
    setFilters([{ field, operator: "eq", value: value === "" || value == null ? undefined : value }], "merge");

  return [current?.value, set] as const;
}
