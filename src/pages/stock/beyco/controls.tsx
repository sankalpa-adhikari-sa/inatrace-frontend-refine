import { useNotification, useTranslate } from "@refinedev/core";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ApiGroupStockOrder } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { useSelectedCompany } from "@/hooks/use-session";
import { call } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { ERRORS, redirectToBeyco, STATE_KEY, useBeycoToken } from "./token";

/** Login/logout buttons, OAuth callback handling and "create offer" for selected lots. */
export function BeycoControls({ selected }: { selected: ApiGroupStockOrder[] }) {
  const translate = useTranslate();
  const { token, set } = useBeycoToken();
  const { companyId } = useSelectedCompany();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const handled = useRef(false);

  // Handle the redirect back from Beyco (?code=…&state=… or ?error=…).
  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");
    if ((!code && !error) || companyId == null || handled.current) return;
    handled.current = true;
    const saved = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    const fail = (reason?: string) =>
      notify?.({
        type: "error",
        message: translate("stock.beyco.notifications.errorOnBeycoAuthorization"),
        description:
          ERRORS[reason ?? ""] ??
          translate("stock.beyco.descriptions.errorOccurredWhileAuthorizingBeyco"),
      });
    setParams(
      (p) => {
        ["code", "state", "error"].forEach((k) => p.delete(k));
        return p;
      },
      { replace: true }
    );
    if (!saved || params.get("state") !== saved) return fail("UnknownState");
    if (error) return fail(error);
    call(ep.getToken, { path: { companyId }, query: { authCode: code! } })
      .then((t) => {
        set(t ?? null, companyId);
        notify?.({
          type: "success",
          message: translate("stock.beyco.notifications.beycoApplicationAuthorized"),
          description: translate("stock.beyco.notifications.youCanNowSendBeyco"),
        });
      })
      .catch(() => fail());
  }, [params, companyId, notify, set, setParams]);

  const ids = selected.flatMap((g) => g.groupedIds ?? []);

  return token ? (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={ids.length === 0}
        onClick={() => navigate(`/my-stock/beyco/list?${ids.map((id) => `id=${id}`).join("&")}`)}
      >
        {translate("stock.beyco.buttons.createBeycoOffer", { selectedCount: selected.length })}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          set(null);
          notify?.({
            type: "success",
            message: translate("stock.beyco.notifications.logoutFromBeyco"),
          });
        }}
      >
        {translate("stock.beyco.buttons.logoutFromBeyco")}
      </Button>
    </div>
  ) : (
    <Button variant="outline" size="sm" onClick={() => redirectToBeyco("/my-stock/orders/tab")}>
      {translate("stock.beyco.buttons.loginToBeyco")}
    </Button>
  );
}
