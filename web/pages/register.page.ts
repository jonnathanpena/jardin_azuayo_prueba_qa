import { expect, type Locator, type Page } from '@playwright/test';
import type { NewCustomer } from '../../shared/data/types';
import { BasePage } from './base.page';

export class RegisterPage extends BasePage {
  protected readonly path = 'register.htm';

  readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.submit = page.locator('#customerForm').getByRole('button', { name: 'Register' });
  }

  /** Los ids de ParaBank contienen puntos (customer.firstName), por eso se usa el selector de atributo. */
  private field(id: string): Locator {
    return this.page.locator(`[id="${id}"]`);
  }

  async register(customer: NewCustomer): Promise<void> {
    await this.field('customer.firstName').fill(customer.firstName);
    await this.field('customer.lastName').fill(customer.lastName);
    await this.field('customer.address.street').fill(customer.address.street);
    await this.field('customer.address.city').fill(customer.address.city);
    await this.field('customer.address.state').fill(customer.address.state);
    await this.field('customer.address.zipCode').fill(customer.address.zipCode);
    await this.field('customer.phoneNumber').fill(customer.phoneNumber);
    await this.field('customer.ssn').fill(customer.ssn);
    await this.field('customer.username').fill(customer.username);
    await this.field('customer.password').fill(customer.password);
    await this.field('repeatedPassword').fill(customer.password);
    await this.submit.click();
  }

  async expectRegistered(username: string): Promise<void> {
    await this.expectTitle(`Welcome ${username}`);
    await expect(this.page.locator('#rightPanel')).toContainText(
      'Your account was created successfully. You are now logged in.',
    );
  }
}
