import { buildBillPayment, NON_POSITIVE_AMOUNTS } from '../../shared/data/bill-pay.data';
import { toCents } from '../../shared/utils/money';
import { expect, test } from '../fixtures/test.fixture';

test.describe('Pago de servicios — regresión de saldos', () => {
  test(
    'CP-015 Accounts Overview refleja el mismo saldo que el detalle tras un pago',
    { tag: ['@regression'], annotation: { type: 'AC', description: 'AC-04' } },
    async ({ billPayPage, overviewPage, activityPage, customer }) => {
      const payment = buildBillPayment('internet', { amount: '13.37' });
      await overviewPage.goto();
      const before = await overviewPage.balanceOf(customer.primaryAccountId);

      await billPayPage.goto();
      await billPayPage.pay(payment, customer.primaryAccountId);
      await billPayPage.expectPaymentCompleted(payment, customer.primaryAccountId);

      await overviewPage.goto();
      const accounts = await overviewPage.readAccounts();
      const after = accounts.find((a) => a.id === customer.primaryAccountId)?.balanceCents;
      expect(after, 'saldo en Accounts Overview').toBe(before - toCents(payment.amount));

      const sum = accounts.reduce((total, a) => total + a.balanceCents, 0);
      expect(await overviewPage.readTotalCents(), 'fila Total = suma de cuentas').toBe(sum);

      await activityPage.open(customer.primaryAccountId);
      expect(await activityPage.readBalanceCents(), 'saldo en el detalle de la cuenta').toBe(after);
    },
  );
});

// AC-03 (monto > 0): fallan mientras exista DEF-001 (ver evidencias/defectos.md).
test.describe('Pago de servicios — reglas de negocio del monto', () => {
  for (const { id, label, value } of NON_POSITIVE_AMOUNTS) {
    test(
      `${id} Rechazar un pago con monto ${label} (${value})`,
      {
        tag: ['@negative', '@known-defect'],
        annotation: [
          { type: 'AC', description: 'AC-03, AC-05' },
          { type: 'issue', description: 'DEF-001' },
        ],
      },
      async ({ billPayPage, activityPage, customer }) => {
        const payment = buildBillPayment('electricity', { amount: value });

        await activityPage.open(customer.primaryAccountId);
        const balanceBefore = await activityPage.readBalanceCents();

        await billPayPage.goto();
        await billPayPage.pay(payment, customer.primaryAccountId);

        await test.step('el sistema no confirma el pago', async () => {
          await billPayPage.expectPaymentNotCompleted();
        });

        await test.step('el saldo no cambia y no se registra movimiento', async () => {
          await activityPage.open(customer.primaryAccountId);
          expect(await activityPage.readBalanceCents()).toBe(balanceBefore);
          await activityPage.expectNoTransaction(`Bill Payment to ${payment.payee.name}`);
        });
      },
    );
  }
});
