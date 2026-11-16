import { test as base } from '@playwright/test';
import { env } from '../../shared/config/env';
import { ParaBankApiClient } from '../client/parabank-api.client';
import type { Account, Customer } from '../client/types';

interface ApiFixtures {
  api: ParaBankApiClient;
  /** Cliente autenticado con las credenciales configuradas (por defecto john/demo). */
  customer: Customer;
  // Cuenta CHECKING nueva por test, para que otros usuarios no alteren el saldo verificado.
  paymentAccount: Account;
}

export const test = base.extend<ApiFixtures>({
  api: async ({ request }, use) => use(new ParaBankApiClient(request)),

  customer: async ({ api }, use) => use(await api.login(env.demoUser)),

  paymentAccount: async ({ api, customer }, use) => {
    const [source] = await api.customerAccounts(customer.id);
    if (!source) {
      throw new Error(`El cliente ${customer.id} no tiene cuentas para fondear la cuenta de prueba`);
    }
    const created = await api.createAccount(customer.id, source.id, 'CHECKING');
    // La respuesta de createAccount puede no reflejar el depósito inicial: se consulta el estado real.
    await use(await api.account(created.id));
  },
});

export { expect } from '@playwright/test';
