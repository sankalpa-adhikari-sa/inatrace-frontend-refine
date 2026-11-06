import type { ApiFacility, ApiProcessingAction } from "@/client/types.gen";

export type Item = {
  action: ApiProcessingAction | null;
  quoteFacility: ApiFacility | null;
  totalQuantity: number | null;
  currencyForEndCustomer: string | null;
  pricePerUnitForEndCustomer: number | null;
};

export const EMPTY_ITEM: Item = {
  action: null,
  quoteFacility: null,
  totalQuantity: null,
  currencyForEndCustomer: null,
  pricePerUnitForEndCustomer: null,
};

/** "ORDER (Final product, 500 kg)", the item's internal lot name (CustomerOrderItemComponent). */
export function itemLotName(orderId: string | undefined, it: Pick<Item, "action" | "totalQuantity">) {
  const fp = it.action?.inputFinalProduct;
  if (!orderId || !fp || !it.totalQuantity) return "-";
  return `${orderId} (${fp.name}, ${it.totalQuantity} ${fp.measurementUnitType?.label ?? ""})`;
}
