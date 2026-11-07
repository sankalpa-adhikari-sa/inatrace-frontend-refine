import { useLogout, useTranslate } from "@refinedev/core";
import { Suspense, useEffect } from "react";
import { Outlet } from "react-router";
import { PageLoader } from "./page";
import { OnboardingHints } from "./onboarding";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SESSION_EXPIRED_EVENT } from "@/lib/api";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { CompanyGate } from "./company-picker";
import { ConfirmProvider } from "./confirm";

/** Logs out when any API call reports the session expired. */
function SessionWatcher() {
  const { mutate: logout } = useLogout();
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);
  return null;
}

export function AppLayout() {
  return (
    <TooltipProvider>
      <ConfirmProvider>
        <CompanyGate>
          <SessionWatcher />
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0 bg-page">
              <AppHeader />
              {/* Full width with a fixed gutter, so desktop pages aren't boxed in by large side margins.
                  A div, not <main>: SidebarInset already renders the main landmark. */}
              <div className="flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:px-6 md:py-5">
                {/* Pages are lazy-loaded (App.tsx); keep the sidebar and header while one loads. */}
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
                <OnboardingHints />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </CompanyGate>
      </ConfirmProvider>
    </TooltipProvider>
  );
}

/** Centered card layout for login, register and password pages. */
export function GuestLayout() {
  const translate = useTranslate();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="flex items-center gap-2">
        <img src="/logo-INA.png" alt="" className="size-9 object-contain" />
        <span className="font-heading text-3xl text-heading">{translate("common.texts.inaTrace")}</span>
      </div>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        {translate("common.texts.makeAgriculturalSupplyChainsTransparent")}
      </p>
    </div>
  );
}
