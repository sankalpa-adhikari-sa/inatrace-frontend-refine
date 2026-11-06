import type { ApiUserGet } from "@/client/types.gen";
import { ep } from "@/lib/endpoints";
import { profiles } from "../factories";
import { expect, test } from "./fixtures";
import { fail, ok } from "./api-mock";
import { toasts } from "../pages/components";
import { LoginPage } from "../pages/login.page";

test.describe("Login", () => {
  // Start logged out; the login handler below "creates" the session.
  test.use({ profile: null, companyId: 1 });

  let session: ApiUserGet | null;

  test.beforeEach(async ({ api }) => {
    session = null;
    api
      .on(ep.getProfileForUser, () => (session ? ok(session) : { status: 401 }))
      .on(ep.login, ({ body }) => {
        if (body.password !== "secret") return fail(401);
        session = profiles.companyAdmin({ companyId: 1 });
        return { status: "OK" as const };
      });
  });

  test("validates required fields without calling the API", async ({ page, api, tr }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submit.click();

    await expect(page.getByText(tr("auth.errors.usernameIsRequired"))).toBeVisible();
    await expect(page.getByText(tr("auth.errors.passwordIsRequired"))).toBeVisible();
    expect(api.callsTo(ep.login)).toHaveLength(0);
  });

  test("shows one error toast for a wrong password and stays on /login", async ({ page, tr }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login("coadmin@inatrace.test", "wrong");

    await expect(toasts(page, tr("notifications.wrongUsernameOrPassword"))).toBeVisible();
    await expect(toasts(page)).toHaveCount(1);
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in and returns to the page that required it", async ({ page, api }) => {
    await page.goto("/my-customers");
    await expect(page).toHaveURL(/\/login/);

    await new LoginPage(page).login("coadmin@inatrace.test", "secret");

    await expect(page).toHaveURL(/\/my-customers$/);
    expect(api.callsTo(ep.login)[0].body).toEqual({ username: "coadmin@inatrace.test", password: "secret" });
  });

  test("ignores an external redirect target", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto(`?to=${encodeURIComponent("https://evil.test/")}`);
    await login.login("coadmin@inatrace.test", "secret");
    await expect(page).toHaveURL(/\/home$/);
  });
});
