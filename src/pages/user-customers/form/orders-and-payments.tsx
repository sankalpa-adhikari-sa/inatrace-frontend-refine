import { useTranslate } from "@refinedev/core";
import { useMemo, useState } from "react";
import { Section } from "@/components/app/page";
import { PaymentsTable } from "@/pages/stock/payments";
import { StockOrderTable } from "@/pages/stock/stock-order-table";
import type { UserCustomerType } from "../list";


export function OrdersAndPayments({
  type,
  companyId,
  userCustomerId,
}: {
  type: UserCustomerType;
  companyId: number;
  userCustomerId: number;
}) {
  const translate = useTranslate();
  const [orders, setOrders] = useState(0);
  const [payments, setPayments] = useState(0);
  const orderFilters = useMemo(
    () =>
      type === "FARMER" ? { farmerId: userCustomerId } : { representativeOfProducerUserCustomerId: userCustomerId },
    [type, userCustomerId]
  );
  const paymentFilters = useMemo(
    () =>
      type === "FARMER" ? { farmerId: userCustomerId } : { representativeOfRecipientUserCustomerId: userCustomerId },
    [type, userCustomerId]
  );
  return (
    <>
      <Section plain
        title={translate("common.titles.deliveries")}
        description={translate("common.descriptions.total", { total: orders })}
      >
        <StockOrderTable mode="PURCHASE_ORDERS" companyId={companyId} filters={orderFilters} onTotal={setOrders} />
      </Section>
      <Section plain
        title={translate("userCustomers.titles.payments")}
        description={translate("common.descriptions.total", { total: payments })}
      >
        <PaymentsTable companyId={companyId} filters={paymentFilters} onTotal={setPayments} />
      </Section>
    </>
  );
}
