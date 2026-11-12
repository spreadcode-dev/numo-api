import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../../shared/auth/public.decorator.js';
import { LoginUseCase } from '../application/login.use-case.js';
import { LogoutUseCase } from '../application/logout.use-case.js';
import { RefreshSessionUseCase } from '../application/refresh-session.use-case.js';
import type { Session } from '../application/session-issuer.js';
import { AccessTokenResponseDto } from './access-token.response.dto.js';
import { toHttpError } from './auth-error.mapper.js';
import { LoginRequestDto } from './login.request.dto.js';
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from './refresh-token.cookie.js';

const SETS_REFRESH_TOKEN_COOKIE = {
  'Set-Cookie': {
    description:
      'refresh_token=<opaque>; HttpOnly; Secure; SameSite=Strict; Path=/auth; Expires=<7 days later>',
    schema: { type: 'string' },
  },
};

const CLEARS_REFRESH_TOKEN_COOKIE = {
  'Set-Cookie': {
    description: 'Expires the refresh_token cookie on Path=/auth',
    schema: { type: 'string' },
  },
};

const toAccessTokenResponse = (session: Session): AccessTokenResponseDto => ({
  accessToken: session.accessToken.value,
  tokenType: 'Bearer',
  expiresIn: session.accessToken.expiresInSeconds,
});

// Login and refresh answer the same way: the access token in the body and
// the (new) refresh token in the cookie.
const respondWithSession = (
  response: Response,
  session: Session,
): AccessTokenResponseDto => {
  setRefreshTokenCookie(response, session.refreshToken);
  return toAccessTokenResponse(session);
};

@Controller('auth')
export class SessionController {
  constructor(
    @Inject(LoginUseCase)
    private readonly loginUseCase: LoginUseCase,
    @Inject(RefreshSessionUseCase)
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    @Inject(LogoutUseCase)
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @ApiOkResponse({
    type: AccessTokenResponseDto,
    headers: SETS_REFRESH_TOKEN_COOKIE,
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format, or unexpected fields',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() body: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponseDto> {
    try {
      const session = await this.loginUseCase.execute(body);
      return respondWithSession(response, session);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiCookieAuth()
  @ApiOkResponse({
    type: AccessTokenResponseDto,
    headers: SETS_REFRESH_TOKEN_COOKIE,
  })
  @ApiUnauthorizedResponse({
    description:
      'Missing, unknown, expired or reused refresh token. Reusing a rotated token also ends every session from the same login.',
  })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponseDto> {
    try {
      const presentedRefreshToken = readRefreshTokenCookie(request);
      const session = await this.refreshSessionUseCase.execute(
        presentedRefreshToken,
      );
      return respondWithSession(response, session);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiCookieAuth()
  @ApiNoContentResponse({
    description:
      'Session ended. Always succeeds, even without a cookie or with a stale one.',
    headers: CLEARS_REFRESH_TOKEN_COOKIE,
  })
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const presentedRefreshToken = readRefreshTokenCookie(request);
    await this.logoutUseCase.execute(presentedRefreshToken);
    clearRefreshTokenCookie(response);
  }
}
