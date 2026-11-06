import { useNotification, useTranslate } from "@refinedev/core";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import type { ApiPayment, ApiStockOrder } from "@/client/types.gen";
import { ComboboxField, EntityComboboxField, SelectField, TextField } from "@/components/app/form-fields";
import { LastChange } from "@/components/app/last-change";
import { FormActions, PageHeader, PageLoader, Section } from "@/components/app/page";
import { UploadField } from "@/components/app/upload-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useEnabledCurrencies } from "@/hooks/use-lookups";
import { useSelectedCompany } from "@/hooks/use-session";
import { day, fmt, personName, toApiDate, today, useStockPermissions, wayOfPaymentLabel } from "../shared";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { PAYMENT_PURPOSES, RECEIPT_TYPES, ReadOnly, paymentTypeLabel, paymentTypes, withSuffix } from "./common";

type PaymentForm = Omit<ApiPayment, "formalCreationTime"> & { formalCreationTime: string };
type Mode = "PURCHASE" | "CUSTOMER";

/**
 * `/my-stock/payments/delivery/:purchaseOrderId/new`,
 * `/my-stock/payments/customer-order/:customerOrderId/new` and
 * `/my-stock/payments/:paymentId/update/:type` (StockPaymentsDetailComponent).
 */
export function PaymentFormPage() {
  const { purchaseOrderId, customerOrderId, paymentId, type } = useParams();
  const stockOrderId = purchaseOrderId ?? customerOrderId;
  const { data: payment, isLoading: pLoading } = useApi(
    ep.getPayment,
    { path: { id: Number(paymentId) } },
    { enabled: paymentId != null, select: (r) => r }
  );
  const { data: stockOrder, isLoading: soLoading } = useApi(
    ep.getStockOrder,
    { path: { id: Number(stockOrderId) } },
    { enabled: stockOrderId != null, select: (r) => r }
  );
  const order = payment?.stockOrder ?? stockOrder;
  if ((paymentId && pLoading) || (stockOrderId && soLoading) || !order) return <PageLoader />;
  // A delivery whose price is determined later can't take a payment yet (newPayment()).
  if (!payment && order.priceDeterminedLater) return <PriceDeterminedLater />;
  const mode: Mode = customerOrderId || type === "CUSTOMER" ? "CUSTOMER" : "PURCHASE";
  return <PaymentEditor key={payment?.id ?? order.id} order={order} payment={payment} mode={mode} />;
}

function PriceDeterminedLater() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  useEffect(() => {
    notify?.({
      type: "error",
      message: translate("stock.payments.notifications.selectEditToAddPrice"),
    });
    navigate("/my-stock/deliveries", { replace: true });
  }, [notify, navigate, translate]);
  return null;
}

