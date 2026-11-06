import { FileText, Pencil } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import type {
  ApiProcessingAction,
  ApiStockOrder,
  ApiStockOrderEvidenceFieldValue,
  ApiStockOrderEvidenceTypeValue,
  ApiStockOrderHistoryTimelineItem,
  ApiTransaction,
} from "@/client/types.gen";
import { PageHeader, PageLoader, Section } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { documentUrl } from "@/lib/api";
import { safeRedirect } from "@/lib/safe-redirect";
import { cn } from "@/lib/utils";
import { ACTION_TYPES } from "../companies/processing-actions";
import { ORDER_TYPES, day, fmt, personName } from "./shared";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useNotification, useTranslate } from "@refinedev/core";

/** `/my-stock/all-stock/stock-order/:stockOrderId/view` (BatchHistoryComponent). */
export function BatchHistory() {
  const translate = useTranslate();
  const { stockOrderId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: history, isLoading } = useApi(
    ep.getStockOrderAggregatedHistory,
    { path: { id: Number(stockOrderId) } },
    { select: (r) => r }
  );

  if (isLoading || !history?.stockOrder) return <PageLoader />;
  const so = history.stockOrder;
  const po = history.processingOrder;
  const unit = so.measureUnitType?.label ?? "";
  // The list this history was opened from. Kept while moving between linked batches, so Back returns to
  // that list (with its filters), not to each batch in turn. Without it Back goes back in history.
  const returnUrl = safeRedirect(params.get("returnUrl"), "");
  const view = (id?: number) =>
    id &&
    navigate(
      `/my-stock/all-stock/stock-order/${id}/view${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`
    );

  const edit = () =>
    navigate(
      so.orderType === "PURCHASE_ORDER"
        ? `/my-stock/deliveries/update/${so.id}`
        : `/my-stock/processing/update/${so.id}`
    );

  return (
    <>
      <PageHeader
        title={translate("stock.titles.batchHistory")}
        description={so.internalLotNumber || so.identifier}
        back={returnUrl || true}
        actions={
          <Button onClick={edit}>
            <Pencil />
            {translate("buttons.edit")}
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={translate("common.titles.basicInformation")}>
          <Rows
            rows={[
              so.purchaseOrder ? [translate("stock.fields.identifier"), so.identifier] : [translate("stock.processingOrder.fields.internalLotName"), so.internalLotNumber],
              [
                translate("common.fields.facility"),
                `${so.facility?.name ?? ""}${so.facility?.company?.name ? ` (${so.facility.company.name})` : ""}`,
              ],
              so.semiProduct && [translate("stock.fields.semiProduct"), so.semiProduct.name],
              so.finalProduct && [translate("common.fields.finalProduct"), `${so.finalProduct.name} (${so.finalProduct.product?.name ?? ""})`],
              [translate("common.fields.quantity"), `${fmt(so.totalQuantity)} ${unit}`],
              [translate("stock.fields.filled"), `${fmt(so.fulfilledQuantity)} ${unit}`],
              [translate("stock.fields.available"), `${fmt(so.availableQuantity)} ${unit}`],
              [translate("stock.fields.created"), so.creationTimestamp?.slice(0, 16).replace("T", " ")],
              [translate("stock.fields.lastChange"), so.updateTimestamp?.slice(0, 16).replace("T", " ")],
              [translate("stock.fields.productionDate"), day(so.productionDate)],
              [translate("stock.fields.comment"), so.comments || "-"],
            ]}
          />
        </Section>
        <Section title={translate("stock.titles.processingInformation")}>
          <Rows
            rows={[
              [translate("stock.fields.orderType"), ORDER_TYPES[so.orderType!]],
              po?.processingAction && [
                translate("stock.fields.processingAction"),
                `${po.processingAction.name} (${
                  ACTION_TYPES.find((t) => t.value === po.processingAction?.type)?.label ?? ""
                })`,
              ],
              so.purchaseOrder && [translate("common.fields.farmer"), personName(so.producerUserCustomer)],
              so.purchaseOrder &&
                so.representativeOfProducerUserCustomer && [
                  translate("stock.fields.farmerRepresentative"),
                  personName(so.representativeOfProducerUserCustomer),
                ],
              so.purchaseOrder && [
                translate("stock.fields.costPaidBalance"),
                so.priceDeterminedLater
                  ? translate("stock.fields.priceDeterminedLater")
                  : `${fmt(so.cost)} / ${fmt(so.paid ?? 0)} / ${fmt(so.balance)} ${so.currency ?? ""}`,
              ],
              !so.purchaseOrder && [
                translate("stock.fields.inputs"),
                <TransactionList key="in" txs={po?.inputTransactions} onClick={(t) => view(t.sourceStockOrder?.id)} />,
              ],
              [
                translate("stock.processingOrder.fields.outputs"),
                <TransactionList
                  key="out"
                  txs={history.outputTransactions}
                  onClick={(t) => view(t.targetStockOrder?.id)}
                />,
              ],
            ]}
          />
          {so.id != null && <StockOrderQr id={so.id} />}
        </Section>
      </div>

      <Section title={translate("stock.titles.history")}>
        <ol className="relative flex flex-col gap-4 border-l pl-5">
          {(history.timelineItems ?? []).map((item, i) => (
            <TimelineItem key={item.id ?? i} item={item} rootId={so.id} onOpen={view} />
          ))}
        </ol>
      </Section>
    </>
  );
}

/** QR of the stock order ID; click to copy it (BatchHistoryComponent.qrCodeString). */
function StockOrderQr({ id }: { id: number }) {
  const translate = useTranslate();
  const { open: notify } = useNotification();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(id));
      notify?.({ type: "success", message: translate("stock.notifications.copiedToClipboard") });
    } catch {
      // Clipboard access can be blocked; the QR stays usable.
    }
  };
  return (
    <button
      type="button"
      title={translate("stock.titles.copyToClipboard")}
      onClick={copy}
      className="self-start rounded-md border bg-white p-2"
    >
      <QRCodeSVG value={String(id)} size={110} />
    </button>
  );
}

