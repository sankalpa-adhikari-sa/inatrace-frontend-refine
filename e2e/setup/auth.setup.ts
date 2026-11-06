import { expect, type Page, test as setup } from "@playwright/test";
import { SESSION_ROLES, account, companyAdmin, type Role, storageStatePath } from "../env";

/**
 * Logs in once per role through the API and saves the session cookie plus the app's localStorage
 * (locale, selected company), so specs start logged in. The login form itself is tested in login.spec.ts.
 * Roles without an account (when running against an existing backend) are skipped.
 */
async function authenticate(page: Page, role: Role, username: string, password: string, companyId: number) {
  const res = await page.request.post("/api/user/login", { data: { username, password } });
  expect(res.ok(), `API login as ${role} failed with HTTP ${res.status()}. Is the backend running?`).toBeTruthy();

  await page.goto("/");
  await page.evaluate((id) => {
    localStorage.setItem("inatraceLocale", "en");
    localStorage.setItem("selectedUserCompany", String(id));
  }, companyId);
  await page.context().storageState({ path: storageStatePath(role) });
}

const { companyId } = companyAdmin();

for (const role of SESSION_ROLES) {
  setup(`authenticate ${role}`, async ({ page }) => {
    const acc = account(role);
    setup.skip(!acc, `no ${role} account configured`);
    await authenticate(page, role, acc!.username, acc!.password, companyId);
  });
}
