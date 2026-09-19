export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'UGX', label: 'Ugandan Shilling (UGX)' },
  { code: 'KES', label: 'Kenyan Shilling (KES)' },
  { code: 'TZS', label: 'Tanzanian Shilling (TZS)' },
  { code: 'RWF', label: 'Rwandan Franc (RWF)' },
  { code: 'NGN', label: 'Nigerian Naira (NGN)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
];

// Currencies with no meaningful minor unit in everyday use — shown as whole
// numbers. Everything else (USD, EUR, GBP, etc.) gets 2 decimal places,
// which matters once amounts are converted rather than always round UGX figures.
const ZERO_DECIMAL_CURRENCIES = new Set(['UGX', 'TZS', 'RWF']);

export function formatMoney(amount: number, currency: string): string {
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
