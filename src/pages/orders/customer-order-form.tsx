// Customer order (AddCustomerOrderComponent).
import { useTranslate } from "@refinedev/core";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Control, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import type { ApiProcessingAction, ApiProductOrder } from "@/client/types.gen";
import { CheckboxField, ComboboxField, EntitySelectField, TextField } from "@/components/app/form-fields";
import { FormActions, PageHeader, PageLoader, Section } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useEnabledCurrencies } from "@/hooks/use-lookups";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { toApiDate, today } from "../stock/shared";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { EMPTY_ITEM, type Item, itemLotName } from "./customer-order-model";

type CustomerOrderForm = Omit<ApiProductOrder, "deliveryDeadline" | "items"> & {
  deliveryDeadline: string;
  items: Item[];
};

/** `/my-orders/customer-order/add` */
export function CustomerOrderForm() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { companyId } = useSelectedCompany();
  const { user } = useIdentity();
  const query = { requestType: "FETCH" as const, limit: 1000 };

  const { data: customers = [] } = useApi(
    ep.getCompanyCustomersList,
    { path: { companyId: companyId ?? 0 }, query },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );
  const { data: facilities = [] } = useApi(
    ep.listFacilitiesByCompany,
    { path: { id: companyId ?? 0 }, query },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );
  const { data: actions = [] } = useApi(
    ep.listProcessingActionsByCompany,
    { path: { id: companyId ?? 0 }, query },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );

  const { control, handleSubmit, setValue, getValues } = useForm<CustomerOrderForm>({
    defaultValues: { deliveryDeadline: "", requiredOrganic: false, requiredWomensOnly: false, items: [] },
  });
  const items = useFieldArray({ control, name: "items", keyName: "key" });
  const facility = useWatch({ control, name: "facility" });
  const orderId = useWatch({ control, name: "orderId" });
  const [itemsError, setItemsError] = useState(false);

  // Items depend on the "Order to" facility, so a different facility starts the list over.
  const facilityId = facility?.id;
  const lastFacilityId = useRef(facilityId);
  useEffect(() => {
    if (lastFacilityId.current !== facilityId && getValues("items").length) setValue("items", []);
    lastFacilityId.current = facilityId;
  }, [facilityId, getValues, setValue]);

  // Final product quote actions whose final product the "Order to" facility holds
  // (CompanyFinalProductQuoteOrderActionsService).
  const finalActions = actions.filter(
    (a) =>
      a.type === "SHIPMENT" &&
      !!a.inputFinalProduct &&
      !!facility?.facilityFinalProducts?.some((fp) => fp.id === a.inputFinalProduct?.id)
  );

  const save = useApiMutation({
    mutationFn: (v: CustomerOrderForm) => {
      const deliveryDeadline = toApiDate(v.deliveryDeadline);
      const productionDate = toApiDate(today());
      const order: ApiProductOrder = {
        ...v,
        deliveryDeadline,
        items: v.items.map((it) => {
          const finalProduct = it.action!.inputFinalProduct!;
          return {
            creatorId: user?.id,
            deliveryTime: deliveryDeadline,
            consumerCompanyCustomer: v.customer,
            finalProduct,
            facility: v.facility,
            quoteFacility: it.quoteFacility ?? undefined,
            totalQuantity: it.totalQuantity ?? undefined,
            currencyForEndCustomer: it.currencyForEndCustomer ?? undefined,
            pricePerUnitForEndCustomer: it.pricePerUnitForEndCustomer ?? undefined,
            fulfilledQuantity: 0,
            availableQuantity: 0,
            productionDate,
            orderType: "GENERAL_ORDER",
            internalLotNumber: itemLotName(v.orderId, it),
            processingOrder: { processingAction: it.action!, initiatorUserId: user?.id, inputTransactions: [] },
          };
        }),
      };
      return call(ep.createProductOrder, { body: order });
    },
    onSuccess: () => navigate("/my-orders/placed-orders"),
  });

  function submit(v: CustomerOrderForm) {
    // At least one order item (MinLengthArrayValidator(1)).
    if (!v.items.length) {
      setItemsError(true);
      return;
    }
    setItemsError(false);
    save.mutate(v);
  }

  if (companyId == null) return <PageLoader />;

  return (
    <>
      <PageHeader title={translate("orders.titles.newOrder")} back="/my-orders/placed-orders" />
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-6">
        <Section>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="orderId"
              label={translate("orders.fields.orderId")}
              placeholder={translate("orders.placeholders.enterId")}
              rules={{
                required: translate("orders.errors.orderIdIsRequired"),
              }}
            />
            <EntitySelectField
              control={control}
              name="customer"
              label={translate("orders.fields.customer")}
              items={customers}
              getLabel={(c) => c.name ?? ""}
              rules={{
                required: translate("orders.errors.customerIsRequired"),
              }}
            />
            <EntitySelectField
              control={control}
              name="facility"
              label={translate("orders.fields.orderTo")}
              items={facilities}
              getLabel={(f) => f.name ?? ""}
              rules={{
                required: translate("orders.errors.outputFacilityIsRequired"),
              }}
            />
            <TextField
              control={control}
              name="deliveryDeadline"
              type="date"
              label={translate("orders.fields.latestDateOfDelivery")}
              rules={{
                required: translate("orders.errors.latestDeliveryDateIsRequired"),
              }}
            />
            <CheckboxField
              control={control}
              name="requiredWomensOnly"
              label={translate("orders.fields.womensOnly")}
            />
            <CheckboxField
              control={control}
              name="requiredOrganic"
              label={translate("orders.fields.organicOnly")}
            />
          </FieldGroup>
        </Section>
        {facility && orderId && (
          <Section
            title={translate("orders.titles.listOfOrderItems")}
            actions={
              <Button type="button" variant="outline" size="sm" onClick={() => items.append(EMPTY_ITEM)}>
                <Plus />
                {translate("orders.buttons.addOrderItem")}
              </Button>
            }
          >
            {items.fields.map((f, i) => (
              <OrderItem
                key={f.key}
                index={i}
                control={control}
                actions={finalActions}
                companyId={companyId}
                orderId={orderId}
                onRemove={() => items.remove(i)}
              />
            ))}
            {itemsError && items.fields.length === 0 && (
              <FieldError>{translate("orders.errors.atLeastOneOrderItem")}</FieldError>
            )}
          </Section>
        )}
        <FormActions>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            {translate("buttons.cancel")}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {translate("buttons.save")}
          </Button>
        </FormActions>
      </form>
    </>
  );
}

