import { UnsupportedCurrencyError } from './accounts.errors.js';

export type Currency = 'BRL';

export const DEFAULT_CURRENCY: Currency = 'BRL';

export const toCurrency = (raw: string): Currency => {
  if (raw !== DEFAULT_CURRENCY) {
    throw new UnsupportedCurrencyError();
  }
  return DEFAULT_CURRENCY;
};
