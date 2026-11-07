import { ep } from "@/lib/endpoints";
import { ok } from "./api-mock";
import { expect, test } from "./fixtures";

/** QR labels tab of a product (products/product-page/labels.tsx). */
test("a product without QR labels explains them and offers to create one", async ({ page, api, tr }) => {
  api
    .on(ep.getProduct, ({ params }) =>
      ok({
        id: Number(params.id),
        name: "Coffee One",
        valueChain: { id: 1, name: "Coffee" },
        associatedCompanies: [{ type: "OWNER", company: { id: 1, name: "Test Co-op" } }],
      }),
    )
    .on(ep.getProductLabels, () => ok([]));
  await page.goto("/product-labels/8");

  await expect(page.getByText(tr("products.productPage.titles.noQrLabelsYet"), { exact: true })).toBeVisible();
  const create = page.getByRole("button", { name: tr("products.productPage.buttons.newLabel") });
  await expect(create).toHaveCount(1);
  // A real button, not a sliver: at least the size of a standard button.
  const box = (await create.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(28);
  await create.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
