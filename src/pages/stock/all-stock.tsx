import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { ApiGroupStockOrder } from "@/client/types.gen";
import { FilterPopover, RowActions, SimpleCombobox, StatusBadge, Toolbar } from "@/components/app/controls";
import { PageLoader, Section } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSelectedCompany } from "@/hooks/use-session";
import { useUrlFilters } from "@/hooks/use-url-state";
import { BeycoControls } from "./beyco";
import { useFacilityParam } from "./deliveries";
import { ORDER_TYPES, day, fmt } from "./shared";
import { StockOrderTable } from "./stock-order-table";
import { download, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useTranslate } from "@refinedev/core";

/** `/my-stock/all-stock` (StockAllStockTabComponent). */
export function AllStockTab() {
  const translate = useTranslate();
  const { companyId, company } = useSelectedCompany();
  const [facilityId, setFacilityId] = useFacilityParam();
  // In the URL, so a reload or the back button from a stock order keeps them.
  const url = useUrlFilters(["view", "purchaseOnly", "availableOnly", "semiProductId"] as const);
  const view: "single" | "group" = url.values.view === "group" ? "group" : "single";
  const purchaseOnly = url.values.purchaseOnly === "true";
  const availableOnly = url.values.availableOnly === "true";
  const semiProductId = url.values.semiProductId ? Number(url.values.semiProductId) : null;
  const setView = (v: "single" | "group") => url.set({ view: v === "group" ? v : "" });
  const setPurchaseOnly = (v: boolean) => url.set({ purchaseOnly: v });
  const setAvailableOnly = (v: boolean) => url.set({ availableOnly: v });
  const setSemiProductId = (v: number | null) => url.set({ semiProductId: v });
  const [total, setTotal] = useState(0);
  const [selectedGroups, setSelectedGroups] = useState<ApiGroupStockOrder[]>([]);

  const { data: facilities = [] } = useApi(
    ep.listFacilitiesByCompany,
    { path: { id: companyId ?? 0 }, query: { requestType: "FETCH", limit: 1000 } },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );

  const { data: facility } = useApi(
    ep.getFacility,
    { path: { id: facilityId ?? 0 } },
    { enabled: facilityId != null, select: (r) => r }
  );

  const filters = useMemo(
    () => ({
      isPurchaseOrderOnly: purchaseOnly || undefined,
      availableOnly: availableOnly || undefined,
      semiProductId: semiProductId ?? undefined,
    }),
    [purchaseOnly, availableOnly, semiProductId]
  );

  if (companyId == null) return <PageLoader />;

  return (
    <Section plain
      title={translate("stock.titles.allStock")}
      onboarding="stock-all-stock"
      description={
        facilityId
          ? translate("stock.descriptions.listOfOrdersTotal", { view: view === "group" ? "grouped " : "", total })
          : undefined
      }
      actions={company?.allowBeycoIntegration && <BeycoControls selected={selectedGroups} />}
    >
      <Toolbar>
        <div data-onboarding="all-stock-facility" className="w-full sm:w-64">
          <SimpleCombobox
            clearable={false}
            options={facilities.map((f) => ({ value: f.id!, label: f.name ?? "" }))}
            value={facilityId}
            onChange={(id) => {
              // The SKU list belongs to the facility, so a new facility starts without one.
              setSemiProductId(null);
              setFacilityId(id);
            }}
            placeholder={translate("stock.placeholders.selectFacility")}
          />
        </div>
        {facilityId && (
          <>
            <SimpleCombobox
              className="sm:w-56"
              options={(facility?.facilitySemiProductList ?? []).map((sp) => ({ value: sp.id!, label: sp.name ?? "" }))}
              value={semiProductId}
              onChange={setSemiProductId}
              placeholder={translate("stock.placeholders.selectSku")}
            />
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[view]}
              onValueChange={(v) => v[0] && setView(v[0] as "single" | "group")}
            >
              <ToggleGroupItem value="single">
                {translate("stock.buttons.singleView")}
              </ToggleGroupItem>
              <ToggleGroupItem value="group">
                {translate("stock.buttons.groupView")}
              </ToggleGroupItem>
            </ToggleGroup>
            <FilterPopover
              count={[purchaseOnly, availableOnly].filter(Boolean).length}
              onReset={() => {
                setPurchaseOnly(false);
                setAvailableOnly(false);
              }}
            >
              <div className="flex items-center gap-2">
                <Switch id="po-only" checked={purchaseOnly} onCheckedChange={setPurchaseOnly} />
                <Label htmlFor="po-only">{translate("stock.fields.purchaseOrdersOnly")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="available-only" checked={availableOnly} onCheckedChange={setAvailableOnly} />
                <Label htmlFor="available-only">
                  {translate("stock.fields.availableOnly")}
                </Label>
              </div>
            </FilterPopover>
          </>
        )}
      </Toolbar>
      {!facilityId ? (
        <p className="text-xs text-muted-foreground">
          {translate("stock.texts.pleaseSelectOneFacilityTo")}
        </p>
      ) : view === "single" ? (
        <StockOrderTable
          mode="COMPANY_ADMIN"
          companyId={companyId}
          facilityId={facilityId}
          filters={filters}
          onTotal={setTotal}
        />
      ) : (
        <GroupTable
          facilityId={facilityId}
          filters={filters}
          onTotal={setTotal}
          selectable={!!company?.allowBeycoIntegration}
          onSelectionChange={setSelectedGroups}
        />
      )}
    </Section>
  );
}

