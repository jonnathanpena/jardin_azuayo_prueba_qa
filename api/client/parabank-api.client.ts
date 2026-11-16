import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { Credentials, Payee } from '../../shared/data/types';
import { NEW_ACCOUNT_TYPE, type Account, type BillPayResult, type Customer, type Transaction } from './types';

// Cliente sobre /services/bank. Los métodos "raw" devuelven la respuesta (casos negativos); los demás validan el 200.
export class ParaBankApiClient {
  constructor(private readonly request: APIRequestContext) {}

  loginRaw({ username, password }: Credentials): Promise<APIResponse> {
    return this.request.get(`login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`);
  }

  async login(credentials: Credentials): Promise<Customer> {
    return this.json<Customer>(await this.loginRaw(credentials));
  }

  customerAccountsRaw(customerId: number | string): Promise<APIResponse> {
    return this.request.get(`customers/${customerId}/accounts`);
  }

  async customerAccounts(customerId: number): Promise<Account[]> {
    return this.json<Account[]>(await this.customerAccountsRaw(customerId));
  }

  async account(accountId: number): Promise<Account> {
    return this.json<Account>(await this.request.get(`accounts/${accountId}`));
  }

  async transactions(accountId: number): Promise<Transaction[]> {
    return this.json<Transaction[]>(await this.request.get(`accounts/${accountId}/transactions`));
  }

  async transactionsByAmount(accountId: number, amount: number | string): Promise<Transaction[]> {
    return this.json<Transaction[]>(
      await this.request.get(`accounts/${accountId}/transactions/amount/${amount}`),
    );
  }

  async createAccount(
    customerId: number,
    fromAccountId: number,
    type: keyof typeof NEW_ACCOUNT_TYPE = 'CHECKING',
  ): Promise<Account> {
    const response = await this.request.post('createAccount', {
      params: { customerId, newAccountType: NEW_ACCOUNT_TYPE[type], fromAccountId },
    });
    return this.json<Account>(response);
  }

  billPayRaw(accountId: number | string, amount: number | string, payee: Payee): Promise<APIResponse> {
    return this.request.post('billpay', {
      params: { accountId, amount },
      data: payee,
    });
  }

  async billPay(accountId: number, amount: number | string, payee: Payee): Promise<BillPayResult> {
    return this.json<BillPayResult>(await this.billPayRaw(accountId, amount, payee));
  }

  private async json<T>(response: APIResponse): Promise<T> {
    expect(response.status(), `${response.url()} → ${await response.text()}`).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    return (await response.json()) as T;
  }
}
