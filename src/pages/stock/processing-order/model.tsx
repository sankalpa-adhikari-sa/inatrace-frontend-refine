import type {
  ApiDocument,
  ApiFacility,
  ApiMeasureUnitType,
  ApiProcessingAction,
  ApiProcessingEvidenceField,
  ApiProcessingEvidenceType,
  ApiProcessingOrder,
  ApiStockOrder,
  ApiStockOrderEvidenceFieldValue,
} from "@/client/types.gen";
import { day, personName, toApiDate, today } from "../shared";

export type ActionType = NonNullable<ApiProcessingAction["type"]>;
export type Sac = { id?: number; sacNumber: number | null; totalQuantity: number | null };
export type Target = {
  id?: number;
  semiProduct?: ApiStockOrder["semiProduct"] & { repackedOutput?: boolean; maxOutputWeight?: number };
  finalProduct?: ApiStockOrder["finalProduct"];
  facility?: ApiFacility | null;
  internalLotNumber?: string;
  totalQuantity?: number | null;
  orderId?: string;
  deliveryTime?: string;
  repackedOriginStockOrderId?: string;
  sacs: Sac[];
  /** Processing evidence field values keyed by field name. */
  evidence: Record<string, string | number | null>;
};
export type RequiredDoc = {
  evidenceTypeId?: number;
  evidenceTypeCode?: string;
  label?: string;
  mandatory?: boolean;
  date?: string;
  document?: ApiDocument;
};
export type OtherDoc = { type?: ApiProcessingEvidenceType | null; formalCreationDate?: string; document?: ApiDocument };
export type FormValues = {
  processingDate: string;
  inputFacility: ApiFacility | null;
  targets: Target[];
  requiredDocs: RequiredDoc[];
  otherDocs: OtherDoc[];
  comments: string;
};

export const NUMERIC_FIELDS = ["NUMBER", "INTEGER", "EXCHANGE_RATE", "PRICE"];

/** Only processing actions may use part of an input stock order (clipInputTransaction). */
export const canClip = (type: ActionType) => type === "PROCESSING" || type === "FINAL_PROCESSING";

export const repackedMax = (action: ApiProcessingAction, t: Target) =>
  action.repackedOutputFinalProducts
    ? action.maxOutputWeight
    : t.semiProduct?.repackedOutput
    ? t.semiProduct.maxOutputWeight
    : undefined;

export const unitOf = (t: Target) => t.semiProduct?.measurementUnitType ?? t.finalProduct?.measurementUnitType;

/** `quantity` in `from` units, expressed in `to` units by unit weight (calcTotalOutputQuantity). */
export function convertQuantity(quantity: number, from?: ApiMeasureUnitType, to?: ApiMeasureUnitType) {
  return from?.weight && to?.weight ? (quantity * from.weight) / to.weight : quantity;
}

/** Sacs don't add up to the entered output quantity (notAllOutputQuantityIsUsed). */
export function notAllOutputUsed(action: ApiProcessingAction, t: Target) {
  if (repackedMax(action, t) == null || !Number(t.totalQuantity)) return false;
  const packed = (t.sacs ?? []).reduce((s, x) => s + (Number(x.totalQuantity) || 0), 0);
  return Number(t.totalQuantity) > packed;
}

/** Purchase orders show "identifier (farmer)", other stock "prefix identifier lot". */
export function stockOrderName(o: ApiStockOrder) {
  if (o.orderType === "PURCHASE_ORDER") {
    return o.producerUserCustomer ? `${o.identifier} (${personName(o.producerUserCustomer)})` : (o.identifier ?? "");
  }
  return [o.lotPrefix, o.identifier, o.internalLotNumber].filter(Boolean).join(" ");
}

export function evidenceToForm(fields: ApiProcessingEvidenceField[], values: ApiStockOrderEvidenceFieldValue[] = []) {
  const out: Record<string, string | number | null> = {};
  for (const f of fields) {
    const v = values.find((x) => x.evidenceFieldId === f.id && x.evidenceFieldName === f.fieldName);
    out[f.fieldName!] = !v
      ? null
      : NUMERIC_FIELDS.includes(f.type ?? "")
      ? v.numericValue ?? null
      : f.type === "DATE" || f.type === "TIMESTAMP"
      ? day(v.dateValue)
      : v.stringValue ?? null;
  }
  return out;
}

