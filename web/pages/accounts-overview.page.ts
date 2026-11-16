import { expect, type Locator, type Page } from '@playwright/test';
import { parseCurrency, toCents } from '../../shared/utils/money';
import { BasePage } from './base.page';

export interface AccountRow {
  id: string;
  balanceCents: number;
  availableCents: number;
}

export class AccountsOverviewPage extends BasePage {
  protected readonly path = 'overview.htm';

  readonly table: Locator;
  /** Filas de cuentas: las que tienen enlace a la actividad (excluye la fila "Total" y la nota al pie). */
  readonly accountRows: Locator;
  readonly totalRow: Locator;

  constructor(page: Page) {
    super(page);
    this.table = page.locator('#accountTable');
    this.accountRows = this.table
      .locator('tbody tr')
      .filter({ has: page.locator('a[href*="activity.htm"]') });
    this.totalRow = this.table.locator('tbody tr').filter({ hasText: 'Total' });
  }

  /** La tabla se carga por AJAX: se espera a que exista al menos una cuenta antes de leerla. */
  async waitForAccounts(): Promise<void> {
    await this.expectTitle('Accounts Overview');
    await expect(this.accountRows.first()).toBeVisible();
  }

  async readAccounts(): Promise<AccountRow[]> {
    await this.waitForAccounts();
    const rows = await this.accountRows.all();
    const accounts: AccountRow[] = [];
    for (const row of rows) {
      const cells = row.locator('td');
      accounts.push({
        id: (await cells.nth(0).innerText()).trim(),
        balanceCents: toCents(await cells.nth(1).innerText()),
        availableCents: toCents(await cells.nth(2).innerText()),
      });
    }
    return accounts;
  }

  async readTotalCents(): Promise<number> {
    await this.waitForAccounts();
    return toCents(parseCurrency(await this.totalRow.locator('td').nth(1).innerText()));
  }

  async balanceOf(accountId: string): Promise<number> {
    const account = (await this.readAccounts()).find((a) => a.id === accountId);
    if (!account) {
      throw new Error(`La cuenta ${accountId} no aparece en Accounts Overview`);
    }
    return account.balanceCents;
  }

  async openActivity(accountId: string): Promise<void> {
    await this.waitForAccounts();
    await this.table.getByRole('link', { name: accountId, exact: true }).click();
  }
}
