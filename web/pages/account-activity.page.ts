import { expect, type Locator, type Page } from '@playwright/test';
import { formatCurrency, toCents } from '../../shared/utils/money';
import { BasePage } from './base.page';

/** Detalle y movimientos de una cuenta (activity.htm?id=...). */
export class AccountActivityPage extends BasePage {
  protected readonly path = 'activity.htm';

  readonly accountId: Locator;
  readonly accountType: Locator;
  readonly balance: Locator;
  readonly availableBalance: Locator;
  readonly month: Locator;
  readonly transactionType: Locator;
  readonly go: Locator;
  readonly transactions: Locator;
  readonly noTransactions: Locator;

  constructor(page: Page) {
    super(page);
    this.accountId = page.locator('#accountId');
    this.accountType = page.locator('#accountType');
    this.balance = page.locator('#balance');
    this.availableBalance = page.locator('#availableBalance');
    this.month = page.locator('#month');
    this.transactionType = page.locator('#transactionType');
    this.go = page.locator('#activityForm').getByRole('button', { name: 'Go' });
    this.transactions = page.locator('#transactionTable tbody tr');
    this.noTransactions = page.locator('#noTransactions');
  }

  async open(accountId: string): Promise<void> {
    await this.page.goto(`${this.path}?id=${accountId}`);
    await expect(this.accountId).toHaveText(accountId);
  }

  async readBalanceCents(): Promise<number> {
    await expect(this.balance).toHaveText(/\$\d/);
    return toCents(await this.balance.innerText());
  }

  async filter(month: string, type: 'All' | 'Credit' | 'Debit'): Promise<void> {
    await this.month.selectOption(month);
    await this.transactionType.selectOption(type);
    await this.go.click();
  }

  transactionRow(description: string): Locator {
    return this.transactions.filter({ has: this.page.getByRole('link', { name: description, exact: true }) });
  }

  /** AC-04: el pago debe quedar como débito con la descripción y el monto exactos. */
  async expectDebit(description: string, amount: number): Promise<void> {
    const row = this.transactionRow(description);
    await expect(row).toHaveCount(1);
    const cells = row.locator('td');
    await expect(cells.nth(2)).toHaveText(formatCurrency(amount));
    await expect(cells.nth(3)).toHaveText('');
  }

  async expectNoTransaction(description: string): Promise<void> {
    await expect(this.transactions.or(this.noTransactions).first()).toBeVisible();
    await expect(this.transactionRow(description)).toHaveCount(0);
  }
}
