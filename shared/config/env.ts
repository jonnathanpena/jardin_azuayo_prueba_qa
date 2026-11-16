import 'dotenv/config';

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

const baseUrl = withTrailingSlash(process.env.PARABANK_BASE_URL ?? 'https://parabank.parasoft.com/parabank/');

// Configuración centralizada: los tests no leen process.env directamente.
export const env = {
  baseUrl,
  apiBaseUrl: `${baseUrl}services/bank/`,
  demoUser: {
    username: process.env.PARABANK_USERNAME ?? 'john',
    password: process.env.PARABANK_PASSWORD ?? 'demo',
  },
  userPrefix: process.env.PARABANK_USER_PREFIX ?? 'qa',
} as const;