function Rows({ rows }: { rows: (false | null | undefined | [string, ReactNode])[] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-xs">
      {rows.filter(Boolean).map((r) => {
        const [k, v] = r as [string, ReactNode];
        return (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v ?? "-"}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function TransactionList({ txs, onClick }: { txs?: ApiTransaction[]; onClick: (t: ApiTransaction) => void }) {
  if (!txs?.length) return <>-</>;
  return (
    <ul className="flex flex-col gap-0.5">
      {txs.map((t, i) => (
        <li key={t.id ?? i}>
          <button
            type="button"
            onClick={() => onClick(t)}
            className={cn(
              "underline-offset-2 hover:underline",
              t.status === "CANCELED" && "text-destructive line-through"
            )}
          >
            {fmt(t.inputQuantity)} {t.inputMeasureUnitType?.label}
          </button>
          {t.status === "CANCELED" && t.rejectComment && <div className="text-destructive">{t.rejectComment}</div>}
        </li>
      ))}
    </ul>
  );
}

/** Sacs of one repacked output share a lot name ending in "/<sac>"; show them as one group. */
function groupSacs(orders: ApiStockOrder[]) {
  const singles: ApiStockOrder[] = [];
  const groups = new Map<string, ApiStockOrder[]>();
  for (const o of orders) {
    const slash = o.internalLotNumber?.lastIndexOf("/") ?? -1;
    if (o.sacNumber != null && slash !== -1) {
      const lot = o.internalLotNumber!.slice(0, slash);
      groups.set(lot, [...(groups.get(lot) ?? []), o]);
    } else {
      singles.push(o);
    }
  }
  return { singles, groups: [...groups.entries()] };
}

function TimelineItem({
  item,
  rootId,
  onOpen,
}: {
  item: ApiStockOrderHistoryTimelineItem;
  rootId?: number;
  onOpen: (id?: number) => void;
}) {
  const translate = useTranslate();
  const po = item.processingOrder;
  const action = po?.processingAction;
  const name = po ? action?.name ?? translate("stock.texts.corruptedHistoryProcessingActionDeleted") : translate("stock.texts.purchase");
  const targets = item.purchaseOrders?.length ? item.purchaseOrders : po?.targetStockOrders ?? [];
  const { singles, groups } = groupSacs(targets);

  return (
    <li className="relative">
      <span className="absolute top-1 -left-[25px] size-2.5 rounded-full border-2 border-background bg-primary" />
      <div className="text-xs font-medium">
        {po?.processingDate && `${day(po.processingDate)} – `}
        {name}
      </div>
      <ul className="mt-1 flex flex-col gap-1 text-xs">
        {singles.map((o) => (
          <li key={o.id}>
            <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => onOpen(o.id)}>
              {day(o.productionDate)} @ {o.facility?.name}: {o.internalLotNumber || o.identifier} –{" "}
              {fmt(o.totalQuantity)} {o.measureUnitType?.label}
            </button>
            {o.id === rootId && <span className="text-muted-foreground"> {translate("stock.texts.thisOrder")}</span>}
            <Evidence fields={o.requiredEvidenceFieldValues} action={action} />
          </li>
        ))}
        {groups.map(([lot, sacs]) => (
          <li key={lot}>
            <button
              type="button"
              className="text-left underline-offset-2 hover:underline"
              onClick={() => onOpen(sacs[0].id)}
            >
              {day(sacs[0].productionDate)} @ {sacs[0].facility?.name}: {lot}
            </button>{" "}
            <span className="text-muted-foreground">
              {translate("stock.texts.numberOfSacs", { sacsCount: sacs.length, totalQuantity: fmt(sacs.reduce((s, x) => s + (x.totalQuantity ?? 0), 0)) })}{" "}
              {sacs[0].measureUnitType?.label})
            </span>
            <Evidence fields={sacs[0].requiredEvidenceFieldValues} action={action} />
          </li>
        ))}
      </ul>
      <Documents
        title={translate("stock.titles.processingEvidenceDocuments")}
        docs={item.requiredEvidenceDocuments}
        action={action}
      />
      <Documents
        title={translate("stock.titles.otherEvidenceDocuments")}
        docs={item.otherEvidenceDocuments}
        action={action}
      />
    </li>
  );
}

/** FieldOrDocInfoComponent for evidence field values. */
function Evidence({ fields, action }: { fields?: ApiStockOrderEvidenceFieldValue[]; action?: ApiProcessingAction }) {
  if (!fields?.length) return null;
  return (
    <ul className="ml-3 text-muted-foreground">
      {fields.map((f) => {
        const def = action?.requiredEvidenceFields?.find((x) => x.id === f.evidenceFieldId);
        const value = f.stringValue ?? (f.numericValue != null ? fmt(f.numericValue) : day(f.dateValue)) ?? "";
        return (
          <li key={f.id ?? f.evidenceFieldName}>
            {def?.label ?? f.evidenceFieldName}: {value || "-"}
          </li>
        );
      })}
    </ul>
  );
}

function Documents({
  title,
  docs,
  action,
}: {
  title: string;
  docs?: ApiStockOrderEvidenceTypeValue[];
  action?: ApiProcessingAction;
}) {
  if (!docs?.length) return null;
  return (
    <div className="mt-2">
      <div className="text-[0.7rem] font-medium text-muted-foreground uppercase">{title}</div>
      <ul className="flex flex-col gap-0.5 text-xs">
        {docs.map((d, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <FileText className="size-3.5 text-muted-foreground" />
            <a
              href={documentUrl(d.document?.storageKey)}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {d.evidenceTypeLabel ??
                action?.requiredDocumentTypes?.find((t) => t.id === d.evidenceTypeId)?.label ??
                d.evidenceTypeCode}
            </a>
            {d.date && <span className="text-muted-foreground">({day(d.date)})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
