import { useList, useTranslate } from "@refinedev/core";
import { useState } from "react";
import { Link } from "react-router";
import type { ApiProductListResponse } from "@/client/types.gen";
import { PageHeader, PageLoader } from "@/components/app/page";
import { OnboardingHome } from "@/components/app/onboarding";
import { ProductCard } from "@/components/app/product-card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useSelectedCompany } from "@/hooks/use-session";

const PAGE_SIZE = 12;

export function HomePage() {
  const translate = useTranslate();
  const { company } = useSelectedCompany();
  const [page, setPage] = useState(1);

  const { result, query } = useList<ApiProductListResponse>({
    resource: "products",
    pagination: { currentPage: page, pageSize: PAGE_SIZE },
  });
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const shortcuts: { to: string; label: string; icon: string; hidden?: boolean; onboarding?: string }[] = [
    {
      to: "/my-stock",
      label: translate("home.fields.myStock"),
      icon: "/icons/icon-my-stock.svg",
      onboarding: "home-my-stock",
    },
    { to: "/my-orders", label: translate("home.fields.orders"), icon: "/icons/icon-orders.svg" },
    {
      to: "/my-customers",
      label: translate("home.fields.myCustomers"),
      icon: "/icons/icon-my-customers.svg",
      hidden: !company?.companyRoles?.includes("BUYER"),
    },
    {
      to: "/my-farmers",
      label: translate("home.fields.farmers"),
      icon: "/icons/icon-farmers.svg",
      onboarding: "home-farmers",
    },
    {
      to: "/my-collectors",
      label: translate("home.fields.collectors"),
      icon: "/icons/icon-collectors.svg",
      hidden: !company?.supportsCollectors,
    },
    {
      to: "/company-dashboard",
      label: translate("home.fields.dashboard"),
      icon: "/icons/icon-dashboard.svg",
    },
  ];

  return (
    <>
      {company && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {shortcuts
            .filter((s) => !s.hidden)
            .map((s) => (
              <Link
                key={s.to}
                to={s.to}
                data-onboarding={s.onboarding}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                <img src={s.icon} alt="" aria-hidden className="size-14 object-contain" />
                {s.label}
              </Link>
            ))}
        </div>
      )}

      {company && <OnboardingHome />}
      <PageHeader title={translate("home.titles.myProducts")} />
      {query.isLoading ? (
        <PageLoader />
      ) : result.data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{translate("home.titles.noProducts")}</EmptyTitle>
            <EmptyDescription>{translate("home.descriptions.productsYouHaveAccessTo")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
          {result.data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {translate("buttons.previous")}
          </Button>
          <span className="text-muted-foreground">
            {translate("common.texts.pageOf", { page, pages })}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {translate("buttons.next")}
          </Button>
        </div>
      )}
    </>
  );
}
