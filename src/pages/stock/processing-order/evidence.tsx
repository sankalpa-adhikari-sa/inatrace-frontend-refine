import { useTranslate } from "@refinedev/core";
import { Plus, Trash2 } from "lucide-react";
import { type Control, type FieldPath, useFieldArray } from "react-hook-form";
import type { ApiProcessingEvidenceField } from "@/client/types.gen";
import { DateField, EntityComboboxField, TextareaField, TextField, ReadOnlyField } from "@/components/app/form-fields";
import { UploadField } from "@/components/app/upload-field";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { type FormValues, NUMERIC_FIELDS } from "./model";

/** One processing evidence field, typed like StockProcessingOrderFieldsComponent. */
export function EvidenceField({
  control,
  name,
  field,
}: {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  field: ApiProcessingEvidenceField;
}) {
  const translate = useTranslate();
  const rules = {
    required: field.mandatory ? translate("stock.processingOrder.errors.fieldIsRequired") : false,
    validate:
      field.type === "INTEGER"
        ? (v: unknown) =>
            v == null ||
            v === "" ||
            Number.isInteger(Number(v)) ||
            translate("stock.processingOrder.errors.fieldMustBeAWhole")
        : undefined,
  };
  if (field.type === "TEXT") {
    return <TextareaField control={control} name={name} label={field.label} rules={rules} rows={2} />;
  }
  if (field.type === "DATE" || field.type === "TIMESTAMP") {
    return <DateField control={control} name={name} label={field.label} rules={rules} />;
  }
  return (
    <TextField
      control={control}
      name={name}
      label={field.label}
      type={NUMERIC_FIELDS.includes(field.type ?? "") ? "number" : "text"}
      rules={rules}
    />
  );
}

export function RequiredDocs({ control }: { control: Control<FormValues> }) {
  const translate = useTranslate();
  const { fields } = useFieldArray({ control, name: "requiredDocs", keyName: "key" });
  if (!fields.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {fields.map((f, i) => (
        <div key={f.key} className="grid gap-4 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_1fr_2fr] sm:items-end">
          <ReadOnlyField
            label={translate("common.fields.type")}
            value={`${f.label ?? ""}${f.mandatory ? " *" : ""}`}
          />
          <DateField
            control={control}
            name={`requiredDocs.${i}.date`}
            label={translate("common.fields.date")}
            rules={
              f.mandatory
                ? { required: translate("stock.processingOrder.errors.dateIsRequired") }
                : undefined
            }
          />
          <UploadField
            control={control}
            name={`requiredDocs.${i}.document`}
            label={translate("stock.processingOrder.fields.documentJpgPngPdf")}
            accept="image/png,image/jpeg,application/pdf"
            rules={
              f.mandatory
                ? {
                    required: translate("common.errors.documentIsRequired"),
                  }
                : undefined
            }
          />
        </div>
      ))}
    </div>
  );
}

/** Other evidence: any processing evidence type of kind DOCUMENT (ProcessingEvidenceTypeService 'DOCUMENT'). */
export function OtherDocs({ control }: { control: Control<FormValues> }) {
  const translate = useTranslate();
  const { fields, append, remove } = useFieldArray({ control, name: "otherDocs", keyName: "key" });
  const { data: types = [] } = useApi(
    ep.getProcessingEvidenceTypeList,
    { query: { requestType: "FETCH", limit: 1000 } },
    { select: (r) => (r?.items ?? []).filter((t) => t.type === "DOCUMENT") }
  );
  return (
    <div className="flex flex-col gap-3">
      <FieldLabel>
        {translate("stock.processingOrder.fields.otherEvidenceDocuments")}
      </FieldLabel>
      {fields.map((f, i) => (
        <div key={f.key} className="grid gap-4 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <EntityComboboxField
            control={control}
            name={`otherDocs.${i}.type`}
            label={translate("common.fields.type")}
            items={types}
            getLabel={(t) => t.label ?? ""}
            rules={{ required: translate("common.errors.typeIsRequired") }}
          />
          <DateField
            control={control}
            name={`otherDocs.${i}.formalCreationDate`}
            label={translate("common.fields.date")}
            rules={{ required: translate("stock.processingOrder.errors.dateIsRequired") }}
          />
          <UploadField
            control={control}
            name={`otherDocs.${i}.document`}
            label={translate("stock.processingOrder.fields.documentJpgPngPdf")}
            accept="image/png,image/jpeg,application/pdf"
            rules={{ required: translate("common.errors.documentIsRequired") }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={translate("buttons.remove")}
            onClick={() => remove(i)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append({ type: null })}>
        <Plus />
        {translate("stock.processingOrder.buttons.addDocument")}
      </Button>
    </div>
  );
}
