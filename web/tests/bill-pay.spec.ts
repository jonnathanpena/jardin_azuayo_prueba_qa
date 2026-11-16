import { buildBillPayment } from '../../shared/data/bill-pay.data';
import { toCents } from '../../shared/utils/money';
import { expect, test } from '../fixtures/test.fixture';

test.describe('Pago de servicios — flujo principal', () => {
  test.beforeEach(async ({ billPayPage, menu, customer }) => {
    await billPayPage.page.goto('overview.htm');
    await menu.expectLoggedIn(customer.fullName);
    await menu.goTo('Bill Pay');
    await billPayPage.expectLoaded();
  });

  test(
    'CP-002 Registrar un pago de servicio básico con datos válidos',
    {
      tag: ['@smoke', '@regression', '@mobile'],
      annotation: { type: 'AC', description: 'AC-02, AC-03, AC-04' },
    },
    async ({ billPayPage, customer }) => {
      const payment = buildBillPayment('electricity', { amount: '25.75' });

      await billPayPage.pay(payment, customer.primaryAccountId);

      await billPayPage.expectPaymentCompleted(payment, customer.primaryAccountId);
      await expect(billPayPage.form).toBeHidden();
    },
  );

  test(
    'CP-003 El pago descuenta el saldo y queda registrado como débito en la cuenta origen',
    { tag: ['@smoke', '@regression'], annotation: { type: 'AC', description: 'AC-04' } },
    async ({ billPayPage, activityPage, customer }) => {
      const payment = buildBillPayment('water', { amount: '42.10' });

      await activityPage.open(customer.primaryAccountId);
      const balanceBefore = await activityPage.readBalanceCents();

      await billPayPage.goto();
      await billPayPage.pay(payment, customer.primaryAccountId);
      await billPayPage.expectPaymentCompleted(payment, customer.primaryAccountId);

      await activityPage.open(customer.primaryAccountId);
      await expect
        .poll(() => activityPage.readBalanceCents(), { message: 'saldo después del pago' })
        .toBe(balanceBefore - toCents(payment.amount));
      await activityPage.expectDebit(`Bill Payment to ${payment.payee.name}`, Number(payment.amount));
    },
  );

  test(
    'CP-004 Aceptar el monto mínimo positivo (0.01)',
    { tag: ['@regression'], annotation: { type: 'AC', description: 'AC-03 (valor límite)' } },
    async ({ billPayPage, activityPage, customer }) => {
      const payment = buildBillPayment('internet', { amount: '0.01' });

      await activityPage.open(customer.primaryAccountId);
      const balanceBefore = await activityPage.readBalanceCents();

      await billPayPage.goto();
      await billPayPage.pay(payment, customer.primaryAccountId);
      await billPayPage.expectPaymentCompleted(payment, customer.primaryAccountId);

      await activityPage.open(customer.primaryAccountId);
      await expect.poll(() => activityPage.readBalanceCents()).toBe(balanceBefore - 1);
    },
  );
});
