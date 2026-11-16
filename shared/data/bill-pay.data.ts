import type { BillPayment, Payee } from './types';

/** Identificador corto por ejecución: permite encontrar en el historial los movimientos creados por cada corrida. */
export const RUN_ID = (process.env.GITHUB_RUN_ID ?? Date.now().toString(36)).slice(-6).toUpperCase();

/** Catálogo de beneficiarios de servicios básicos usados en el escenario de pago. */
export const PAYEES = {
  electricity: {
    name: 'Empresa Electrica Quito',
    address: { street: 'Av. 10 de Agosto N25-15', city: 'Quito', state: 'Pichincha', zipCode: '170143' },
    phoneNumber: '022396500',
    accountNumber: '78451236',
  },
  water: {
    name: 'EPMAPS Agua Potable',
    address: { street: 'Av. Mariana de Jesus E7-02', city: 'Quito', state: 'Pichincha', zipCode: '170135' },
    phoneNumber: '022994400',
    accountNumber: '55123987',
  },
  internet: {
    name: 'CNT Internet Fijo',
    address: { street: 'Av. Amazonas N36-49', city: 'Quito', state: 'Pichincha', zipCode: '170102' },
    phoneNumber: '022973000',
    accountNumber: '90011234',
  },
} as const satisfies Record<string, Payee>;

export type PayeeKey = keyof typeof PAYEES;

// Construye un pago válido; el beneficiario lleva un sufijo único para ubicar su movimiento.
export function buildBillPayment(
  payeeKey: PayeeKey = 'electricity',
  overrides: Partial<Omit<BillPayment, 'payee'>> & { payee?: Partial<Payee> } = {},
): BillPayment {
  const base = PAYEES[payeeKey];
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const payee: Payee = {
    ...base,
    address: { ...base.address },
    name: `${base.name} ${RUN_ID}-${suffix}`,
    ...overrides.payee,
  };
  return {
    payee,
    verifyAccount: overrides.verifyAccount ?? payee.accountNumber,
    amount: overrides.amount ?? '25.75',
  };
}

/** Importes válidos para pruebas parametrizadas (incluye el límite inferior 0.01). */
export const VALID_AMOUNTS = ['25.75', '0.01', '150'] as const;

/** Importes que, según las reglas de aceptación del ejercicio, deben ser rechazados (monto > 0). */
export const NON_POSITIVE_AMOUNTS = [
  { id: 'CP-010', label: 'cero', value: '0' },
  { id: 'CP-011', label: 'negativo', value: '-50.00' },
] as const;

export type BillPayField =
  | 'payee.name'
  | 'payee.address.street'
  | 'payee.address.city'
  | 'payee.address.state'
  | 'payee.address.zipCode'
  | 'payee.phoneNumber'
  | 'payee.accountNumber'
  | 'verifyAccount'
  | 'amount';

/** Mensajes de ParaBank (messages.properties), indexados por el sufijo del id "validationModel-<id>". */
export const VALIDATION_MESSAGES = {
  name: 'Payee name is required.',
  address: 'Address is required.',
  city: 'City is required.',
  state: 'State is required.',
  zipCode: 'Zip Code is required.',
  phoneNumber: 'Phone number is required.',
  'account-empty': 'Account number is required.',
  'account-invalid': 'Please enter a valid number.',
  'verifyAccount-empty': 'Account number is required.',
  'verifyAccount-invalid': 'Please enter a valid number.',
  'verifyAccount-mismatch': 'The account numbers do not match.',
  'amount-empty': 'The amount cannot be empty.',
  'amount-invalid': 'Please enter a valid amount.',
} as const;

export type ValidationId = keyof typeof VALIDATION_MESSAGES;

// CP-014: un campo obligatorio vacío y sus mensajes. Sin cuenta, la verificación tampoco coincide ("mismatch").
export const REQUIRED_FIELD_CASES: ReadonlyArray<{ field: BillPayField; errors: ValidationId[] }> = [
  { field: 'payee.name', errors: ['name'] },
  { field: 'payee.address.street', errors: ['address'] },
  { field: 'payee.address.city', errors: ['city'] },
  { field: 'payee.address.state', errors: ['state'] },
  { field: 'payee.address.zipCode', errors: ['zipCode'] },
  { field: 'payee.phoneNumber', errors: ['phoneNumber'] },
  { field: 'payee.accountNumber', errors: ['account-empty', 'verifyAccount-mismatch'] },
  { field: 'verifyAccount', errors: ['verifyAccount-empty'] },
  { field: 'amount', errors: ['amount-empty'] },
];

/** CP-009: formatos no numéricos que la validación del cliente debe bloquear. */
export const INVALID_FORMAT_CASES: ReadonlyArray<{
  label: string;
  overrides: { amount?: string; accountNumber?: string; verifyAccount?: string };
  errors: ValidationId[];
}> = [
  { label: 'monto con letras', overrides: { amount: 'abc' }, errors: ['amount-invalid'] },
  { label: 'monto con símbolos', overrides: { amount: '$%&' }, errors: ['amount-invalid'] },
  {
    label: 'cuenta del beneficiario con letras',
    overrides: { accountNumber: 'ABC123', verifyAccount: 'ABC123' },
    errors: ['account-invalid', 'verifyAccount-invalid'],
  },
];

export function messagesFor(ids: readonly ValidationId[]): Record<string, string> {
  return Object.fromEntries(ids.map((id) => [id, VALIDATION_MESSAGES[id]]));
}