/** GroupStockUnitListComponent: stock orders grouped by lot (sacs counted together). */
function GroupTable({
  facilityId,
  filters,
  onTotal,
  selectable,
  onSelectionChange,
}: {
  facilityId: number;
  filters: Record<string, unknown>;
  onTotal: (n: number) => void;
  selectable: boolean;
  onSelectionChange: (g: ApiGroupStockOrder[]) => void;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const location = useLocation();

  const columns = useMemo<ColumnDef<ApiGroupStockOrder>[]>(() => {
    const cols: ColumnDef<ApiGroupStockOrder>[] = [];
    if (selectable) {
      cols.push({
        id: "select",
        size: 32,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(c) => table.toggleAllPageRowsSelected(!!c)}
            aria-label={translate("stock.buttons.selectAll")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(c) => row.toggleSelected(!!c)}
            aria-label={translate("stock.buttons.selectRow")}
          />
        ),
      });
    }
    cols.push(
      {
        id: "date",
        header: translate("stock.fields.productionDate"),
        enableSorting: false,
        cell: ({ row }) => day(row.original.productionDate),
      },
      {
        accessorKey: "internalLotNumber",
        header: translate("stock.fields.identifier"),
        enableSorting: false,
      },
      {
        id: "sacs",
        header: translate("stock.fields.sacs"),
        enableSorting: false,
        cell: ({ row }) => (row.original.noOfSacs ? row.original.noOfSacs : "/"),
      },
      {
        id: "type",
        header: translate("common.fields.type"),
        enableSorting: false,
        cell: ({ row }) => ORDER_TYPES[row.original.orderType!] ?? "",
      },
      {
        id: "product",
        header: translate("stock.fields.product"),
        enableSorting: false,
        cell: ({ row }) => row.original.semiProductName ?? row.original.finalProductName,
      },
      {
        id: "quantity",
        header: translate("stock.fields.quantityFilledAvailable"),
        enableSorting: false,
        cell: ({ row }) =>
          `${fmt(row.original.totalQuantity ?? 0)} / ${fmt(row.original.fulfilledQuantity ?? 0)} / ${fmt(
            row.original.availableQuantity ?? 0
          )}`,
      },
      {
        accessorKey: "unitLabel",
        header: translate("common.fields.unit"),
        enableSorting: false,
      },
      {
        id: "delivery",
        header: translate("common.fields.deliveryDate"),
        enableSorting: false,
        cell: ({ row }) => day(row.original.deliveryTime),
      },
      {
        id: "status",
        header: translate("common.fields.status"),
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.available ? "ACTIVE" : "DEACTIVATED"} />,
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => {
          const g = row.original;
          const first = g.groupedIds?.[0];
          return (
            <RowActions
              actions={[
                {
                  label: translate("common.fields.edit"),
                  onClick: () =>
                    navigate(
                      g.orderType === "PURCHASE_ORDER"
                        ? `/my-stock/deliveries/update/${first}`
                        : `/my-stock/processing/update/${first}`
                    ),
                },
                {
                  label: translate("stock.fields.viewHistory"),
                  onClick: () =>
                    navigate(
                      `/my-stock/all-stock/stock-order/${first}/view?returnUrl=${encodeURIComponent(
                        location.pathname + location.search
                      )}`
                    ),
                },
                {
                  label: translate("stock.fields.exportGeoData"),
                  onClick: () => download(ep.exportGeoData, { path: { id: first! } }, "geoData.geojson"),
                },
              ]}
            />
          );
        },
      }
    );
    return cols;
  }, [selectable, navigate, location]);

  const permanent = useMemo(
    () =>
      Object.entries(filters)
        .filter(([, v]) => v !== undefined)
        .map(([field, value]) => ({ field, operator: "eq" as const, value })),
    [filters]
  );

  const table = useTable<ApiGroupStockOrder>({
    columns,
    getRowId: (row) => (row.groupedIds ?? []).join("-"),
    refineCoreProps: {
      resource: "group-stock-orders",
      meta: { facilityId },
      filters: { permanent },
      syncWithLocation: false,
    },
  });

  const items = table.refineCore.result.data;
  const total = table.refineCore.result.total;
  const selection = table.reactTable.getState().rowSelection;
  useEffect(() => {
    if (total != null) onTotal(total);
  }, [total, onTotal]);
  useEffect(() => {
    onSelectionChange(items.filter((g) => selection[(g.groupedIds ?? []).join("-")]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, items]);

  return <DataTable table={table} filterKey={permanent} />;
}
