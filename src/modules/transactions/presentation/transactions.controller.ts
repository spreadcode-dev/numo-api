import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
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
import { ListTransactionsUseCase } from '../application/list-transactions.use-case.js';
import { RecordTransactionUseCase } from '../application/record-transaction.use-case.js';
import { ListTransactionsQueryDto } from './list-transactions.query.dto.js';
import { RecordTransactionRequestDto } from './record-transaction.request.dto.js';
import { TransactionPageResponseDto } from './transaction-page.response.dto.js';
import { TransactionResponseDto } from './transaction.response.dto.js';
import { toHttpError } from './transactions-error.mapper.js';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token',
})
@Controller('transactions')
export class TransactionsController {
  constructor(
    @Inject(RecordTransactionUseCase)
    private readonly recordTransactionUseCase: RecordTransactionUseCase,
    @Inject(ListTransactionsUseCase)
    private readonly listTransactionsUseCase: ListTransactionsUseCase,
  ) {}

  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({
    description:
      'Amount 0 or not an integer, date not a real YYYY-MM-DD day, description outside 1-140 characters, accountId not a UUID, or unexpected fields',
  })
  @ApiNotFoundResponse({
    description: 'No account with this id belongs to the user in the token',
  })
  @ApiConflictResponse({ description: 'The account is archived' })
  @Post()
  async record(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RecordTransactionRequestDto,
  ): Promise<TransactionResponseDto> {
    try {
      const transaction = await this.recordTransactionUseCase.execute({
        userId: user.id,
        accountId: body.accountId,
        date: body.date,
        amount: body.amount,
        description: body.description,
      });
      return transaction;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiOkResponse({
    type: TransactionPageResponseDto,
    description:
      "The user's transactions, newest first (date, then id). Filters combine with AND",
  })
  @ApiBadRequestResponse({
    description:
      'limit outside 1-100, a tampered or outdated cursor, from/to not a real YYYY-MM-DD day, accountId not a UUID, or unexpected parameters',
  })
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<TransactionPageResponseDto> {
    try {
      const page = await this.listTransactionsUseCase.execute({
        userId: user.id,
        accountId: query.accountId,
        from: query.from,
        to: query.to,
        limit: query.limit === undefined ? undefined : Number(query.limit),
        cursor: query.cursor,
      });
      return page;
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
