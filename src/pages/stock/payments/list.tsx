import { useDelete, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Plus, Venus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import type { ApiBulkPayment, ApiPayment, ApiStockOrder, ApiUserCustomer } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, SearchInput, SimpleSelect, Toolbar } from "@/components/app/controls";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { PageLoader, Section } from "@/components/app/page";
import { SearchSelectField } from "@/components/app/search-select-field";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSelectedCompany } from "@/hooks/use-session";
import { useUrlFilters } from "@/hooks/use-url-state";
import { WAYS_OF_PAYMENT, day, fmt, personName, toApiDay, today, useStockPermissions, wayOfPaymentLabel } from "../shared";
import { call, download, useApi, useInvalidateData } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { t } from "@/lib/i18n";
import { userCustomerSearch } from "../delivery-form";
import { cn } from "@/lib/utils";
import { purposeLabel } from "./common";

// ---------------------------------------------------------------------------
// Tab

/** `/my-stock/payments` (StockPaymentsTabComponent). */
export function PaymentsTab() {
  const translate = useTranslate();
  const { companyId } = useSelectedCompany();
  const { canEditPayments } = useStockPermissions();
  const navigate = useNavigate();
  // In the URL, so a reload or the back button from a payment keeps them.
  const url = useUrlFilters(["wayOfPayment", "query", "from", "to"] as const);
  const { wayOfPayment, query, from, to } = url.values;
  const setWayOfPayment = (v: string) => url.set({ wayOfPayment: v });
  const setQuery = (v: string) => url.set({ query: v });
  const setFrom = (v: string) => url.set({ from: v });
  const setTo = (v: string) => url.set({ to: v });
  const [picking, setPicking] = useState(false);
  const [total, setTotal] = useState(0);

  const filters = useMemo(
    () => ({
      preferredWayOfPayment: wayOfPayment || undefined,
      query: query || undefined,
      productionDateStart: from ? toApiDay(from) : undefined,
      productionDateEnd: to ? toApiDay(to) : undefined,
    }),
    [wayOfPayment, query, from, to]
  );

  if (companyId == null) return <PageLoader />;

  return (
    <>
      <Section plain
        title={translate("stock.payments.titles.payments")}
        onboarding="stock-payments"
        description={translate("stock.payments.descriptions.listOfPaymentsTotal", { total })}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => download(ep.exportPaymentsByCompany, { path: { id: companyId } }, "payments.xlsx")}
            >
              <Download />
              {translate("stock.payments.buttons.exportData")}
            </Button>
            {canEditPayments && (
              <Button size="sm" data-onboarding="add-payment" onClick={() => setPicking(true)}>
                <Plus />
                {translate("stock.payments.buttons.newPayment")}
              </Button>
            )}
          </div>
        }
      >
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder={translate("stock.payments.placeholders.searchByFarmerNameOr")} />
          <SimpleSelect
            className="sm:w-48"
            options={[{ value: "", label: translate("stock.payments.fields.anyWayOfPayment") }, ...WAYS_OF_PAYMENT]}
            value={wayOfPayment}
            onChange={(v) => setWayOfPayment(v ?? "")}
          />
          <DateRangePicker
            clearable
            from={from}
            to={to}
            max={today()}
            onChange={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
          />
        </Toolbar>
        <PaymentsTable companyId={companyId} filters={filters} onTotal={setTotal} />
      </Section>
      <BulkPayments companyId={companyId} />
      {picking && (
        <PickDeliveryDialog
          companyId={companyId}
          onClose={() => setPicking(false)}
          onPick={(o) => navigate(`/my-stock/payments/delivery/${o.id}/new`)}
        />
      )}
    </>
  );
}

/**
 * Port of StockPaymentsListComponent. `filters` are extra list query params
 * (e.g. `farmerId` on the farmer form).
 */
