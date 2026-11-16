import { env } from '../../shared/config/env';
import { expect, guestTest as test } from '../fixtures/test.fixture';

test.describe('Autenticación y control de acceso', () => {
  test(
    'CP-001 Iniciar sesión con un usuario válido',
    { tag: ['@smoke', '@regression', '@mobile'], annotation: { type: 'AC', description: 'AC-01' } },
    async ({ customer, loginPage, overviewPage, menu }) => {
      await loginPage.goto();
      await loginPage.login(customer);

      await menu.expectLoggedIn(customer.fullName);
      await overviewPage.waitForAccounts();
      await expect(overviewPage.page).toHaveURL(/overview\.htm/);
    },
  );

  test(
    'CP-001b Iniciar sesión con el usuario de demostración configurado',
    { tag: ['@regression'], annotation: { type: 'AC', description: 'AC-01' } },
    async ({ loginPage, overviewPage, menu }) => {
      await loginPage.goto();
      await loginPage.login(env.demoUser);

      await menu.expectLoggedIn();
      await overviewPage.waitForAccounts();
    },
  );

  const invalidLogins = [
    { label: 'contraseña incorrecta', username: 'john', password: 'clave-incorrecta' },
    { label: 'usuario inexistente', username: 'usuario_que_no_existe_qa', password: 'demo' },
  ];

  for (const { label, username, password } of invalidLogins) {
    test(
      `CP-005 Rechazar inicio de sesión con ${label}`,
      { tag: ['@negative', '@regression'], annotation: { type: 'AC', description: 'AC-01' } },
      async ({ loginPage, menu }) => {
        await loginPage.goto();
        await loginPage.login({ username, password });

        await loginPage.expectLoginRejected();
        await menu.expectLoggedOut();
      },
    );
  }

  test(
    'CP-005c Rechazar inicio de sesión con credenciales vacías',
    { tag: ['@negative'], annotation: { type: 'AC', description: 'AC-01' } },
    async ({ loginPage, menu }) => {
      await loginPage.goto();
      await loginPage.submit.click();

      await loginPage.expectTitle('Error!');
      await expect(loginPage.errorMessage).toHaveText('Please enter a username and password.');
      await menu.expectLoggedOut();
    },
  );

  test(
    'CP-006 Impedir el acceso a Bill Pay sin sesión iniciada',
    { tag: ['@smoke', '@negative', '@regression'], annotation: { type: 'AC', description: 'AC-01' } },
    async ({ page, loginPage, billPayPage, menu }) => {
      await page.goto('billpay.htm');

      await expect(billPayPage.form).toBeHidden();
      await expect(billPayPage.sendPayment).toBeHidden();
      await loginPage.expectVisible();
      await menu.expectLoggedOut();
    },
  );

  test(
    'CP-016 Cerrar sesión invalida el acceso a Bill Pay',
    { tag: ['@regression'], annotation: { type: 'AC', description: 'AC-01' } },
    async ({ page, customer, loginPage, billPayPage, menu }) => {
      // Sesión propia (no la compartida del worker) para que el logout no afecte a otros tests.
      await loginPage.goto();
      await loginPage.login(customer);
      await menu.expectLoggedIn(customer.fullName);

      await menu.goTo('Log Out');
      await loginPage.expectVisible();

      await page.goto('billpay.htm');
      await expect(billPayPage.form).toBeHidden();
      await expect(billPayPage.sendPayment).toBeHidden();
      await loginPage.expectVisible();
    },
  );
});
