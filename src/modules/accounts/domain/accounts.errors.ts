export class InvalidAccountNameError extends Error {
  constructor(
    message: string = 'Account name must be between 1 and 60 characters',
  ) {
    super(message);
    this.name = 'InvalidAccountNameError';
  }
}

export class InvalidAccountTypeError extends Error {
  constructor(
    message: string = 'Account type must be one of: checking, savings, credit_card, cash, investment',
  ) {
    super(message);
    this.name = 'InvalidAccountTypeError';
  }
}

export class UnsupportedCurrencyError extends Error {
  constructor(message: string = 'Only BRL is supported') {
    super(message);
    this.name = 'UnsupportedCurrencyError';
  }
}

export class InvalidAmountError extends Error {
  constructor(
    message: string = 'Amount must be a whole number of cents within the safe integer range',
  ) {
    super(message);
    this.name = 'InvalidAmountError';
  }
}

export class AccountNameAlreadyUsedError extends Error {
  constructor(message: string = 'You already have an account with this name') {
    super(message);
    this.name = 'AccountNameAlreadyUsedError';
  }
}

export class AccountNotFoundError extends Error {
  constructor(message: string = 'Account not found') {
    super(message);
    this.name = 'AccountNotFoundError';
  }
}
