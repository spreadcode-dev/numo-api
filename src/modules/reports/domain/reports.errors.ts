export class InvalidYearMonthError extends Error {
  constructor(message: string = 'Month must be a real month as YYYY-MM') {
    super(message);
    this.name = 'InvalidYearMonthError';
  }
}

export class InvalidMonthCountError extends Error {
  constructor(
    message: string = 'months must be a whole number between 1 and 24',
  ) {
    super(message);
    this.name = 'InvalidMonthCountError';
  }
}
