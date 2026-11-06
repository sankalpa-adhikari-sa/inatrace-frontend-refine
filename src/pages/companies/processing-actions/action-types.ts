import type { ApiProcessingAction } from "@/client/types.gen";
import { t } from "@/lib/i18n";

type ActionType = NonNullable<ApiProcessingAction["type"]>;

export const ACTION_TYPES: { value: ActionType; label: string }[] = [
  {
    value: "PROCESSING",
    get label() { return t("common.fields.processing"); },
  },
  {
    value: "FINAL_PROCESSING",
    get label() { return t("companies.processingActions.fields.finalProcessing"); },
  },
  { value: "SHIPMENT", get label() { return t("companies.processingActions.fields.quote"); } },
  { value: "TRANSFER", get label() { return t("companies.processingActions.fields.transfer"); } },
  {
    value: "GENERATE_QR_CODE",
    get label() { return t("companies.processingActions.fields.generateQrCode"); },
  },
];

export const typeLabel = (t?: string) => ACTION_TYPES.find((x) => x.value === t)?.label ?? t ?? "";

export const LANGUAGES = ["EN", "DE", "RW", "ES"] as const;
