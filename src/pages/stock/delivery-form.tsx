import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { type Control, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useParams } from "react-router";
import type { ApiFacility, ApiStockOrder, ApiUserCustomer } from "@/client/types.gen";
import { CheckboxField, ComboboxField, DateField, EntityComboboxField, SelectField, TextField, ReadOnlyField } from "@/components/app/form-fields";
import { LastChange } from "@/components/app/last-change";
import { useConfirm } from "@/components/app/confirm";
import { FormLayout } from "@/components/app/form-layout";
import { RepeaterItem } from "@/components/app/repeater-item";
import { FormActions, PageHeader, Section } from "@/components/app/page";
import { FormSkeleton } from "@/components/app/states";
import { SearchSelectField } from "@/components/app/search-select-field";
import { UploadField } from "@/components/app/upload-field";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useGoBack } from "@/hooks/use-go-back";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { useWarnWhenDirty } from "@/hooks/use-warn-when-dirty";
import { focusFirstError } from "@/lib/form-errors";
import { WAYS_OF_PAYMENT, type WayOfPayment, day, fmt, personName, toApiDate, today } from "./shared";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

export const PROOF_TYPES = [
  { value: "PAYMENT_LIST", get label() { return t("stock.fields.paymentList"); } },
  { value: "PAYMENT_ORDER_APPROVED", get label() { return t("stock.fields.paymentOrderApproved"); } },
  { value: "PAYMENT_PROOF", get label() { return t("stock.fields.paymentProof"); } },
  { value: "PURCHASE_SHEET", get label() { return t("stock.fields.purchaseSheet"); } },
  { value: "PURCHASE_SHEET_BANK_TRANSFER", get label() { return t("stock.fields.purchaseSheetBankTransfer"); } },
  { value: "PURCHASE_SHEET_COLLECTOR", get label() { return t("stock.fields.purchaseSheetCollector"); } },
  { value: "RECEIPT", get label() { return t("stock.fields.receipt"); } },
  { value: "RECEIPT_BANK_TRANSFER", get label() { return t("stock.fields.receiptBankTransfer"); } },
  { value: "RECEIPT_COLLECTOR", get label() { return t("stock.fields.receiptCollector"); } },
];

const ORGANIC_YES_NO = [
  { value: "true", get label() { return t("common.fields.yes"); } },
  { value: "false", get label() { return t("common.fields.no"); } },
];

const WOMEN_ONLY_YES_NO = [
  { value: "true", get label() { return t("common.fields.yes"); } },
  { value: "false", get label() { return t("common.fields.no"); } },
];

type FormValues = Omit<ApiStockOrder, "creatorId" | "organic" | "womenShare" | "productionDate"> & {
  productionDate: string;
  creatorId: string | null;
  organic: string | null;
  womenShare: string | null;
};

/** Search farmers or collectors of a company by name. */
export function userCustomerSearch(companyId: number, type: "FARMER" | "COLLECTOR") {
  return async (query: string) =>
    (
      await call(ep.getUserCustomersForCompanyAndType, {
        path: { companyId, type },
        query: { limit: 1000, query: query || undefined, sortBy: "BY_NAME", sort: "ASC", searchBy:"BY_NAME_AND_SURNAME" },
      })
    )?.items ?? [];
}

function toForm(o: ApiStockOrder): FormValues {
  return {
    ...o,
    productionDate: day(o.productionDate) || today(),
    creatorId: o.creatorId != null ? String(o.creatorId) : null,
    organic: o.organic == null ? null : String(o.organic),
    womenShare: o.womenShare == null ? null : String(o.womenShare),
    activityProofs: (o.activityProofs ?? []).map((p) => ({ ...p, formalCreationDate: day(p.formalCreationDate) })),
  };
}

/**
 * `/my-stock/deliveries/facility/:facilityId/deliveries/new` and
 * `/my-stock/deliveries/update/:purchaseOrderId` (StockDeliveryDetailsComponent).
 */
