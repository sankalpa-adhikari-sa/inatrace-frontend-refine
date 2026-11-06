import { expect, type Locator, type Page } from "@playwright/test";
import { tr, trLabel } from "../tr";

export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByLabel(trLabel("auth.fields.username"));
    this.password = page.getByLabel(trLabel("auth.fields.password"));
    this.submit = page.getByRole("button", { name: tr("auth.buttons.login") });
  }

  async goto(query = "") {
    await this.page.goto(`/login${query}`);
    await expect(this.page.getByText(tr("auth.titles.welcomeBack"))).toBeVisible();
  }

  async login(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }
}
