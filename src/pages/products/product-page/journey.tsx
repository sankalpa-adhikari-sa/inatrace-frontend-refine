import { useTranslate } from "@refinedev/core";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type Control, useController, useFieldArray, useWatch } from "react-hook-form";
import { TextField } from "@/components/app/form-fields";
import { MapView } from "@/components/app/map-view";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { type FormValues } from "./model";

export function JourneyMarkers({ control }: { control: Control<FormValues> }) {
  const translate = useTranslate();
  const { fields, append, remove, swap, update } = useFieldArray({ control, name: "journeyMarkers", keyName: "key" });
  const { field } = useController({ control, name: "journeyMarkers" });
  const points = (useWatch({ control, name: "journeyMarkers" }) ?? []).map((m) => ({
    lat: Number(m?.latitude),
    lng: Number(m?.longitude),
  }));
  const editable = !field.disabled;
  const round = (v: number) => Number(v.toFixed(6));
  // Fit once to the saved route.
  const [fitKey, setFitKey] = useState<number>();
  useEffect(() => {
    if (fitKey === undefined && points.length > 0) setFitKey(1);
  }, [fitKey, points.length]);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{translate("products.productPage.fields.productJourney")}</FieldLabel>
      <p className="text-xs text-muted-foreground">
        {translate("products.productPage.texts.theRouteOfTheProduct")}
      </p>
      <MapView
        fitKey={fitKey}
        lines={[{ id: "journey", points, dashed: true }]}
        markers={points.map((pt, i) => ({
          id: fields[i]?.key ?? i,
          ...pt,
          label: String(i + 1),
          draggable: editable,
          onDragEnd: (to) => update(i, { latitude: round(to.lat), longitude: round(to.lng) }),
        }))}
        onMapClick={editable ? (pt) => append({ latitude: round(pt.lat), longitude: round(pt.lng) }) : undefined}
      />
      {fields.map((f, i) => (
        <div key={f.key} className="grid grid-cols-[2rem_1fr_1fr_auto] items-end gap-3">
          <span className="pb-2 text-xs text-muted-foreground">{i + 1}.</span>
          <TextField
            control={control}
            name={`journeyMarkers.${i}.latitude`}
            type="number"
            label={translate("products.productPage.fields.latitude")}
          />
          <TextField
            control={control}
            name={`journeyMarkers.${i}.longitude`}
            type="number"
            label={translate("products.productPage.fields.longitude")}
          />
          <div className="flex">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={translate("products.productPage.buttons.moveUp")}
              disabled={i === 0}
              onClick={() => swap(i, i - 1)}
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={translate("products.productPage.buttons.moveDown")}
              disabled={i === fields.length - 1}
              onClick={() => swap(i, i + 1)}
            >
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={translate("products.productPage.buttons.removePoint")}
              onClick={() => remove(i)}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append({})}>
        <Plus />
        {translate("products.productPage.buttons.addJourneyPoint")}
      </Button>
    </div>
  );
}
