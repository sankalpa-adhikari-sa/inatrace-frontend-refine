import { ep } from "@/lib/endpoints";
import { paged } from "./api-mock";
import { expect, test } from "./fixtures";

/** The farmers list sorts by one column at a time, and that column is what the backend is asked for. */
test("sorting the farmers list asks the backend for the clicked column", async ({ page, api, tr }) => {
  api.on(ep.getUserCustomersForCompanyAndType, () => paged([]));
  await page.goto("/my-farmers");
  const lastSort = () => {
    const url = api.callsTo(ep.getUserCustomersForCompanyAndType).at(-1)?.url.searchParams;
    return url && `${url.get("sortBy")} ${url.get("sort")}`;
  };
  await expect.poll(lastSort).toBe("BY_NAME ASC");

  const header = (key: string) => page.getByRole("button", { name: new RegExp(tr("common.fields." + key)) });
  await header("lastName").click();
  await expect.poll(lastSort).toBe("BY_SURNAME ASC");
  await header("lastName").click();
  await expect.poll(lastSort).toBe("BY_SURNAME DESC");
  await header("lastName").click();
  await expect.poll(lastSort).toBe("BY_SURNAME ASC");
  await header("firstName").click();
  await expect.poll(lastSort).toBe("BY_NAME ASC");
});
