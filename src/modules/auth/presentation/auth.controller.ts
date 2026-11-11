import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../../shared/auth/public.decorator.js';
import { GetCurrentUserUseCase } from '../application/get-current-user.use-case.js';
import { LoginUseCase } from '../application/login.use-case.js';
import { RegisterUserUseCase } from '../application/register-user.use-case.js';
import type { AccessToken } from '../domain/access-token.js';
import { toHttpError } from './auth-error.mapper.js';
import type { AuthenticatedUser } from './authenticated-request.js';
import { CurrentUser } from './current-user.decorator.js';
import { CurrentUserResponseDto } from './current-user.response.dto.js';
import { LoginRequestDto } from './login.request.dto.js';
import { LoginResponseDto } from './login.response.dto.js';
import { RegisterUserRequestDto } from './register-user.request.dto.js';
import { RegisterUserResponseDto } from './register-user.response.dto.js';

const toLoginResponse = (accessToken: AccessToken): LoginResponseDto => ({
  accessToken: accessToken.value,
  tokenType: 'Bearer',
  expiresIn: accessToken.expiresInSeconds,
});

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(RegisterUserUseCase)
    private readonly registerUserUseCase: RegisterUserUseCase,
    @Inject(LoginUseCase)
    private readonly loginUseCase: LoginUseCase,
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid email, password outside 12-128 characters, or unexpected fields',
  })
  @ApiConflictResponse({ description: 'Email already registered' })
  @Public()
  @Post('register')
  async register(
    @Body() body: RegisterUserRequestDto,
  ): Promise<RegisterUserResponseDto> {
    try {
      const registeredUser = await this.registerUserUseCase.execute(body);
      return registeredUser;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid email format, or unexpected fields',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: LoginRequestDto): Promise<LoginResponseDto> {
    try {
      const accessToken = await this.loginUseCase.execute(body);
      return toLoginResponse(accessToken);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or expired access token',
  })
  @Get('me')
  async me(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CurrentUserResponseDto> {
    try {
      const currentUser = await this.getCurrentUserUseCase.execute(user.id);
      return currentUser;
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
