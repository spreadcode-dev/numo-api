export const ACCESS_TOKEN_ISSUER = Symbol('ACCESS_TOKEN_ISSUER');
export const ACCESS_TOKEN_VERIFIER = Symbol('ACCESS_TOKEN_VERIFIER');

export type AccessToken = {
  value: string;
  expiresInSeconds: number;
};

export type AccessTokenClaims = {
  userId: string;
};

export interface AccessTokenIssuer {
  issue(userId: string): Promise<AccessToken>;
}

export interface AccessTokenVerifier {
  // Throws InvalidAccessTokenError for a malformed, forged or expired token.
  verify(token: string): Promise<AccessTokenClaims>;
}
