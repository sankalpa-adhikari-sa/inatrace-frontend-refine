import { useTranslate } from "@refinedev/core";
import { ArrowUp, Facebook, Globe, Instagram, Twitter, Youtube } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { documentUrl } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { useApi } from "@/lib/http";
import { type B2c, B2cContext, useB2c } from "./context";
import { B2cTabs } from "./layout";

const externalLink = (link: string) => (/^https?:\/\//.test(link) ? link : `http://${link}`);

/** `/p-cd/:uuid/:qrTag/*`: the consumer-facing product page a QR code opens. */
export function B2cPage() {
  const translate = useTranslate();
  const { uuid = "", qrTag = "EMPTY" } = useParams();
  const { data: label, isLoading } = useApi(ep.getPublicProductLabelValues, { path: { uid: uuid } });
  const { data: qr, isLoading: qrLoading } = useApi(
    ep.getQRTagPublicData,
    { path: { qrTag }, query: { withHistory: true } },
    { enabled: qrTag !== "EMPTY" }
  );

  const settings = label?.businessToCustomerSettings ?? {};
  useCustomFont("custom-product", settings.productFont?.storageKey);
  useCustomFont("custom-text", settings.textFont?.storageKey);

  const value = useMemo<B2c | null>(() => {
    if (!label) return null;
    const field = <T,>(name: string) => (label.fields?.find((f) => f.name === name)?.value as T | undefined) ?? null;
    return {
      uuid,
      qrTag,
      label,
      qr: qr ?? {},
      settings,
      productName: field<string>("name") ?? "",
      field,
      textFont: settings.textFont ? { fontFamily: "custom-text" } : undefined,
      productFont: settings.productFont ? { fontFamily: "custom-product" } : undefined,
    };
  }, [label, qr, settings, uuid, qrTag]);

  if (isLoading || (qrTag !== "EMPTY" && qrLoading)) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (!value) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4 text-sm text-muted-foreground">
        {translate("b2c.texts.thisProductPageIsNot")}
      </div>
    );
  }

  return (
    <B2cContext.Provider value={value}>
      <B2cShell />
    </B2cContext.Provider>
  );
}

/** Registers an uploaded font file as a @font-face for the page. */
function useCustomFont(family: string, storageKey?: string) {
  useEffect(() => {
    if (!storageKey) return;
    const style = document.createElement("style");
    style.textContent = `@font-face { font-family: '${family}'; font-style: normal; font-weight: 400; src: url(${documentUrl(
      storageKey,
      true
    )}); }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [family, storageKey]);
}

/** Colour bar, tab bar, the current tab, social links and footer (B2cPageComponent). */
function B2cShell() {
  const translate = useTranslate();
  const { settings, field, uuid, qrTag } = useB2c();
  const { pathname } = useLocation();
  const base = `/p-cd/${uuid}/${qrTag}`;
  const tab = pathname.slice(base.length).replace(/^\//, "");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const socials = (
    [
      ["facebook", Facebook],
      ["twitter", Twitter],
      ["instagram", Instagram],
      ["youtube", Youtube],
      ["other", Globe],
    ] as const
  )
    .map(([key, Icon]) => ({ key, Icon, href: field(`company.mediaLinks.${key}`) }))
    .filter((s) => !!s.href);

  return (
    <div className="flex min-h-svh flex-col bg-white text-neutral-900">
      <header className="h-2 shrink-0" style={{ backgroundColor: settings.quaternaryColor }} />
      <div className="flex flex-1 flex-col">
        {/* The intro has no tab bar; terms / privacy show it without a selected tab. */}
        {tab !== "" && <B2cTabs current={tab} />}
        <Outlet />
      </div>
      {socials.length > 0 && (
        <div className="flex justify-center gap-4 py-6" style={{ backgroundColor: settings.primaryColor }}>
          {socials.map(({ key, Icon, href }) => (
            <a
              key={key}
              href={externalLink(href!)}
              target="_blank"
              rel="noreferrer"
              aria-label={key}
              className="flex size-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 hover:bg-white"
            >
              <Icon className="size-5" />
            </a>
          ))}
        </div>
      )}
      <footer className="bg-neutral-900 py-6 text-center text-sm text-white">
        <div className="flex flex-col justify-center gap-2 md:flex-row md:gap-12">
          <Link to={`${base}/terms-of-use`} className="hover:underline">
            {translate("b2c.buttons.termsOfUse")}
          </Link>
          <Link to={`${base}/privacy-policy`} className="hover:underline">
            {translate("b2c.buttons.privacyPolicy")}
          </Link>
        </div>
        <p className="mt-4 text-xs text-white/70">
          {translate("b2c.texts.copyright2023InaTrace")}
          <br />
          {translate("b2c.texts.allRightsReserved")}
        </p>
      </footer>
      {scrolled && (
        <button
          type="button"
          aria-label={translate("b2c.buttons.backToTop")}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed right-4 bottom-4 flex size-10 items-center justify-center rounded-full border-2 bg-white shadow"
          style={{ borderColor: settings.secondaryColor }}
        >
          <ArrowUp className="size-4" />
        </button>
      )}
    </div>
  );
}
