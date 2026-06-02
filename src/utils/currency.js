// Display-currency conversion + formatting.
//
// Coin values in the database are stored in USD. These static rates convert a
// USD amount into the user's selected display currency (chosen in Account
// Settings). Swap CURRENCY_RATES for a live FX feed later if needed.

export const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };

// Approximate rates relative to USD (1 USD = N units of the currency).
export const CURRENCY_RATES = { USD: 1, EUR: 0.92, GBP: 0.79 };

export function currencySymbol(currency = 'USD') {
  return CURRENCY_SYMBOLS[currency] ?? '$';
}

// Convert a USD amount to `currency` and format it with the matching symbol.
// `options` is passed through to Number.toLocaleString (e.g. fraction digits).
export function formatCurrency(usdAmount, currency = 'USD', options = {}) {
  const amount = Number(usdAmount) || 0;
  const rate   = CURRENCY_RATES[currency] ?? 1;
  const symbol = currencySymbol(currency);
  return `${symbol}${(amount * rate).toLocaleString('en-US', {
    maximumFractionDigits: 0,
    ...options,
  })}`;
}
