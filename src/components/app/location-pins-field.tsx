import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldValues,
  type Path,
  useController,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import type { ApiLocation } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { FormFieldLabel, TextField } from "./form-fields";
import { MapView } from "./map-view";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

/**
 * List of `ApiLocation` pins (pin name, number of farmers, coordinates):
 * click the map to drop a pin, drag pins to move them.
 */
export function LocationPinsField<T extends FieldValues>({
  control,
  name,
  label = t("common.texts.originLocations"),
  description,
  required,
  actions,
  pinNameLabel,
  farmersLabel,
  resetLabel,
}: {
  control: Control<T>;
  name: ArrayPath<T>;
  label?: ReactNode;
  description?: ReactNode;
  /** Error message shown when the list is empty. */
  required?: string;
  actions?: ReactNode;
  pinNameLabel?: string;
  farmersLabel?: string;
  resetLabel?: string;
}) {
  const translate = useTranslate();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name,
    keyName: "key",
    rules: required ? { validate: (v) => (Array.isArray(v) && v.length > 0) || required } : undefined,
  });
  const { field, fieldState } = useController({ control, name: name as Path<T> });
  const editable = !field.disabled;
  const p = (i: number, field: string) => `${name}.${i}.${field}` as Path<T>;
  const values = (useWatch({ control, name: name as Path<T> }) ?? []) as ApiLocation[];
  // Fit the camera to loaded or replaced pins (e.g. "prefill from product"),
  // but not after pins placed or moved on the map.
  const [fitKey, setFitKey] = useState(0);
  const fromMap = useRef(false);
  useEffect(() => {
    if (fromMap.current) fromMap.current = false;
    else setFitKey((k) => k + 1);
  }, [values.length]);
  const round = (v: number) => Number(v.toFixed(6));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormFieldLabel required={required}>{label}</FormFieldLabel>
        <div className="flex items-center gap-2">
          {actions}
          {resetLabel && values.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setFitKey((k) => k + 1)}>
              {resetLabel}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {description ??
          translate("common.texts.clickTheMapToMark")}
      </p>
      <MapView
        fitKey={fitKey}
        onMapClick={
          editable
            ? (pt) => {
                fromMap.current = true;
                append({ latitude: round(pt.lat), longitude: round(pt.lng) } as FieldArray<T, ArrayPath<T>>);
              }
            : undefined
        }
        markers={values.map((loc, i) => ({
          id: fields[i]?.key ?? i,
          lat: Number(loc?.latitude),
          lng: Number(loc?.longitude),
          label: loc?.numberOfFarmers != null ? String(loc.numberOfFarmers) : String(i + 1),
          draggable: editable,
          onDragEnd: (pt) =>
            update(i, { ...loc, latitude: round(pt.lat), longitude: round(pt.lng) } as FieldArray<T, ArrayPath<T>>),
          popup: loc?.pinName || undefined,
        }))}
      />
      {fields.map((f, i) => (
        <div key={f.key} className="grid gap-3 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
          <TextField
            control={control}
            name={p(i, "pinName")}
            label={pinNameLabel ?? translate("common.fields.pinName")}
            // ApiLocation.pinName is limited to 255 characters.
            rules={{ maxLength: { value: 255, message: translate("common.errors.atMost255Characters") } }}
          />
          <TextField
            control={control}
            name={p(i, "numberOfFarmers")}
            type="number"
            label={farmersLabel ?? translate("common.fields.ofFarmers")}
          />
          <TextField
            control={control}
            name={p(i, "latitude")}
            type="number"
            label={translate("common.fields.latitude")}
            rules={{ required: translate("common.errors.required") }}
          />
          <TextField
            control={control}
            name={p(i, "longitude")}
            type="number"
            label={translate("common.fields.longitude")}
            rules={{ required: translate("common.errors.required") }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={translate("buttons.removeLocation")}
            onClick={() => remove(i)}
          >
            <Trash2 />
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
        {translate("buttons.addLocation")}
      </Button>
      {fieldState.error?.root?.message && <p className="text-xs text-destructive">{fieldState.error.root.message}</p>}
    </div>
  );
}
