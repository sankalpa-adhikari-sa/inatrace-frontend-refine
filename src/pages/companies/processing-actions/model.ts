import type { ApiProcessingAction } from "@/client/types.gen";
import { t } from "@/lib/i18n";
import { LANGUAGES } from "./action-types";

type Translation = { language: (typeof LANGUAGES)[number]; name: string; description: string };

export type FormValues = Omit<ApiProcessingAction, "translations"> & { translations: Translation[] };

export function toForm(pa: ApiProcessingAction): FormValues {
  return {
    ...pa,
    valueChains: pa.valueChains ?? [],
    outputSemiProducts: pa.outputSemiProducts ?? [],
    supportedFacilities: pa.supportedFacilities ?? [],
    requiredEvidenceFields: pa.requiredEvidenceFields ?? [],
    requiredDocumentTypes: pa.requiredDocumentTypes ?? [],
    finalProductAction: pa.finalProductAction ?? false,
    translations: LANGUAGES.map((language) => {
      const t = pa.translations?.find((x) => x.language === language);
      return { language, name: t?.name ?? "", description: t?.description ?? "" };
    }),
  };
}
