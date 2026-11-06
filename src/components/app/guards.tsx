import type { PropsWithChildren } from "react";
import { Navigate, Outlet, useParams } from "react-router";
import { useIdentity } from "@/hooks/use-session";
import { canManageCompany, isAdmin, isCompanyAdmin } from "@/providers/auth";
import { PageLoader } from "./page";
import { useTranslate } from "@refinedev/core";

export function RequireActive({ children }: PropsWithChildren) {
  const translate = useTranslate();
  const { user, isLoading } = useIdentity();
  if (isLoading) return <PageLoader />;
  if (user?.status !== "ACTIVE") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold">{translate("common.titles.accountNotActiveYet")}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {translate("common.texts.yourEMailIsConfirmed")}
        </p>
      </div>
    );
  }
  return children ?? <Outlet />;
}

/** SystemOrRegionalAdminGuard. */
export function RequireAdmin({ children }: PropsWithChildren) {
  const { user, isLoading } = useIdentity();
  if (isLoading) return <PageLoader />;
  if (!isAdmin(user)) return <Navigate to="/home" replace />;
  return children ?? <Outlet />;
}

/** AdminOrCompanyAdminGuard, reading the company from the `:id` route param. */
export function RequireCompanyManager({ children }: PropsWithChildren) {
  const { id } = useParams();
  const { user, isLoading } = useIdentity();
  if (isLoading) return <PageLoader />;
  if (!canManageCompany(user, Number(id))) return <Navigate to="/home" replace />;
  return children ?? <Outlet />;
}

/** CompanyAdminGuard. */
export function RequireCompanyAdmin({ children }: PropsWithChildren) {
  const { id } = useParams();
  const { user, isLoading } = useIdentity();
  if (isLoading) return <PageLoader />;
  if (!isCompanyAdmin(user, Number(id))) return <Navigate to="/home" replace />;
  return children ?? <Outlet />;
}
