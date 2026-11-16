import { env } from '../../shared/config/env';
import { expect, test } from '../fixtures/api.fixture';

test.describe('API — autenticación y consulta de cuentas', () => {
  test(
    'API CP-001 Login con credenciales válidas devuelve el cliente',
    { tag: ['@smoke', '@regression'], annotation: { type: 'AC', description: 'AC-01' } },
    async ({ api }) => {
      const response = await api.loginRaw(env.demoUser);

      expect(response.status()).toBe(200);
      const customer = await response.json();
      expect(customer).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          firstName: expect.any(String),
          lastName: expect.any(String),
          address: expect.objectContaining({ street: expect.any(String), city: expect.any(String) }),
        }),
      );
    },
  );

  test(
    'API CP-005 Login con contraseña incorrecta es rechazado',
    { tag: ['@negative', '@regression'], annotation: { type: 'AC', description: 'AC-01' } },
    async ({ api }) => {
      const response = await api.loginRaw({ username: env.demoUser.username, password: 'clave-incorrecta' });

      expect(response.ok()).toBe(false);
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(await response.text()).not.toContain('"firstName"');
    },
  );

  test(
    'API CP-015 Las cuentas del cliente son coherentes con su detalle',
    { tag: ['@regression'], annotation: { type: 'AC', description: 'AC-04' } },
    async ({ api, customer }) => {
      const accounts = await api.customerAccounts(customer.id);

      expect(accounts.length).toBeGreaterThan(0);
      for (const account of accounts.slice(0, 3)) {
        expect(account.customerId).toBe(customer.id);
        expect(['CHECKING', 'SAVINGS', 'LOAN']).toContain(account.type);

        const detail = await api.account(account.id);
        expect(detail).toEqual(account);
      }
    },
  );

  test(
    'API CP-021 Los servicios REST deben exigir autenticación para consultar cuentas',
    {
      tag: ['@security', '@known-defect'],
      annotation: [
        { type: 'AC', description: 'AC-01' },
        { type: 'issue', description: 'DEF-003' },
      ],
    },
    async ({ api, customer }) => {
      // Petición sin cookie, token ni cabecera Authorization: solo con el id del cliente.
      const response = await api.customerAccountsRaw(customer.id);

      const status = response.status();
      expect(
        [401, 403].includes(status),
        `consultar cuentas sin credenciales debe responder 401 o 403 (respondió ${status})`,
      ).toBe(true);
    },
  );
});
