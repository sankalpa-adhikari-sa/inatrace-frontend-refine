import { useMany, useTranslate } from "@refinedev/core";
import { Banknote, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import type { ApiBulkPayment, ApiPayment, ApiStockOrder, ApiUserCustomer } from "@/client/types.gen";
import { LastChange } from "@/components/app/last-change";
import { DateField, SelectField, TextareaField, TextField } from "@/components/app/form-fields";
import { FormActions, PageHeader, PageLoader, Section } from "@/components/app/page";
import { TableEmptyRow } from "@/components/app/table-empty-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSelectedCompany } from "@/hooks/use-session";
import { ActivityProofs, PROOF_TYPES } from "../delivery-form";
import { day, fmt, personName, toApiDate, today } from "../shared";
import { documentUrl } from "@/lib/api";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { PAYMENT_PURPOSES, purposeLabel, ReadOnly, withSuffix } from "./common";

type PayRow = { order: ApiStockOrder; paid: number | null };
type BulkForm = Omit<ApiBulkPayment, "formalCreationTime" | "payments" | "additionalProofs"> & {
  formalCreationTime: string;
  rows: PayRow[];
  activityProofs: NonNullable<ApiBulkPayment["additionalProofs"]>;
};

/** Who gets the money: the collector for cash-via-collector deliveries, otherwise the farmer (initPurchaseOrders). */
function payee(o: ApiStockOrder): { person?: ApiUserCustomer; collector: boolean } {
  const collector = o.preferredWayOfPayment === "CASH_VIA_COLLECTOR" && !!o.representativeOfProducerUserCustomer;
  return { person: collector ? o.representativeOfProducerUserCustomer : o.producerUserCustomer, collector };
}

/**
 * `/my-stock/payments/deliveries/bulk-payment/:purchaseOrderIds/new/:bulkType`
 * and `/my-stock/payments/deliveries/bulk-payment/update/:bulkPaymentId` (StockPaymentsBulkDetailComponent).
 */
export function BulkPaymentPage() {
  const { purchaseOrderIds, bulkPaymentId, bulkType } = useParams();
  const { company } = useSelectedCompany();
  const ids = useMemo(() => (purchaseOrderIds ?? "").split(",").filter(Boolean).map(Number), [purchaseOrderIds]);

  const { data: existing, isLoading } = useApi(
    ep.getBulkPayment,
    { path: { id: Number(bulkPaymentId) } },
    { enabled: bulkPaymentId != null, select: (r) => r }
  );
  const { result: orders, query: ordersQuery } = useMany<ApiStockOrder>({
    resource: "stock-orders",
    ids,
    queryOptions: { enabled: ids.length > 0 },
  });

  if ((bulkPaymentId && isLoading) || (ids.length && ordersQuery.isLoading) || !company) return <PageLoader />;
  if (existing) return <BulkPaymentView bulk={existing} />;
  return <BulkPaymentEditor orders={orders?.data ?? []} purchaseOrders={bulkType === "PO"} />;
}

function BulkPaymentEditor({ orders, purchaseOrders }: { orders: ApiStockOrder[]; purchaseOrders: boolean }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { company } = useSelectedCompany();
  const withPayee = orders.filter((o) => payee(o).person);
  const payable = withPayee.filter((o) => payee(o).person?.bank?.accountNumber);
  const unpayable = withPayee.filter((o) => !payee(o).person?.bank?.accountNumber);
  const currency = company?.currency?.code;
  const multiple = translate("stock.payments.fields.multiple");

  const { control, handleSubmit, setValue } = useForm<BulkForm>({
    defaultValues: {
      formalCreationTime: today(),
      paymentPurposeType: "FIRST_INSTALLMENT",
      currency,
      rows: payable.map((order) => ({ order, paid: order.balance ?? null })),
      activityProofs: [],
    },
  });
  const rows = useFieldArray({ control, name: "rows", keyName: "key" });
  const watchedRows = (useWatch({ control, name: "rows" }) ?? []) as PayRow[];
  const additionalCost = useWatch({ control, name: "additionalCost" });
  const total = watchedRows.reduce((s, r) => s + (Number(r.paid) || 0), 0);
  // Like hideSavedButton(): every selected delivery needs a payee with a bank account.
  const canSave = unpayable.length === 0 && rows.fields.length > 0;

  useEffect(() => setValue("totalAmount", total), [total, setValue]);

  const save = useApiMutation({
    mutationFn: (v: BulkForm) => {
      const formalCreationTime = toApiDate(v.formalCreationTime);
      const payments: ApiPayment[] = v.rows.map(({ order, paid }) => ({
        currency,
        formalCreationTime,
        payingCompany: company ?? undefined,
        paymentPurposeType: v.paymentPurposeType,
        receiptNumber: v.receiptNumber,
        stockOrder: order,
        amount: paid ?? undefined,
        amountPaidToTheCollector: order.preferredWayOfPayment === "CASH_VIA_COLLECTOR" ? paid ?? undefined : undefined,
        recipientUserCustomer: order.producerUserCustomer,
        preferredWayOfPayment: order.preferredWayOfPayment,
        representativeOfRecipientUserCustomer: order.representativeOfProducerUserCustomer,
        paymentType: "BANK_TRANSFER",
        recipientType: "USER_CUSTOMER",
        paymentStatus: "UNCONFIRMED",
      }));
      const { rows: _rows, activityProofs, ...rest } = v;
      return call(ep.createBulkPayment, {
        body: {
          ...rest,
          formalCreationTime,
          currency,
          payingCompany: company ?? undefined,
          totalAmount: total,
          payments,
          additionalProofs: activityProofs.map((p) => ({ ...p, formalCreationDate: toApiDate(p.formalCreationDate) })),
        },
      });
    },
    onSuccess: () => navigate("/my-stock/payments"),
  });

  return (
    <>
      <PageHeader title={translate("stock.payments.titles.newBulkPayment")} back />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="flex flex-col gap-6">
        <Section title={translate("common.titles.basicInformation")}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <DateField
              control={control}
              name="formalCreationTime"
              label={translate("stock.payments.fields.paymentDate")}
              rules={{
                required: translate("stock.payments.errors.paymentDateIsRequired"),
              }}
            />
            <ReadOnly
              label={translate("stock.payments.fields.payableFrom")}
              value={company?.name ?? ""}
            />
            {purchaseOrders && (
              <ReadOnly
                label={translate("common.fields.collector")}
                value={multiple}
              />
            )}
            <ReadOnly
              label={translate("common.fields.farmer")}
              value={multiple}
            />
            <SelectField
              control={control}
              name="paymentPurposeType"
              label={translate("stock.payments.fields.paymentPurpose")}
              options={PAYMENT_PURPOSES}
              rules={{
                required: translate("stock.payments.errors.paymentPurposeIsRequired"),
              }}
            />
            <TextField
              control={control}
              name="receiptNumber"
              label={translate("stock.payments.fields.receiptNumber")}
              placeholder={translate("stock.payments.placeholders.enterReceiptNumber")}
              rules={{
                required: translate("stock.payments.errors.receiptNumberIsRequired"),
              }}
            />
            <TextareaField
              control={control}
              name="paymentDescription"
              label={translate("stock.payments.fields.paymentDescription")}
              rules={{
                required: translate("stock.payments.errors.paymentDescriptionIsRequired"),
              }}
              rows={2}
              className="sm:col-span-2"
            />
            <ReadOnly
              label={withSuffix(
                translate("stock.payments.fields.totalAmountPaid"),
                currency
              )}
              value={fmt(total)}
            />
            {purchaseOrders && (
              <TextField
                control={control}
                name="additionalCost"
                type="number"
                label={withSuffix(
                  translate("stock.payments.fields.additionalCosts"),
                  currency
                )}
                placeholder={translate("stock.payments.placeholders.enterAdditionalCosts")}
              />
            )}
            {purchaseOrders && additionalCost != null && String(additionalCost) !== "" && (
              <TextField
                control={control}
                name="additionalCostDescription"
                label={translate("stock.payments.fields.descriptionOfAdditionalCosts")}
                rules={{
                  required: translate("stock.payments.errors.descriptionOfAdditionalCostsIs"),
                }}
                className="sm:col-span-2"
              />
            )}
          </FieldGroup>
        </Section>

        <Section plain title={translate("stock.payments.titles.deliveriesToBePaid")}>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("common.fields.name")}</TableHead>
                  <TableHead>
                    {withSuffix(translate("stock.payments.fields.cost"), currency)}
                  </TableHead>
                  <TableHead>
                    {withSuffix(translate("stock.payments.fields.balance"), currency)}
                  </TableHead>
                  <TableHead className="w-40">
                    {withSuffix(translate("stock.payments.fields.paying"), currency)}
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.fields.length === 0 && (
                  <TableEmptyRow colSpan={5} icon={<Banknote />} title={translate("stock.payments.titles.nothingToPay")} />
                )}
                {rows.fields.map((r, i) => (
                  <TableRow key={r.key}>
                    <TableCell>{r.order.identifier}</TableCell>
                    <TableCell>{fmt(r.order.cost)}</TableCell>
                    <TableCell>{fmt(r.order.balance)}</TableCell>
                    <TableCell>
                      <TextField
                        control={control}
                        name={`rows.${i}.paid`}
                        type="number"
                        rules={{
                          required: translate("common.errors.required"),
                          min: { value: 0, message: translate("common.errors.mustNotBeNegative") },
                          validate: (paid) =>
                            paid == null ||
                            r.order.balance == null ||
                            Number(paid) <= r.order.balance ||
                            translate("stock.payments.errors.shouldBeLessThanOr"),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={translate("buttons.remove")}
                        onClick={() => rows.remove(i)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        {unpayable.length > 0 && (
          <Section
            title={translate("stock.payments.titles.deliveriesCannotBePaid")}
          >
            <ul className="flex flex-col gap-2 text-xs">
              {unpayable.map((o) => (
                <li key={o.id} className="flex flex-wrap gap-x-3">
                  <span className="font-medium">{o.identifier}</span>
                  <MissingBankAccount order={o} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section
          title={translate("stock.payments.titles.additionalProofs")}
        >
          <ActivityProofs control={control} />
        </Section>

        <FormActions>
          {!canSave && unpayable.length > 0 && (
            <span className="mr-auto self-center text-xs text-destructive">
              {translate("stock.payments.texts.addTheMissingBankAccounts")}
            </span>
          )}
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            {translate("buttons.cancel")}
          </Button>
          <Button type="submit" disabled={save.isPending || !canSave}>
            {save.isPending && <Spinner />}
            {translate("buttons.save")}
          </Button>
        </FormActions>
      </form>
    </>
  );
}

/** "Recipient <name> bank account is missing", with the name linking to the farmer / collector. */
function MissingBankAccount({ order }: { order: ApiStockOrder }) {
  const translate = useTranslate();
  const { person, collector } = payee(order);
  // Translate with a marker in place of the name, then put the link where the marker lands.
  const MARK = "\u0000";
  const [before, after = ""] = translate("stock.payments.fields.recipientBankAccountIsMissing", { name: MARK }).split(MARK);
  return (
    <span className="text-destructive">
      {before}
      <Link to={`${collector ? "/my-collectors" : "/my-farmers"}/edit/${person?.id}`} className="underline">
        {personName(person)}
      </Link>
      {after}
    </span>
  );
}

function BulkPaymentView({ bulk }: { bulk: ApiBulkPayment }) {
  const translate = useTranslate();
  const currency = bulk.currency ?? bulk.payingCompany?.currency?.code;
  const multiple = translate("stock.payments.fields.multiple");
  const proofs = bulk.additionalProofs ?? [];
  return (
    <>
      <PageHeader
        title={translate("stock.payments.titles.updateBulkPayment")}
        back
        actions={<LastChange user={bulk.createdBy} timestamp={bulk.creationTimestamp} />}
      />
      <Section title={translate("common.titles.basicInformation")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnly
            label={translate("stock.payments.fields.paymentDate")}
            value={day(bulk.formalCreationTime)}
          />
          <ReadOnly
            label={translate("stock.payments.fields.payableFrom")}
            value={bulk.payingCompany?.name ?? ""}
          />
          <ReadOnly
            label={translate("common.fields.collector")}
            value={multiple}
          />
          <ReadOnly
            label={translate("common.fields.farmer")}
            value={multiple}
          />
          <ReadOnly
            label={translate("stock.payments.fields.paymentPurpose")}
            value={purposeLabel(bulk.paymentPurposeType)}
          />
          <ReadOnly
            label={translate("stock.payments.fields.receiptNumber")}
            value={bulk.receiptNumber ?? ""}
          />
          <ReadOnly
            label={translate("stock.payments.fields.paymentDescription")}
            value={bulk.paymentDescription ?? ""}
          />
          <ReadOnly
            label={withSuffix(
              translate("stock.payments.fields.totalAmountPaid"),
              currency
            )}
            value={fmt(bulk.totalAmount)}
          />
          {bulk.additionalCost != null && (
            <>
              <ReadOnly
                label={withSuffix(
                  translate("stock.payments.fields.additionalCosts"),
                  currency
                )}
                value={fmt(bulk.additionalCost)}
              />
              <ReadOnly
                label={translate("stock.payments.fields.descriptionOfAdditionalCosts")}
                value={bulk.additionalCostDescription ?? ""}
              />
            </>
          )}
        </div>
      </Section>
      <Section plain title={translate("stock.payments.titles.payments")}>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translate("stock.payments.fields.recipient")}</TableHead>
                <TableHead>{translate("stock.payments.fields.amount")}</TableHead>
                <TableHead>{translate("common.fields.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bulk.payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{personName(p.recipientUserCustomer)}</TableCell>
                  <TableCell>
                    {fmt(p.amount)} {p.currency}
                  </TableCell>
                  <TableCell>
                    {p.paymentStatus === "CONFIRMED" ? (
                      <Badge>{translate("stock.payments.fields.confirmed")}</Badge>
                    ) : (
                      <Badge variant="outline">{translate("stock.payments.texts.unconfirmed")}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
      <Section title={translate("stock.payments.titles.additionalProofs")}>
        {proofs.length === 0 ? (
          <p className="text-xs text-muted-foreground">{translate("stock.payments.texts.noAdditionalProofs")}</p>
        ) : (
          <ul className="flex flex-col gap-2 text-xs">
            {proofs.map((p, i) => (
              <li key={p.id ?? i} className="flex flex-wrap items-center gap-x-3">
                <span className="font-medium">{PROOF_TYPES.find((t) => t.value === p.type)?.label ?? p.type}</span>
                <span className="text-muted-foreground">{day(p.formalCreationDate)}</span>
                {p.document?.storageKey && (
                  <a href={documentUrl(p.document.storageKey)} target="_blank" rel="noreferrer" className="underline">
                    {p.document.name ?? translate("stock.payments.texts.document")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
