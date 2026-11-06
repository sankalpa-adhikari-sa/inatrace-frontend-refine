import { expect, test } from "@playwright/test";
import { ConfirmDialog, toasts } from "../test/pages/components";
import { FacilityFormPage, FacilityListPage } from "../test/pages/facilities.page";
import { humanizedEnum, tr } from "../test/tr";
import { companyAdmin, referenceData, storageStatePath } from "./env";

/**
 * Facility lifecycle against the real backend, as the company admin: create, edit, deactivate and
 * activate. Facilities can't be deleted in the UI, so the test deletes its own through the API afterwards.
 * The facility type and the company's value chain come from referenceData() (seed or E2E_* variables).
 */
const { facilityType: FACILITY_TYPE, valueChain: VALUE_CHAIN } = referenceData();

const admin = companyAdmin();

test.describe("Facility lifecycle", () => {
  test.use({ storageState: storageStatePath("company-admin") });

  let name: string;

  test.beforeEach(({}, testInfo) => {
    name = `e2e-facility-${testInfo.workerIndex}-${Date.now()}`;
  });

  test.afterEach(async ({ request }) => {
    const res = await request.get(`/api/chain/facility/list/company/${admin.companyId}/all`, { params: { limit: 500 } });
    const items: { id: number; name?: string }[] = (await res.json())?.data?.items ?? [];
    for (const f of items.filter((i) => i.name?.startsWith(name))) {
      const del = await request.delete(`/api/chain/facility/${f.id}`);
      expect(del.ok(), `cleanup: deleting facility ${f.id} failed with ${del.status()}`).toBeTruthy();
    }
  });

  test("create, edit, deactivate and activate a facility", async ({ page }) => {
    const list = new FacilityListPage(page);
    const form = new FacilityFormPage(page);

    await list.goto(admin.companyId);
    await list.newButton.click();
    await expect(page).toHaveURL(/\/facilities\/add$/);

    await form.choose("companies.fields.facilityType", FACILITY_TYPE);
    await form.name.fill(name);
    await form.chooseCountry("Rwanda");
    // Not public, so no map pin is required.
    await form.choose("common.fields.isLocationPubliclyVisibleOn", tr("common.fields.no"));
    await form.choose("companies.fields.isThisACollectionFacility", tr("common.fields.no"));
    await form.choose("companies.fields.containsSellableSemiProductsOr", tr("common.fields.no"));
    await form.addValueChain(VALUE_CHAIN);
    await form.save.click();

    await expect(page).toHaveURL(new RegExp(`/companies/${admin.companyId}/facilities$`));
    await expect(list.table.row(name)).toBeVisible();
    await expect(list.status(name)).toHaveText(humanizedEnum("ACTIVE"));

    // Edit: the form loads the saved values, and the new name is saved.
    await list.table.rowAction(name, tr("common.fields.edit"));
    await expect(form.name).toHaveValue(name);
    await form.name.fill(`${name} edited`);
    await form.save.click();
    await expect(list.table.row(`${name} edited`)).toBeVisible();

    // Deactivate asks first; activate doesn't.
    await list.table.rowAction(`${name} edited`, tr("companies.fields.deactivate"));
    await new ConfirmDialog(page).confirm(tr("companies.buttons.deactivate"));
    await expect(toasts(page, tr("companies.notifications.facilityDeactivated"))).toBeVisible();
    await expect(list.status(`${name} edited`)).toHaveText(humanizedEnum("DEACTIVATED"));

    await list.table.rowAction(`${name} edited`, tr("companies.fields.activate"));
    await expect(list.status(`${name} edited`)).toHaveText(humanizedEnum("ACTIVE"));
  });
});
