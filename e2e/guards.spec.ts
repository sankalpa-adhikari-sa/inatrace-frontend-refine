import { expect, test } from "@playwright/test";
import { tr } from "../test/tr";
import { account, companyAdmin, type Role, storageStatePath } from "./env";

/**
 * Route guards with real accounts and the backend's real permissions. A refused user lands on /home.
 * The seeded stack has every role; against an existing backend, roles without an account are skipped.
 */
const companyId = companyAdmin().companyId;

function asRole(role: Role) {
  test.skip(!account(role), `no ${role} account configured`);
  test.use({ storageState: storageStatePath(role) });
}

const sentHome = (path: string) =>
  test(`is sent home from ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/home$/);
  });

test.describe("Company admin", () => {
  asRole("company-admin");

  test("manages their own company's facilities", async ({ page }) => {
    await page.goto(`/companies/${companyId}/facilities`);
    await expect(page).toHaveURL(new RegExp(`/companies/${companyId}/facilities$`));
    await expect(page.getByRole("button", { name: tr("companies.buttons.newFacility") })).toBeVisible();
  });

  for (const path of ["/companies", "/users", "/currencies"]) sentHome(path);
});

test.describe("Company user", () => {
  asRole("company-user");

  test("uses the company's operational pages", async ({ page }) => {
    await page.goto("/my-customers");
    await expect(page.getByRole("heading", { name: tr("customers.titles.customers") })).toBeVisible();
  });

  sentHome(`/companies/${companyId}/facilities`);
  sentHome(`/companies/${companyId}/company`);
  sentHome("/companies");
});

test.describe("Regional admin", () => {
  asRole("regional-admin");

  test("opens the admin company list", async ({ page }) => {
    await page.goto("/companies");
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("manages the profile of a company they belong to", async ({ page }) => {
    await page.goto(`/companies/${companyId}/company`);
    await expect(page).toHaveURL(new RegExp(`/companies/${companyId}/company$`));
  });

  // Facilities need company admin, which a regional admin isn't here.
  sentHome(`/companies/${companyId}/facilities`);
});

test.describe("System admin", () => {
  asRole("system-admin");

  test("opens the admin company list", async ({ page }) => {
    await page.goto("/companies");
    await expect(page).toHaveURL(/\/companies$/);
    await expect(page.getByRole("table")).toBeVisible();
  });

  // The account is a member, not an admin, of the company (RequireCompanyAdmin).
  sentHome(`/companies/${companyId}/facilities`);
});
