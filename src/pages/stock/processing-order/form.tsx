import { useNotification, useTranslate } from "@refinedev/core";
import { Plus } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import type { ApiFacility, ApiProcessingAction, ApiProcessingOrder, ApiStockOrder, ApiTransaction } from "@/client/types.gen";
import { DateField, TextareaField } from "@/components/app/form-fields";
import { FormActions, PageHeader, PageLoader, Section } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { ApiError } from "@/lib/api";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { fmt, toApiDate } from "../shared";
import { OtherDocs, RequiredDocs } from "./evidence";
import { InputSection } from "./input";
import {
  type ActionType,
  type FormValues,
  NO_STOCK_FILTERS,
  ReadOnly,
  type StockFilters,
  type Target,
  canClip,
  convertQuantity,
  evidenceToApi,
  fromOrder,
  newForm,
  newTarget,
  notAllOutputUsed,
  repackedMax,
  unitOf,
} from "./model";
import { OutputFields } from "./output";

const KEY = "productLabelStockProcessingOrderDetail";
const EMPTY: ApiFacility[] = [];

/**
 * `/my-stock/processing/:procActionId/facility/:inputFacilityId/new` and
 * `/my-stock/processing/update/:stockOrderId` (StockProcessingOrderDetailsComponent).
 */
export function ProcessingOrderForm() {
  const { procActionId, inputFacilityId, stockOrderId } = useParams();
  const editing = stockOrderId != null;

  const { data: stockOrder, isLoading: soLoading } = useApi(
    ep.getStockOrder,
    { path: { id: Number(stockOrderId) }, query: { withProcessingOrder: true } },
    { enabled: editing, select: (r) => r }
  );
  const processingOrder = stockOrder?.processingOrder;
  const actionId = editing ? processingOrder?.processingAction?.id : Number(procActionId);
  const { data: action, isLoading: actionLoading } = useApi(
    ep.getProcessingActionDetail,
    { path: { id: actionId ?? 0 } },
    { enabled: actionId != null, select: (r) => r }
  );

  if ((editing && soLoading) || actionLoading || !action) return <PageLoader />;
  return (
    <Form
      key={`${action.id}-${processingOrder?.id ?? "new"}`}
      action={action}
      order={processingOrder}
      inputFacilityId={inputFacilityId ? Number(inputFacilityId) : undefined}
    />
  );
}

/** Page titles (StockProcessingOrderDetailsComponent.updatePageTitle). */
function useTitle(type: ActionType, editing: boolean, fulfilling: boolean) {
  const translate = useTranslate();
  if (!editing) {
    if (type === "SHIPMENT") return translate("stock.processingOrder.titles.placeNewOrder");
    if (type === "TRANSFER") return translate("stock.processingOrder.titles.addTransferAction");
    if (type === "FINAL_PROCESSING") return translate("stock.processingOrder.titles.addFinalProcessingAction");
    return translate("stock.processingOrder.titles.addNewProcessingAction");
  }
  if (type === "SHIPMENT")
    return fulfilling
      ? translate("stock.processingOrder.titles.fulfillOrder")
      : translate("stock.processingOrder.titles.updateExistingOrder");
  if (type === "TRANSFER") return translate("stock.processingOrder.titles.updateTransferAction");
  if (type === "FINAL_PROCESSING") return translate("stock.processingOrder.titles.updateFinalProcessingAction");
  return translate("stock.processingOrder.titles.updateProcessingAction");
}

function Lockable({ locked, children }: { locked: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={locked} className="min-w-0 disabled:opacity-70">
      {children}
    </fieldset>
  );
}

