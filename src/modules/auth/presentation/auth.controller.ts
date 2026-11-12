import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
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
import { RegisterUserUseCase } from '../application/register-user.use-case.js';
import { toHttpError } from './auth-error.mapper.js';
import { AuthRateLimited } from './auth-rate-limited.decorator.js';
import type { AuthenticatedUser } from './authenticated-request.js';
import { CurrentUser } from './current-user.decorator.js';
import { CurrentUserResponseDto } from './current-user.response.dto.js';
import { RegisterUserRequestDto } from './register-user.request.dto.js';
import { RegisterUserResponseDto } from './register-user.response.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(RegisterUserUseCase)
    private readonly registerUserUseCase: RegisterUserUseCase,
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid email, password outside 12-128 characters, or unexpected fields',
  })
  @ApiConflictResponse({ description: 'Email already registered' })
  @AuthRateLimited()
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
