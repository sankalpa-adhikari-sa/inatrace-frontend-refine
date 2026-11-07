import { ep } from "@/lib/endpoints";
import { paged } from "./api-mock";
import { expect, test } from "./fixtures";

/**
 * Navigation and error handling on long forms (components/app/form-layout.tsx), on the company form:
 * a table of contents that marks sections with errors, a sticky save bar with the error count, focus on
 * the first error after a failed save, and the unsaved-changes warning.
 */
test.describe("Long form (company)", () => {
  test.beforeEach(async ({ api }) => {
    api
      .on(ep.getCountries, () => paged([]))
      .on(ep.getEnabledCurrencyTypes, () => paged([]))
      .on(ep.getValueChainList, () => paged([]));
  });

  test("a failed save marks the sections with errors and focuses the first one", async ({ page, tr }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/companies/1/company");

    const rail = page.getByRole("navigation", { name: tr("common.titles.onThisPage") });
    await expect(rail).toBeVisible();
    await expect(rail.getByRole("link", { name: tr("common.titles.basicInformation") })).toHaveAttribute("aria-current", "location");

    await page.getByRole("button", { name: tr("buttons.save") }).click();

    // The sticky bar says how many fields need fixing; the rail marks the sections they're in.
    await expect(page.getByText(new RegExp(`^${tr("common.texts.fieldsToFix", { count: 0 }).replace("0", "\\d+")}`))).toBeVisible();
    const hasErrors = tr("common.texts.hasErrors");
    await expect(rail.getByRole("link", { name: tr("common.titles.basicInformation") }).getByRole("img", { name: hasErrors })).toBeVisible();
    await expect(rail.getByRole("link", { name: tr("companies.titles.socialMedia") }).getByRole("img", { name: hasErrors })).toHaveCount(0);
    // The logo upload is the first invalid field: it has no ref for react-hook-form to focus, so this is ours.
    await expect(page.locator("#basic :focus")).toHaveCount(1);
    await page.screenshot({ path: ".playwright/results/long-form-desktop-errors.png", fullPage: false });

    // Jumping to a section scrolls there and makes it linkable.
    await rail.getByRole("link", { name: tr("companies.titles.certification") }).click();
    await expect(page).toHaveURL(/#certification$/);
    await expect(page.locator("#certification")).toBeInViewport();
    await expect(rail.getByRole("link", { name: tr("companies.titles.certification") })).toHaveAttribute("aria-current", "location");
  });

  test("on a phone the contents are a Jump to menu", async ({ page, tr }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/companies/1/company");

    await expect(page.getByRole("navigation", { name: tr("common.titles.onThisPage") })).toBeHidden();
    const jump = page.getByRole("button", { name: new RegExp(tr("common.placeholders.jumpTo")) });
    await expect(jump).toBeVisible();
    await page.screenshot({ path: ".playwright/results/long-form-mobile.png" });

    await jump.click();
    await page.getByRole("menuitem", { name: tr("companies.titles.socialMedia") }).click();
    await expect(page.locator("#social-media")).toBeInViewport();
    // Still reachable after scrolling: the menu sticks below the app header.
    await expect(jump).toBeInViewport();
  });

  test("warns before leaving with unsaved changes", async ({ page, tr }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/companies/1/company");
    // Loading the record isn't an edit (Refine fills edit forms with setValue).
    await expect(page.getByLabel(tr("common.fields.companyName"))).toHaveValue("Test Co-op");
    await expect(page.getByText(tr("common.texts.unsavedChanges"))).toHaveCount(0);

    await page.getByLabel(tr("companies.fields.city")).fill("Kigali");
    await expect(page.getByText(tr("common.texts.unsavedChanges"))).toBeVisible();

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("link", { name: tr("common.fields.home"), exact: true }).first().click();
    await expect(page).toHaveURL(/\/companies\/1\/company/);
  });
});
