import { env } from '../config/env';
import type { NewCustomer } from './types';

// Cada worker registra su propio socio: la demo es compartida y el saldo de john/demo cambia.
export function buildCustomer(workerIndex: number): NewCustomer {
  const unique = `${Date.now().toString(36)}${workerIndex}${Math.random().toString(36).slice(2, 5)}`;
  return {
    firstName: 'Socio',
    lastName: `Prueba${workerIndex}`,
    address: { street: 'Av. Republica E7-123', city: 'Quito', state: 'Pichincha', zipCode: '170135' },
    phoneNumber: '0991234567',
    ssn: `${100 + workerIndex}-${unique.slice(-2)}-${String(Date.now()).slice(-4)}`,
    username: `${env.userPrefix}_${unique}`.slice(0, 20),
    password: `Qa!${unique.slice(0, 8)}`,
  };
}
