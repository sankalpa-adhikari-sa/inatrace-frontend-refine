import { useTranslate } from "@refinedev/core";
import { Plus, Trash2 } from "lucide-react";
import { type Control, useFieldArray, useWatch } from "react-hook-form";
import type { ApiFacility, ApiProcessingAction } from "@/client/types.gen";
import { DateField, EntitySelectField, TextField, ReadOnlyField } from "@/components/app/form-fields";
import { RepeaterItem } from "@/components/app/repeater-item";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { fmt } from "../shared";
import { EvidenceField } from "./evidence";
import {
  type ActionType,
  type FormValues,
  type Sac,
  type Target,
  notAllOutputUsed,
  repackedMax,
  unitOf,
} from "./model";

const KEY = "productLabelStockProcessingOrderDetail";

export function OutputFields({
  index: i,
  control,
  action,
  type,
  facilities,
  showQuantity,
  showOrderId,
  numbered,
  onRemove,
}: {
  index: number;
  control: Control<FormValues>;
  action: ApiProcessingAction;
  type: ActionType;
  facilities: ApiFacility[];
  showQuantity: boolean;
  /** Quote orders without a product order take a free order ID. */
  showOrderId: boolean;
  /** Head the output "Output n" (when the order has more than one). */
  numbered?: boolean;
  onRemove?: () => void;
}) {
  const translate = useTranslate();
  const t = (useWatch({ control, name: `targets.${i}` }) ?? {}) as Target;
  const sacs = useFieldArray({ control, name: `targets.${i}.sacs`, keyName: "key" });
  const max = repackedMax(action, t);
  const unit = unitOf(t)?.label ?? "";
  const sacTotal = (t.sacs ?? []).reduce((s, x) => s + (Number(x.totalQuantity) || 0), 0);
  const fields = action.requiredEvidenceFields ?? [];

  // Pre-split the output into sacs of at most `max` (prefillRepackedOutputSOQuantities).
  function prefillSacs() {
    const total = Number(t.totalQuantity) || 0;
    if (!max || !total) return;
    const next: Sac[] = [];
    for (let left = total, n = 1; left > 0; left -= max, n++) {
      next.push({ sacNumber: n, totalQuantity: Number(Math.min(left, max).toFixed(2)) });
    }
    sacs.replace(next);
  }

  const body = (
    <>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {t.finalProduct ? (
          <ReadOnlyField
            label={translate("stock.processingOrder.fields.finalProductType")}
            value={`${t.finalProduct.name} (${t.finalProduct.product?.name ?? ""})`}
          />
        ) : (
          <EntitySelectField
            control={control}
            name={`targets.${i}.semiProduct`}
            label={translate("stock.processingOrder.fields.semiProductType")}
            items={
              type === "TRANSFER" || type === "SHIPMENT"
                ? [action.inputSemiProduct!].filter(Boolean)
                : action.outputSemiProducts ?? []
            }
            getLabel={(s) => s.name ?? ""}
            rules={
              type === "FINAL_PROCESSING"
                ? undefined
                : { required: translate("stock.processingOrder.errors.outputSemiProductIsRequired") }
            }
          />
        )}
        {(t.finalProduct || t.semiProduct) && (
          <EntitySelectField
            control={control}
            name={`targets.${i}.facility`}
            label={translate("common.fields.facility")}
            items={facilities}
            getLabel={(f) => f.name ?? ""}
            rules={{ required: translate("stock.processingOrder.errors.outputFacilityIsRequired") }}
          />
        )}
        {showOrderId && (
          <TextField
            control={control}
            name={`targets.${i}.orderId`}
            label={translate("stock.processingOrder.fields.orderId")}
            placeholder={translate("stock.processingOrder.placeholders.enterTheOrderId")}
          />
        )}
        {action.prefix && (
          <ReadOnlyField label={translate("stock.processingOrder.fields.prefix")} value={action.prefix} />
        )}
        <TextField
          control={control}
          name={`targets.${i}.internalLotNumber`}
          label={translate("stock.processingOrder.fields.internalLotName")}
          placeholder={translate("stock.processingOrder.placeholders.enterInternalLotName")}
          rules={{ required: translate("stock.processingOrder.errors.internalLotNameIsRequired") }}
        />
        {showQuantity && (
          <TextField
            control={control}
            name={`targets.${i}.totalQuantity`}
            type="number"
            label={`${
              type === "SHIPMENT"
                ? translate("stock.processingOrder.fields.orderedQuantityIn")
                : translate("stock.processingOrder.fields.outputQuantityIn")
            } ${unit || "-"}`}
            placeholder={translate("stock.processingOrder.placeholders.enterQuantity")}
            rules={{
              required:
                type === "SHIPMENT"
                  ? translate("stock.processingOrder.errors.enterTheDesiredOutputQuantity")
                  : translate("common.errors.quantityIsRequired"),
              min: { value: 0, message: translate("common.errors.mustNotBeNegative") },
            }}
          />
        )}
        {type === "SHIPMENT" && (
          <DateField
            control={control}
            name={`targets.${i}.deliveryTime`}
            label={translate("stock.processingOrder.fields.preferredDeliveryDate")}
            rules={{
              required: translate("stock.processingOrder.errors.preferredDeliveryDateIsRequired"),
            }}
          />
        )}
        {fields.map((f) => (
          <EvidenceField key={f.id} control={control} name={`targets.${i}.evidence.${f.fieldName}`} field={f} />
        ))}
      </FieldGroup>

      {max != null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FieldLabel>{translate("stock.processingOrder.fields.outputs")}</FieldLabel>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" onClick={prefillSacs}>
                {translate("stock.processingOrder.buttons.prefill")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const last = t.sacs?.at(-1)?.sacNumber;
                  sacs.append({ sacNumber: last ? last + 1 : null, totalQuantity: null });
                }}
              >
                <Plus />
                {translate("stock.processingOrder.buttons.addSac")}
              </Button>
            </div>
          </div>
          {sacs.fields.map((s, j) => (
            <div key={s.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <TextField
                control={control}
                name={`targets.${i}.sacs.${j}.sacNumber`}
                type="number"
                label={translate("stock.processingOrder.fields.sacNumber")}
                rules={{ required: translate("stock.processingOrder.errors.sacNumberIsRequired") }}
              />
              <TextField
                control={control}
                name={`targets.${i}.sacs.${j}.totalQuantity`}
                type="number"
                label={translate("stock.processingOrder.fields.quantityMax", { max: fmt(max), unit })}
                rules={{
                  required: translate("common.errors.quantityIsRequired"),
                  max: { value: max, message: translate("stock.processingOrder.errors.inputExceedsTheMaxValue") },
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={translate("buttons.remove")}
                onClick={() => sacs.remove(j)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {notAllOutputUsed(action, t) && (
            <FieldError data-invalid>
              {translate("stock.processingOrder.errors.enteredOutputQuantityIsNot")}{" "}
              ({fmt(sacTotal)} / {fmt(Number(t.totalQuantity))})
            </FieldError>
          )}
        </div>
      )}

    </>
  );
  // With several outputs each gets a numbered, removable frame; a single one stays plain.
  return numbered ? (
    <RepeaterItem title={translate("stock.processingOrder.titles.outputNumber", { number: i + 1 })} onRemove={onRemove}>
      {body}
    </RepeaterItem>
  ) : (
    <div className="flex flex-col gap-4">{body}</div>
  );
}
