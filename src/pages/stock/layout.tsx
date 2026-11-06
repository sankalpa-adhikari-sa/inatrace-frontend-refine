import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { PageHeader, PageLoader, PageTabs } from "@/components/app/page";
import { useStockPermissions } from "./shared";
import { useTranslate } from "@refinedev/core";

/** Tabs of `/my-stock` (StockCoreTabComponent). */
export function StockLayout() {
  const translate = useTranslate();
  const { canSeeProcessing, canSeeMyStock, isLoading } = useStockPermissions();
  const { pathname } = useLocation();

  if (isLoading) return <PageLoader />;
  const blocked =
    (pathname.startsWith("/my-stock/processing") && !canSeeProcessing) ||
    (pathname.startsWith("/my-stock/all-stock") && !canSeeMyStock);
  if (blocked) return <Navigate to="/my-stock/deliveries" replace />;

  return (
    <>
      <PageHeader title={translate("stock.titles.myStock")} />
      <PageTabs
        tabs={[
          { label: translate("stock.fields.deliveries"), to: "/my-stock/deliveries" },
          {
            label: translate("common.fields.processing"),
            to: "/my-stock/processing",
            disabled: !canSeeProcessing,
          },
          {
            label: translate("stock.fields.payments"),
            to: "/my-stock/payments",
          },
          {
            label: translate("stock.fields.allStock"),
            to: "/my-stock/all-stock",
            disabled: !canSeeMyStock,
          },
        ]}
      />
      <Outlet />
    </>
  );
}


export function LegacyStockTab() {
  const { tab } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/my-stock/${tab && tab !== "orders" ? tab : "all-stock"}${search}`} replace />;
}