export function DeliveryForm() {
  const { facilityId, purchaseOrderId } = useParams();
  const isNew = purchaseOrderId == null;

  const { data: order, isLoading: orderLoading } = useApi(
    ep.getStockOrder,
    { path: { id: Number(purchaseOrderId) } },
    { enabled: !isNew, select: (r) => r }
  );
  const { data: newFacility, isLoading: facilityLoading } = useApi(
    ep.getFacility,
    { path: { id: Number(facilityId) } },
    { enabled: isNew, select: (r) => r }
  );
  const { company } = useSelectedCompany();

  const facility = isNew ? newFacility : order?.facility;
  if ((isNew ? facilityLoading : orderLoading) || !facility || !company) return <FormSkeleton sections={3} />;
  return <Form key={order?.id ?? "new"} facility={facility} order={order} currency={company.currency?.code} />;
}

function Form({ facility, order, currency }: { facility: ApiFacility; order?: ApiStockOrder; currency?: string }) {
  const translate = useTranslate();
  const isNew = order == null;
  const { user } = useIdentity();
  const { company, companyId } = useSelectedCompany();
  const back = useGoBack("/my-stock/deliveries");
  const semiProducts = (facility.facilitySemiProductList ?? []).filter((s) => s.buyable);
  const selectedCurrency = order?.currency ?? currency ?? "-";

  const { control, handleSubmit, setValue, getValues, reset } = useForm<FormValues>({
    defaultValues: order
      ? toForm(order)
      : toForm({
          orderType: "PURCHASE_ORDER",
          facility: { id: facility.id },
          currency: currency,
          semiProduct: semiProducts.length === 1 ? semiProducts[0] : undefined,
          // The logged-in user is the default employee.
          creatorId: user?.id,
          womenShare: facility.displayWomenOnly ? undefined : false,
        }),
  });
  const release = useWarnWhenDirty(control);

  const v = useWatch({ control }) as FormValues;
  const semiProductId = v.semiProduct?.id;
  const { data: semiProduct } = useApi(ep.getSemiProduct, { path: { id: semiProductId! } }, { enabled: semiProductId != null });
  const unit =
    (semiProductId != null && semiProduct?.id === semiProductId ? semiProduct.measurementUnitType?.label : undefined) ??
    order?.measureUnitType?.label ??
    "-";
  const withUnit = (label: string, suffix: string) => `${label} (${suffix})`;
  const perUnit = `${selectedCurrency}/${unit}`;
  const priceLater = !!v.priceDeterminedLater;

  const show = {
    collector: !!facility.displayMayInvolveCollectors,
    organic: !!facility.displayOrganic || v.organic != null,
    womenOnly: !!facility.displayWomenOnly,
    tare: !!facility.displayTare || v.tare != null,
    priceDeduction: (!!facility.displayPriceDeductionDamage || v.damagedPriceDeduction != null) && !priceLater,
    weightDeduction: !!facility.displayWeightDeductionDamage || v.damagedWeightDeduction != null,
  };

  const num = (x: unknown) => (x === null || x === undefined || x === "" ? null : Number(x));
  const gross = num(v.totalGrossQuantity);
  const netWeight =
    gross == null ? null : Math.max(0, gross - (num(v.tare) ?? 0) - (num(v.damagedWeightDeduction) ?? 0));
  const price = num(v.pricePerUnit);
  const finalPrice = price == null ? null : Math.max(0, price - (num(v.damagedPriceDeduction) ?? 0));
  const cost =
    netWeight != null && finalPrice != null && !priceLater ? Number((netWeight * finalPrice).toFixed(2)) : null;

  useEffect(() => {
    if (getValues("cost") !== cost) {
      setValue("cost", cost ?? undefined);
      if (isNew || !order?.payments?.length) setValue("balance", cost ?? undefined);
    }
  }, [cost, getValues, setValue, isNew, order]);

  const paymentOptions = useMemo(() => {
    const allowed = new Set<WayOfPayment>(["CASH", "BANK_TRANSFER", "CHEQUE", "OFFSETTING"]);
    if (v.representativeOfProducerUserCustomer) allowed.add("CASH_VIA_COLLECTOR");
    if (v.producerUserCustomer && !v.representativeOfProducerUserCustomer) allowed.add("UNKNOWN");
    return WAYS_OF_PAYMENT.filter((w) => allowed.has(w.value));
  }, [v.representativeOfProducerUserCustomer, v.producerUserCustomer]);

  const wasPriceLater = useRef(priceLater);
  useEffect(() => {
    if (priceLater && !wasPriceLater.current) {
      setValue("pricePerUnit", undefined);
      setValue("damagedPriceDeduction", undefined);
    }
    wasPriceLater.current = priceLater;
  }, [priceLater, setValue]);

  // Changing farmer/collector can remove "Cash via collector" or "Unknown"; drop a value no longer offered.
  useEffect(() => {
    const current = getValues("preferredWayOfPayment");
    if (current && !paymentOptions.some((o) => o.value === current)) setValue("preferredWayOfPayment", undefined);
  }, [paymentOptions, getValues, setValue]);

  const employees = (company?.users ?? []).map((u) => ({ value: String(u.id), label: `${u.name} ${u.surname}` }));

  const save = useApiMutation({
    mutationFn: async ({ values, close }: { values: FormValues; close: boolean }) => {
      const quantity = Math.max(0, (num(values.totalGrossQuantity) ?? 0) - (num(values.tare) ?? 0));
      const body: ApiStockOrder = {
        ...values,
        orderType: "PURCHASE_ORDER",
        facility: { id: facility.id },
        productionDate: toApiDate(values.productionDate),
        creatorId: values.creatorId ? Number(values.creatorId) : undefined,
        organic: values.organic == null ? undefined : values.organic === "true",
        womenShare: values.womenShare === "true",
        totalQuantity: quantity,
        fulfilledQuantity: quantity,
        availableQuantity: quantity,
        activityProofs: values.activityProofs?.map((p) => ({
          ...p,
          formalCreationDate: toApiDate(p.formalCreationDate),
        })),
      };
      if (isNew) {
        body.identifier = `PT-${values.producerUserCustomer?.surname ?? ""}-${body.productionDate}`;
      }
      const saved = await call(ep.createOrUpdateStockOrder, { body });
      return { saved, close };
    },
    onSuccess: ({ close }, { values }) => {
      if (close) {
        release();
        back();
      } else reset(values);
    },
  });

  const submit = (close: boolean) => handleSubmit((values) => save.mutate({ values, close }), focusFirstError);

  return (
    <>
      <PageHeader
        title={
          isNew
            ? translate("stock.titles.newDelivery")
            : translate("stock.titles.updateDelivery")
        }
        breadcrumbs={[{ label: translate("common.fields.myStock"), to: "/my-stock" }, { label: translate("stock.fields.deliveries"), to: "/my-stock/deliveries" }]}
        actions={
          order && (
            <LastChange
              user={order.updatedBy?.id ? order.updatedBy : order.createdBy}
              timestamp={order.updateTimestamp}
            />
          )
        }
      />
      <form onSubmit={submit(true)}>
        <FormLayout control={control}>
          <Section id="basic" title={translate("common.titles.basicInformation")}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <DateField
                control={control}
                name="productionDate"
                label={translate("common.fields.deliveryDate")}
                rules={{
                  required: translate("stock.errors.deliveryDateIsRequired"),
                }}
              />
              <Field>
                <FieldLabel>
                  {translate("stock.fields.facilityName")}
                </FieldLabel>
                <Input disabled value={facility.name ?? ""} />
              </Field>
              <SearchSelectField<FormValues, ApiUserCustomer>
                control={control}
                name="producerUserCustomer"
                label={translate("common.fields.farmer")}
                queryKey={["farmers", companyId]}
                search={userCustomerSearch(companyId!, "FARMER")}
                getLabel={(u) => `${personName(u)} (${u.id})`}
                rules={{
                  required: translate("stock.errors.farmerIsRequired"),
                }}
              />
              {show.collector && (
                <SearchSelectField<FormValues, ApiUserCustomer>
                  control={control}
                  name="representativeOfProducerUserCustomer"
                  label={translate("common.fields.collector")}
                  queryKey={["collectors", companyId]}
                  search={userCustomerSearch(companyId!, "COLLECTOR")}
                  getLabel={(u) => personName(u)}
                />
              )}
              <ComboboxField
                control={control}
                name="creatorId"
                label={translate("stock.fields.cooperativeEmployee")}
                options={employees}
                rules={{ required: translate("stock.errors.employeeIsRequired") }}
              />
            </FieldGroup>
          </Section>

          <Section id="details" title={translate("stock.titles.deliveryDetails")}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <EntityComboboxField
                control={control}
                name="semiProduct"
                label={translate("stock.fields.semiProduct")}
                items={semiProducts}
                getLabel={(s) => s.name ?? ""}
                rules={{
                  required: translate("stock.errors.semiProductIsRequired"),
                }}
              />
              {facility.displayPriceDeterminedLater && (
                <CheckboxField
                  control={control}
                  name="priceDeterminedLater"
                  label={translate("stock.fields.priceDeterminedLater")}
                  className="self-end"
                />
              )}
              <TextField
                control={control}
                name="totalGrossQuantity"
                type="number"
                label={withUnit(translate("common.fields.quantity"), unit)}
                rules={{
                  required: translate("common.errors.quantityIsRequired"),
                  min: { value: 0, message: translate("common.errors.mustNotBeNegative") },
                }}
              />
              {!priceLater && (
                <TextField
                  control={control}
                  name="pricePerUnit"
                  type="number"
                  label={withUnit(translate("stock.fields.pricePerUnit"), perUnit)}
                  rules={{
                    required: translate("stock.errors.pricePerUnitIsRequired"),
                  }}
                />
              )}
              {show.tare && (
                <TextField
                  control={control}
                  name="tare"
                  type="number"
                  readOnly={!facility.displayTare}
                  label={withUnit(translate("stock.fields.tare"), unit)}
                  rules={{
                    required: facility.displayTare
                      ? translate("stock.errors.tareIsRequired")
                      : false,
                    validate: (t) =>
                      t == null ||
                      gross == null ||
                      Number(t) <= gross ||
                      translate("stock.errors.tareValueIsLargerThan"),
                  }}
                />
              )}
              {show.weightDeduction && (
                <TextField
                  control={control}
                  name="damagedWeightDeduction"
                  type="number"
                  readOnly={!facility.displayWeightDeductionDamage}
                  label={withUnit(
                    translate("stock.fields.damagedWeightDeduction"),
                    unit
                  )}
                  rules={{
                    required: facility.displayWeightDeductionDamage
                      ? translate("stock.errors.damagedWeightDeductionIsRequired")
                      : false,
                    validate: (d) =>
                      d == null ||
                      gross == null ||
                      Number(d) <= gross - (num(v.tare) ?? 0) ||
                      translate("stock.errors.damagedWeightDeductionIsLarger"),
                  }}
                />
              )}
              {show.priceDeduction && (
                <TextField
                  control={control}
                  name="damagedPriceDeduction"
                  type="number"
                  label={withUnit(
                    translate("stock.fields.damagedPriceDeduction"),
                    perUnit
                  )}
                  readOnly={!facility.displayPriceDeductionDamage}
                  rules={{
                    required: facility.displayPriceDeductionDamage
                      ? translate("stock.errors.damagedPriceDeductionIsRequired")
                      : false,
                    validate: (d) =>
                      d == null ||
                      price == null ||
                      Number(d) <= price ||
                      translate("stock.errors.damagedPriceDeductionIsLarger"),
                  }}
                />
              )}
              {(show.tare || show.weightDeduction) && (
                <ReadOnlyField
                  label={withUnit(translate("stock.fields.netWeight"), unit)}
                  value={fmt(netWeight)}
                />
              )}
              {show.priceDeduction && (
                <ReadOnlyField
                  label={withUnit(translate("stock.fields.finalPrice"), perUnit)}
                  value={fmt(finalPrice)}
                />
              )}
              <ReadOnlyField
                label={withUnit(translate("stock.fields.basePayment"), selectedCurrency)}
                value={fmt(v.cost)}
              />
              <ReadOnlyField
                label={withUnit(translate("stock.fields.openBalance"), selectedCurrency)}
                value={fmt(v.balance)}
              />
              <ComboboxField
                control={control}
                name="preferredWayOfPayment"
                label={translate("stock.fields.preferredWayOfPayment")}
                options={paymentOptions}
                rules={{
                  required: translate("stock.errors.preferredWayOfPaymentIs"),
                }}
              />
              {show.organic && !facility.displayOrganic && (
                <ReadOnlyField
                  label={translate("stock.fields.organic")}
                  value={ORGANIC_YES_NO.find((o) => o.value === v.organic)?.label ?? "-"}
                />
              )}
              {show.organic && facility.displayOrganic && (
                <SelectField
                  control={control}
                  name="organic"
                  label={translate("stock.fields.organic")}
                  options={ORGANIC_YES_NO}
                  rules={{
                    required: translate("stock.errors.organicIsRequired"),
                  }}
                />
              )}
              {show.womenOnly && (
                <SelectField
                  control={control}
                  name="womenShare"
                  label={translate("stock.fields.womensOnly2")}
                  options={WOMEN_ONLY_YES_NO}
                  rules={{ required: translate("stock.errors.womensOnlyIsRequired2") }}
                />
              )}
            </FieldGroup>
          </Section>

          <Section id="proofs" title={translate("stock.titles.additionalProofs")}>
            <ActivityProofs control={control} />
          </Section>

          <FormActions sticky control={control}>
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => back()}>
              {translate("buttons.cancel")}
            </Button>
            {!isNew && (
              <Button type="button" variant="outline" disabled={save.isPending} onClick={submit(false)}>
                {translate("buttons.save")}
              </Button>
            )}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {isNew ? translate("buttons.save") : translate("stock.buttons.saveClose")}
            </Button>
          </FormActions>
        </FormLayout>
      </form>
    </>
  );
}


