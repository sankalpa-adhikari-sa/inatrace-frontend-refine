import { type CrudFilter, useNotification, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import type { ApiStockOrder } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, StatusBadge } from "@/components/app/controls";
import { QrCodeDialog } from "@/components/app/qr-code-dialog";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { sortable } from "@/components/refine-ui/data-table/data-table-sorter";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_TYPES, day, fmt, personName } from "./shared";
import { call, download } from "@/lib/http";
import { ep } from "@/lib/endpoints";

/**
 * - `PURCHASE_ORDERS`: deliveries (farmer, payable/balance, payment actions)
 * - `COMPANY_ADMIN`: all stock (identifier, type, filled/available, status)
 */
export type StockListMode = "PURCHASE_ORDERS" | "COMPANY_ADMIN";

export type StockOrderFilters = Record<string, string | number | boolean | null | undefined>;


function canDelete(o: ApiStockOrder) {
  if (o.orderType === "GENERAL_ORDER") {
    return Math.abs((o.fulfilledQuantity ?? 0) - (o.availableQuantity ?? 0)) < 1e-10;
  }
  return true;
}

/** Port of StockUnitListComponent. */
export function StockOrderTable({
  mode,
  companyId,
  facilityId,
  filters,
  selectable,
  onSelectionChange,
  onTotal,
  isFiltered,
  onClearFilters,
  selectionResetKey,
}: {
  mode: StockListMode;
  companyId: number;
  facilityId?: number | null;
  filters: StockOrderFilters;
  selectable?: boolean;
  onSelectionChange?: (orders: ApiStockOrder[]) => void;
  onTotal?: (total: number) => void;
  /** Whether the page's own filter controls narrow the list, for the "no results" state. */
  isFiltered?: boolean;
  onClearFilters?: () => void;
  /** Changing it clears the selection. */
  selectionResetKey?: number;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const { open: notify } = useNotification();
  const [qr, setQr] = useState<ApiStockOrder | null>(null);
  const purchases = mode === "PURCHASE_ORDERS";

  async function remove(o: ApiStockOrder) {
    const processing = o.orderType !== "PURCHASE_ORDER";
    const ok = await confirm({
      description: processing
        ? translate("stock.descriptions.areYouSureYouWantToDeleteThe")
        : translate("stock.descriptions.areYouSureYouWant"),
      destructive: true,
      confirmLabel: translate("buttons.delete"),
    });
    if (!ok) return;
    if (processing) {
      // Processing-type orders are removed by deleting their processing order.
      const full = await call(ep.getStockOrder, { path: { id: o.id! }, query: { withProcessingOrder: true } });
      if (full?.processingOrder?.id) await call(ep.deleteProcessingOrder, { path: { id: full.processingOrder.id } });
    } else {
      await call(ep.deleteStockOrder, { path: { id: o.id! } });
    }
    table.refineCore.tableQuery.refetch();
  }

  function edit(o: ApiStockOrder) {
    if (o.orderType === "PURCHASE_ORDER") navigate(`/my-stock/deliveries/update/${o.id}`);
    else navigate(`/my-stock/processing/update/${o.id}`);
  }

  const columns = useMemo<ColumnDef<ApiStockOrder>[]>(() => {
    const cols: ColumnDef<ApiStockOrder>[] = [];
    if (selectable) {
      cols.push({
        id: "select",
        size: 32,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(c) => table.toggleAllPageRowsSelected(!!c)}
            aria-label={translate("stock.buttons.selectAll")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(c) => row.toggleSelected(!!c)}
            aria-label={translate("stock.buttons.selectRow")}
          />
        ),
      });
    }
    // Column ids double as the backend's sortBy keys.
    cols.push({
      id: "date",
      header: sortable(purchases ? translate("common.fields.deliveryDate") : translate("stock.fields.productionDate")),
      cell: ({ row }) => day(row.original.productionDate),
    });
    if (!purchases) {
      cols.push(
        {
          id: "identifier",
          header: translate("stock.fields.identifier"),
          enableSorting: false,
          cell: ({ row }) => row.original.internalLotNumber || row.original.identifier,
        },
        {
          id: "orderType",
          header: translate("common.fields.type"),
          enableSorting: false,
          cell: ({ row }) => ORDER_TYPES[row.original.orderType!] ?? "",
        }
      );
    } else {
      cols.push({
        id: "farmer",
        header: translate("common.fields.farmer"),
        enableSorting: false,
        cell: ({ row }) => personName(row.original.producerUserCustomer),
      });
    }
    cols.push({
      id: "semiProduct",
      header: translate("stock.fields.semiProduct"),
      enableSorting: false,
      cell: ({ row }) => {
        const o = row.original;
        if (o.semiProduct) return o.semiProduct.name;
        if (o.finalProduct) return `${o.finalProduct.name} (${o.finalProduct.product?.name ?? ""})`;
        return "";
      },
    });
    if (purchases) {
      cols.push(
        {
          id: "quantity",
          header: translate("common.fields.quantity"),
          enableSorting: false,
          meta: { align: "right" },
          cell: ({ row }) => `${fmt(row.original.totalQuantity)} ${row.original.measureUnitType?.label ?? ""}`,
        },
        {
          id: "payable",
          header: translate("stock.fields.payable"),
          enableSorting: false,
          meta: { align: "right" },
          cell: ({ row }) =>
            row.original.priceDeterminedLater ? (
              <span className="text-muted-foreground">
                {translate("stock.fields.priceDeterminedLater")}
              </span>
            ) : (
              fmt(row.original.cost)
            ),
        },
        {
          id: "balance",
          header: translate("stock.fields.balance"),
          enableSorting: false,
          meta: { align: "right" },
          cell: ({ row }) => (row.original.priceDeterminedLater ? "" : fmt(row.original.balance)),
        }
      );
    } else {
      cols.push(
        {
          id: "quantity",
          header: translate("common.fields.quantity"),
          enableSorting: false,
          meta: { align: "right" },
          cell: ({ row }) => fmt(row.original.totalQuantity ?? 0),
        },
        {
          id: "filled",
          header: translate("stock.fields.filled"),
          enableSorting: false,
          meta: { align: "right" },
          cell: ({ row }) => fmt(row.original.fulfilledQuantity ?? 0),
        },
        {
          id: "available",
          header: translate("stock.fields.available"),
          enableSorting: false,
          meta: { align: "right" },
          cell: ({ row }) => fmt(row.original.availableQuantity ?? 0),
        },
        {
          id: "unit",
          header: translate("common.fields.unit"),
          enableSorting: false,
          cell: ({ row }) => row.original.measureUnitType?.label,
        },
        { id: "deliveryTime", header: sortable(translate("common.fields.deliveryDate")), cell: ({ row }) => day(row.original.deliveryTime) },
        {
          id: "lastChange",
          header: sortable(translate("stock.fields.lastChange")),
          cell: ({ row }) => row.original.updateTimestamp?.slice(0, 16).replace("T", " "),
        },
        {
          id: "isAvailable",
          header: translate("common.fields.status"),
          enableSorting: false,
          cell: ({ row }) => <StatusBadge status={row.original.isAvailable ? "ACTIVE" : "DEACTIVATED"} />,
        }
      );
    }
    cols.push({
      id: "actions",
      header: "",
      size: 48,
      enableSorting: false,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <RowActions
            actions={[
              { label: translate("common.fields.edit"), onClick: () => edit(o) },
              {
                label: translate("stock.fields.viewHistory"),
                onClick: () =>
                  navigate(
                    `/my-stock/all-stock/stock-order/${o.id}/view?returnUrl=${encodeURIComponent(
                      location.pathname + location.search
                    )}`
                  ),
              },
              {
                label: translate("stock.fields.payment"),
                hidden: !purchases,
                onClick: () => {
                  if (o.priceDeterminedLater) {
                    notify?.({
                      type: "error",
                      message: translate("stock.notifications.priceMissing"),
                      description: translate("stock.notifications.pleaseAddThePricePer"),
                    });
                    return;
                  }
                  navigate(`/my-stock/payments/delivery/${o.id}/new`);
                },
              },
              {
                label: translate("stock.fields.farmerProfile"),
                hidden: !purchases || !o.producerUserCustomer?.id,
                onClick: () => navigate(`/my-farmers/edit/${o.producerUserCustomer?.id}`),
              },
              {
                label: translate("stock.fields.qrCode"),
                hidden: purchases || !o.qrCodeTag,
                onClick: () => setQr(o),
              },
              {
                label: translate("stock.fields.exportGeoData"),
                hidden: purchases,
                onClick: () => download(ep.exportGeoData, { path: { id: o.id! } }, "geoData.geojson"),
              },
              {
                label: translate("common.fields.delete"),
                destructive: true,
                separatorBefore: true,
                hidden: !canDelete(o),
                onClick: () => remove(o),
              },
            ]}
          />
        );
      },
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases, selectable]);

  const permanent = useMemo<CrudFilter[]>(
    () =>
      Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([field, value]) => ({ field, operator: "eq" as const, value })),
    [filters]
  );

  const table = useTable<ApiStockOrder>({
    columns,
    enableRowSelection: (row) => !row.original.priceDeterminedLater,
    getRowId: (row) => String(row.id),
    refineCoreProps: {
      resource: "stock-orders",
      meta: { companyId, facilityId },
      filters: { permanent },
      sorters: { initial: [{ field: purchases ? "date" : "lastChange", order: "desc" }] },
      syncWithLocation: false,
    },
  });

  const items = table.refineCore.result.data;
  const total = table.refineCore.result.total;
  const selection = table.reactTable.getState().rowSelection;

  useEffect(() => {
    if (total != null) onTotal?.(total);
  }, [total, onTotal]);

  // Selection is kept by id across pages; remember each order seen so ticks on other pages still count.
  const seen = useRef(new Map<string, ApiStockOrder>());
  useEffect(() => {
    for (const o of items) seen.current.set(String(o.id), o);
    onSelectionChange?.(
      Object.keys(selection)
        .filter((id) => selection[id])
        .map((id) => seen.current.get(id))
        .filter((o): o is ApiStockOrder => !!o)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, items]);

  // The page's "Clear selection".
  useEffect(() => {
    if (selectionResetKey) table.reactTable.resetRowSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionResetKey]);

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        table={table}
        filterKey={permanent}
        columnsKey={purchases ? "deliveries" : "stock-orders"}
        isFiltered={isFiltered}
        onClearFilters={onClearFilters}
        getRowHref={(o) =>
          o.orderType === "PURCHASE_ORDER" ? `/my-stock/deliveries/update/${o.id}` : `/my-stock/processing/update/${o.id}`
        }
      />
      <Aggregated items={items} />
      {qr?.qrCodeTag && (
        <QrCodeDialog qrCodeTag={qr.qrCodeTag} finalProduct={qr.qrCodeTagFinalProduct} onClose={() => setQr(null)} />
      )}
    </div>
  );
}

/** "Summed up quantities" per semi-product / final product on the current page. */
function Aggregated({ items }: { items: ApiStockOrder[] }) {
  const translate = useTranslate();
  const sums = new Map<string, { name: string; amount: number; unit: string }>();
  for (const o of items) {
    const key = o.semiProduct?.id ? `s${o.semiProduct.id}` : o.finalProduct?.id ? `f${o.finalProduct.id}` : null;
    if (!key) continue;
    const name = o.semiProduct?.name ?? `${o.finalProduct?.name} (${o.finalProduct?.product?.name ?? ""})`;
    const prev = sums.get(key);
    sums.set(key, { name, unit: o.measureUnitType?.label ?? "", amount: (prev?.amount ?? 0) + (o.totalQuantity ?? 0) });
  }
  if (sums.size === 0) return null;
  return (
    <div className="max-w-md rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {translate("stock.fields.semiProduct")}
            </TableHead>
            <TableHead>{translate("stock.fields.totalQuantity")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...sums.values()].map((s) => (
            <TableRow key={s.name}>
              <TableCell>{s.name}</TableCell>
              <TableCell>
                {fmt(s.amount)} {s.unit}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
