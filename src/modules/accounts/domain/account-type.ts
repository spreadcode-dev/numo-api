import { InvalidAccountTypeError } from './accounts.errors.js';

export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

const isAccountType = (raw: string): raw is AccountType =>
  (ACCOUNT_TYPES as readonly string[]).includes(raw);

export const toAccountType = (raw: string): AccountType => {
  if (!isAccountType(raw)) {
    throw new InvalidAccountTypeError();
  }
  return raw;
};