function Form({
  action,
  order,
  inputFacilityId,
}: {
  action: ApiProcessingAction;
  order?: ApiProcessingOrder;
  inputFacilityId?: number;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const { user } = useIdentity();
  const { companyId } = useSelectedCompany();
  const type = action.type!;
  const editing = order != null;
  const shipment = type === "SHIPMENT";
  const evidenceFields = action.requiredEvidenceFields ?? [];
  const outputFinal =
    type === "FINAL_PROCESSING" || ((type === "TRANSFER" || shipment) && action.finalProductAction)
      ? action.outputFinalProduct ?? action.inputFinalProduct
      : undefined;
  const supportedIds = action.supportedFacilities?.map((f) => f.id) ?? [];

  const [keptTransactions, setKeptTransactions] = useState<ApiTransaction[]>(order?.inputTransactions ?? []);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [stockFilters, setStockFilters] = useState<StockFilters>(NO_STOCK_FILTERS);

  const { control, handleSubmit, setValue, getValues } = useForm<FormValues>({
    defaultValues: editing ? fromOrder(order, action) : newForm(action, outputFinal),
  });
  const targets = useFieldArray({ control, name: "targets", keyName: "key" });
  const inputFacility = useWatch({ control, name: "inputFacility" });
  const watchedTargets = (useWatch({ control, name: "targets" }) ?? []) as Target[];

  // Another company's part of an existing order is read-only (rightSideEnabled / leftSideEnabled).
  const firstTarget = order?.targetStockOrders?.[0];
  const outputLocked = editing && !!firstTarget?.facility?.company?.id && firstTarget.facility.company.id !== companyId;
  const inputLocked = editing && !!inputFacility?.company?.id && inputFacility.company.id !== companyId;
  const productOrderId = firstTarget?.productOrder?.orderId;
  const title = useTitle(type, editing, outputLocked);

  // ---- Input facility & available stock
  const productFilter = { semiProductId: action.inputSemiProduct?.id, finalProductId: action.inputFinalProduct?.id };
  const facilityQuery = {
    path: { id: companyId ?? 0 },
    query: { ...productFilter, requestType: "FETCH" as const, limit: 1000 },
  };
  const items = (r?: { items?: ApiFacility[] }) => r?.items ?? [];
  // Quote orders are placed on facilities of other companies that sell the input.
  const sellers = useApi(ep.listAvailableSellingFacilitiesForCompany, facilityQuery, {
    enabled: companyId != null && !editing && shipment,
    select: items,
  });
  // The backend also filters company facilities by semiProductId / finalProductId
  // (FacilityController), although the spec does not declare those params.
  const own = useApi(ep.listFacilitiesByCompany, facilityQuery as never, {
    enabled: companyId != null && !editing && !shipment,
    select: (r) => items(r).filter((f) => !supportedIds.length || supportedIds.includes(f.id)),
  });
  const inputFacilities = (shipment ? sellers.data : own.data) ?? EMPTY;

  useEffect(() => {
    if (editing) {
      const source = shipment ? order?.targetStockOrders?.[0]?.quoteFacility : order?.inputTransactions?.[0]?.sourceFacility;
      if (source && getValues("inputFacility")?.id !== source.id) setValue("inputFacility", source);
      return;
    }
    if (getValues("inputFacility") || !inputFacilities.length) return;
    const preset =
      inputFacilities.find((f) => f.id === inputFacilityId) ?? (inputFacilities.length === 1 ? inputFacilities[0] : null);
    if (preset) setValue("inputFacility", preset);
  }, [editing, inputFacilities, inputFacilityId, order, shipment, getValues, setValue]);

  const inputFacilityItems = useMemo(
    () => (editing && inputFacility ? [inputFacility] : inputFacilities),
    [editing, inputFacility, inputFacilities]
  );

  // Stock can only be picked from our own facility: placing a quote order uses another company's
  // facility (nothing to pick); fulfilling one uses ours (hideAvailableStock).
  const ownFacility = !!inputFacility && inputFacility.company?.id === companyId;
  const available = useApi(
    ep.getAvailableStockForStockUnitInFacility,
    {
      path: { facilityId: inputFacility?.id ?? 0 },
      query: {
        ...productFilter,
        requestType: "FETCH",
        limit: 500,
        internalLotName: stockFilters.lot || undefined,
        productionDateStart: stockFilters.from || undefined,
        productionDateEnd: stockFilters.to || undefined,
        isWomenShare: stockFilters.women === "" ? undefined : stockFilters.women === "true",
        organicOnly: stockFilters.organic === "" ? undefined : stockFilters.organic === "true",
      },
    },
    { enabled: !!inputFacility?.id && ownFacility, select: (r) => r?.items ?? [] }
  );
  const availableOrders = available.data ?? [];

  const selectedOrders = availableOrders.filter((o) => selected[o.id!] != null);
  const totalInput =
    keptTransactions.reduce((s, t) => s + (t.outputQuantity ?? t.inputQuantity ?? 0), 0) +
    selectedOrders.reduce((s, o) => s + (selected[o.id!] ?? 0), 0);
  const inputUnitType = action.inputSemiProduct?.measurementUnitType ?? action.inputFinalProduct?.measurementUnitType;
  const inputUnit = inputUnitType?.label ?? "";
  // Outputs may use another unit; total them in the input unit (calcTotalOutputQuantity).
  const totalOutput = watchedTargets.reduce(
    (s, t) => s + convertQuantity(Number(t.totalQuantity) || 0, unitOf(t), inputUnitType),
    0
  );

  // ---- Output facilities per product
  const { data: allFacilities = [] } = useApi(
    ep.listFacilitiesByCompany,
    { path: { id: companyId ?? 0 }, query: { requestType: "FETCH", limit: 1000 } },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );
  const facilitiesFor = (t: Target) =>
    allFacilities.filter(
      (f) =>
        (t.semiProduct ? f.facilitySemiProductList?.some((s) => s.id === t.semiProduct?.id) : true) &&
        (t.finalProduct ? f.facilityFinalProducts?.some((p) => p.id === t.finalProduct?.id) : true) &&
        (!shipment || !supportedIds.length || supportedIds.includes(f.id))
    );

  const [inputError, setInputError] = useState<string | null>(null);

  const save = useApiMutation({
    mutationFn: (body: ApiProcessingOrder) => call(ep.createOrUpdateProcessingOrder, { body }),
    onSuccess: () => navigate(-1),
    onError: (e) => {
      if (e instanceof ApiError) return;
      notify?.({
        type: "error",
        message: translate("stock.processingOrder.notifications.processingOrderCouldNotBe"),
        description: translate("stock.processingOrder.notifications.yourEntriesWereKeptPlease"),
      });
    },
  });

  function submit(v: FormValues) {
    if (!shipment && keptTransactions.length + selectedOrders.length === 0) {
      setInputError(translate("stock.processingOrder.errors.atLeastOneInputSemi"));
      return;
    }
    setInputError(null);
    // Sacs must hold the whole output quantity (saveProcessingOrder → notAllOutputQuantityIsUsed).
    if (v.targets.some((t) => notAllOutputUsed(action, t))) return;

    const productionDate = toApiDate(v.processingDate);
    const isProcessing = type === "PROCESSING" || type === "FINAL_PROCESSING" || type === "GENERATE_QR_CODE";

    const newTransactions: ApiTransaction[] = selectedOrders.map((o) => ({
      isProcessing,
      company: { id: companyId! },
      initiationUserId: user?.id,
      sourceStockOrder: o,
      status: "EXECUTED",
      inputQuantity: selected[o.id!],
      outputQuantity: selected[o.id!],
    }));

    const requiredEvidenceTypeValues = v.requiredDocs
      .filter((d) => d.document?.id)
      .map((d) => ({
        evidenceTypeId: d.evidenceTypeId,
        evidenceTypeCode: d.evidenceTypeCode,
        date: toApiDate(d.date),
        document: d.document,
      }));
    const otherEvidenceDocuments = v.otherDocs.map((d) => ({
      evidenceTypeId: d.type?.id,
      evidenceTypeCode: d.type?.code,
      date: toApiDate(d.formalCreationDate),
      document: d.document,
    }));

    const common = (t: Target): ApiStockOrder => ({
      creatorId: user?.id,
      orderType: shipment ? "GENERAL_ORDER" : type === "TRANSFER" ? "TRANSFER_ORDER" : "PROCESSING_ORDER",
      productionDate,
      facility: t.facility ?? undefined,
      semiProduct: t.semiProduct,
      finalProduct: t.finalProduct,
      measureUnitType: unitOf(t),
      internalLotNumber: t.internalLotNumber,
      requiredEvidenceTypeValues,
      otherEvidenceDocuments,
      requiredEvidenceFieldValues: evidenceToApi(evidenceFields, t.evidence),
      comments: v.comments || undefined,
      fulfilledQuantity: 0,
      availableQuantity: 0,
    });

    let targetStockOrders: ApiStockOrder[];
    if (type === "TRANSFER") {
      // One transfer order per selected input, named after the entered lot (prepareTransferTargetStockOrders).
      const t = v.targets[0];
      targetStockOrders = selectedOrders.map((o, i) => ({
        ...common(t),
        semiProduct: o.semiProduct,
        finalProduct: o.finalProduct,
        internalLotNumber: `${t.internalLotNumber}/${i + 1}`,
        productionDate: o.productionDate ?? productionDate,
        totalQuantity: o.availableQuantity,
      }));
    } else {
      targetStockOrders = v.targets.flatMap((t) => {
        if (repackedMax(action, t) && t.sacs.length) {
          const origin = t.repackedOriginStockOrderId ?? crypto.randomUUID();
          return t.sacs.map((s) => ({
            ...common(t),
            id: s.id,
            orderType: "PROCESSING_ORDER" as const,
            sacNumber: s.sacNumber ?? undefined,
            totalQuantity: s.totalQuantity ?? undefined,
            repackedOriginStockOrderId: origin,
          }));
        }
        return [
          {
            ...common(t),
            id: t.id,
            totalQuantity: t.totalQuantity ?? undefined,
            ...(shipment
              ? { quoteFacility: v.inputFacility ?? undefined, deliveryTime: toApiDate(t.deliveryTime), orderId: t.orderId }
              : {}),
          },
        ];
      });
    }

    save.mutate({
      id: order?.id,
      processingAction: action,
      initiatorUserId: order?.initiatorUserId ?? user?.id,
      processingDate: productionDate,
      inputTransactions: [...keptTransactions, ...newTransactions],
      targetStockOrders,
    });
  }

  const showQuantity = type !== "TRANSFER" && type !== "GENERATE_QR_CODE";

  const outputs = (
    <div className="flex flex-col gap-4">
      {targets.fields.map((f, i) => (
        <OutputFields
          key={f.key}
          index={i}
          control={control}
          action={action}
          type={type}
          facilities={facilitiesFor(watchedTargets[i] ?? f)}
          showQuantity={showQuantity}
          showOrderId={shipment && !productOrderId}
          onRemove={targets.fields.length > 1 ? () => targets.remove(i) : undefined}
        />
      ))}
      {type === "PROCESSING" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-end"
          onClick={() => targets.append(newTarget(action, outputFinal))}
        >
          <Plus />
          {translate("stock.processingOrder.buttons.addAdditionalOutput")}
        </Button>
      )}
    </div>
  );

  const input = (
    <InputSection
      control={control}
      type={type}
      editing={editing}
      facilities={inputFacilityItems}
      getFacilityLabel={(f) => `${f.name}${shipment && f.company?.name ? ` (${f.company.name})` : ""}`}
      kept={keptTransactions}
      onRemoveKept={(i) => setKeptTransactions((k) => k.filter((_, j) => j !== i))}
      showStock={ownFacility && !inputLocked}
      stock={{
        orders: availableOrders,
        loading: available.isLoading,
        error: available.isError,
        retry: () => void available.refetch(),
      }}
      selected={selected}
      setSelected={(s) => {
        // Without clipping, an input stock order is always used whole.
        if (!canClip(type)) {
          s = Object.fromEntries(
            Object.keys(s).map((id) => [id, availableOrders.find((o) => o.id === Number(id))?.availableQuantity ?? 0])
          );
        }
        setSelected(s);
      }}
      filters={stockFilters}
      setFilters={setStockFilters}
      unit={inputUnit}
      error={inputError}
    />
  );

  return (
    <>
      <PageHeader title={title} description={action.name} back />
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-6">
        <Section
          title={
            shipment
              ? translate("stock.processingOrder.titles.orderDetails")
              : translate("stock.processingOrder.titles.chooseActivityThatYouWant")
          }
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <ReadOnly label={translate("common.fields.processing")} value={action.name ?? ""} />
            {type === "GENERATE_QR_CODE" && action.qrCodeForFinalProduct && (
              <ReadOnly
                label={translate("stock.processingOrder.fields.qrCodeForFinalProduct")}
                value={`${action.qrCodeForFinalProduct.name} (${action.qrCodeForFinalProduct.product?.name ?? ""})`}
              />
            )}
            {shipment && editing && firstTarget?.facility?.company?.name && (
              <p className="self-center text-sm font-medium">{firstTarget.facility.company.name}</p>
            )}
            {shipment && productOrderId && (
              <p className="self-center text-sm">
                {translate("stock.processingOrder.fields.orderId2")} {productOrderId}
              </p>
            )}
            <Lockable locked={outputLocked}>
              <DateField
                control={control}
                name="processingDate"
                label={
                  shipment
                    ? translate("stock.processingOrder.fields.orderDate")
                    : translate("stock.processingOrder.fields.processingDate")
                }
                rules={{ required: translate("stock.processingOrder.errors.processingDateIsRequired") }}
              />
            </Lockable>
          </FieldGroup>
          {shipment && <Lockable locked={outputLocked}>{outputs}</Lockable>}
        </Section>

        <div className={shipment ? "flex flex-col gap-6" : "grid gap-6 xl:grid-cols-2"}>
          <Section
            title={
              shipment
                ? translate("stock.processingOrder.titles.supplierDetails")
                : translate("stock.processingOrder.titles.materialToBeRecorded")
            }
          >
            <Lockable locked={inputLocked}>{input}</Lockable>
          </Section>

          {!shipment && (
            <Section title={translate("stock.processingOrder.titles.outputsOfThisProcessing")}>
              <Lockable locked={outputLocked}>{outputs}</Lockable>
            </Section>
          )}
        </div>

        <Section title={translate("stock.processingOrder.titles.totalQuantities")}>
          <Lockable locked={outputLocked}>
            <TotalQuantities
              action={action}
              type={type}
              totalInput={totalInput}
              totalOutput={totalOutput}
              unit={inputUnit}
            />
            <TextareaField
              control={control}
              name="comments"
              label={translate("stock.processingOrder.fields.comments")}
              rows={2}
              className="mt-4"
            />
          </Lockable>
        </Section>

        <Section title={translate("stock.processingOrder.titles.processingEvidence")}>
          <RequiredDocs control={control} />
          <OtherDocs control={control} />
        </Section>

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

function TotalQuantities({
  action,
  type,
  totalInput,
  totalOutput,
  unit,
}: {
  action: ApiProcessingAction;
  type: ActionType;
  totalInput: number;
  totalOutput: number;
  unit: string;
}) {
  const translate = useTranslate();
  const shipment = type === "SHIPMENT";
  const withOutput = type !== "TRANSFER" && type !== "GENERATE_QR_CODE";
  const remaining = shipment ? totalOutput - totalInput : Math.max(0, totalInput - totalOutput);
  const tooLarge = !shipment && totalInput > 0 && totalOutput > totalInput;

  // Expected output: estimated yield per input unit, ±20 %, never more than the input.
  const estimate = type === "PROCESSING" ? action.estimatedOutputQuantityPerUnit : undefined;
  const expected = estimate && totalInput ? totalInput * estimate : null;
  const low = expected != null ? expected * 0.8 : null;
  const high = expected != null ? Math.min(expected * 1.2, totalInput) : null;
  const notInRange = low != null && high != null && totalOutput > 0 && (totalOutput < low || totalOutput > high);

  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      <ReadOnly
        label={
          shipment
            ? translate("stock.processingOrder.fields.quantityFulfilledBySupplierIn", { unit })
            : translate("stock.processingOrder.fields.inputQuantityIn", { unit })
        }
        value={totalInput ? totalInput.toFixed(2) : ""}
      />
      {withOutput && (
        <ReadOnly
          label={translate("stock.processingOrder.fields.remainingQuantityIn", { unit })}
          value={totalInput || totalOutput ? remaining.toFixed(2) : ""}
        />
      )}
      {withOutput && (
        <div className="flex flex-col gap-1">
          <ReadOnly
            label={
              shipment
                ? translate("stock.processingOrder.fields.totalOrderedQuantityIn", { unit })
                : translate("stock.processingOrder.fields.totalOutputQuantityIn", { unit })
            }
            value={totalOutput ? totalOutput.toFixed(2) : ""}
          />
          {tooLarge && (
            <FieldError>
              {translate("stock.processingOrder.errors.outputQuantityExceedsInputQuantity")}
            </FieldError>
          )}
          {notInRange && (
            <FieldError>
              {translate("stock.processingOrder.errors.outputQuantityNotInExpected")}
            </FieldError>
          )}
          {estimate && unit && (
            <FieldDescription>
              {translate("stock.processingOrder.descriptions.expectedOutputQuantityRange")}{" "}
              {low != null ? fmt(Number(low.toFixed(2))) : "/"} ~ {high != null ? fmt(Number(high.toFixed(2))) : "/"} ({unit})
            </FieldDescription>
          )}
        </div>
      )}
    </FieldGroup>
  );
}
