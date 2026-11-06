import { expect, type Locator, type Page } from "@playwright/test";
import { tr } from "../tr";

/** The shared confirm dialog (components/app/confirm.tsx, a Base UI AlertDialog). */
export class ConfirmDialog {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("alertdialog");
  }

  async confirm(label: string) {
    await this.root.getByRole("button", { name: label }).click();
    await expect(this.root).toBeHidden();
  }

  async cancel(label = tr("buttons.cancel")) {
    await this.root.getByRole("button", { name: label }).click();
    await expect(this.root).toBeHidden();
  }
}

/** Toasts (Base UI toast, components/ui/toast.tsx). Match by text, never by position: they stack. */
export function toasts(page: Page, text?: string | RegExp) {
  const all = page.locator('[data-slot="toast"]');
  return text ? all.filter({ hasText: text }) : all;
}

/** A refine-ui DataTable with RowActions menus. */
export class DataTable {
  readonly rows: Locator;

  constructor(private readonly page: Page, root: Locator = page.getByRole("table")) {
    this.rows = root.locator("tbody tr");
  }

  row(text: string) {
    return this.rows.filter({ has: this.page.getByRole("cell", { name: text, exact: true }) });
  }

  async rowAction(rowText: string, action: string) {
    await this.row(rowText).getByRole("button", { name: tr("buttons.actions") }).click();
    await this.page.getByRole("menuitem", { name: action }).click();
  }

  nextPage() {
    return this.page.getByRole("button", { name: tr("buttons.goToNextPage") });
  }
}
