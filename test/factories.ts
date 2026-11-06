import type { ApiCompanyCustomer, ApiCountry, ApiUserGet } from "@/client/types.gen";

/**
 * Test data shared by Vitest and Playwright. Builders return complete-enough objects with
 * overridable fields; keep them free of browser / Node specifics.
 */

const base = (over: Partial<ApiUserGet>): ApiUserGet => ({
  id: 1,
  email: "user@inatrace.test",
  name: "Test",
  surname: "User",
  status: "ACTIVE",
  role: "USER",
  language: "EN",
  companyIds: [],
  companyIdsAdmin: [],
  ...over,
});

export const profiles = {
  systemAdmin: (over: Partial<ApiUserGet> = {}) => base({ id: 100, email: "sysadmin@inatrace.test", role: "SYSTEM_ADMIN", ...over }),

  regionalAdmin: ({ companyIds = [] as number[], ...over }: Partial<ApiUserGet> = {}) =>
    base({ id: 101, email: "regional@inatrace.test", role: "REGIONAL_ADMIN", companyIds, ...over }),

  companyAdmin: ({ companyId = 1, ...over }: Partial<ApiUserGet> & { companyId?: number } = {}) =>
    base({ id: 102, email: "coadmin@inatrace.test", companyIds: [companyId], companyIdsAdmin: [companyId], ...over }),

  companyUser: ({ companyId = 1, ...over }: Partial<ApiUserGet> & { companyId?: number } = {}) =>
    base({ id: 103, email: "couser@inatrace.test", companyIds: [companyId], ...over }),

  inactive: (over: Partial<ApiUserGet> = {}) => base({ id: 104, status: "CONFIRMED_EMAIL", ...over }),
};

export const countries = {
  rwanda: { id: 1, code: "RW", name: "Rwanda" },
  germany: { id: 2, code: "DE", name: "Germany" },
} satisfies Record<string, ApiCountry>;

export function companyCustomer(over: Partial<ApiCompanyCustomer> = {}): ApiCompanyCustomer {
  return {
    id: 101,
    companyId: 1,
    name: "Acme Roasters",
    contact: "Jane Doe",
    email: "jane@acme.test",
    location: { country: countries.germany, city: "Hamburg", state: "Hamburg" },
    ...over,
  };
}
