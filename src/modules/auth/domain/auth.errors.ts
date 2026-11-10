export class InvalidEmailError extends Error {
  constructor(message: string = 'Invalid email address') {
    super(message);
    this.name = 'InvalidEmailError';
  }
}

export class InvalidPasswordError extends Error {
  constructor(
    message: string = 'Password must be between 12 and 128 characters',
  ) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor(message: string = 'Email address is already registered') {
    super(message);
    this.name = 'EmailAlreadyRegisteredError';
  }
}