export function PaymentsTable({
  companyId,
  filters,
  onTotal,
}: {
  companyId: number;
  filters: Record<string, string | number | undefined>;
  onTotal?: (total: number) => void;
}) {
  const translate = useTranslate();
  const { canEditPayments } = useStockPermissions();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { mutate: remove } = useDelete();
  const invalidateData = useInvalidateData();

  async function confirmPayment(p: ApiPayment) {
    if (
      !(await confirm({
        description: translate("stock.payments.descriptions.areYouSureYouWantToConfirmThis"),
      }))
    )
      return;
    await call(ep.createOrUpdatePayment, { body: { ...p, paymentStatus: "CONFIRMED" } });
    // Also refreshes this table, and the deliveries / stock that show payment status.
    invalidateData();
  }

  const columns = useMemo<ColumnDef<ApiPayment>[]>(
    () => [
      {
        id: "purpose",
        header: translate("stock.payments.fields.purpose"),
        enableSorting: false,
        cell: ({ row }) => purposeLabel(row.original.paymentPurposeType),
      },
      {
        id: "amount",
        header: translate("stock.payments.fields.amount"),
        enableSorting: false,
        cell: ({ row }) => `${fmt(row.original.amount)} ${row.original.currency ?? ""}`,
      },
      {
        id: "recipient",
        header: translate("common.fields.farmer"),
        enableSorting: false,
        cell: ({ row }) => personName(row.original.recipientUserCustomer),
      },
      {
        id: "company",
        header: translate("common.fields.company"),
        enableSorting: false,
        cell: ({ row }) => row.original.recipientCompany?.name,
      },
      {
        id: "productionDate",
        header: translate("common.fields.deliveryDate"),
        enableSorting: false,
        cell: ({ row }) => day(row.original.productionDate),
      },
      {
        id: "formalCreationTime",
        header: translate("stock.payments.fields.paymentDate"),
        enableSorting: false,
        cell: ({ row }) => day(row.original.formalCreationTime),
      },
      {
        id: "way",
        header: translate("stock.payments.fields.wayOfPayment"),
        enableSorting: false,
        cell: ({ row }) => wayOfPaymentLabel(row.original.preferredWayOfPayment),
      },
      {
        id: "status",
        header: translate("common.fields.status"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.paymentStatus === "CONFIRMED" ? (
            <Badge>{translate("stock.payments.fields.confirmed")}</Badge>
          ) : (
            <Badge variant="outline">{translate("stock.payments.texts.unconfirmed")}</Badge>
          ),
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original;
          const mode = p.recipientType === "USER_CUSTOMER" ? "PURCHASE" : "CUSTOMER";
          return (
            <RowActions
              actions={[
                {
                  label: canEditPayments
                    ? translate("common.fields.edit")
                    : translate("common.fields.view"),
                  onClick: () => navigate(`/my-stock/payments/${p.id}/update/${mode}`),
                },
                {
                  label: translate("stock.payments.fields.confirm"),
                  hidden: !canEditPayments || p.paymentStatus === "CONFIRMED",
                  onClick: () => confirmPayment(p),
                },
                {
                  label: translate("common.fields.delete"),
                  destructive: true,
                  separatorBefore: true,
                  hidden: !canEditPayments || p.paymentStatus === "CONFIRMED",
                  onClick: async () => {
                    if (
                      await confirm({
                        description: translate("stock.payments.descriptions.areYouSureYouWant"),
                        destructive: true,
                        confirmLabel: translate("buttons.delete"),
                      })
                    ) {
                      remove({ resource: "payments", id: p.id! });
                    }
                  },
                },
              ]}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEditPayments]
  );

  const permanent = useMemo(
    () =>
      Object.entries(filters)
        .filter(([, v]) => v !== undefined)
        .map(([field, value]) => ({ field, operator: "eq" as const, value })),
    [filters]
  );

  const table = useTable<ApiPayment>({
    columns,
    refineCoreProps: { resource: "payments", meta: { companyId }, filters: { permanent }, syncWithLocation: false },
  });
  const total = table.refineCore.result.total;
  useEffect(() => {
    if (total != null) onTotal?.(total);
  }, [total, onTotal]);

  return <DataTable table={table} filterKey={permanent} />;
}

function BulkPayments({ companyId }: { companyId: number }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const columns = useMemo<ColumnDef<ApiBulkPayment>[]>(
    () => [
      {
        accessorKey: "receiptNumber",
        header: translate("stock.payments.fields.receiptNumber"),
        enableSorting: false,
      },
      {
        id: "purpose",
        header: translate("stock.payments.fields.purpose"),
        enableSorting: false,
        cell: ({ row }) => purposeLabel(row.original.paymentPurposeType),
      },
      {
        id: "total",
        header: translate("stock.payments.fields.totalAmount"),
        enableSorting: false,
        cell: ({ row }) => `${fmt(row.original.totalAmount)} ${row.original.currency ?? ""}`,
      },
      {
        id: "date",
        header: translate("stock.payments.fields.paymentDate"),
        enableSorting: false,
        cell: ({ row }) => day(row.original.formalCreationTime),
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              {
                label: translate("common.fields.view"),
                onClick: () => navigate(`/my-stock/payments/deliveries/bulk-payment/update/${row.original.id}`),
              },
            ]}
          />
        ),
      },
    ],
    [navigate]
  );
  const table = useTable<ApiBulkPayment>({
    columns,
    refineCoreProps: { resource: "bulk-payments", meta: { companyId }, syncWithLocation: false },
  });
  return (
    <Section plain
      title={translate("stock.payments.titles.bulkPayments")}
      description={translate("common.descriptions.total", { total: table.refineCore.result.total ?? 0 })}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => download(ep.exportBulkPaymentsByCompany, { path: { id: companyId } }, "bulk_payments.xlsx")}
        >
          <Download />
          {translate("stock.payments.buttons.exportData")}
        </Button>
      }
    >
      <DataTable table={table} />
    </Section>
  );
}

