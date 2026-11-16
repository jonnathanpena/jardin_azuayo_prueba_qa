export type AccountType = 'CHECKING' | 'SAVINGS' | 'LOAN';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  address: { street: string; city: string; state: string; zipCode: string };
  phoneNumber: string;
  ssn: string;
}

export interface Account {
  id: number;
  customerId: number;
  type: AccountType;
  balance: number;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: 'Credit' | 'Debit';
  date: number | string;
  amount: number;
  description: string;
}

export interface BillPayResult {
  payeeName: string;
  amount: number;
  accountId: number;
}

/** Valores que espera el parámetro newAccountType de /createAccount. */
export const NEW_ACCOUNT_TYPE = { CHECKING: 0, SAVINGS: 1 } as const;
