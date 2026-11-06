import type { ReactNode } from "react";
import { Link, Outlet } from "react-router";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@refinedev/core";

/** LandingPageLayoutComponent / ProductLabelFrontLayoutComponent: logo bar, page, partner footer. */
export function PublicLayout({ children }: { children?: ReactNode }) {
  const translate = useTranslate();
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b bg-[#25265E]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <img src="/landing-page/landing-inatrace-logo.png" alt={translate("public.texts.inaTrace")} className="h-8 w-auto" />
          </Link>
          <Button variant="secondary" size="sm" nativeButton={false} render={<Link to="/login" />}>
            {translate("public.buttons.login")}
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children ?? <Outlet />}</main>
      <PublicFooter />
    </div>
  );
}

export function PublicFooter() {
  const translate = useTranslate();
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link to="/s/cookies" className="hover:underline">
            {translate("public.buttons.cookiePolicy")}
          </Link>
          <Link to="/s/privacy" className="hover:underline">
            {translate("public.buttons.privacyPolicy")}
          </Link>
          <Link to="/s/terms-and-conditions" className="hover:underline">
            {translate("public.buttons.termsAndConditions")}
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-6">
          <img src="/landing-page/bmz-logo.jpg" alt={translate("public.texts.bmz")} className="h-12 w-auto" />
          <img src="/landing-page/giz-logo.jpg" alt={translate("public.texts.giz")} className="h-12 w-auto" />
          <img src="/landing-page/ina-logo.jpg" alt={translate("public.texts.ina")} className="h-12 w-auto" />
        </div>
      </div>
    </footer>
  );
}

/** Narrow reading column used by the policy pages and the public blog. */
export function Article({ children }: { children: ReactNode }) {
  return (
    <article
      className={[
        "mx-auto w-full max-w-2xl px-4 py-10 text-sm/relaxed",
        "[&_h2]:mb-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h5]:mt-8 [&_h5]:mb-2 [&_h5]:text-base [&_h5]:font-semibold",
        "[&_h6]:mt-4 [&_h6]:mb-1 [&_h6]:font-semibold",
        "[&_p]:mb-3 [&_p]:text-muted-foreground [&_li]:text-muted-foreground",
        "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_a]:text-primary [&_a]:underline",
      ].join(" ")}
    >
      {children}
    </article>
  );
}