function OrderItem({
  index: i,
  control,
  actions,
  companyId,
  orderId,
  onRemove,
}: {
  index: number;
  control: Control<CustomerOrderForm>;
  actions: ApiProcessingAction[];
  companyId: number;
  orderId?: string;
  onRemove: () => void;
}) {
  const translate = useTranslate();
  const currencies = useEnabledCurrencies();
  const item = (useWatch({ control, name: `items.${i}` }) ?? EMPTY_ITEM) as Item;
  const action = item.action;
  const finalProduct = action?.inputFinalProduct;
  const unit = (action?.outputFinalProduct ?? finalProduct)?.measurementUnitType?.label;
  const currency = item.currencyForEndCustomer || "-";
  const { data: sellers = [] } = useApi(
    ep.listAvailableSellingFacilitiesForCompany,
    {
      path: { id: companyId },
      query: { finalProductId: finalProduct?.id, requestType: "FETCH", limit: 1000 },
    },
    { enabled: !!finalProduct?.id, select: (r) => r?.items ?? [] }
  );
  return (
    <div className="flex flex-col gap-3 border-b pb-4 last:border-b-0 last:pb-0">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <EntitySelectField
          control={control}
          name={`items.${i}.action`}
          label={translate("orders.fields.finalProduct")}
          items={actions}
          getLabel={(a) => `${a.inputFinalProduct?.name ?? ""} (${a.name ?? ""})`}
          rules={{ required: translate("orders.errors.finalProductIsRequired") }}
        />
        <EntitySelectField
          control={control}
          name={`items.${i}.quoteFacility`}
          label={translate("orders.fields.orderFrom")}
          items={sellers}
          getLabel={(f) => `${f.name}${f.company?.name ? ` (${f.company.name})` : ""}`}
          rules={{ required: translate("orders.errors.inputFacilityIsRequired") }}
        />
        <TextField
          control={control}
          name={`items.${i}.totalQuantity`}
          type="number"
          readOnly={!action}
          label={
            unit
              ? `${translate("orders.fields.quantityIn")} ${unit}`
              : translate("common.fields.quantity")
          }
          placeholder={translate("orders.placeholders.enterQuantity")}
          rules={{ required: translate("common.errors.quantityIsRequired") }}
        />
        <Field>
          <FieldLabel>{translate("orders.fields.internalLotName")}</FieldLabel>
          <Input disabled value={itemLotName(orderId, item)} />
        </Field>
        <ComboboxField
          control={control}
          name={`items.${i}.currencyForEndCustomer`}
          label={translate("orders.fields.currencyForEndCustomer")}
          options={currencies.map((c) => ({ value: c.code!, label: c.code! }))}
          rules={{
            required: translate("orders.errors.currencyForEndCustomerIs"),
          }}
        />
        <TextField
          control={control}
          name={`items.${i}.pricePerUnitForEndCustomer`}
          type="number"
          readOnly={!item.currencyForEndCustomer}
          label={`${translate("orders.fields.grossPricePerItemAt")} (${currency})`}
          placeholder={`${translate("orders.placeholders.enterPriceIn")} ${currency}`}
          rules={{ required: translate("orders.errors.priceIsRequired") }}
        />
      </FieldGroup>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="self-end"
        aria-label={translate("buttons.remove")}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
