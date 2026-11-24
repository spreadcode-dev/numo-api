import { UnsupportedCurrencyError } from './accounts.errors.js';
import { toCurrency } from './currency.js';

describe('toCurrency', () => {
  it('should accept BRL', () => {
    // Act
    const currency = toCurrency('BRL');

    // Assert
    expect(currency).toBe('BRL');
  });

  it.each(['USD', 'brl', ''])('should reject %j', (raw) => {
    // Act
    const convert = () => toCurrency(raw);

    // Assert
    expect(convert).toThrow(UnsupportedCurrencyError);
  });
});