/** List of ApiActivityProof (AdditionalProofItemComponent). */
export function ActivityProofs<T extends { activityProofs?: ApiStockOrder["activityProofs"] }>({
  control,
}: {
  control: Control<T>;
}) {
  const translate = useTranslate();
  const c = control as unknown as Control<{ activityProofs: NonNullable<ApiStockOrder["activityProofs"]> }>;
  const { fields, append, remove } = useFieldArray({ control: c, name: "activityProofs", keyName: "key" });
  const values = useWatch({ control: c, name: "activityProofs" }) ?? [];
  const confirm = useConfirm();
  // Ask only when a document was attached; an empty proof just goes.
  const removeAt = async (i: number) => {
    if (
      !values[i]?.document ||
      (await confirm({
        description: translate("common.descriptions.removeThisItem"),
        destructive: true,
        confirmLabel: translate("buttons.remove"),
      }))
    )
      remove(i);
  };
  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && <p className="text-xs text-muted-foreground">{translate("stock.texts.noAdditionalProofs")}</p>}
      {fields.map((f, i) => (
        <RepeaterItem key={f.key} title={translate("stock.titles.proofNumber", { number: i + 1 })} onRemove={() => removeAt(i)}>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr] sm:items-start">
            <DateField
              control={c}
              name={`activityProofs.${i}.formalCreationDate`}
              label={translate("common.fields.date")}
              rules={{ required: translate("stock.errors.dateIsRequired") }}
            />
            <ComboboxField
              control={c}
              name={`activityProofs.${i}.type`}
              label={translate("common.fields.type")}
              options={PROOF_TYPES}
              rules={{ required: translate("common.errors.typeIsRequired") }}
            />
            <UploadField
              control={c}
              name={`activityProofs.${i}.document`}
              label={translate("stock.fields.documentJpgPngPdf")}
              accept="image/png,image/jpeg,application/pdf"
              rules={{ required: translate("common.errors.documentIsRequired") }}
            />
          </div>
        </RepeaterItem>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append({ formalCreationDate: today() })}>
        <Plus />
        {translate("stock.buttons.addProof")}
      </Button>
    </div>
  );
}