const PICK_PAGE = 50;


function PickDeliveryDialog({
  companyId,
  onClose,
  onPick,
}: {
  companyId: number;
  onClose: () => void;
  onPick: (o: ApiStockOrder) => void;
}) {
  const translate = useTranslate();
  const { control } = useForm<{ farmer: ApiUserCustomer | null }>({ defaultValues: { farmer: null } });
  const farmer = useWatch({ control, name: "farmer" });
  const [women, setWomen] = useState<"" | "true" | "false">("");
  const [choice, setChoice] = useState<number | null>(null);

  const [pageSize, setPageSize] = useState(PICK_PAGE);
  const { data, isLoading, isFetching } = useApi(
    ep.getStockOrderListByCompanyId,
    {
      path: { companyId },
      query: {
        limit: farmer ? 1000 : pageSize,
        offset: 0,
        orderType: "PURCHASE_ORDER",
        isOpenBalanceOnly: true,
        farmerId: farmer?.id,
        isWomenShare: women === "" ? undefined : women === "true",
        sortBy: "date",
        sort: "DESC",
      },
    },
    { select: (r) => ({ items: r?.items ?? [], count: r?.count ?? 0 }), keepPrevious: true }
  );
  const orders = data?.items ?? [];
  // A changed filter can drop the chosen delivery from the list.
  const chosen = orders.find((o) => o.id === choice);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translate("stock.payments.titles.selectFarmerAndDelivery")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <SearchSelectField<{ farmer: ApiUserCustomer | null }, ApiUserCustomer>
            control={control}
            name="farmer"
            label={translate("common.fields.farmer")}
            placeholder={translate("stock.payments.placeholders.allFarmers")}
            queryKey={["farmers", companyId]}
            search={userCustomerSearch(companyId, "FARMER")}
            getLabel={(u) => `${personName(u)} (${u.id})`}
          />
          <Field>
            <FieldLabel>{translate("stock.payments.fields.womenOnly")}</FieldLabel>
            <SimpleSelect
              options={[
                { value: "", label: translate("stock.payments.fields.any") },
                { value: "true", label: translate("common.fields.womensOnlyCoffee") },
                {
                  value: "false",
                  label: translate("common.fields.nonWomensOnlyCoffee"),
                },
              ]}
              value={women}
              onChange={(v) => setWomen((v ?? "") as typeof women)}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>{translate("stock.payments.fields.delivery")}</FieldLabel>
          <div role="radiogroup" className="max-h-72 overflow-y-auto rounded-md border p-1">
            {isLoading ? (
              <p className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                <Spinner />
                {translate("stock.payments.texts.loading")}
              </p>
            ) : orders.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">{translate("stock.payments.texts.noDeliveriesWithAnOpen")}</p>
            ) : (
              orders.map((o) => {
                const checked = o.id === choice;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setChoice(o.id!)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent",
                      checked && "bg-accent"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        checked ? "border-primary" : "border-muted-foreground/50"
                      )}
                    >
                      {checked && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("truncate", checked && "font-medium")}>
                        {personName(o.producerUserCustomer)}
                        {o.womenShare && (
                          <Venus
                            className="ml-1 inline size-3.5 align-[-2px] text-muted-foreground"
                            aria-label={translate("stock.payments.buttons.womenCoffee")}
                          />
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {day(o.productionDate)}
                        {o.identifier ? ` · ${o.identifier}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span className="block text-muted-foreground">{translate("stock.payments.fields.openBalance")}</span>
                      <span className="font-medium tabular-nums">
                        {fmt(o.balance)} {o.currency ?? ""}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {(data?.count ?? 0) > orders.length && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {translate("stock.payments.texts.showingTheLatestOfChoose", { ordersCount: orders.length, count: data?.count })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => setPageSize((n) => n + PICK_PAGE)}
              >
                {isFetching && <Spinner />}
                {translate("stock.payments.buttons.loadMore")}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button disabled={!chosen} onClick={() => chosen && onPick(chosen)}>
            {translate("buttons.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
