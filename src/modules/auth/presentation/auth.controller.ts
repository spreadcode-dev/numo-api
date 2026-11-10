import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { RegisterUserUseCase } from '../application/register-user.use-case.js';
import { toHttpError } from './auth-error.mapper.js';
import { RegisterUserRequestDto } from './register-user.request.dto.js';
import { RegisterUserResponseDto } from './register-user.response.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(RegisterUserUseCase)
    private readonly registerUserUseCase: RegisterUserUseCase,
  ) {}

  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid email, password outside 12-128 characters, or unexpected fields',
  })
  @ApiConflictResponse({ description: 'Email already registered' })
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
}
