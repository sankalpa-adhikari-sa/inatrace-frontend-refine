import { useEffect, useState } from "react";
import { type Control, type FieldValues, type Path, useController, useWatch } from "react-hook-form";
import type { ApiCountry } from "@/client/types.gen";
import { useCountries } from "@/hooks/use-lookups";
import { EntityComboboxField, SelectField, TextField } from "./form-fields";
import { type MapPoint, MapView } from "./map-view";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

const YES_NO = [
  { value: "true", get label() { return t("common.fields.yes"); } },
  { value: "false", get label() { return t("common.fields.no"); } },
];

/**
 * Address + map pin. `prefix` points at an object with `address`,
 * `latitude`, `longitude` and `publiclyVisible` (e.g. "facilityLocation").
 *
 * - `facility` ports location-form-new: Rwanda (or no country yet) uses
 *   village/cell/sector, everything else a street address.
 * - `person` ports the older location-form used for farmers and collectors,
 *   which also has Honduras-specific fields.
 *
 * The pin is picked on the map or typed in.
 */
export function LocationFields<T extends FieldValues>({
  control,
  prefix,
  variant = "facility",
  showVisibility = true,
  showPin = true,
  flat = false,
}: {
  control: Control<T>;
  prefix: string;
  variant?: "facility" | "person";
  showVisibility?: boolean;
  /** Show the latitude / longitude inputs (off for plain addresses). */
  showPin?: boolean;
  /** Address fields sit directly under `prefix` (ApiGeoAddress) instead of `prefix.address`. */
  flat?: boolean;
}) {
  const translate = useTranslate();
  const countries = useCountries();
  const p = (field: string) => `${prefix}.${flat ? field.replace(/^address\./, "") : field}` as Path<T>;
  const country = useWatch({ control, name: p("address.country") }) as ApiCountry | null | undefined;
  const visible = useWatch({ control, name: p("publiclyVisible") }) as unknown;
  const pinRequired = String(visible) === "true";

  const rwanda = variant === "facility" ? !country || country.code === "RW" : country?.code === "RW";
  const honduras = variant === "person" && country?.code === "HN";
  const required = (label: string) => ({
    required: translate("common.errors.isRequired", { label }),
  });
  // Village / cell / sector are required on people's addresses (location-form) but not on
  // facilities (location-form-new).
  const personRequired = (label: string) => (variant === "person" ? required(label) : undefined);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Searchable: the country list is long. */}
      <EntityComboboxField
        control={control}
        name={p("address.country")}
        label={translate("common.fields.country")}
        items={countries}
        getLabel={(c) => c.name}
        rules={required(translate("common.fields.country"))}
        className="sm:col-span-2"
      />
      {rwanda && (
        <>
          <TextField
            control={control}
            name={p("address.village")}
            label={translate("common.fields.village")}
            rules={personRequired(translate("common.fields.village"))}
          />
          <TextField
            control={control}
            name={p("address.cell")}
            label={translate("common.fields.cell")}
            rules={personRequired(translate("common.fields.cell"))}
          />
          <TextField
            control={control}
            name={p("address.sector")}
            label={translate("common.fields.sector")}
            rules={personRequired(translate("common.fields.sector"))}
          />
        </>
      )}
      {honduras && (
        <>
          <TextField
            control={control}
            name={p("address.hondurasFarm")}
            label={translate("common.fields.farm")}
          />
          <TextField
            control={control}
            name={p("address.hondurasVillage")}
            label={translate("common.fields.village")}
            rules={required(translate("common.fields.village"))}
          />
          <TextField
            control={control}
            name={p("address.hondurasMunicipality")}
            label={translate("common.fields.municipality")}
            rules={required(translate("common.fields.municipality"))}
          />
          <TextField
            control={control}
            name={p("address.hondurasDepartment")}
            label={translate("common.fields.department")}
            rules={required(translate("common.fields.department"))}
          />
        </>
      )}
      {!rwanda && !honduras && (
        <>
          <TextField
            control={control}
            name={p("address.address")}
            label={translate("common.fields.streetAddress")}
            className="sm:col-span-2"
          />
          <TextField
            control={control}
            name={p("address.city")}
            label={
              variant === "person"
                ? translate("common.fields.cityTownVillage")
                : translate("common.fields.city")
            }
            rules={variant === "person" ? required(translate("common.fields.city")) : undefined}
          />
          <TextField
            control={control}
            name={p("address.state")}
            label={translate("common.fields.stateProvinceRegion")}
            rules={variant === "person" ? required(translate("common.fields.state")) : undefined}
          />
          <TextField
            control={control}
            name={p("address.zip")}
            label={translate("common.fields.zipPostalCodePO")}
            rules={{ maxLength: { value: 50, message: translate("common.errors.atMost50Characters") } }}
          />
          {variant === "person" && (
            <TextField
              control={control}
              name={p("address.otherAddress")}
              label={translate("common.fields.additionalOtherAddress")}
              rules={{ maxLength: { value: 1000, message: translate("common.errors.atMost1000Characters") } }}
            />
          )}
        </>
      )}
      {showVisibility && (
        <SelectField
          control={control}
          name={p("publiclyVisible")}
          rules={variant === "facility" ? { required: translate("common.errors.thisFieldIsRequired") } : undefined}
          label={translate("common.fields.isLocationPubliclyVisibleOn")}
          options={YES_NO}
          className="sm:col-span-2"
        />
      )}
      {showPin && (
        <>
          <TextField
            control={control}
            name={p("latitude")}
            type="number"
            label={translate("common.fields.mapPinLatitude")}
            rules={
              pinRequired ? { required: translate("common.errors.mapPinIsRequiredFor") } : undefined
            }
          />
          <TextField
            control={control}
            name={p("longitude")}
            type="number"
            label={translate("common.fields.mapPinLongitude")}
            rules={
              pinRequired ? { required: translate("common.errors.mapPinIsRequiredFor") } : undefined
            }
          />
          <PinMap control={control} lat={p("latitude")} lng={p("longitude")} />
        </>
      )}
    </div>
  );
}

/** Click the map (or drag the pin) to set the coordinates. */
function PinMap<T extends FieldValues>({ control, lat, lng }: { control: Control<T>; lat: Path<T>; lng: Path<T> }) {
  const translate = useTranslate();
  const { field: latField } = useController({ control, name: lat });
  const { field: lngField } = useController({ control, name: lng });
  const pin = { lat: Number(latField.value), lng: Number(lngField.value) };
  const hasPin = latField.value != null && latField.value !== "" && lngField.value != null && lngField.value !== "";
  const editable = !latField.disabled;
  const set = (p: MapPoint) => {
    latField.onChange(Number(p.lat.toFixed(6)));
    lngField.onChange(Number(p.lng.toFixed(6)));
  };
  // Fit once when the saved pin first arrives.
  const [fitKey, setFitKey] = useState<number>();
  useEffect(() => {
    if (hasPin && fitKey === undefined) setFitKey(1);
  }, [hasPin, fitKey]);
  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <MapView
        className="h-64"
        center={hasPin ? pin : undefined}
        fitKey={fitKey}
        markers={hasPin ? [{ id: "pin", ...pin, draggable: editable, onDragEnd: set }] : []}
        onMapClick={editable ? set : undefined}
      />
      {editable && (
        <p className="text-xs text-muted-foreground">
          {translate("common.texts.clickTheMapOrDrag")}
        </p>
      )}
    </div>
  );
}
