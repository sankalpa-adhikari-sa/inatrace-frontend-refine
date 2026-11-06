import { type Control, useWatch } from "react-hook-form";
import type { ApiUserCustomer } from "@/client/types.gen";
import { t } from "@/lib/i18n";

export const GENDERS = [
  { value: "MALE", get label() { return t("userCustomers.fields.male"); } },
  { value: "FEMALE", get label() { return t("userCustomers.fields.female"); } },
  { value: "N_A", label: "N/A" },
  { value: "DIVERSE", get label() { return t("userCustomers.fields.diverse"); } },
];

export type FormValues = Omit<ApiUserCustomer, "location"> & {
  location: Omit<NonNullable<ApiUserCustomer["location"]>, "publiclyVisible"> & { publiclyVisible?: string | null };
};

const str = (b?: boolean) => (b == null ? null : String(b));
// Dates come back as ISO timestamps; date inputs need yyyy-mm-dd.
const day = (d?: string) => (d ? d.slice(0, 10) : undefined);

export function toForm(uc: ApiUserCustomer): FormValues {
  return {
    ...uc,
    location: { ...uc.location, publiclyVisible: str(uc.location?.publiclyVisible) },
    associations: uc.associations ?? [],
    cooperatives: uc.cooperatives ?? [],
    certifications: (uc.certifications ?? []).map((c) => ({ ...c, validity: day(c.validity) })),
    plots: (uc.plots ?? []).map((p) => ({ ...p, organicStartOfTransition: day(p.organicStartOfTransition) })),
    productTypes: uc.productTypes ?? [],
    farm: {
      ...uc.farm,
      startTransitionToOrganic: day(uc.farm?.startTransitionToOrganic),
      farmPlantInformationList: uc.farm?.farmPlantInformationList ?? [],
    },
  };
}

export function useWatchFarm(control: Control<FormValues>) {
  return (useWatch({ control, name: "farm" }) ?? {}) as NonNullable<FormValues["farm"]>;
}

export const withAreaUnit = (text: string, unit?: string) => (unit ? `${text} (${unit})` : text);
