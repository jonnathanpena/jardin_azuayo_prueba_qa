import { expect, type Locator, type Page } from '@playwright/test';
import type { BillPayField } from '../../shared/data/bill-pay.data';
import type { BillPayment } from '../../shared/data/types';
import { formatCurrency } from '../../shared/utils/money';
import { BasePage } from './base.page';

/** Página "Bill Payment Service" (billpay.htm). */
export class BillPayPage extends BasePage {
  protected readonly path = 'billpay.htm';

  readonly form: Locator;
  readonly result: Locator;
  readonly serverError: Locator;
  readonly fromAccount: Locator;
  readonly sendPayment: Locator;
  readonly visibleValidationErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.form = page.locator('#billpayForm');
    this.result = page.locator('#billpayResult');
    this.serverError = page.locator('#billpayError');
    this.fromAccount = this.form.locator('select[name="fromAccountId"]');
    this.sendPayment = this.form.getByRole('button', { name: 'Send Payment' });
    this.visibleValidationErrors = this.form.locator('[id^="validationModel"]:visible');
  }

  /** El teléfono tiene id/clase aleatorios en cada carga: el atributo name es el único localizador estable. */
  input(field: BillPayField): Locator {
    return this.form.locator(`input[name="${field}"]`);
  }

  validationError(id: string): Locator {
    return this.form.locator(`#validationModel-${id}`);
  }

  async expectLoaded(): Promise<void> {
    await this.expectTitle('Bill Payment Service');
    await expect(this.sendPayment).toBeVisible();
  }

  async fillForm(payment: BillPayment, fromAccountId?: string): Promise<void> {
    const { payee } = payment;
    // El formulario carga sus datos por AJAX y, si se envía antes de terminar, el clic no hace nada.
    // eslint-disable-next-line playwright/no-networkidle -- no hay otra señal fiable de que el formulario esté listo
    await this.page.waitForLoadState('networkidle');
    await this.input('payee.name').fill(payee.name);
    await this.input('payee.address.street').fill(payee.address.street);
    await this.input('payee.address.city').fill(payee.address.city);
    await this.input('payee.address.state').fill(payee.address.state);
    await this.input('payee.address.zipCode').fill(payee.address.zipCode);
    await this.input('payee.phoneNumber').fill(payee.phoneNumber);
    await this.input('payee.accountNumber').fill(payee.accountNumber);
    await this.input('verifyAccount').fill(payment.verifyAccount);
    await this.input('amount').fill(payment.amount);
    if (fromAccountId) {
      await this.fromAccount.selectOption(fromAccountId);
    }
  }

  async submit(): Promise<void> {
    await this.sendPayment.click();
  }

  async pay(payment: BillPayment, fromAccountId?: string): Promise<void> {
    await this.fillForm(payment, fromAccountId);
    await this.submit();
  }

  /** AC-04: confirmación visible con beneficiario, monto y cuenta origen. */
  async expectPaymentCompleted(payment: BillPayment, fromAccountId: string): Promise<void> {
    await expect(this.result).toBeVisible();
    await expect(this.result.locator('h1.title')).toHaveText('Bill Payment Complete');
    await expect(this.result.locator('#payeeName')).toHaveText(payment.payee.name);
    await expect(this.result.locator('#amount')).toHaveText(formatCurrency(Number(payment.amount)));
    await expect(this.result.locator('#fromAccountId')).toHaveText(fromAccountId);
    await expect(this.result).toContainText(
      `Bill Payment to ${payment.payee.name} in the amount of ${formatCurrency(Number(payment.amount))} from account ${fromAccountId} was successful.`,
    );
  }

  // AC-05: un pago rechazado no debe mostrarse como exitoso. Se espera primero un desenlace visible
  // para no dar un falso positivo antes de que responda el AJAX.
  async expectPaymentNotCompleted(): Promise<void> {
    const outcome = this.result
      .or(this.serverError)
      .or(this.visibleValidationErrors)
      .filter({ visible: true });
    await expect(outcome.first()).toBeVisible();
    await expect(this.result, 'el pago no debe mostrarse como exitoso').toBeHidden();
  }

  async expectValidationErrors(expected: Record<string, string>): Promise<void> {
    for (const [id, message] of Object.entries(expected)) {
      await expect(this.validationError(id)).toBeVisible();
      await expect(this.validationError(id)).toHaveText(message);
    }
    await expect(this.visibleValidationErrors).toHaveCount(Object.keys(expected).length);
    await this.expectPaymentNotCompleted();
  }

  async expectServerError(): Promise<void> {
    await expect(this.serverError).toBeVisible();
    await expect(this.serverError.locator('h1.title')).toHaveText('Error!');
    await expect(this.serverError.locator('p.error')).toHaveText(
      'An internal error has occurred and has been logged.',
    );
    await this.expectPaymentNotCompleted();
  }
}
