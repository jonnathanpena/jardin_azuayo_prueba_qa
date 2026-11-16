import { defineConfig, devices } from '@playwright/test';
import { env } from './shared/config/env';

const isCI = !!process.env.CI;

// Un solo runner para web (desktop y mobile emulado) y API.
export default defineConfig({
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // ParaBank es un entorno público y compartido: se limita la concurrencia por respeto al servicio.
  workers: isCI ? 2 : 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/playwright-results.xml' }],
    ['json', { outputFile: 'reports/json/playwright-results.json' }],
  ],
  use: {
    baseURL: env.baseUrl,
    testIdAttribute: 'data-test',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'America/Guayaquil',
  },
  projects: [
    {
      name: 'web-chromium',
      testDir: './web/tests',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'web-mobile',
      testDir: './web/tests',
      grep: /@mobile/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'api',
      testDir: './api/tests',
      use: {
        baseURL: env.apiBaseUrl,
        extraHTTPHeaders: { Accept: 'application/json' },
        screenshot: 'off',
        video: 'off',
        trace: 'off',
      },
    },
  ],
});
