import { useTranslate } from "@refinedev/core";
import type { ApiStockOrder } from "@/client/types.gen";
import { PageHeader, PageTabs } from "@/components/app/page";
import { fmt } from "../stock/shared";

export type Kind = "RECEIVED" | "PLACED";

export function OrdersTabs() {
  const translate = useTranslate();
  return (
    <>
      <PageHeader title={translate("orders.titles.orders")} />
      <PageTabs
        tabs={[
          { label: translate("orders.fields.receivedOrders"), to: "/my-orders/received-orders" },
          { label: translate("orders.fields.placedOrders"), to: "/my-orders/placed-orders" },
        ]}
      />
    </>
  );
}

export const kgs = (o: ApiStockOrder) =>
  o.measureUnitType?.weight && o.totalQuantity != null ? fmt(o.measureUnitType.weight * o.totalQuantity) : "-";
