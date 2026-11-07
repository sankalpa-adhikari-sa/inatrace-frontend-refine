import { format } from "date-fns";
import { Banknote, ChevronDown, Download, Layers, Plus, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ApiFacility, ApiStockOrder } from "@/client/types.gen";
import { FilterPopover, SearchInput, SimpleCombobox, SimpleSelect, Toolbar } from "@/components/app/controls";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { PageLoader, Section } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSelectedCompany } from "@/hooks/use-session";
import { useUrlFilters } from "@/hooks/use-url-state";
import { WAYS_OF_PAYMENT, toApiDay, today } from "./shared";
import { StockOrderTable } from "./stock-order-table";
import { download, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";

/** Facility picker persisted in `?facilityId=`. */
export function useFacilityParam() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("facilityId");
  const facilityId = raw && raw !== "null" ? Number(raw) : null;
  const setFacilityId = (id: number | null) =>
    setParams(
      () => {
        // The URL as it is now: other filters may have been set in the same tick (see useUrlFilters).
        const p = new URLSearchParams(window.location.search);
        if (id == null) p.delete("facilityId");
        else p.set("facilityId", String(id));
        return p;
      },
      { replace: true }
    );
  return [facilityId, setFacilityId] as const;
}

function dateRange(from: string, to: string) {
  if (!from && !to) return {};
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    productionDateStart: toApiDay(from || "1970-01-01"),
    productionDateEnd: toApiDay(to || format(tomorrow, "yyyy-MM-dd")),
  };
}

const DELIVERY_FILTERS = ["query", "semiProductId", "from", "to", "wayOfPayment", "womenOnly", "openBalance"] as const;

/** `/my-stock/deliveries` */
export function DeliveriesTab() {
  const translate = useTranslate();
  const { companyId } = useSelectedCompany();
  const navigate = useNavigate();
  const [facilityId, setFacilityId] = useFacilityParam();
  // In the URL, so a reload or the back button from a delivery keeps them.
  const url = useUrlFilters(DELIVERY_FILTERS);
  const { wayOfPayment, womenOnly, query, from, to } = url.values;
  const openBalanceOnly = url.values.openBalance === "true";
  const semiProductId = url.values.semiProductId ? Number(url.values.semiProductId) : null;
  const setOpenBalanceOnly = (v: boolean) => url.set({ openBalance: v });
  const setWayOfPayment = (v: string) => url.set({ wayOfPayment: v });
  const setWomenOnly = (v: string) => url.set({ womenOnly: v });
  const setQuery = (v: string) => url.set({ query: v });
  const setSemiProductId = (v: number | null) => url.set({ semiProductId: v });
  const setFrom = (v: string) => url.set({ from: v });
  const setTo = (v: string) => url.set({ to: v });
  const [selected, setSelected] = useState<ApiStockOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  const { data: facilities = [] } = useApi(
    ep.listCollectingFacilitiesByCompany,
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
      isPurchaseOrderOnly: true,
      isOpenBalanceOnly: openBalanceOnly || undefined,
      wayOfPayment: wayOfPayment || undefined,
      isWomenShare: womenOnly === "" ? undefined : womenOnly === "true",
      query: query || undefined,
      semiProductId: semiProductId ?? undefined,
      ...dateRange(from, to),
    }),
    [openBalanceOnly, wayOfPayment, womenOnly, query, semiProductId, from, to]
  );

  if (companyId == null) return <PageLoader />;

  const payable = selected.filter((o) => !o.priceDeterminedLater);

  return (
    <Section plain
      title={translate("common.titles.deliveries")}
      onboarding="stock-deliveries"
      description={translate("stock.descriptions.listOfPurchaseOrdersTotal", { total })}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={total < 1 || exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await download(ep.exportDeliveriesByCompany, { path: { companyId } }, "deliveries.xlsx");
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download />
            {translate("stock.buttons.export")}
          </Button>
          <AddDeliveryMenu facilities={facilities} facilityId={facilityId} />
        </div>
      }
    >
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder={translate("stock.placeholders.searchByFarmerNameOr")} />
        <SimpleCombobox
          className="sm:w-64"
          placeholder={translate("stock.placeholders.allCollectingFacilities")}
          options={facilities.map((f) => ({ value: f.id!, label: f.name ?? "" }))}
          value={facilityId}
          onChange={(id) => {
            setSemiProductId(null);
            setFacilityId(id);
          }}
        />
        {facility && (
          <SimpleCombobox
            className="sm:w-52"
            placeholder={translate("stock.placeholders.allSemiProducts")}
            options={(facility.facilitySemiProductList ?? []).map((s) => ({ value: s.id!, label: s.name ?? "" }))}
            value={semiProductId}
            onChange={setSemiProductId}
          />
        )}
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
        <FilterPopover
          count={[wayOfPayment, womenOnly, openBalanceOnly].filter(Boolean).length}
          onReset={() => {
            setWayOfPayment("");
            setWomenOnly("");
            setOpenBalanceOnly(false);
          }}
        >
          <Field>
            <FieldLabel>{translate("stock.fields.wayOfPayment")}</FieldLabel>
            <SimpleSelect
              options={[{ value: "", label: translate("stock.fields.anyWayOfPayment") }, ...WAYS_OF_PAYMENT]}
              value={wayOfPayment}
              onChange={(v) => setWayOfPayment(v ?? "")}
            />
          </Field>
          <Field>
            <FieldLabel>{translate("stock.fields.womensOnly")}</FieldLabel>
            <SimpleSelect
              options={[
                { value: "", label: translate("stock.fields.any") },
                {
                  value: "true",
                  label: translate("common.fields.womensOnlyCoffee"),
                },
                {
                  value: "false",
                  label: translate("common.fields.nonWomensOnlyCoffee"),
                },
              ]}
              value={womenOnly}
              onChange={(v) => setWomenOnly(v ?? "")}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Switch id="open-balance" checked={openBalanceOnly} onCheckedChange={setOpenBalanceOnly} />
            <Label htmlFor="open-balance">{translate("stock.fields.openBalanceOnly")}</Label>
          </div>
        </FilterPopover>
      </Toolbar>
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border bg-primary-lighter px-3 py-2 text-sm">
          <span className="font-medium">
            {translate("stock.texts.selected", { selectedCount: selected.length })}
          </span>
          {payable.length < selected.length && (
            <span className="text-xs text-muted-foreground">
              {translate("stock.texts.withThePriceDeterminedLater", { payableCount: selected.length - payable.length })}
            </span>
          )}
          <Button
            size="sm"
            className="ml-auto"
            disabled={payable.length === 0}
            onClick={() =>
              navigate(`/my-stock/payments/deliveries/bulk-payment/${payable.map((o) => o.id).join(",")}/new/PO`)
            }
          >
            <Banknote />
            {translate("stock.buttons.addPayments", { payableCount: payable.length })}
          </Button>
        </div>
      ) : (
        total > 0 && (
          <p className="text-xs text-muted-foreground">
            {translate("stock.texts.selectDeliveriesInTheList")}
          </p>
        )
      )}
      {/* Onboarding anchor wraps the list; an empty sibling would add an extra flex gap. */}
      <div data-onboarding="deliveries-list">
        <StockOrderTable
          mode="PURCHASE_ORDERS"
          companyId={companyId}
          facilityId={facilityId}
          filters={filters}
          selectable
          onSelectionChange={setSelected}
          onTotal={setTotal}
          isFiltered={url.active}
          onClearFilters={url.clear}
        />
      </div>
    </Section>
  );
}

