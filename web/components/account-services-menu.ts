import { expect, type Locator, type Page } from '@playwright/test';

export type MenuOption =
  | 'Open New Account'
  | 'Accounts Overview'
  | 'Transfer Funds'
  | 'Bill Pay'
  | 'Find Transactions'
  | 'Update Contact Info'
  | 'Request Loan'
  | 'Log Out';

/** Menú lateral "Account Services", visible solo con sesión iniciada. */
export class AccountServicesMenu {
  readonly root: Locator;
  readonly welcome: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('#leftPanel');
    this.welcome = this.root.locator('p.smallText');
  }

  link(option: MenuOption): Locator {
    return this.root.getByRole('link', { name: option, exact: true });
  }

  async goTo(option: MenuOption): Promise<void> {
    await this.link(option).click();
  }

  async expectLoggedIn(fullName?: string): Promise<void> {
    await expect(this.link('Log Out')).toBeVisible();
    await expect(this.welcome).toContainText('Welcome');
    if (fullName) {
      await expect(this.welcome).toContainText(fullName);
    }
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.link('Log Out')).toBeHidden();
  }
}
