import { Plus, Trash2 } from "lucide-react";
import { type Control, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useParams } from "react-router";
import type {
  ApiFacility,
  ApiPurchaseOrder,
  ApiPurchaseOrderFarmer,
  ApiSemiProduct,
  ApiUserCustomer,
} from "@/client/types.gen";
import { ComboboxField, DateField, EntityComboboxField, SelectField, TextField } from "@/components/app/form-fields";
import { FormActions, PageHeader, Section } from "@/components/app/page";
import { FormLayout } from "@/components/app/form-layout";
import { FormSkeleton } from "@/components/app/states";
import { SearchSelectField } from "@/components/app/search-select-field";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { useWarnWhenDirty } from "@/hooks/use-warn-when-dirty";
import { useGoBack } from "@/hooks/use-go-back";
import { ActivityProofs, userCustomerSearch } from "./delivery-form";
import { WAYS_OF_PAYMENT, fmt, personName, toApiDate, today } from "./shared";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";
import { focusFirstError } from "@/lib/form-errors";

const YES_NO = [
  { value: "true", get label() { return t("common.fields.yes"); } },
  { value: "false", get label() { return t("common.fields.no"); } },
];

type FarmerRow = Omit<ApiPurchaseOrderFarmer, "organic" | "womenShare"> & {
  organic: string | null;
  womenShare: string | null;
};
type FormValues = Omit<ApiPurchaseOrder, "creatorId" | "farmers" | "productionDate"> & {
  productionDate: string;
  creatorId: string | null;
  farmers: FarmerRow[];
};

const n = (x: unknown) => (x === null || x === undefined || x === "" ? null : Number(x));

function rowAmounts(r: Partial<FarmerRow>) {
  const gross = n(r.totalGrossQuantity);
  const quantity = gross == null ? null : Math.max(0, gross - (n(r.tare) ?? 0));
  const net = gross == null ? null : Math.max(0, gross - (n(r.tare) ?? 0) - (n(r.damagedWeightDeduction) ?? 0));
  const price = n(r.pricePerUnit);
  const finalPrice = price == null ? null : Math.max(0, price - (n(r.damagedPriceDeduction) ?? 0));
  const cost = net != null && finalPrice != null ? Number((net * finalPrice).toFixed(2)) : null;
  return { quantity, net, cost };
}

/** `/my-stock/deliveries/facility/:facilityId/deliveries/new-bulk` (StockBulkDeliveryDetailsComponent). */
export function BulkDeliveryForm() {
  const { facilityId } = useParams();
  const { data: facility } = useApi(ep.getFacility, { path: { id: Number(facilityId) } }, { select: (r) => r });
  const { company } = useSelectedCompany();
  if (!facility || !company) return <FormSkeleton sections={3} />;
  return <Form facility={facility} currency={company.currency?.code ?? "-"} />;
}

