import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  AccessToken,
  AccessTokenClaims,
  AccessTokenIssuer,
  AccessTokenVerifier,
} from '../domain/access-token.js';
import { InvalidAccessTokenError } from '../domain/auth.errors.js';
import {
  ACCESS_TOKEN_CONFIG,
  type AccessTokenConfig,
} from './access-token.config.js';

type AccessTokenPayload = {
  sub: string;
};

@Injectable()
export class JwtAccessTokenService
  implements AccessTokenIssuer, AccessTokenVerifier
{
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ACCESS_TOKEN_CONFIG) private readonly config: AccessTokenConfig,
  ) {}

  async issue(userId: string): Promise<AccessToken> {
    const payload: AccessTokenPayload = { sub: userId };
    const value = await this.jwtService.signAsync(payload);
    return { value, expiresInSeconds: this.config.ttlSeconds };
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    const payload = await this.decodeVerified(token);
    return { userId: payload.sub };
  }

  private async decodeVerified(token: string): Promise<AccessTokenPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      return payload;
    } catch {
      throw new InvalidAccessTokenError();
    }
  }
}