export function evidenceToApi(
  fields: ApiProcessingEvidenceField[],
  values: Target["evidence"]
): ApiStockOrderEvidenceFieldValue[] {
  return fields.map((f) => {
    const raw = values[f.fieldName!];
    const base = { evidenceFieldId: f.id, evidenceFieldName: f.fieldName };
    if (NUMERIC_FIELDS.includes(f.type ?? ""))
      return { ...base, numericValue: raw == null || raw === "" ? undefined : Number(raw) };
    if (f.type === "DATE" || f.type === "TIMESTAMP") return { ...base, dateValue: toApiDate(raw as string) };
    return { ...base, stringValue: (raw as string) ?? undefined };
  });
}

export function newTarget(action: ApiProcessingAction, outputFinal: Target["finalProduct"]): Target {
  return {
    semiProduct: outputFinal
      ? undefined
      : action.outputSemiProducts?.length === 1
      ? action.outputSemiProducts[0]
      : undefined,
    finalProduct: outputFinal,
    facility: null,
    sacs: [],
    evidence: evidenceToForm(action.requiredEvidenceFields ?? []),
  };
}

export function newForm(action: ApiProcessingAction, outputFinal: Target["finalProduct"]): FormValues {
  return {
    processingDate: today(),
    inputFacility: null,
    targets: [newTarget(action, outputFinal)],
    requiredDocs: (action.requiredDocumentTypes ?? []).map((d) => ({
      evidenceTypeId: d.id,
      evidenceTypeCode: d.code,
      label: d.label,
      mandatory: d.mandatory,
      date: today(),
    })),
    otherDocs: [],
    comments: "",
  };
}

export function fromOrder(order: ApiProcessingOrder, action: ApiProcessingAction): FormValues {
  const fields = action.requiredEvidenceFields ?? [];
  const tsos = order.targetStockOrders ?? [];
  // Repacked outputs (sacs) were saved as separate stock orders sharing repackedOriginStockOrderId.
  const groups = new Map<string, ApiStockOrder[]>();
  for (const t of tsos) {
    const key = t.repackedOriginStockOrderId ?? `single-${t.id}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const targets: Target[] = [...groups.values()].map((group) => {
    const first = group[0];
    const repacked = !!first.repackedOriginStockOrderId;
    const semi = action.outputSemiProducts?.find((s) => s.id === first.semiProduct?.id) ?? first.semiProduct;
    return {
      id: repacked ? undefined : first.id,
      semiProduct: semi,
      finalProduct: first.finalProduct,
      facility: first.facility,
      internalLotNumber: first.internalLotNumber,
      totalQuantity: repacked ? group.reduce((s, g) => s + (g.totalQuantity ?? 0), 0) : first.totalQuantity,
      orderId: first.orderId,
      deliveryTime: day(first.deliveryTime),
      repackedOriginStockOrderId: first.repackedOriginStockOrderId,
      sacs: repacked
        ? group.map((g) => ({ id: g.id, sacNumber: g.sacNumber ?? null, totalQuantity: g.totalQuantity ?? null }))
        : [],
      evidence: evidenceToForm(fields, first.requiredEvidenceFieldValues),
    };
  });
  const first = tsos[0];
  return {
    processingDate: day(order.processingDate) || today(),
    inputFacility: null,
    targets,
    requiredDocs: (action.requiredDocumentTypes ?? []).map((d) => {
      const v = first?.requiredEvidenceTypeValues?.find((x) => x.evidenceTypeId === d.id);
      return {
        evidenceTypeId: d.id,
        evidenceTypeCode: d.code,
        label: d.label,
        mandatory: d.mandatory,
        date: day(v?.date),
        document: v?.document,
      };
    }),
    otherDocs: (first?.otherEvidenceDocuments ?? []).map((d) => ({
      type: { id: d.evidenceTypeId, code: d.evidenceTypeCode ?? "", label: d.evidenceTypeLabel ?? "" },
      formalCreationDate: day(d.date),
      document: d.document,
    })),
    comments: first?.comments ?? "",
  };
}

/** Filters for the available input stock (ProcessingOrderInputComponent.dateSearch). */
export type StockFilters = {
  lot: string;
  from: string;
  to: string;
  women: "" | "true" | "false";
  organic: "" | "true" | "false";
};
export const NO_STOCK_FILTERS: StockFilters = { lot: "", from: "", to: "", women: "", organic: "" };