function PaymentEditor({ order, payment, mode }: { order: ApiStockOrder; payment?: ApiPayment; mode: Mode }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { companyId } = useSelectedCompany();
  const { canEditPayments } = useStockPermissions();
  const currencies = useEnabledCurrencies();
  const confirmed = payment?.paymentStatus === "CONFIRMED";
  const readOnly = confirmed || !canEditPayments;
  const purchase = mode === "PURCHASE";
  const collector = payment ? payment.representativeOfRecipientUserCustomer : order.representativeOfProducerUserCustomer;
  const viaCollector = order.preferredWayOfPayment === "CASH_VIA_COLLECTOR" && !!order.representativeOfProducerUserCustomer;
  const currency = purchase ? order.currency : payment?.currency ?? order.currency;
  const unit = order.measureUnitType?.label;
  // Prefill with the open balance only when something is still owed (StockPaymentsFormComponent.ngOnInit).
  const openBalance = order.balance != null && order.balance > 0 ? order.balance : undefined;

  const { data: connectedCompanies = [] } = useApi(
    ep.getConnectedCompanies,
    { path: { id: companyId! }, query: { requestType: "FETCH", limit: 1000 } },
    { enabled: !purchase && companyId != null, select: (r) => r?.items ?? [] }
  );

  const { control, handleSubmit } = useForm<PaymentForm>({
    disabled: readOnly,
    defaultValues: payment
      ? { ...payment, formalCreationTime: day(payment.formalCreationTime) }
      : {
          formalCreationTime: today(),
          currency: purchase ? order.currency : undefined,
          paymentStatus: "UNCONFIRMED",
          stockOrder: order,
          productionDate: order.productionDate,
          preferredWayOfPayment: order.preferredWayOfPayment,
          paymentPurposeType: purchase ? "FIRST_INSTALLMENT" : undefined,
          paymentType: viaCollector || !purchase ? "BANK_TRANSFER" : undefined,
          // Receipt unless a collector is involved, in which case the user picks the document type.
          receiptDocumentType: collector && purchase ? undefined : "RECEIPT",
          recipientUserCustomer: order.producerUserCustomer,
          representativeOfRecipientUserCustomer: order.representativeOfProducerUserCustomer,
          recipientCompany: order.quoteCompany,
          payingCompany: order.company,
          amount: viaCollector ? undefined : openBalance,
          amountPaidToTheCollector: viaCollector ? openBalance : purchase ? 0 : undefined,
        },
  });

  const amount = useWatch({ control, name: "amount" });
  const purpose = useWatch({ control, name: "paymentPurposeType" });
  const receiptRequired = purpose === "FIRST_INSTALLMENT";
  const receiptLabel = collector
    ? translate("stock.payments.fields.documentPdfPngJpg")
    : translate("stock.payments.fields.signedReceiptPdfPngJpg");

  const save = useApiMutation({
    mutationFn: (v: PaymentForm) =>
      call(ep.createOrUpdatePayment, {
        body: {
          ...v,
          formalCreationTime: toApiDate(v.formalCreationTime),
          recipientType: v.recipientCompany?.id ? "COMPANY" : v.recipientUserCustomer?.id ? "USER_CUSTOMER" : undefined,
        },
      }),
    onSuccess: () => navigate(-1),
  });

  const confirmedBy = payment?.paymentConfirmedByUser;
  const notNegative = { value: 0, message: translate("common.errors.mustNotBeNegative") };

  return (
    <>
      <PageHeader
        title={
          payment
            ? `${translate("stock.payments.titles.updatePayment")}${payment.receiptNumber ? ` ${payment.receiptNumber}` : ""}`
            : translate("stock.payments.titles.newPayment")
        }
        back
        actions={
          <>
            {payment && (
              <LastChange user={payment.updatedBy ?? payment.createdBy} timestamp={payment.updatedTimestamp} />
            )}
            {confirmed && (
              <span className="text-xs text-muted-foreground">
                {translate("stock.payments.buttons.paymentWasConfirmedByAt", { Boolean: [confirmedBy?.name, confirmedBy?.surname].filter(Boolean).join(" "), timeStyle: payment?.paymentConfirmedAtTime
                                              ? new Date(payment.paymentConfirmedAtTime).toLocaleString(undefined, {
                                                  dateStyle: "medium",
                                                  timeStyle: "short",
                                                })
                                              : "" })}
              </span>
            )}
          </>
        }
      />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="flex flex-col gap-6">
        <Section title={translate("common.titles.basicInformation")}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="formalCreationTime"
              type="date"
              label={translate("stock.payments.fields.paymentDate")}
              rules={{ required: translate("stock.payments.errors.paymentDateIsRequired") }}
            />
            <ReadOnly
              label={translate("stock.payments.fields.payableFrom")}
              value={order.company?.name ?? payment?.payingCompany?.name ?? ""}
            />
            {purchase ? (
              <>
                <ReadOnly
                  label={translate("common.fields.farmer")}
                  value={personName(payment?.recipientUserCustomer ?? order.producerUserCustomer)}
                />
                {collector && (
                  <ReadOnly
                    label={translate("common.fields.collector")}
                    value={personName(collector)}
                  />
                )}
              </>
            ) : (
              <EntityComboboxField
                control={control}
                name="recipientCompany"
                label={translate("common.fields.company")}
                items={connectedCompanies}
                getLabel={(c) => c.name ?? ""}
                rules={{
                  required: translate("stock.payments.errors.atLeastOneOfPayable"),
                }}
              />
            )}
            <ReadOnly
              label={translate("stock.payments.fields.orderReference")}
              value={(purchase ? order.identifier : order.internalLotNumber) ?? ""}
            />
            {purchase && (
              <ReadOnly
                label={translate("stock.payments.fields.preferredWayOfPayment")}
                value={wayOfPaymentLabel(order.preferredWayOfPayment)}
              />
            )}
            <SelectField
              control={control}
              name="paymentPurposeType"
              label={translate("stock.payments.fields.paymentPurpose")}
              options={PAYMENT_PURPOSES}
              rules={{
                required: translate("stock.payments.errors.paymentPurposeIsRequired"),
              }}
            />
            {purchase ? (
              <SelectField
                control={control}
                name="paymentType"
                label={translate("stock.payments.fields.paymentType")}
                options={paymentTypes(!!collector)}
                rules={{ required: translate("stock.payments.errors.paymentTypeIsRequired") }}
              />
            ) : (
              // Customer payments are always bank transfers (readonlyPaymentType).
              <ReadOnly
                label={translate("stock.payments.fields.paymentType")}
                value={paymentTypeLabel("BANK_TRANSFER")}
              />
            )}

            {purchase && (
              <>
                <ReadOnly
                  label={withSuffix(translate("stock.payments.fields.purchased"), unit)}
                  value={fmt(order.fulfilledQuantity)}
                />
                <ReadOnly
                  label={withSuffix(translate("stock.payments.fields.openBalance"), currency)}
                  value={fmt(order.balance)}
                />
              </>
            )}
            <TextField
              control={control}
              name="amount"
              type="number"
              label={
                purchase
                  ? withSuffix(
                      viaCollector
                        ? translate("stock.payments.fields.amountAlreadyPaidByCollector")
                        : translate("stock.payments.fields.amountPaidToTheFarmer"),
                      currency
                    )
                  : translate("stock.payments.fields.amountPaid")
              }
              rules={{
                required: !purchase
                  ? translate("stock.payments.errors.amountIsRequired")
                  : viaCollector
                    ? translate("stock.payments.errors.amountAlreadyPaidIsRequired")
                    : translate("stock.payments.errors.amountIsRequired"),
                min: notNegative,
              }}
            />
            {!purchase && (
              <ComboboxField
                control={control}
                name="currency"
                label={translate("common.fields.currency")}
                options={currencies.map((c) => ({ value: c.code!, label: c.code! }))}
                rules={{ required: translate("stock.payments.errors.currencyIsRequired") }}
              />
            )}
            {purchase && viaCollector && (
              <TextField
                control={control}
                name="amountPaidToTheCollector"
                type="number"
                label={withSuffix(
                  translate("stock.payments.fields.amountPaidToTheCollector"),
                  currency
                )}
                rules={{
                  required: translate("stock.payments.errors.amountPaidToTheCollector"),
                  min: notNegative,
                }}
              />
            )}
            {purchase && (
              <ReadOnly
                label={withSuffix(translate("stock.payments.fields.totalPaid"), currency)}
                value={fmt(Number(amount ?? 0))}
              />
            )}
          </FieldGroup>
        </Section>

        <Section title={translate("stock.payments.titles.receipt")}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="receiptNumber"
              label={translate("stock.payments.fields.receiptNumber")}
              placeholder={translate("stock.payments.placeholders.enterReceiptNumber")}
              rules={{ required: translate("stock.payments.errors.receiptNumberIsRequired") }}
            />
            {collector && purchase ? (
              <SelectField
                control={control}
                name="receiptDocumentType"
                label={translate("common.fields.type")}
                options={RECEIPT_TYPES}
                rules={{
                  required: translate("common.errors.typeIsRequired"),
                }}
              />
            ) : (
              <ReadOnly
                label={translate("common.fields.type")}
                value={RECEIPT_TYPES.find((r) => r.value === "RECEIPT")!.label}
              />
            )}
            <UploadField
              control={control}
              name="receiptDocument"
              label={receiptLabel}
              accept="image/png,image/jpeg,application/pdf"
              rules={{
                required: receiptRequired
                  ? translate("stock.payments.errors.signedReceiptIsRequired")
                  : false,
              }}
              className="sm:col-span-2"
            />
          </FieldGroup>
        </Section>

        {!readOnly && (
          <FormActions>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              {translate("buttons.cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {translate("buttons.save")}
            </Button>
          </FormActions>
        )}
      </form>
    </>
  );
}
