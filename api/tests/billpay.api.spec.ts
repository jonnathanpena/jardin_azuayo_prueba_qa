import { buildBillPayment } from '../../shared/data/bill-pay.data';
import { toCents } from '../../shared/utils/money';
import { expect, test } from '../fixtures/api.fixture';

test.describe('API — pago de servicios (POST /billpay)', () => {
  test(
    'API CP-002/CP-003 Un pago válido descuenta el saldo y genera el débito',
    { tag: ['@smoke', '@regression'], annotation: { type: 'AC', description: 'AC-02, AC-03, AC-04' } },
    async ({ api, paymentAccount }) => {
      const { payee, amount } = buildBillPayment('electricity', { amount: '25.75' });

      const result = await api.billPay(paymentAccount.id, amount, payee);

      expect(result).toEqual(
        expect.objectContaining({
          payeeName: payee.name,
          amount: Number(amount),
          accountId: paymentAccount.id,
        }),
      );

      await test.step('el saldo baja exactamente el monto pagado', async () => {
        const after = await api.account(paymentAccount.id);
        expect(toCents(after.balance)).toBe(toCents(paymentAccount.balance) - toCents(amount));
      });

      await test.step('existe un único débito "Bill Payment to <beneficiario>"', async () => {
        const debits = (await api.transactions(paymentAccount.id)).filter(
          (t) => t.description === `Bill Payment to ${payee.name}`,
        );
        expect(debits).toHaveLength(1);
        expect(debits[0]).toEqual(
          expect.objectContaining({ type: 'Debit', amount: Number(amount), accountId: paymentAccount.id }),
        );
      });
    },
  );

  test(
    'API CP-017 El pago se puede localizar buscando por monto',
    { tag: ['@regression'], annotation: { type: 'AC', description: 'AC-04' } },
    async ({ api, paymentAccount }) => {
      const { payee, amount } = buildBillPayment('water', { amount: '17.43' });
      await api.billPay(paymentAccount.id, amount, payee);

      const found = await api.transactionsByAmount(paymentAccount.id, amount);

      expect(found.map((t) => t.description)).toContain(`Bill Payment to ${payee.name}`);
      expect(found.every((t) => t.amount === Number(amount))).toBe(true);
    },
  );

  test(
    'API CP-004 Acepta el monto mínimo positivo 0.01',
    { tag: ['@regression'], annotation: { type: 'AC', description: 'AC-03 (valor límite)' } },
    async ({ api, paymentAccount }) => {
      const { payee } = buildBillPayment('internet');

      const result = await api.billPay(paymentAccount.id, '0.01', payee);

      expect(result.amount).toBe(0.01);
      const after = await api.account(paymentAccount.id);
      expect(toCents(after.balance)).toBe(toCents(paymentAccount.balance) - 1);
    },
  );

  test(
    'API CP-013 Pagar desde una cuenta inexistente es rechazado',
    { tag: ['@negative', '@regression'], annotation: { type: 'AC', description: 'AC-05' } },
    async ({ api }) => {
      const { payee } = buildBillPayment();

      const response = await api.billPayRaw(999999999, '10.00', payee);

      expect(response.ok()).toBe(false);
      expect(response.status()).toBeGreaterThanOrEqual(400);
    },
  );

  test(
    'API CP-020 Un monto no numérico es rechazado',
    { tag: ['@negative', '@regression'], annotation: { type: 'AC', description: 'AC-03, AC-05' } },
    async ({ api, paymentAccount }) => {
      const { payee } = buildBillPayment();

      const response = await api.billPayRaw(paymentAccount.id, '10abc', payee);

      expect(response.ok()).toBe(false);
      const after = await api.account(paymentAccount.id);
      expect(after.balance).toBe(paymentAccount.balance);
    },
  );
});

// Reglas que ParaBank no cumple (DEF-001 y DEF-002). Corren en el job "known-defects".
test.describe('API — reglas de negocio del monto (defectos conocidos)', () => {
  const rejectedAmounts = [
    { id: 'CP-010', label: 'cero', amount: '0', defect: 'DEF-001' },
    { id: 'CP-011', label: 'negativo', amount: '-50.00', defect: 'DEF-001' },
  ];

  for (const { id, label, amount, defect } of rejectedAmounts) {
    test(
      `API ${id} Rechaza un pago con monto ${label} (${amount})`,
      {
        tag: ['@negative', '@known-defect'],
        annotation: [
          { type: 'AC', description: 'AC-03, AC-05' },
          { type: 'issue', description: defect },
        ],
      },
      async ({ api, paymentAccount }) => {
        const { payee } = buildBillPayment();

        const response = await api.billPayRaw(paymentAccount.id, amount, payee);

        expect(response.status(), await response.text()).toBeGreaterThanOrEqual(400);
        const after = await api.account(paymentAccount.id);
        expect(after.balance, 'el saldo no debe cambiar').toBe(paymentAccount.balance);
      },
    );
  }

  test(
    'API CP-012 Rechaza un pago que supera el saldo disponible',
    {
      tag: ['@negative', '@known-defect'],
      annotation: [
        { type: 'AC', description: 'AC-05' },
        { type: 'issue', description: 'DEF-002' },
      ],
    },
    async ({ api, paymentAccount }) => {
      const { payee } = buildBillPayment();
      const amount = (paymentAccount.balance + 1000).toFixed(2);

      const response = await api.billPayRaw(paymentAccount.id, amount, payee);

      expect(response.status(), await response.text()).toBeGreaterThanOrEqual(400);
      const after = await api.account(paymentAccount.id);
      expect(after.balance, 'la cuenta no debe quedar en sobregiro').toBe(paymentAccount.balance);
    },
  );
});
