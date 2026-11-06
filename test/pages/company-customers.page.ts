import { expect, type Locator, type Page } from "@playwright/test";
import { tr, trLabel } from "../tr";
import { DataTable } from "./components";

/** `/my-customers` (resource "company-customers"). */
export class CustomerListPage {
  readonly heading: Locator;
  readonly addButton: Locator;
  readonly search: Locator;
  readonly table: DataTable;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: tr("customers.titles.customers") });
    this.addButton = page.getByRole("button", { name: tr("customers.buttons.addCustomer") });
    this.search = page.getByPlaceholder(tr("customers.placeholders.searchCustomers"));
    this.table = new DataTable(page);
  }

  async goto() {
    await this.page.goto("/my-customers");
    await expect(this.heading).toBeVisible();
  }

  /** Types into the search box and waits for the filtered list, so rows don't re-render under the next click. */
  async searchFor(text: string) {
    const filtered = this.page.waitForResponse(
      (r) => r.url().includes("/companyCustomers/list/") && new URL(r.url()).searchParams.get("query") === text,
    );
    await this.search.fill(text);
    await filtered;
    await expect(this.table.row(text)).toBeVisible();
  }

  total(count: number) {
    return this.page.getByText(tr("customers.descriptions.listOfCustomersTotal", { total: count }));
  }
}

/** `/my-customers/add` and `/my-customers/edit/:id`. */
export class CustomerFormPage {
  readonly name: Locator;
  readonly contact: Locator;
  readonly email: Locator;
  readonly country: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly save: Locator;

  constructor(private readonly page: Page) {
    this.name = page.getByLabel(trLabel("common.fields.companyName"));
    this.contact = page.getByLabel(trLabel("customers.fields.contact"));
    this.email = page.getByLabel(trLabel("common.fields.eMail"));
    this.country = page.getByRole("combobox", { name: trLabel("common.fields.country") });
    this.city = page.getByLabel(/^City/);
    this.state = page.getByLabel(/^State/);
    this.save = page.getByRole("button", { name: tr("buttons.save") });
  }

  async chooseCountry(name: string) {
    await this.country.fill(name.slice(0, 4));
    await this.page.getByRole("option", { name }).click();
  }
}
