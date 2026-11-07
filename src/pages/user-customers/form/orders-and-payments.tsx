import { useOne, useTranslate } from "@refinedev/core";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import type { ApiUserCustomer } from "@/client/types.gen";
import { PageHeader, PageLoader, PageTabs, Section } from "@/components/app/page";
import { useSelectedCompany } from "@/hooks/use-session";
import { ep } from "@/lib/endpoints";
import { useApi } from "@/lib/http";
import { PaymentsTable } from "@/pages/stock/payments";
import { StockOrderTable } from "@/pages/stock/stock-order-table";
import { KIND, type UserCustomerType } from "../list";

/** List filters for a farmer's (or a collector's, as representative) deliveries and payments. */
function useRelatedFilters(type: UserCustomerType, id: number) {
  return useMemo(
    () =>
      type === "FARMER"
        ? { orders: { farmerId: id }, payments: { farmerId: id } }
        : {
            orders: { representativeOfProducerUserCustomerId: id },
            payments: { representativeOfRecipientUserCustomerId: id },
          },
    [type, id]
  );
}

/**
 * Header of a farmer / collector: their name, and once they exist, tabs for the profile form and their
 * deliveries and payments (each its own route, so the form isn't followed by two long tables).
 */
export function UserCustomerHeader({ type, id }: { type: UserCustomerType; id?: number }) {
  const translate = useTranslate();
  const kind = KIND[type];
  const isFarmer = type === "FARMER";
  const isNew = id == null;
  const { companyId } = useSelectedCompany();
  const { query } = useOne<ApiUserCustomer>({ resource: "user-customers", id, queryOptions: { enabled: !isNew } });
  const person = query.data?.data;
  const name = [person?.name, person?.surname].filter(Boolean).join(" ");

  const filters = useRelatedFilters(type, id ?? 0);
  const enabled = !isNew && companyId != null;
  const count = { select: (r: { count?: number } | undefined) => r?.count, enabled, keepPrevious: true };
  const { data: deliveries } = useApi(
    ep.getStockOrderListByCompanyId,
    { path: { companyId: companyId ?? 0 }, query: { requestType: "FETCH", limit: 1, ...filters.orders } },
    count
  );
  const { data: payments } = useApi(
    ep.listPaymentsByCompany,
    { path: { id: companyId ?? 0 }, query: { requestType: "FETCH", limit: 1, ...filters.payments } },
    count
  );

  const title = isNew
    ? isFarmer
      ? translate("userCustomers.titles.newFarmer")
      : translate("userCustomers.titles.newCollector")
    : name ||
      (isFarmer ? translate("userCustomers.titles.editFarmer") : translate("userCustomers.titles.editCollector"));
  const base = `${kind.base}/edit/${id}`;

  return (
    <>
      <PageHeader title={title} breadcrumbs={[{ label: kind.title, to: kind.base }]} />
      {!isNew && (
        <PageTabs
          tabs={[
            { label: translate("userCustomers.titles.profile"), to: base, exact: true },
            { label: translate("common.titles.deliveries"), to: `${base}/deliveries`, count: deliveries },
            { label: translate("userCustomers.titles.payments"), to: `${base}/payments`, count: payments },
          ]}
        />
      )}
    </>
  );
}

/** `/my-farmers/edit/:id/deliveries` and the collector equivalent. */
export function UserCustomerDeliveries({ type }: { type: UserCustomerType }) {
  const translate = useTranslate();
  const id = Number(useParams().id);
  const { companyId } = useSelectedCompany();
  const filters = useRelatedFilters(type, id);
  const [total, setTotal] = useState(0);
  return (
    <>
      <UserCustomerHeader type={type} id={id} />
      {companyId == null ? (
        <PageLoader />
      ) : (
        <Section
          plain
          title={translate("common.titles.deliveries")}
          description={translate("common.descriptions.total", { total })}
        >
          <StockOrderTable
            mode="PURCHASE_ORDERS"
            companyId={companyId}
            filters={filters.orders}
            onTotal={setTotal}
            hideFarmer={type === "FARMER"}
          />
        </Section>
      )}
    </>
  );
}

/** `/my-farmers/edit/:id/payments` and the collector equivalent. */
export function UserCustomerPayments({ type }: { type: UserCustomerType }) {
  const translate = useTranslate();
  const id = Number(useParams().id);
  const { companyId } = useSelectedCompany();
  const filters = useRelatedFilters(type, id);
  const [total, setTotal] = useState(0);
  return (
    <>
      <UserCustomerHeader type={type} id={id} />
      {companyId == null ? (
        <PageLoader />
      ) : (
        <Section
          plain
          title={translate("userCustomers.titles.payments")}
          description={translate("common.descriptions.total", { total })}
        >
          <PaymentsTable companyId={companyId} filters={filters.payments} onTotal={setTotal} />
        </Section>
      )}
    </>
  );
}
