export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Payee {
  name: string;
  address: Address;
  phoneNumber: string;
  accountNumber: string;
}

export interface BillPayment {
  payee: Payee;
  verifyAccount: string;
  amount: string;
}

export interface NewCustomer {
  firstName: string;
  lastName: string;
  address: Address;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}

export interface Credentials {
  username: string;
  password: string;
}