function Form({ facility, currency }: { facility: ApiFacility; currency: string }) {
  const translate = useTranslate();
  const { user } = useIdentity();
  const { company, companyId } = useSelectedCompany();
  const semiProducts = (facility.facilitySemiProductList ?? []).filter((s) => s.buyable);

  const emptyRow = (): FarmerRow => ({
    semiProduct: semiProducts.length === 1 ? semiProducts[0] : undefined,
    organic: null,
    womenShare: facility.displayWomenOnly ? null : "false",
  });

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      productionDate: today(),
      creatorId: user?.id != null ? String(user.id) : null,
      currency,
      farmers: [emptyRow()],
      activityProofs: [],
    },
  });
  const goBack = useGoBack("/my-stock/deliveries");
  const release = useWarnWhenDirty(control);
  const { fields, append, remove } = useFieldArray({ control, name: "farmers", keyName: "key" });
  const collector = useWatch({ control, name: "representativeOfProducerUserCustomer" });

  const paymentOptions = WAYS_OF_PAYMENT.filter(
    (w) => (w.value !== "CASH_VIA_COLLECTOR" || !!collector) && (w.value !== "UNKNOWN" || !collector)
  );
  const employees = (company?.users ?? []).map((u) => ({ value: String(u.id), label: `${u.name} ${u.surname}` }));

  const save = useApiMutation({
    mutationFn: async (v: FormValues) => {
      const productionDate = toApiDate(v.productionDate);
      const body: ApiPurchaseOrder = {
        ...v,
        productionDate,
        facility: { id: facility.id },
        creatorId: v.creatorId ? Number(v.creatorId) : undefined,
        farmers: v.farmers.map((r) => {
          const { quantity, cost } = rowAmounts(r);
          return {
            ...r,
            identifier: `PT-${r.producerUserCustomer?.surname ?? ""}-${productionDate}`,
            organic: r.organic == null ? undefined : r.organic === "true",
            womenShare: r.womenShare === "true",
            totalQuantity: quantity ?? undefined,
            fulfilledQuantity: quantity ?? undefined,
            availableQuantity: quantity ?? undefined,
            cost: cost ?? undefined,
            balance: cost ?? undefined,
          };
        }),
        activityProofs: v.activityProofs?.map((p) => ({ ...p, formalCreationDate: toApiDate(p.formalCreationDate) })),
      };
      await call(ep.createPurchaseOrderBulk, { body });
    },
    onSuccess: () => {
      release();
      goBack();
    },
  });

  return (
    <>
      <PageHeader
        title={translate("stock.titles.newBulkPurchaseOrder")}
        breadcrumbs={[{ label: translate("common.fields.myStock"), to: "/my-stock" }, { label: translate("stock.fields.deliveries"), to: "/my-stock/deliveries" }]}
      />
      <form onSubmit={handleSubmit((v) => save.mutate(v), focusFirstError)}>
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
                  {translate("common.fields.facility")}
                </FieldLabel>
                <Input disabled value={facility.name ?? ""} />
              </Field>
              {facility.displayMayInvolveCollectors && (
                <SearchSelectField<FormValues, ApiUserCustomer>
                  control={control}
                  name="representativeOfProducerUserCustomer"
                  label={translate("common.fields.collector")}
                  queryKey={["collectors", companyId]}
                  search={userCustomerSearch(companyId!, "COLLECTOR")}
                  getLabel={personName}
                />
              )}
              <ComboboxField
                control={control}
                name="creatorId"
                label={translate("stock.fields.cooperativeEmployee")}
                options={employees}
                rules={{ required: translate("stock.errors.employeeIsRequired") }}
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
            </FieldGroup>
          </Section>

          <Section
            id="farmers"
            title={translate("stock.titles.farmers")}
            actions={
              <Button type="button" variant="outline" size="sm" onClick={() => append(emptyRow())}>
                <Plus />
                {translate("stock.buttons.addFarmer")}
              </Button>
            }
          >
            {fields.map((f, i) => (
              <FarmerRowFields
                key={f.key}
                index={i}
                control={control}
                facility={facility}
                semiProducts={semiProducts}
                currency={currency}
                companyId={companyId!}
                onRemove={fields.length > 1 ? () => remove(i) : undefined}
              />
            ))}
          </Section>

          <Section
            id="proofs"
            title={translate("stock.titles.additionalProofs")}
          >
            <ActivityProofs control={control} />
          </Section>

          <FormActions sticky control={control}>
            <Button type="button" variant="outline" onClick={() => goBack()}>
              {translate("buttons.cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {translate("buttons.save")}
            </Button>
          </FormActions>
        </FormLayout>
      </form>
    </>
  );
}

function FarmerRowFields({
  index: i,
  control,
  facility,
  semiProducts,
  currency,
  companyId,
  onRemove,
}: {
  index: number;
  control: Control<FormValues>;
  facility: ApiFacility;
  semiProducts: ApiSemiProduct[];
  currency: string;
  companyId: number;
  onRemove?: () => void;
}) {
  const translate = useTranslate();
  const row = (useWatch({ control, name: `farmers.${i}` }) ?? {}) as FarmerRow;
  const unit = semiProducts.find((s) => s.id === row.semiProduct?.id)?.measurementUnitType?.label ?? "";
  const { net, cost } = rowAmounts(row);
  const gross = n(row.totalGrossQuantity);
  const price = n(row.pricePerUnit);

  return (
    <div className="grid gap-4 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-3">
      <SearchSelectField<FormValues, ApiUserCustomer>
        control={control}
        name={`farmers.${i}.producerUserCustomer`}
        label={translate("common.fields.farmer")}
        queryKey={["farmers", companyId]}
        search={userCustomerSearch(companyId, "FARMER")}
        getLabel={(u) => `${personName(u)} (${u.id})`}
        rules={{
          required: translate("stock.errors.farmerIsRequired"),
        }}
        className="sm:col-span-2"
      />
      <EntityComboboxField
        control={control}
        name={`farmers.${i}.semiProduct`}
        label={translate("stock.fields.semiProduct")}
        items={semiProducts}
        getLabel={(s) => s.name ?? ""}
        rules={{
          required: translate("stock.errors.semiProductIsRequired"),
        }}
      />
      <TextField
        control={control}
        name={`farmers.${i}.totalGrossQuantity`}
        type="number"
        label={translate("stock.fields.quantity", { unit })}
        rules={{
          required: translate("common.errors.quantityIsRequired"),
        }}
      />
      <TextField
        control={control}
        name={`farmers.${i}.pricePerUnit`}
        type="number"
        label={translate("stock.fields.pricePerUnit2", { currency, unit })}
        rules={{
          required: translate("stock.errors.pricePerUnitIsRequired"),
        }}
      />
      {facility.displayTare && (
        <TextField
          control={control}
          name={`farmers.${i}.tare`}
          type="number"
          label={translate("stock.fields.tare2", { unit })}
          rules={{
            required: translate("stock.errors.tareIsRequired"),
            validate: (t) => t == null || gross == null || Number(t) <= gross || translate("stock.errors.tareCannotExceedTheQuantity"),
          }}
        />
      )}
      {facility.displayWeightDeductionDamage && (
        <TextField
          control={control}
          name={`farmers.${i}.damagedWeightDeduction`}
          type="number"
          label={translate("stock.fields.weightDeduction", { unit })}
        />
      )}
      {facility.displayPriceDeductionDamage && (
        <TextField
          control={control}
          name={`farmers.${i}.damagedPriceDeduction`}
          type="number"
          label={translate("stock.fields.priceDeduction", { currency, unit })}
          rules={{
            validate: (d) =>
              d == null || price == null || Number(d) <= price || translate("stock.errors.deductionCannotExceedThePrice"),
          }}
        />
      )}
      {facility.displayOrganic && (
        <SelectField
          control={control}
          name={`farmers.${i}.organic`}
          label={translate("stock.fields.organic")}
          options={YES_NO}
          rules={{
            required: translate("stock.errors.organicIsRequired"),
          }}
        />
      )}
      {facility.displayWomenOnly && (
        <SelectField
          control={control}
          name={`farmers.${i}.womenShare`}
          label={translate("stock.fields.womensOnly")}
          options={YES_NO}
          rules={{ required: translate("stock.errors.womensOnlyIsRequired") }}
        />
      )}
      <div className="flex items-end justify-between gap-2 text-xs text-muted-foreground sm:col-span-3">
        <span>
          {translate("stock.texts.netWeightBasePayment", { net: fmt(net), unit, cost: fmt(cost), currency })}
        </span>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 />
            {translate("stock.buttons.removeFarmer")}
          </Button>
        )}
      </div>
    </div>
  );
}
