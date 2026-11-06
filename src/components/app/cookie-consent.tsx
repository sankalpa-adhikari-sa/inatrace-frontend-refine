import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  type ConsentType,
  activeConsents,
  getConsent,
  hasDecidedAll,
  loadConsented,
  needsConsent,
  setConsent,
  trackPageView,
} from "@/lib/consent";
import { env } from "@/lib/env";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

/**
 * Cookie banner (CookieBannerComponent) plus loading of the consented trackers
 * and page-view tracking. Mounted once inside the router.
 */
export function CookieConsent() {
  const translate = useTranslate();
  const [decided, setDecided] = useState(hasDecidedAll);
  const { pathname } = useLocation();

  useEffect(() => loadConsented(), []);
  useEffect(() => trackPageView(pathname), [pathname]);

  if (decided || !needsConsent()) return null;

  function acceptAll() {
    for (const type of activeConsents()) setConsent(type, true);
    loadConsented();
    setDecided(true);
  }

  return (
    <div
      role="dialog"
      aria-label={translate("buttons.cookiesOnThisPage")}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 shadow-lg backdrop-blur"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4 text-sm md:flex-row md:items-center">
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-semibold">{translate("common.texts.cookiesOnThisPage")}</p>
          <p className="text-xs text-muted-foreground">
            {translate("common.texts.theWebsiteUsesCookiesFor")}{" "}
            <Link to="/s/cookies" className="underline">
              {translate("buttons.cookiePolicyPage")}
            </Link>
            {translate("common.texts.byContinuingToUseThe")}
          </p>
        </div>
        <Button onClick={acceptAll}>{translate("buttons.ok")}</Button>
      </div>
    </div>
  );
}

const OPTIONS: { type: ConsentType; label: string; description: string; when?: () => boolean }[] = [
  { type: "GA", get label() { return t("common.fields.googleAnalytics"); }, get description() { return t("common.descriptions.performanceCookies"); } },
  {
    type: "INTERCOM",
    get label() { return t("common.fields.intercom"); },
    get description() { return t("common.descriptions.customerSupportWithLiveChat"); },
    when: () => env.chatApp === "intercom",
  },
  {
    type: "ROCKET",
    get label() { return t("common.fields.rocketChat"); },
    get description() { return t("common.descriptions.customerSupportWithLiveChat"); },
    when: () => env.chatApp === "rocket",
  },
];

/** CookieManagementModalComponent: per-tracker consent switches; saving reloads the page. */
export function CookieSettingsDialog({ onClose }: { onClose: () => void }) {
  const translate = useTranslate();
  const options = OPTIONS.filter((o) => !o.when || o.when());
  const [values, setValues] = useState(() => Object.fromEntries(options.map((o) => [o.type, !!getConsent(o.type)])));

  function save() {
    for (const type of ["GA", "FB", "INTERCOM", "ROCKET"] as ConsentType[]) setConsent(type, !!values[type]);
    window.location.reload();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate("common.titles.cookiesSettings")}</DialogTitle>
          <DialogDescription>{translate("common.descriptions.chooseWhichOptionalCookiesThis")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {options.map((o) => (
            <div key={o.type} className="flex items-center justify-between gap-4">
              <Label htmlFor={`consent-${o.type}`} className="flex flex-col items-start gap-0.5">
                <span>{o.label}</span>
                <span className="text-xs font-normal text-muted-foreground">{o.description}</span>
              </Label>
              <Switch
                id={`consent-${o.type}`}
                checked={!!values[o.type]}
                onCheckedChange={(checked) => setValues((v) => ({ ...v, [o.type]: !!checked }))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button onClick={save}>{translate("buttons.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
