import { useEffect } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { logPublicRequest } from "@/lib/http";
import { changeLocale } from "@/lib/i18n";
import { useTranslate } from "@refinedev/core";

/** `/` (LandingPageComponent) */
export function LandingPage() {
  const translate = useTranslate();
  useEffect(() => logPublicRequest("LANDING_PAGE"), []);
  return (
    <section
      className="relative flex flex-1 items-center bg-cover bg-center"
      style={{ backgroundImage: "url(/landing-page/landing-background.jpg)" }}
    >
      <div className="absolute inset-0 bg-[#25265E]/60" />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center text-white">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {translate("public.titles.inaTraceMakeAgriculturalSupplyChains")}
        </h1>
        <p className="text-base/relaxed text-pretty text-white/90 md:text-lg/relaxed">
          {translate("public.texts.inaTraceIsAnOpenSource")}
        </p>
        <Button
          size="lg"
          variant="secondary"
          nativeButton={false}
          render={
            <a
              href="https://www.nachhaltige-agrarlieferketten.org/en/in-practice/inatrace/"
              target="_blank"
              rel="nofollow noreferrer"
            />
          }
        >
          {translate("public.buttons.readMore")}
        </Button>
      </div>
    </section>
  );
}

/** `/app-version` (VersionComponent) */
export function AppVersionPage() {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-1 p-4 text-sm">
      <p>{translate("public.texts.appVersion", { version: env.version })}</p>
      <p>
        {translate("public.texts.environment", { environmentName: env.environmentName })}
      </p>
    </div>
  );
}


export function QrRedirect() {
  const { uuid = "", qrTag = "EMPTY" } = useParams();
  useEffect(() => logPublicRequest("VISIT_QR", uuid), [uuid]);
  return <Navigate to={`/p-cd/${uuid}/${qrTag}`} replace />;
}


export function LocalePrefixRedirect({ locale }: { locale: string }) {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    const rest = pathname.slice(locale.length + 1) || "/";
    void changeLocale(locale).then(() => navigate(rest + search + hash, { replace: true }));
  }, [locale, pathname, search, hash, navigate]);
  return null;
}
