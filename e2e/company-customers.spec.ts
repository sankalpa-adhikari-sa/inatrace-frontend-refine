import { expect, test } from "@playwright/test";
import { tr } from "../test/tr";
import { ConfirmDialog } from "../test/pages/components";
import { CustomerFormPage, CustomerListPage } from "../test/pages/company-customers.page";
import { companyAdmin, storageStatePath } from "./env";

/**
 * Company customer lifecycle against the real backend, as the company admin. Data is created with a
 * unique name per run and removed afterwards, so runs don't depend on or disturb each other.
 */
const admin = companyAdmin();

test.describe("Company customers lifecycle", () => {
  test.use({ storageState: storageStatePath("company-admin") });

  let name: string;

  test.beforeEach(({}, testInfo) => {
    name = `e2e-${testInfo.workerIndex}-${Date.now()}`;
  });

  // Remove anything a failed run left behind.
  test.afterEach(async ({ request }) => {
    const res = await request.get(`/api/company/companyCustomers/list/${admin.companyId}`, {
      params: { query: name, limit: 50, offset: 0 },
    });
    const items: { id: number; name: string }[] = (await res.json())?.data?.items ?? [];
    for (const c of items.filter((i) => i.name.startsWith(name))) {
      await request.delete(`/api/company/companyCustomers/${c.id}`);
    }
  });

  test("create, find, edit and delete a customer", async ({ page }) => {
    const list = new CustomerListPage(page);
    const form = new CustomerFormPage(page);
    const dialog = new ConfirmDialog(page);

    await list.goto();
    await list.addButton.click();
    await form.name.fill(name);
    await form.chooseCountry("Germany");
    await form.city.fill("Hamburg");
    await form.state.fill("Hamburg");
    await form.save.click();
    await expect(page).toHaveURL(/\/my-customers$/);

    await list.searchFor(name);

    await list.table.rowAction(name, tr("common.fields.edit"));
    await expect(form.name).toHaveValue(name);
    await form.contact.fill("E2E contact");
    await form.save.click();
    await expect(page).toHaveURL(/\/my-customers/);

    await list.searchFor(name);
    await list.table.rowAction(name, tr("common.fields.delete"));
    await dialog.confirm(tr("buttons.delete"));
    await expect(list.table.row(name)).toHaveCount(0);
  });
});
