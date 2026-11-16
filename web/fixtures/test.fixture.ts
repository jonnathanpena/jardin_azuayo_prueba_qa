import { test as base } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../shared/config/env';
import { buildCustomer } from '../../shared/data/customer.factory';
import type { NewCustomer } from '../../shared/data/types';
import { AccountServicesMenu } from '../components/account-services-menu';
import { AccountActivityPage } from '../pages/account-activity.page';
import { AccountsOverviewPage } from '../pages/accounts-overview.page';
import { BillPayPage } from '../pages/bill-pay.page';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';

export interface RegisteredCustomer extends NewCustomer {
  storageStatePath: string;
  primaryAccountId: string;
  fullName: string;
}

interface PageFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  overviewPage: AccountsOverviewPage;
  billPayPage: BillPayPage;
  activityPage: AccountActivityPage;
  menu: AccountServicesMenu;
}

interface WorkerFixtures {
  customer: RegisteredCustomer;
}

// guestTest: navegador sin sesión (login, accesos no autorizados y cierre de sesión).
export const guestTest = base.extend<PageFixtures, WorkerFixtures>({
  customer: [
    async ({ browser }, use, workerInfo) => {
      const data = buildCustomer(workerInfo.workerIndex);
      const context = await browser.newContext({ baseURL: env.baseUrl });
      const page = await context.newPage();

      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.register(data);
      await registerPage.expectRegistered(data.username);

      const overview = new AccountsOverviewPage(page);
      await overview.goto();
      const [primary] = await overview.readAccounts();
      if (!primary) {
        throw new Error(`El socio ${data.username} se registró sin cuenta inicial`);
      }

      const storageStatePath = path.join('.auth', `customer-${workerInfo.parallelIndex}.json`);
      await mkdir(path.dirname(storageStatePath), { recursive: true });
      await context.storageState({ path: storageStatePath });
      await context.close();

      await use({
        ...data,
        storageStatePath,
        primaryAccountId: primary.id,
        fullName: `${data.firstName} ${data.lastName}`,
      });
    },
    { scope: 'worker', timeout: 90_000 },
  ],

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  overviewPage: async ({ page }, use) => use(new AccountsOverviewPage(page)),
  billPayPage: async ({ page }, use) => use(new BillPayPage(page)),
  activityPage: async ({ page }, use) => use(new AccountActivityPage(page)),
  menu: async ({ page }, use) => use(new AccountServicesMenu(page)),
});

// test: navegador ya autenticado con el socio del worker. Estos tests no deben cerrar sesión.
export const test = guestTest.extend({
  storageState: async ({ customer }, use) => use(customer.storageStatePath),
});

export { expect } from '@playwright/test';
