import { CryptoRefreshTokenGenerator } from './crypto-refresh-token-generator.js';

const BASE64URL_OF_32_BYTES = /^[A-Za-z0-9_-]{43}$/;
const SHA256_OF_ABC =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('CryptoRefreshTokenGenerator', () => {
  it('should generate a 256-bit value encoded as base64url', () => {
    // Arrange
    const generator = new CryptoRefreshTokenGenerator();

    // Act
    const { value } = generator.generate();

    // Assert
    expect(value).toMatch(BASE64URL_OF_32_BYTES);
  });

  it('should generate a different value every time', () => {
    // Arrange
    const generator = new CryptoRefreshTokenGenerator();

    // Act
    const first = generator.generate();
    const second = generator.generate();

    // Assert
    expect(second.value).not.toBe(first.value);
  });

  it('should return the hash of the generated value', () => {
    // Arrange
    const generator = new CryptoRefreshTokenGenerator();

    // Act
    const { value, hash } = generator.generate();

    // Assert
    expect(hash).toBe(generator.hash(value));
  });

  it('should hash with SHA-256 as 64 hex characters', () => {
    // Arrange
    const generator = new CryptoRefreshTokenGenerator();

    // Act
    const hash = generator.hash('abc');

    // Assert
    expect(hash).toBe(SHA256_OF_ABC);
  });
});
