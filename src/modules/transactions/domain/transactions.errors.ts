export class InvalidTransactionAmountError extends Error {
  constructor(
    message: string = 'Amount must be a non-zero whole number of cents within the safe integer range',
  ) {
    super(message);
    this.name = 'InvalidTransactionAmountError';
  }
}

export class InvalidTransactionDateError extends Error {
  constructor(message: string = 'Date must be a calendar day as YYYY-MM-DD') {
    super(message);
    this.name = 'InvalidTransactionDateError';
  }
}

export class InvalidTransactionDescriptionError extends Error {
  constructor(
    message: string = 'Description must be between 1 and 140 characters',
  ) {
    super(message);
    this.name = 'InvalidTransactionDescriptionError';
  }
}

export class TransactionAccountNotFoundError extends Error {
  constructor(message: string = 'Account not found') {
    super(message);
    this.name = 'TransactionAccountNotFoundError';
  }
}

export class TransactionAccountArchivedError extends Error {
  constructor(
    message: string = 'The account is archived; unarchive it to record transactions',
  ) {
    super(message);
    this.name = 'TransactionAccountArchivedError';
  }
}

export class InvalidPageLimitError extends Error {
  constructor(
    message: string = 'limit must be a whole number between 1 and 100',
  ) {
    super(message);
    this.name = 'InvalidPageLimitError';
  }
}

export class InvalidPageCursorError extends Error {
  constructor(message: string = 'cursor is not valid; start again without it') {
    super(message);
    this.name = 'InvalidPageCursorError';
  }
}

export class TransactionNotFoundError extends Error {
  constructor(message: string = 'Transaction not found') {
    super(message);
    this.name = 'TransactionNotFoundError';
  }
}

export class InvalidTransactionLabelsError extends Error {
  constructor(
    message: string = 'labelIds must hold at most 10 different labels',
  ) {
    super(message);
    this.name = 'InvalidTransactionLabelsError';
  }
}

export class TransactionLabelNotFoundError extends Error {
  constructor(message: string = 'Label not found') {
    super(message);
    this.name = 'TransactionLabelNotFoundError';
  }
}
