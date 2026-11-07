import type { ApiCompanyCustomer } from "@/client/types.gen";
import { ep } from "@/lib/endpoints";
import { companyCustomer, countries } from "../factories";
import { tr } from "../tr";
import { expect, test } from "./fixtures";
import { fail, ok, paged } from "./api-mock";
import { ConfirmDialog, toasts } from "../pages/components";
import { CustomerFormPage, CustomerListPage } from "../pages/company-customers.page";

const COMPANY_ID = 1;

test.describe("Company customers CRUD", () => {
  test.use({ companyId: COMPANY_ID });

  let db: ApiCompanyCustomer[];

  test.beforeEach(async ({ api }) => {
    db = [companyCustomer(), companyCustomer({ id: 102, name: "Blue Bean Co", email: "info@bluebean.test" })];

    // A tiny in-memory backend: the list reflects writes, so the real refetch / invalidation path is tested.
    api
      .on(ep.getCountries, () => paged(Object.values(countries)))
      .on(ep.getCompanyCustomersList, ({ params, url }) => {
        expect(Number(params.companyId)).toBe(COMPANY_ID);
        const query = url.searchParams.get("query")?.toLowerCase() ?? "";
        const limit = Number(url.searchParams.get("limit") ?? 10);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const hits = db.filter((c) => c.name!.toLowerCase().includes(query));
        return paged(hits.slice(offset, offset + limit), hits.length);
      })
      .on(ep.getCompanyCustomer, ({ params }) => ok(db.find((c) => c.id === Number(params.id))!))
      .on(ep.createCompanyCustomer, ({ body }) => {
        const created = { ...body, id: 200 + db.length };
        db.push(created);
        return ok(created);
      })
      .on(ep.updateCompanyCustomer, ({ body }) => {
        db = db.map((c) => (c.id === body.id ? { ...c, ...body } : c));
        return ok(body);
      })
      .on(ep.deleteCompanyCustomer, ({ params }) => {
        db = db.filter((c) => c.id !== Number(params.id));
        return ok(null as never);
      });
  });

  test("a new search starts from the first page, and a row opens the customer", async ({ page, api }) => {
    db = Array.from({ length: 12 }, (_, i) => companyCustomer({ id: 300 + i, name: `Roaster ${String(i + 1).padStart(2, "0")}` }));
    const list = new CustomerListPage(page);
    await list.goto();
    await expect(list.table.rows).toHaveCount(10);

    await page.getByRole("button", { name: tr("buttons.goToNextPage") }).click();
    await expect(list.table.rows).toHaveCount(2);

    // Three hits for "roaster 1" (10, 11, 12): all on page 1 of the new results; page 2 of them would be empty.
    await list.search.fill("roaster 1");
    await expect(list.table.rows).toHaveCount(3);
    expect(api.callsTo(ep.getCompanyCustomersList).at(-1)!.url.searchParams.get("offset") ?? "0").toBe("0");

    await list.table.row("Roaster 10").click();
    await expect(page).toHaveURL(/\/my-customers\/edit\/309$/);
  });

  test("lists customers and keeps the search in the URL", async ({ page, api }) => {
    const list = new CustomerListPage(page);
    await list.goto();

    await expect(list.table.rows).toHaveCount(2);
    await expect(list.total(2)).toBeVisible();

    await list.search.fill("blue");
    await expect(list.table.rows).toHaveCount(1);
    await expect(list.table.row("Blue Bean Co")).toBeVisible();
    expect(api.callsTo(ep.getCompanyCustomersList).at(-1)!.url.searchParams.get("query")).toBe("blue");

    await page.reload(); // syncWithLocation: the filter survives a reload
    await expect(list.search).toHaveValue("blue");
    await expect(list.table.rows).toHaveCount(1);
  });

  test("blocks invalid input, then creates a customer", async ({ page, api, tr }) => {
    const list = new CustomerListPage(page);
    const form = new CustomerFormPage(page);
    await list.goto();
    await list.addButton.click();
    await expect(page).toHaveURL(/\/my-customers\/add$/);

    await form.save.click();
    await expect(page.getByText(tr("common.errors.companyNameIsRequired"))).toBeVisible();
    expect(api.callsTo(ep.createCompanyCustomer)).toHaveLength(0);

    await form.name.fill("Green Leaf Ltd");
    await form.email.fill("hello@greenleaf.test");
    await form.chooseCountry("Germany");
    await form.city.fill("Hamburg");
    await form.state.fill("Hamburg");
    await form.save.click();

    await expect(page).toHaveURL(/\/my-customers$/);
    await expect(list.table.row("Green Leaf Ltd")).toBeVisible();
    await expect(list.total(3)).toBeVisible();
    expect(api.callsTo(ep.createCompanyCustomer)[0].body).toMatchObject({
      name: "Green Leaf Ltd",
      companyId: COMPANY_ID,
      location: { country: countries.germany, city: "Hamburg", state: "Hamburg" },
    });
  });

  test("pre-fills the edit form and sends the id in the PUT body", async ({ page, api, tr }) => {
    const list = new CustomerListPage(page);
    const form = new CustomerFormPage(page);
    await list.goto();
    await list.table.rowAction("Acme Roasters", tr("common.fields.edit"));

    await expect(page).toHaveURL(/\/my-customers\/edit\/101$/);
    await expect(form.name).toHaveValue("Acme Roasters");
    await expect(form.contact).toHaveValue("Jane Doe");

    await form.name.fill("Acme Roasters GmbH");
    await form.save.click();

    await expect(list.table.row("Acme Roasters GmbH")).toBeVisible();
    expect(api.callsTo(ep.updateCompanyCustomer)[0].body).toMatchObject({ id: 101, name: "Acme Roasters GmbH" });
  });

  test("keeps the form and shows one error toast when saving fails", async ({ page, api }) => {
    api.on(ep.updateCompanyCustomer, () => fail(500, "GENERIC_ERROR"));
    const form = new CustomerFormPage(page);
    await page.goto("/my-customers/edit/101");

    await expect(form.name).toHaveValue("Acme Roasters");
    await form.name.fill("Will not save");
    await form.save.click();

    await expect(toasts(page)).toHaveCount(1); // the HTTP layer's toast only, no duplicate from Refine
    await expect(page).toHaveURL(/\/my-customers\/edit\/101$/);
    await expect(form.name).toHaveValue("Will not save");
  });

  test("delete asks first; cancel keeps the row, confirm removes it", async ({ page, api, tr }) => {
    const list = new CustomerListPage(page);
    const dialog = new ConfirmDialog(page);
    await list.goto();

    await list.table.rowAction("Blue Bean Co", tr("common.fields.delete"));
    await expect(dialog.root).toContainText(tr("customers.descriptions.areYouSureYouWant"));
    await dialog.cancel();
    expect(api.callsTo(ep.deleteCompanyCustomer)).toHaveLength(0);

    await list.table.rowAction("Blue Bean Co", tr("common.fields.delete"));
    await dialog.confirm(tr("buttons.delete"));

    await expect(list.table.row("Blue Bean Co")).toHaveCount(0);
    await expect(list.total(1)).toBeVisible();
    expect(api.callsTo(ep.deleteCompanyCustomer)[0].path).toBe("/api/company/companyCustomers/102");
  });
});
