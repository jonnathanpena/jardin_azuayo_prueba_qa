// ParaBank muestra importes como "$1,234.56". Se comparan en centavos para evitar errores de coma flotante.
export function toCents(amount: number | string): number {
  const value = typeof amount === 'number' ? amount : parseCurrency(amount);
  return Math.round(value * 100);
}

export function parseCurrency(text: string): number {
  const normalized = text.trim().replace(/[$,\s]/g, '');
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) {
    throw new Error(`No se pudo interpretar el importe "${text}"`);
  }
  return value;
}

export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}
