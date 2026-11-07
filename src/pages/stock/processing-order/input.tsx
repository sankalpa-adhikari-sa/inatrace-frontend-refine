import { useTranslate } from "@refinedev/core";
import { Leaf, QrCode, Trash2, Venus } from "lucide-react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import type { ApiFacility, ApiStockOrder, ApiTransaction } from "@/client/types.gen";
import { SimpleSelect } from "@/components/app/controls";
import { DatePicker } from "@/components/app/date-picker";
import { EntitySelectField } from "@/components/app/form-fields";
import { QrCodeDialog } from "@/components/app/qr-code-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { day, fmt } from "../shared";
import { type ActionType, type FormValues, NO_STOCK_FILTERS, type StockFilters, canClip, stockOrderName } from "./model";

export type AvailableStockState = {
  orders: ApiStockOrder[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

/** Organic / women's coffee markers and the QR code link of a stock order. */
function StockMarkers({ order, onQr }: { order?: ApiStockOrder; onQr: (o: ApiStockOrder) => void }) {
  const translate = useTranslate();
  if (!order) return null;
  return (
    <span className="inline-flex items-center gap-1.5 pl-1.5 align-middle text-muted-foreground [&_svg]:size-3.5">
      {order.qrCodeTag && (
        <button type="button" aria-label="QR" className="hover:text-foreground" onClick={() => onQr(order)}>
          <QrCode />
        </button>
      )}
      {order.organic && (
        <span title={translate("stock.processingOrder.titles.organicCoffee")}>
          <Leaf />
        </span>
      )}
      {order.womenShare && (
        <span title={translate("stock.processingOrder.titles.womenCoffee")}>
          <Venus />
        </span>
      )}
    </span>
  );
}

export function InputSection({
  control,
  type,
  editing,
  facilities,
  getFacilityLabel,
  kept,
  onRemoveKept,
  showStock,
  stock,
  selected,
  setSelected,
  filters,
  setFilters,
  unit,
  error,
}: {
  control: Control<FormValues>;
  type: ActionType;
  editing: boolean;
  facilities: ApiFacility[];
  getFacilityLabel: (f: ApiFacility) => string;
  kept: ApiTransaction[];
  onRemoveKept: (index: number) => void;
  showStock: boolean;
  stock: AvailableStockState;
  selected: Record<number, number>;
  setSelected: (s: Record<number, number>) => void;
  filters: StockFilters;
  setFilters: (f: StockFilters) => void;
  unit: string;
  error: string | null;
}) {
  const translate = useTranslate();
  const [qr, setQr] = useState<ApiStockOrder | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <EntitySelectField
        control={control}
        name="inputFacility"
        label={translate("common.fields.facility")}
        items={facilities}
        getLabel={getFacilityLabel}
        disabled={editing}
        rules={{
          required: translate("stock.processingOrder.errors.inputFacilityIsRequired"),
        }}
      />

      {kept.length > 0 && (
        <div className="flex flex-col gap-1">
          {kept.map((t, i) => (
            <div key={t.id ?? i} className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs">
              <div className="flex-1">
                <span>
                  {t.sourceStockOrder ? stockOrderName(t.sourceStockOrder) : ""}
                  {t.status && <span className="text-muted-foreground"> ({t.status})</span>}
                </span>
                <StockMarkers order={t.sourceStockOrder} onQr={setQr} />
                {t.status === "CANCELED" && t.rejectComment && (
                  <div className="text-destructive">{t.rejectComment}</div>
                )}
              </div>
              <span className="whitespace-nowrap">
                {fmt(t.outputQuantity)} {t.inputMeasureUnitType?.label ?? unit}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={translate("buttons.remove")}
                onClick={() => onRemoveKept(i)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showStock && (
        <AvailableStock
          type={type}
          stock={stock}
          selected={selected}
          setSelected={setSelected}
          filters={filters}
          setFilters={setFilters}
          unit={unit}
          onQr={setQr}
        />
      )}
      {/* data-invalid: found by the form's "go to first error" and the section error marks. */}
      {error && <FieldError data-invalid>{error}</FieldError>}

      {qr?.qrCodeTag && <QrCodeDialog qrCodeTag={qr.qrCodeTag} finalProduct={qr.qrCodeTagFinalProduct} onClose={() => setQr(null)} />}
    </div>
  );
}

function AvailableStock({
  type,
  stock,
  selected,
  setSelected,
  filters,
  setFilters,
  unit,
  onQr,
}: {
  type: ActionType;
  stock: AvailableStockState;
  selected: Record<number, number>;
  setSelected: (s: Record<number, number>) => void;
  filters: StockFilters;
  setFilters: (f: StockFilters) => void;
  unit: string;
  onQr: (o: ApiStockOrder) => void;
}) {
  const translate = useTranslate();
  const { orders } = stock;
  const clip = canClip(type);
  const toggle = (o: ApiStockOrder, on: boolean) => {
    const next = { ...selected };
    if (on) next[o.id!] = o.availableQuantity ?? 0;
    else delete next[o.id!];
    setSelected(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field className="w-40">
          <FieldLabel className="text-xs">
            {translate("stock.processingOrder.fields.from")}
          </FieldLabel>
          <DatePicker
            value={filters.from}
            max={filters.to || undefined}
            clearable
            onChange={(from) => setFilters({ ...filters, from })}
          />
        </Field>
        <Field className="w-40">
          <FieldLabel className="text-xs">
            {translate("stock.processingOrder.fields.to")}
          </FieldLabel>
          <DatePicker
            value={filters.to}
            min={filters.from || undefined}
            clearable
            onChange={(to) => setFilters({ ...filters, to })}
          />
        </Field>
        <SimpleSelect
          className="w-48"
          options={[
            { value: "", label: translate("stock.processingOrder.fields.anyWomensShare") },
            {
              value: "true",
              label: translate("common.fields.womensOnlyCoffee"),
            },
            {
              value: "false",
              label: translate("common.fields.nonWomensOnlyCoffee"),
            },
          ]}
          value={filters.women}
          onChange={(v) => setFilters({ ...filters, women: (v ?? "") as StockFilters["women"] })}
        />
        <SimpleSelect
          className="w-44"
          options={[
            { value: "", label: translate("stock.processingOrder.fields.organicAndConventional") },
            {
              value: "true",
              label: translate("stock.processingOrder.fields.organicOnlyCoffee"),
            },
            {
              value: "false",
              label: translate("stock.processingOrder.fields.conventionalCoffee"),
            },
          ]}
          value={filters.organic}
          onChange={(v) => setFilters({ ...filters, organic: (v ?? "") as StockFilters["organic"] })}
        />
        <Input
          className="w-48"
          placeholder={translate("stock.processingOrder.placeholders.search")}
          value={filters.lot}
          onChange={(e) => setFilters({ ...filters, lot: e.target.value })}
        />
        {JSON.stringify(filters) !== JSON.stringify(NO_STOCK_FILTERS) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setFilters(NO_STOCK_FILTERS)}>
            {translate("stock.processingOrder.buttons.clearFilters")}
          </Button>
        )}
      </div>

      {stock.loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner />
          {translate("stock.processingOrder.fields.loadingAvailableStock")}
        </p>
      ) : stock.error ? (
        <p className="text-xs text-destructive">
          {translate("stock.processingOrder.errors.availableStockCouldNotBe")}{" "}
          <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={stock.retry}>
            {translate("stock.processingOrder.buttons.tryAgain")}
          </Button>
        </p>
      ) : orders.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {translate("stock.processingOrder.fields.noRelevantStockToAdd")}
        </p>
      ) : (
        <>
          <FieldLabel>{translate("stock.processingOrder.fields.addNewTransactions")}</FieldLabel>
          <div className="max-h-80 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan={2}>
                    <label className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={orders.every((o) => selected[o.id!] != null)}
                        onCheckedChange={(c) =>
                          setSelected(c ? Object.fromEntries(orders.map((o) => [o.id!, o.availableQuantity ?? 0])) : {})
                        }
                      />
                      {translate("stock.processingOrder.fields.selectAll", { ordersCount: orders.length })}
                    </label>
                  </TableHead>
                  <TableHead>{translate("common.fields.date")}</TableHead>
                  <TableHead>
                    {translate("stock.processingOrder.fields.availableQuantity")}
                  </TableHead>
                  {clip && (
                    <TableHead className="w-32">
                      {translate("stock.processingOrder.fields.useInput")}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const on = selected[o.id!] != null;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="w-8">
                        <Checkbox checked={on} onCheckedChange={(c) => toggle(o, !!c)} aria-label={stockOrderName(o)} />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {stockOrderName(o)}
                        <StockMarkers order={o} onQr={onQr} />
                      </TableCell>
                      <TableCell>{day(o.productionDate)}</TableCell>
                      <TableCell>
                        {fmt(o.availableQuantity)} {unit}
                      </TableCell>
                      {clip && (
                        <TableCell>
                          {on && (
                            // Partial use ("clip") of an input stock order.
                            <Input
                              type="number"
                              className="h-6"
                              min={0}
                              max={o.availableQuantity}
                              value={selected[o.id!]}
                              onChange={(e) =>
                                setSelected({
                                  ...selected,
                                  [o.id!]: Math.min(Number(e.target.value), o.availableQuantity ?? 0),
                                })
                              }
                            />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
