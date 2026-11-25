import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/auth/authenticated-request.js';
import { CurrentUser } from '@shared/auth/current-user.decorator.js';
import { ArchiveAccountUseCase } from '../application/archive-account.use-case.js';
import { CreateAccountUseCase } from '../application/create-account.use-case.js';
import { ListAccountsUseCase } from '../application/list-accounts.use-case.js';
import { UnarchiveAccountUseCase } from '../application/unarchive-account.use-case.js';
import { UpdateAccountUseCase } from '../application/update-account.use-case.js';
import { AccountResponseDto } from './account.response.dto.js';
import { toHttpError } from './accounts-error.mapper.js';
import { CreateAccountRequestDto } from './create-account.request.dto.js';
import { ListAccountsQueryDto } from './list-accounts.query.dto.js';
import { UpdateAccountRequestDto } from './update-account.request.dto.js';

// A malformed id can't match any account, so it gets the same 404 as an
// unknown one instead of reaching Postgres as an invalid uuid (a 500).
const ACCOUNT_ID_PIPE = new ParseUUIDPipe({
  errorHttpStatusCode: HttpStatus.NOT_FOUND,
});

const NAME_ALREADY_USED =
  'The user already has an account with this name (any casing)';
const ACCOUNT_NOT_FOUND =
  'No account with this id belongs to the user in the token';

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
    @Inject(UpdateAccountUseCase)
    private readonly updateAccountUseCase: UpdateAccountUseCase,
    @Inject(ArchiveAccountUseCase)
    private readonly archiveAccountUseCase: ArchiveAccountUseCase,
    @Inject(UnarchiveAccountUseCase)
    private readonly unarchiveAccountUseCase: UnarchiveAccountUseCase,
  ) {}

  @ApiCreatedResponse({ type: AccountResponseDto })
  @ApiBadRequestResponse({
    description:
      'Unknown type, name outside 1-60 characters, non-integer openingBalance, currency other than BRL, or unexpected fields',
  })
  @ApiConflictResponse({ description: NAME_ALREADY_USED })
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
  @ApiBadRequestResponse({
    description:
      'includeArchived other than true or false, or an unexpected query parameter',
  })
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAccountsQueryDto,
  ): Promise<AccountResponseDto[]> {
    return this.listAccountsUseCase.execute({
      userId: user.id,
      includeArchived: query.includeArchived === 'true',
    });
  }

  @ApiOkResponse({ type: AccountResponseDto })
  @ApiBadRequestResponse({
    description:
      'Same rules as create, a null field, currency in the body, or unexpected fields',
  })
  @ApiNotFoundResponse({ description: ACCOUNT_NOT_FOUND })
  @ApiConflictResponse({ description: NAME_ALREADY_USED })
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ACCOUNT_ID_PIPE) accountId: string,
    @Body() body: UpdateAccountRequestDto,
  ): Promise<AccountResponseDto> {
    try {
      const account = await this.updateAccountUseCase.execute({
        userId: user.id,
        accountId,
        name: body.name,
        type: body.type,
        openingBalance: body.openingBalance,
      });
      return account;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiOkResponse({ type: AccountResponseDto })
  @ApiNotFoundResponse({ description: ACCOUNT_NOT_FOUND })
  @HttpCode(HttpStatus.OK)
  @Post(':id/archive')
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ACCOUNT_ID_PIPE) accountId: string,
  ): Promise<AccountResponseDto> {
    try {
      const account = await this.archiveAccountUseCase.execute({
        userId: user.id,
        accountId,
      });
      return account;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiOkResponse({ type: AccountResponseDto })
  @ApiNotFoundResponse({ description: ACCOUNT_NOT_FOUND })
  @HttpCode(HttpStatus.OK)
  @Post(':id/unarchive')
  async unarchive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ACCOUNT_ID_PIPE) accountId: string,
  ): Promise<AccountResponseDto> {
    try {
      const account = await this.unarchiveAccountUseCase.execute({
        userId: user.id,
        accountId,
      });
      return account;
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
