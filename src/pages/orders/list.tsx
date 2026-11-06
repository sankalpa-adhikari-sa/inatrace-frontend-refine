import { useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { ApiStockOrder } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, SimpleCombobox, Toolbar } from "@/components/app/controls";
import { PageLoader, Section } from "@/components/app/page";
import { QrCodeDialog } from "@/components/app/qr-code-dialog";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSelectedCompany } from "@/hooks/use-session";
import { useFacilityParam } from "../stock/deliveries";
import { day, fmt } from "../stock/shared";
import { call, download, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { PlaceQuoteOrderDialog } from "./place-quote-order-dialog";
import { ReviewTransactionsDialog } from "./review-transactions-dialog";
import { kgs, type Kind, OrdersTabs } from "./shared";

/** `/my-orders/received-orders` and `/my-orders/placed-orders` (CompanyOrdersListComponent). */
export function OrdersPage({ kind }: { kind: Kind }) {
  const translate = useTranslate();
  const { companyId } = useSelectedCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const [facilityId, setFacilityId] = useFacilityParam();
  const [openOnly, setOpenOnly] = useState(false);
  const [semiProductId, setSemiProductId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<ApiStockOrder | null>(null);
  const [qr, setQr] = useState<ApiStockOrder | null>(null);
  const [quoting, setQuoting] = useState(false);
  const placed = kind === "PLACED";

  const query = { requestType: "FETCH" as const, limit: 1000 };
  const { data: facilities = [] } = useApi(
    ep.listFacilitiesByCompany,
    { path: { id: companyId ?? 0 }, query },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );
  const { data: facility } = useApi(
    ep.getFacility,
    { path: { id: facilityId ?? 0 } },
    { enabled: facilityId != null && !placed, select: (r) => r }
  );
  const { data: customers = [] } = useApi(
    ep.getCompanyCustomersList,
    { path: { companyId: companyId ?? 0 }, query },
    { enabled: companyId != null && placed, select: (r) => r?.items ?? [] }
  );

  async function remove(o: ApiStockOrder) {
    if (
      !(await confirm({
        description: translate("orders.descriptions.areYouSureYouWant"),
        destructive: true,
        confirmLabel: translate("buttons.delete"),
      }))
    )
      return;
    const full = await call(ep.getStockOrder, { path: { id: o.id! }, query: { withProcessingOrder: true } });
    if (full?.processingOrder?.id) await call(ep.deleteProcessingOrder, { path: { id: full.processingOrder.id } });
    table.refineCore.tableQuery.refetch();
  }

  const columns = useMemo<ColumnDef<ApiStockOrder>[]>(() => {
    const cols: ColumnDef<ApiStockOrder>[] = [
      {
        id: "deliveryTime",
        header: translate("common.fields.deliveryDate"),
        enableSorting: false,
        cell: ({ row }) => day(row.original.deliveryTime),
      },
      {
        id: "product",
        header: translate("orders.fields.product"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.semiProduct?.name ??
          (row.original.finalProduct
            ? `${row.original.finalProduct.name} (${row.original.finalProduct.product?.name ?? ""})`
            : ""),
      },
      placed
        ? {
            id: "customer",
            header: translate("orders.fields.customer"),
            enableSorting: false,
            cell: ({ row }) => row.original.consumerCompanyCustomer?.name,
          }
        : {
            id: "client",
            header: translate("orders.fields.client"),
            enableSorting: false,
            cell: ({ row }) => row.original.facility?.company?.name,
          },
      {
        id: "orderId",
        header: translate("orders.fields.orderId"),
        enableSorting: false,
        cell: ({ row }) => row.original.productOrder?.orderId ?? row.original.orderId ?? "/",
      },
      placed
        ? {
            id: "orderedTo",
            header: translate("orders.fields.orderedFrom"),
            enableSorting: false,
            cell: ({ row }) =>
              `${row.original.quoteFacility?.company?.name ?? ""} (${row.original.quoteFacility?.name ?? ""})`,
          }
        : {
            id: "toFacility",
            header: translate("orders.fields.toFacility"),
            enableSorting: false,
            cell: ({ row }) => row.original.facility?.name,
          },
      {
        id: "fulfilled",
        header: translate("orders.fields.orderedFilled"),
        enableSorting: false,
        cell: ({ row }) => `${fmt(row.original.totalQuantity)} / ${fmt(row.original.fulfilledQuantity)}`,
      },
      {
        id: "unit",
        header: translate("common.fields.unit"),
        enableSorting: false,
        cell: ({ row }) => row.original.measureUnitType?.label,
      },
      {
        id: "kilos",
        header: translate("orders.fields.kg"),
        enableSorting: false,
        cell: ({ row }) => kgs(row.original),
      },
      {
        id: "updated",
        header: translate("orders.fields.lastChange"),
        enableSorting: false,
        cell: ({ row }) => row.original.updateTimestamp?.slice(0, 16).replace("T", " "),
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => {
          const o = row.original;
          return (
            <RowActions
              actions={[
                {
                  label: translate("common.fields.edit"),
                  onClick: () => navigate(`/my-stock/processing/update/${o.id}`),
                },
                {
                  label: translate("orders.fields.viewHistory"),
                  onClick: () =>
                    navigate(
                      `/my-stock/all-stock/stock-order/${o.id}/view?returnUrl=${encodeURIComponent(
                        location.pathname + location.search
                      )}`
                    ),
                },
                { label: translate("orders.fields.approveReject"), hidden: !placed, onClick: () => setReviewing(o) },
                {
                  label: translate("orders.fields.payment"),
                  hidden: !placed,
                  onClick: () => navigate(`/my-stock/payments/customer-order/${o.id}/new`),
                },
                {
                  label: translate("orders.fields.qrCode"),
                  hidden: !placed || !o.qrCodeTag,
                  onClick: () => setQr(o),
                },
                {
                  label: translate("orders.fields.exportGeoData"),
                  hidden: !placed,
                  onClick: () => download(ep.exportGeoData, { path: { id: o.id! } }, "geoData.geojson"),
                },
                {
                  label: translate("common.fields.delete"),
                  destructive: true,
                  separatorBefore: true,
                  hidden: (o.fulfilledQuantity ?? 0) > 0,
                  onClick: () => remove(o),
                },
              ]}
            />
          );
        },
      },
    ];
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  const permanent = useMemo(
    () =>
      Object.entries({
        facilityId: facilityId ?? undefined,
        openOnly: openOnly || undefined,
        semiProductId: placed ? undefined : semiProductId ?? undefined,
        companyCustomerId: placed ? customerId ?? undefined : undefined,
      })
        .filter(([, v]) => v !== undefined)
        .map(([field, value]) => ({ field, operator: "eq" as const, value })),
    [facilityId, openOnly, semiProductId, customerId, placed]
  );

  const table = useTable<ApiStockOrder>({
    columns,
    refineCoreProps: { resource: "orders", meta: { companyId, kind }, filters: { permanent }, syncWithLocation: false },
  });

  if (companyId == null) return <PageLoader />;

  return (
    <>
      <OrdersTabs />
      <Section plain
        title={
          placed
            ? translate("orders.titles.placedOrders")
            : translate("orders.titles.receivedOrders")
        }
        description={translate("orders.descriptions.listOfOrdersTotal", { total: table.refineCore.result.total ?? 0 })}
        actions={
          placed && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuoting(true)}>
                {translate("orders.buttons.placeQuoteOrder")}
              </Button>
              <Button size="sm" onClick={() => navigate("/my-orders/customer-order/add")}>
                <Plus />
                {translate("orders.buttons.addCustomerOrder")}
              </Button>
            </div>
          )
        }
      >
        <Toolbar>
          <SimpleCombobox
            className="sm:w-64"
            placeholder={translate("orders.placeholders.allFacilities")}
            options={facilities.map((f) => ({ value: f.id!, label: f.name ?? "" }))}
            value={facilityId}
            onChange={(id) => {
              setSemiProductId(null);
              setFacilityId(id);
            }}
          />
          {!placed && facility && (
            <SimpleCombobox
              className="sm:w-52"
              placeholder={translate("orders.placeholders.allSemiProducts")}
              options={(facility.facilitySemiProductList ?? []).map((s) => ({ value: s.id!, label: s.name ?? "" }))}
              value={semiProductId}
              onChange={setSemiProductId}
            />
          )}
          {placed && (
            <SimpleCombobox
              className="sm:w-56"
              placeholder={translate("orders.placeholders.allCustomers")}
              options={customers.map((c) => ({ value: c.id!, label: c.name ?? "" }))}
              value={customerId}
              onChange={setCustomerId}
            />
          )}
          <div className="flex items-center gap-2">
            <Switch id="open-only" checked={openOnly} onCheckedChange={setOpenOnly} />
            <Label htmlFor="open-only">{translate("orders.fields.openOnly")}</Label>
          </div>
        </Toolbar>
        <DataTable table={table} />
      </Section>
      {reviewing && (
        <ReviewTransactionsDialog
          order={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            table.refineCore.tableQuery.refetch();
          }}
        />
      )}
      {qr?.qrCodeTag && (
        <QrCodeDialog qrCodeTag={qr.qrCodeTag} finalProduct={qr.qrCodeTagFinalProduct} onClose={() => setQr(null)} />
      )}
      {quoting && (
        <PlaceQuoteOrderDialog facilities={facilities} companyId={companyId} onClose={() => setQuoting(false)} />
      )}
    </>
  );
}
