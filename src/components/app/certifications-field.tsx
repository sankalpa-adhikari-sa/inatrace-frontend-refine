import { useTranslate } from "@refinedev/core";
import { Plus, Trash2 } from "lucide-react";
import {
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldValues,
  type Path,
  useFieldArray,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField, TextareaField } from "./form-fields";
import { UploadField } from "./upload-field";

const CERTIFICATION_TYPES = ["EU_ORGANIC", "RAINFOREST_ALLIANCE", "CARBON_NEUTRAL", "FAIRTRADE"] as const;
const CERTIFICATE_FILES = "application/pdf,image/png,image/jpeg,image/jpg";


export function CertificationsField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: ArrayPath<T>;
}) {
  const translate = useTranslate();
  const { fields, append, remove } = useFieldArray({ control, name, keyName: "key" });
  const p = (i: number, field: string) => `${name}.${i}.${field}` as Path<T>;
  const types = CERTIFICATION_TYPES.map((v) => ({
    value: v,
    label: {
      EU_ORGANIC: translate("common.texts.euOrganic"),
      RAINFOREST_ALLIANCE: translate("common.texts.rainforestAlliance"),
      CARBON_NEUTRAL: translate("common.texts.carbonNeutral"),
      FAIRTRADE: translate("common.texts.fairtrade"),
    }[v],
  }));
  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && <p className="text-xs text-muted-foreground">{translate("common.texts.noCertifications")}</p>}
      {fields.map((f, i) => (
        <div key={f.key} className="grid gap-4 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-2">
          <SelectField
            control={control}
            name={p(i, "type")}
            label={translate("common.fields.type")}
            options={types}
          />
          <TextField
            control={control}
            name={p(i, "validity")}
            type="date"
            label={translate("common.fields.validityDate")}
          />
          <TextareaField
            control={control}
            name={p(i, "description")}
            label={translate("common.fields.description")}
            description={translate("common.descriptions.listAndBrieflyDescribeThe")}
            rows={2}
            className="sm:col-span-2"
            rules={{ required: translate("common.errors.descriptionIsRequired") }}
          />
          <UploadField
            control={control}
            name={p(i, "certificate")}
            label={translate("common.fields.certificateOrStandardPdf")}
            description={translate("common.descriptions.withEveryCertificateOrStandard")}
            accept={CERTIFICATE_FILES}
            className="sm:col-span-2"
            rules={{
              validate: (d) =>
                !!(d as { storageKey?: string } | null)?.storageKey ||
                translate("common.errors.documentIsRequired").trim(),
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-self-end sm:col-span-2"
            onClick={() => remove(i)}
          >
            <Trash2 />
            {translate("buttons.remove")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append({} as FieldArray<T, ArrayPath<T>>)}
      >
        <Plus />
        {translate("buttons.addCertification")}
      </Button>
    </div>
  );
}
