import { useTranslate } from "@refinedev/core";
import { useEffect } from "react";
import { type Control, type FieldPath, useController, useWatch } from "react-hook-form";
import { DateField, SelectField, TextField } from "@/components/app/form-fields";
import { Section } from "@/components/app/page";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { type CoffeeForm, type OfferForm } from "./model";
import { CERTIFICATES, CURRENCIES, GRADES, INCOTERMS, PRICE_UNITS, PROCESSES, QUALITY, SPECIES, VARIETIES } from "./options";

export function CoffeeSection({ index: i, control }: { index: number; control: Control<OfferForm> }) {
  const translate = useTranslate();
  const c = (useWatch({ control, name: `coffees.${i}` }) ?? {}) as CoffeeForm;
  const p = <K extends string>(k: K) => `coffees.${i}.${k}` as FieldPath<OfferForm>;
  const req = { required: translate("common.errors.required") };
  const { field: segments } = useController({ control, name: `coffees.${i}.qualitySegments` });

  // A cupping score of 80+ means specialty coffee (isSpecialityCoffee).
  useEffect(() => {
    const value = (segments.value ?? []) as string[];
    if (Number(c.cuppingScore) >= 80 && !value.includes("Specialty")) segments.onChange([...value, "Specialty"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.cuppingScore]);

  const screenInvalid =
    c.minScreenSize != null && c.maxScreenSize != null && Number(c.minScreenSize) > Number(c.maxScreenSize);

  return (
    <Section
      title={c.name || translate("stock.beyco.titles.coffee", { value: i + 1 })}
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-3">
        <TextField
          control={control}
          name={p("name")}
          label={translate("common.fields.name")}
          rules={req}
        />
        <TextField
          control={control}
          name={p("quantity")}
          type="number"
          label={translate("common.fields.quantity")}
          rules={{ ...req, min: { value: 0, message: translate("common.errors.mustNotBeNegative") } }}
        />
        <TextField
          control={control}
          name={p("price")}
          type="number"
          label={translate("stock.beyco.fields.price")}
          rules={{ ...req, min: { value: 0, message: translate("common.errors.mustNotBeNegative") } }}
        />
        <SelectField
          control={control}
          name={p("currency")}
          label={translate("common.fields.currency")}
          options={CURRENCIES}
          rules={req}
        />
        <SelectField
          control={control}
          name={p("priceUnit")}
          label={translate("stock.beyco.fields.priceUnit")}
          options={PRICE_UNITS}
          rules={req}
        />
        <TextField
          control={control}
          name={p("region")}
          label={translate("stock.beyco.fields.region")}
        />
        <TextField
          control={control}
          name={p("country")}
          label={translate("common.fields.country")}
          rules={req}
        />
        <DateField
          control={control}
          name={p("harvestAt")}
          label={translate("stock.beyco.fields.harvestPeriod")}
          rules={req}
        />
        <SelectField
          control={control}
          name={p("incoterms")}
          label={translate("stock.beyco.fields.incoterms")}
          options={INCOTERMS}
          rules={req}
        />
        {c.incoterms === "Other" && (
          <TextField
            control={control}
            name={p("customIncoterms")}
            label={translate("stock.beyco.fields.otherIncoterms")}
            rules={req}
          />
        )}
        <SelectField
          control={control}
          name={p("species")}
          label={translate("stock.beyco.fields.species")}
          options={SPECIES}
          rules={req}
        />
        <SelectField
          control={control}
          name={p("process")}
          label={translate("stock.beyco.fields.process")}
          options={PROCESSES}
        />
        <TextField
          control={control}
          name={p("minScreenSize")}
          type="number"
          label={translate("stock.beyco.fields.minScreenSize")}
          rules={{ ...req, min: { value: 8, message: "8–20" }, max: { value: 20, message: "8–20" } }}
        />
        <TextField
          control={control}
          name={p("maxScreenSize")}
          type="number"
          label={translate("stock.beyco.fields.maxScreenSize")}
          rules={{ ...req, min: { value: 8, message: "8–20" }, max: { value: 20, message: "8–20" } }}
        />
        <TextField
          control={control}
          name={p("cuppingScore")}
          type="number"
          label={translate("stock.beyco.fields.cuppingScore")}
          rules={{ ...req, min: { value: 60, message: "60–100" }, max: { value: 100, message: "60–100" } }}
        />
      </FieldGroup>
      {screenInvalid && (
        <FieldError>{translate("stock.beyco.errors.minScreenSizeMustNot")}</FieldError>
      )}
      <ChipsField
        control={control}
        name={`coffees.${i}.varieties`}
        label={translate("stock.beyco.fields.varieties")}
        options={VARIETIES}
        required
      />
      {c.varieties?.includes("Other") && (
        <TextField
          control={control}
          name={p("customVariety")}
          label={translate("stock.beyco.fields.otherVariety")}
          rules={req}
        />
      )}
      <ChipsField
        control={control}
        name={`coffees.${i}.qualitySegments`}
        label={translate("stock.beyco.fields.qualitySegments")}
        options={QUALITY}
        required
      />
      <ChipsField
        control={control}
        name={`coffees.${i}.grades`}
        label={translate("stock.beyco.fields.grades")}
        options={GRADES}
        required
      />
      {c.grades?.includes("Other") && (
        <TextField
          control={control}
          name={p("additionalQualityDescriptors")}
          label={translate("stock.beyco.fields.otherGrade")}
          rules={req}
        />
      )}
      <ChipsField
        control={control}
        name={`coffees.${i}.certificates`}
        label={translate("stock.beyco.fields.certificates")}
        options={CERTIFICATES}
      />
    </Section>
  );
}

/** Multi-select as toggleable chips. */
function ChipsField({
  control,
  name,
  label,
  options,
  required,
}: {
  control: Control<OfferForm>;
  name: FieldPath<OfferForm>;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  const { field, fieldState } = useController({
    control,
    name,
    rules: required ? { validate: (v) => (Array.isArray(v) && v.length > 0) || `${label} are required` } : undefined,
  });
  const value = (field.value ?? []) as string[];
  return (
    <Field data-invalid={!!fieldState.error || undefined}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => field.onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}
