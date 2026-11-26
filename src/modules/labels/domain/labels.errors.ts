export class InvalidLabelNameError extends Error {
  constructor(
    message: string = 'Label name must be between 1 and 30 characters',
  ) {
    super(message);
    this.name = 'InvalidLabelNameError';
  }
}

export class InvalidLabelColorError extends Error {
  constructor(
    message: string = 'Label color must be one of: #2563eb, #15803d, #0f766e, #7c3aed, #be185d, #b91c1c, #f97316, #facc15',
  ) {
    super(message);
    this.name = 'InvalidLabelColorError';
  }
}

export class LabelNameAlreadyUsedError extends Error {
  constructor(message: string = 'You already have a label with this name') {
    super(message);
    this.name = 'LabelNameAlreadyUsedError';
  }
}

export class LabelNotFoundError extends Error {
  constructor(message: string = 'Label not found') {
    super(message);
    this.name = 'LabelNotFoundError';
  }
}