/** The chosen delivery kind is filled, so the active option is obvious. */
const KIND_TOGGLE =
  "flex-1 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:aria-pressed:bg-primary hover:aria-pressed:text-primary-foreground";

/**
 * "Add delivery": a single or bulk delivery at a collecting facility. With one facility known
 * (the facility filter, or the only one) it's a two-item menu; otherwise the facility is
 * picked from a searchable list, so adding doesn't depend on filtering the list first.
 */
function AddDeliveryMenu({ facilities, facilityId }: { facilities: ApiFacility[]; facilityId: number | null }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"new" | "new-bulk">("new");
  const [chosenId, setChosenId] = useState<number | null>(null);
  const fixed = facilities.find((f) => f.id === facilityId) ?? (facilities.length === 1 ? facilities[0] : undefined);
  const go = (path: string, f: ApiFacility) => navigate(`/my-stock/deliveries/facility/${f.id}/deliveries/${path}`);
  const trigger = (
    <Button size="sm" data-onboarding="add-delivery" disabled={facilities.length === 0}>
      <Plus />
      {translate("stock.buttons.addDelivery")}
      <ChevronDown className="opacity-70" />
    </Button>
  );
  const chosen = facilities.find((f) => f.id === chosenId);
  const delivery = translate("stock.texts.delivery");
  const bulk = translate("stock.texts.bulkDelivery");

  if (fixed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="w-auto min-w-56 p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 pt-1.5 pb-2">
              {translate("stock.texts.at", { name: fixed.name })}
            </DropdownMenuLabel>
            <DropdownMenuItem className="min-h-9 px-2.5 py-2 text-sm" onClick={() => go("new", fixed)}>
              <Truck />
              {delivery}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-9 px-2.5 py-2 text-sm" onClick={() => go("new-bulk", fixed)}>
              <Layers />
              {bulk}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="flex w-80 flex-col gap-2 p-2">
        <ToggleGroup
          variant="outline"
          spacing={0}
          className="w-full"
          value={[kind]}
          onValueChange={(v) => v[0] && setKind(v[0] as typeof kind)}
        >
          <ToggleGroupItem value="new" className={KIND_TOGGLE}>
            <Truck />
            {delivery}
          </ToggleGroupItem>
          <ToggleGroupItem value="new-bulk" className={KIND_TOGGLE}>
            <Layers />
            {bulk}
          </ToggleGroupItem>
        </ToggleGroup>
        <Command className="rounded-md border p-0">
          <CommandInput placeholder={translate("stock.placeholders.searchCollectingFacility")} />
          <CommandList className="max-h-72">
            <CommandEmpty>{translate("stock.texts.noFacilityFound")}</CommandEmpty>
            <CommandGroup heading={translate("stock.titles.chooseTheCollectingFacility")}>
              {facilities.map((f) => {
                const checked = f.id === chosenId;
                return (
                  <CommandItem
                    key={f.id}
                    value={`${f.name ?? ""} ${f.id}`}
                    aria-checked={checked}
                    onSelect={() => setChosenId(f.id!)}
                    className="min-h-8 text-sm"
                  >
                    {/* Radio look: one facility is chosen, then "Continue". */}
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        checked ? "border-primary" : "border-muted-foreground/50"
                      )}
                    >
                      {checked && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span className={cn("truncate", checked && "font-medium")}>{f.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <Button
          size="sm"
          disabled={chosen == null}
          onClick={() => {
            if (!chosen) return;
            setOpen(false);
            go(kind, chosen);
          }}
        >
          {chosen
            ? translate("stock.buttons.addAt", { bulk: (kind === "new" ? delivery : bulk).toLowerCase(), name: chosen.name })
            : translate("stock.buttons.chooseAFacilityToContinue")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
