import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/auth/authenticated-request.js';
import { CurrentUser } from '@shared/auth/current-user.decorator.js';
import { CreateAccountUseCase } from '../application/create-account.use-case.js';
import { ListAccountsUseCase } from '../application/list-accounts.use-case.js';
import { AccountResponseDto } from './account.response.dto.js';
import { toHttpError } from './accounts-error.mapper.js';
import { CreateAccountRequestDto } from './create-account.request.dto.js';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token',
})
@Controller('accounts')
export class AccountsController {
  constructor(
    @Inject(CreateAccountUseCase)
    private readonly createAccountUseCase: CreateAccountUseCase,
    @Inject(ListAccountsUseCase)
    private readonly listAccountsUseCase: ListAccountsUseCase,
  ) {}

  @ApiCreatedResponse({ type: AccountResponseDto })
  @ApiBadRequestResponse({
    description:
      'Unknown type, name outside 1-60 characters, non-integer openingBalance, currency other than BRL, or unexpected fields',
  })
  @ApiConflictResponse({
    description: 'The user already has an account with this name (any casing)',
  })
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAccountRequestDto,
  ): Promise<AccountResponseDto> {
    try {
      const account = await this.createAccountUseCase.execute({
        userId: user.id,
        name: body.name,
        type: body.type,
        openingBalance: body.openingBalance,
        currency: body.currency,
      });
      return account;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiOkResponse({ type: [AccountResponseDto] })
  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<AccountResponseDto[]> {
    return this.listAccountsUseCase.execute(user.id);
  }
}
