import { expect, type Locator, type Page } from "@playwright/test";
import { tr, trLabel } from "../tr";
import { DataTable } from "./components";

/** `/companies/:id/facilities` (resource "facilities"). */
export class FacilityListPage {
  readonly newButton: Locator;
  readonly table: DataTable;

  constructor(private readonly page: Page) {
    this.newButton = page.getByRole("button", { name: tr("companies.buttons.newFacility") });
    this.table = new DataTable(page);
  }

  async goto(companyId: number) {
    await this.page.goto(`/companies/${companyId}/facilities`);
    await expect(this.newButton).toBeVisible();
  }

  status(name: string) {
    return this.table.row(name).getByRole("cell").nth(4);
  }
}

/** `/companies/:id/facilities/add` and `…/:facilityId/edit`. */
export class FacilityFormPage {
  /** English name; the other languages' tabs stay mounted but hidden. */
  readonly name: Locator;
  readonly save: Locator;

  constructor(private readonly page: Page) {
    this.name = page.getByRole("tabpanel").getByLabel(trLabel("companies.fields.nameOfFacility"));
    this.save = page.getByRole("button", { name: tr("buttons.save") });
  }

  /** Picks `option` in the select or combobox labelled with `labelKey`. */
  async choose(labelKey: string, option: string) {
    await this.page.getByRole("combobox", { name: trLabel(labelKey) }).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }

  async chooseCountry(name: string) {
    await this.page.getByRole("combobox", { name: trLabel("common.fields.country") }).fill(name.slice(0, 4));
    await this.page.getByRole("option", { name, exact: true }).click();
  }

  /** Adds a value chain from the "Value chains" section's picker. */
  async addValueChain(name: string) {
    // Form sections are labelled regions (Section with an id); the name leaves out the required "*".
    const section = this.page.getByRole("region", { name: tr("companies.titles.valueChains"), exact: true });
    await section.getByRole("combobox").click();
    await this.page.getByRole("option", { name, exact: true }).click();
    // Added items show as chips (list items with a remove button).
    await expect(section.getByRole("listitem").filter({ hasText: name })).toBeVisible();
  }
}
