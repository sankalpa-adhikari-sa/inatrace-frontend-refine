import { useTranslate } from "@refinedev/core";
import { type Control, useFieldArray } from "react-hook-form";
import { CheckboxField, TextField } from "@/components/app/form-fields";
import { Section } from "@/components/app/page";
import { FieldGroup } from "@/components/ui/field";
import { type FormValues, useWatchFarm, withAreaUnit } from "./model";

/** "Additional information about the farm" (farmers only). */
export function FarmInfoSection({ control }: { control: Control<FormValues> }) {
  const translate = useTranslate();
  const farm = useWatchFarm(control);
  const areaRequired =
    farm.totalCultivatedArea != null ||
    farm.areaOrganicCertified != null ||
    (farm.farmPlantInformationList ?? []).some((p) => p.plantCultivatedArea != null);

  return (
    <Section title={translate("userCustomers.titles.additionalInformationAboutTheFarm")}>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={control}
          name="farm.areaUnit"
          label={translate("userCustomers.fields.areaUnit")}
          placeholder={translate("userCustomers.placeholders.enterAreaUnit")}
          rules={
            areaRequired
              ? { required: translate("userCustomers.errors.areaUnitIsRequired") }
              : undefined
          }
        />
        <TextField
          control={control}
          name="farm.totalCultivatedArea"
          type="number"
          label={withAreaUnit(
            translate("userCustomers.fields.totalFarmSize"),
            farm.areaUnit
          )}
          placeholder={withAreaUnit(
            translate("userCustomers.fields.enterTotalFarmSize"),
            farm.areaUnit
          )}
        />
      </FieldGroup>
      <PlantInformation control={control} areaUnit={farm.areaUnit} />
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <CheckboxField
          control={control}
          name="farm.organic"
          label={translate("userCustomers.fields.organicFarm")}
          className="sm:col-span-2"
        />
        <TextField
          control={control}
          name="farm.areaOrganicCertified"
          type="number"
          label={withAreaUnit(
            translate("userCustomers.fields.organicCertifiedArea"),
            farm.areaUnit
          )}
          placeholder={withAreaUnit(
            translate("userCustomers.fields.enterOrganicCertifiedArea"),
            farm.areaUnit
          )}
        />
        <TextField
          control={control}
          name="farm.startTransitionToOrganic"
          type="date"
          label={translate("userCustomers.fields.startedTransitionToOrganic")}
        />
      </FieldGroup>
    </Section>
  );
}

function PlantInformation({ control, areaUnit }: { control: Control<FormValues>; areaUnit?: string }) {
  const translate = useTranslate();
  const { fields } = useFieldArray({ control, name: "farm.farmPlantInformationList" });
  if (fields.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {translate("userCustomers.errors.productTypesAreRequired")}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {fields.map((f, i) => {
        const product = f.productType?.name ?? "";
        return (
          <div key={f.id} className="flex flex-col gap-3 border-b pb-4 last:border-b-0 last:pb-0">
            <div className="text-xs font-semibold">{product}</div>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name={`farm.farmPlantInformationList.${i}.plantCultivatedArea`}
                type="number"
                label={withAreaUnit(
                  `${translate("userCustomers.fields.areaCultivatedWith")} ${product}`,
                  areaUnit
                )}
                placeholder={withAreaUnit(
                  `${translate("userCustomers.fields.enterAreaCultivatedWith")} ${product}`,
                  areaUnit
                )}
              />
              <TextField
                control={control}
                name={`farm.farmPlantInformationList.${i}.numberOfPlants`}
                type="number"
                label={`${translate("userCustomers.fields.numberOfPlants")} (${product})`}
                placeholder={`${translate("userCustomers.placeholders.enterNumberOfPlants")} (${product})`}
              />
            </FieldGroup>
          </div>
        );
      })}
    </div>
  );
}
