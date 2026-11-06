import type { ApiUserGet } from "@/client/types.gen";
import { ep } from "@/lib/endpoints";
import { profiles } from "../factories";
import { expect, test } from "./fixtures";
import { paged } from "./api-mock";

/**
 * Route guards (components/app/guards.tsx) for representative routes. The full role × company
 * matrix of the underlying predicates is covered by Vitest (src/providers/auth.test.ts); this checks
 * that the routes are actually wired to the right guard. A refused user lands on /home.
 */
type Case = { who: string; profile: ApiUserGet; path: string; allowed: boolean };

// Members of company 1, the pre-selected company (otherwise the "Select company" dialog opens first).
const systemAdmin = profiles.systemAdmin({ companyIds: [1] });

const cases: Case[] = [
  // RequireAdmin
  { who: "system admin", profile: systemAdmin, path: "/companies", allowed: true },
  { who: "company admin", profile: profiles.companyAdmin({ companyId: 1 }), path: "/companies", allowed: false },
  { who: "company user", profile: profiles.companyUser({ companyId: 1 }), path: "/users", allowed: false },
  // RequireCompanyAdmin
  { who: "company admin of 1", profile: profiles.companyAdmin({ companyId: 1 }), path: "/companies/1/facilities", allowed: true },
  { who: "company admin of 2", profile: profiles.companyAdmin({ companyId: 2 }), path: "/companies/1/facilities", allowed: false },
  { who: "company user of 1", profile: profiles.companyUser({ companyId: 1 }), path: "/companies/1/facilities", allowed: false },
  { who: "system admin (not a company admin)", profile: systemAdmin, path: "/companies/1/facilities", allowed: false },
];

for (const c of cases) {
  test.describe(`${c.who} → ${c.path}`, () => {
    test.use({ profile: c.profile, companyId: 1 });

    test(c.allowed ? "is let in" : "is sent home", async ({ page, api }) => {
      // Data the allowed pages load.
      api
        .on(ep.listCompanies, () => paged([{ id: 1, name: "Test Co-op" }]))
        .on(ep.listCompaniesAdmin, () => paged([{ id: 1, name: "Test Co-op" }]))
        .on(ep.listAllFacilitiesByCompany, () => paged([]));

      await page.goto(c.path);

      if (c.allowed) {
        await expect(page).toHaveURL(new RegExp(`${c.path}$`));
        await expect(page.getByRole("table")).toBeVisible();
      } else {
        await expect(page).toHaveURL(/\/home$/);
      }
    });
  });
}
