import { t } from "@/lib/i18n";
import { create } from "zustand";
import type { ApiBeycoTokenResponse } from "@/client/types.gen";
import { env } from "@/lib/env";
import { useCompanyStore } from "@/stores/company";
import { call } from "@/lib/http";
import { ep } from "@/lib/endpoints";

type TokenState = {
  token: ApiBeycoTokenResponse | null;
  timer: number | null;
  set: (token: ApiBeycoTokenResponse | null, companyId?: number) => void;
};

export const useBeycoToken = create<TokenState>((set, get) => ({
  token: null,
  timer: null,
  set: (token, companyId) => {
    const { timer } = get();
    if (timer) window.clearTimeout(timer);
    let next: number | null = null;
    if (token?.expiresIn && token.refreshToken && companyId != null) {

      next = window.setTimeout(async () => {
        try {
          const fresh = await call(ep.refreshToken, {
            path: { companyId },
            headers: { "X-Beyco-Refresh-Token": token.refreshToken! },
          });
          get().set(fresh ?? null, companyId);
        } catch {
          get().set(null);
        }
      }, ((token.expiresIn * 1000) / 3) * 2);
    }
    set({ token, timer: next });
  },
}));

// A token belongs to one company: drop it when the company changes or the user logs out.
useCompanyStore.subscribe((state, prev) => {
  if (state.selectedCompanyId !== prev.selectedCompanyId) useBeycoToken.getState().set(null);
});

export const STATE_KEY = "beyco-auth-state";

export const ERRORS: Record<string, string> = {
  get AccessDenied() { return t("stock.beyco.notifications.accessToBeycoWasDenied"); },
  get UnknownState() { return t("stock.beyco.notifications.beycoAuthorizationWasReturnedWith"); },
};

export function redirectToBeyco(redirectPath: string) {
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  const params = [
    "responseType=code",
    `clientId=${env.beycoClientId}`,
    `redirectUri=${window.location.origin}${redirectPath}`,
    `scope=${encodeURIComponent("Offer:Create")}`,
    `state=${state}`,
  ];
  window.location.href = `${env.beycoAuthUrl}?${params.join("&")}`;
}
