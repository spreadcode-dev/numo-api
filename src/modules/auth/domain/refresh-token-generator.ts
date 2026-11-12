export const REFRESH_TOKEN_GENERATOR = Symbol('REFRESH_TOKEN_GENERATOR');

export type GeneratedRefreshToken = {
  value: string;
  hash: string;
};

export interface RefreshTokenGenerator {
  // `value` goes to the client only; `hash` is the only thing stored.
  generate(): GeneratedRefreshToken;

  hash(value: string): string;
}
