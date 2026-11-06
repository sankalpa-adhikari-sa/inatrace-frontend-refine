import { test as base, expect } from "@playwright/test";
import type { ApiUserGet } from "@/client/types.gen";
import { ep } from "@/lib/endpoints";
import { profiles } from "../factories";
import { tr, trLabel } from "../tr";
import { ApiMock, ok, paged } from "./api-mock";

type Options = {
  /** Logged-in user for the mocked tier; `null` = logged out. Override with `test.use({ profile })`. */
  profile: ApiUserGet | null;
  /** Selected company (`selectedUserCompany`); `null` = none, so the company picker shows. */
  companyId: number | null;
};

type Fixtures = {
  /** Strict API mock, installed before the page loads. */
  api: ApiMock;
  tr: typeof tr;
  trLabel: typeof trLabel;
};

export const test = base.extend<Options & Fixtures>({
  profile: [profiles.companyAdmin({ companyId: 1 }), { option: true }],
  companyId: [1, { option: true }],
  tr: async ({}, use) => use(tr),
  trLabel: async ({}, use) => use(trLabel),

  api: async ({ page, profile, companyId, baseURL }, use, testInfo) => {
    await page.addInitScript((id) => {
      try {
        // Only on the first load of a tab, so reloads keep whatever the test changed.
        if (sessionStorage.getItem("e2e-seeded")) return;
        sessionStorage.setItem("e2e-seeded", "1");
        localStorage.setItem("inatraceLocale", "en");
        if (id != null) localStorage.setItem("selectedUserCompany", String(id));
      } catch {
        // Sandboxed frames (e.g. devtools iframes) have no storage.
      }
    }, companyId);

    const api = new ApiMock(page, baseURL!);
    api.on(ep.getProfileForUser, () => (profile ? ok(profile) : { status: 401 }));
    if (companyId != null) {
      api.on(ep.getCompany, ({ params }) =>
        ok({ id: Number(params.id), name: "Test Co-op", users: [], valueChains: [], supportedLanguages: ["EN"] }),
      );
      api.on(ep.getCompanyName, ({ params }) => ok({ id: Number(params.id), name: "Test Co-op" }));
      // /home, where logins and refused routes land: onboarding checklist + products. Everything done,
      // so no onboarding dialog gets in the way.
      api.on(ep.getCompanyOnboardingState, ({ params }) =>
        ok({
          id: Number(params.id),
          hasCreatedProduct: true,
          hasCreatedFacility: true,
          hasCreatedProcessingAction: true,
          hasAddedFarmers: true,
        }),
      );
    }
    api.on(ep.listProducts, () => paged([]));
    await api.install();

    await use(api);

    if (api.unhandled.length && testInfo.status === testInfo.expectedStatus) {
      throw new Error(`Unmocked API requests (add api.on(ep.…, …)):\n  ${[...new Set(api.unhandled)].join("\n  ")}`);
    }
  },
});

export { expect };
