import { expect, test } from "@playwright/test";
import { LoginPage } from "../test/pages/login.page";
import { toasts } from "../test/pages/components";
import { tr } from "../test/tr";
import { account, companyAdmin } from "./env";

/** The login form against the real backend: session cookie, profile, redirects, logout. */
test.describe("Login", () => {
  // These tests log in themselves.
  test.use({ storageState: { cookies: [], origins: [] } });

  const acc = companyAdmin();

  test.beforeEach(async ({ page }) => {
    // Skip the "Select company" dialog after login; choosing a company is not what's under test here.
    await page.addInitScript((id) => {
      try {
        localStorage.setItem("inatraceLocale", "en");
        if (!localStorage.getItem("selectedUserCompany")) localStorage.setItem("selectedUserCompany", String(id));
      } catch {
        // sandboxed frames
      }
    }, acc.companyId);
  });

  test("a wrong password shows one error and stays on the login page", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(acc.username, "definitely-not-the-password");

    await expect(toasts(page, tr("notifications.wrongUsernameOrPassword"))).toBeVisible();
    await expect(toasts(page)).toHaveCount(1);
    await expect(page).toHaveURL(/\/login/);
  });

  test("a user whose account isn't activated yet can't log in", async ({ page }) => {
    const inactive = account("inactive");
    test.skip(!inactive, "no inactive account configured");
    const login = new LoginPage(page);
    await login.goto();
    await login.login(inactive!.username, inactive!.password);

    await expect(toasts(page)).toHaveCount(1);
    await expect(page).toHaveURL(/\/login/);
    expect((await page.context().request.get("/api/user/profile")).status()).toBe(401);
  });

  test("logging in from a protected page returns to it", async ({ page }) => {
    await page.goto("/my-customers");
    await expect(page).toHaveURL(/\/login\?to=/);

    await new LoginPage(page).login(acc.username, acc.password);

    await expect(page).toHaveURL(/\/my-customers$/);
    await expect(page.getByRole("heading", { name: tr("customers.titles.customers") })).toBeVisible();
  });

  test("logging out ends the session", async ({ page, context }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(acc.username, acc.password);
    await expect(page).toHaveURL(/\/home$/);

    // The avatar button's accessible name is the user's initials; "Account" is its title.
    await page.getByTitle(tr("common.titles.account")).click();
    await page.getByRole("menuitem", { name: tr("buttons.logOut") }).click();
    await expect(page).toHaveURL(/\/login/);

    // The backend no longer accepts the session, and protected pages send you back to login.
    expect((await context.request.get("/api/user/profile")).status()).toBe(401);
    await page.goto("/my-customers");
    await expect(page).toHaveURL(/\/login/);
  });
});
