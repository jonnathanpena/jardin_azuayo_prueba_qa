import {
  buildBillPayment,
  INVALID_FORMAT_CASES,
  messagesFor,
  REQUIRED_FIELD_CASES,
} from '../../shared/data/bill-pay.data';
import { test } from '../fixtures/test.fixture';

test.describe('Pago de servicios — validaciones del formulario', () => {
  test.beforeEach(async ({ billPayPage }) => {
    await billPayPage.goto();
    await billPayPage.expectLoaded();
  });

  test(
    'CP-007 Enviar el formulario vacío muestra todos los campos obligatorios',
    { tag: ['@smoke', '@negative', '@regression'], annotation: { type: 'AC', description: 'AC-02, AC-05' } },
    async ({ billPayPage }) => {
      await billPayPage.submit();

      await billPayPage.expectValidationErrors(
        messagesFor([
          'name',
          'address',
          'city',
          'state',
          'zipCode',
          'phoneNumber',
          'account-empty',
          'verifyAccount-empty',
          'amount-empty',
        ]),
      );
    },
  );

  for (const { field, errors } of REQUIRED_FIELD_CASES) {
    test(
      `CP-014 Campo obligatorio vacío: ${field}`,
      { tag: ['@negative', '@regression'], annotation: { type: 'AC', description: 'AC-02, AC-05' } },
      async ({ billPayPage }) => {
        await billPayPage.fillForm(buildBillPayment());
        await billPayPage.input(field).clear();
        await billPayPage.submit();

        await billPayPage.expectValidationErrors(messagesFor(errors));
      },
    );
  }

  test(
    'CP-008 Rechazar el pago cuando la cuenta de verificación no coincide',
    { tag: ['@smoke', '@negative', '@regression'], annotation: { type: 'AC', description: 'AC-02, AC-05' } },
    async ({ billPayPage }) => {
      const payment = buildBillPayment('electricity', { verifyAccount: '78451299' });

      await billPayPage.pay(payment);

      await billPayPage.expectValidationErrors(messagesFor(['verifyAccount-mismatch']));
    },
  );

  for (const { label, overrides, errors } of INVALID_FORMAT_CASES) {
    test(
      `CP-009 Rechazar formato no numérico: ${label}`,
      { tag: ['@negative', '@regression'], annotation: { type: 'AC', description: 'AC-03, AC-05' } },
      async ({ billPayPage }) => {
        const { accountNumber, ...rest } = overrides;
        const payment = buildBillPayment('electricity', {
          ...rest,
          ...(accountNumber ? { payee: { accountNumber } } : {}),
        });

        await billPayPage.pay(payment);

        await billPayPage.expectValidationErrors(messagesFor(errors));
      },
    );
  }

  test(
    'CP-020 Un monto que el servidor no puede interpretar no se muestra como pago exitoso',
    { tag: ['@negative', '@regression'], annotation: { type: 'AC', description: 'AC-05' } },
    async ({ billPayPage }) => {
      // "10abc" supera la validación del cliente (parseFloat = 10) pero el servicio no puede convertirlo a BigDecimal.
      const payment = buildBillPayment('electricity', { amount: '10abc' });

      await billPayPage.pay(payment);

      await billPayPage.expectServerError();
    },
  );
});
