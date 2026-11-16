import { expect, type Locator, type Page } from '@playwright/test';
import type { Credentials } from '../../shared/data/types';
import { BasePage } from './base.page';

/** Página de inicio con el panel "Customer Login". */
export class LoginPage extends BasePage {
  protected readonly path = 'index.htm';

  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    const panel = page.locator('#loginPanel');
    this.username = panel.locator('input[name="username"]');
    this.password = panel.locator('input[name="password"]');
    this.submit = panel.getByRole('button', { name: 'Log In' });
    this.registerLink = panel.getByRole('link', { name: 'Register' });
  }

  async login({ username, password }: Credentials): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }

  async expectVisible(): Promise<void> {
    await expect(this.username).toBeVisible();
    await expect(this.password).toBeVisible();
    await expect(this.submit).toBeVisible();
  }

  async expectLoginRejected(): Promise<void> {
    await this.expectTitle('Error!');
    await expect(this.errorMessage).toHaveText('The username and password could not be verified.');
  }
}
