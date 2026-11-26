import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/auth/authenticated-request.js';
import { CurrentUser } from '@shared/auth/current-user.decorator.js';
import { DeleteTransactionUseCase } from '../application/delete-transaction.use-case.js';
import { ListTransactionsUseCase } from '../application/list-transactions.use-case.js';
import { RecordTransactionUseCase } from '../application/record-transaction.use-case.js';
import { ReplaceTransactionUseCase } from '../application/replace-transaction.use-case.js';
import { SetTransactionLabelsUseCase } from '../application/set-transaction-labels.use-case.js';
import { ListTransactionsQueryDto } from './list-transactions.query.dto.js';
import { RecordTransactionRequestDto } from './record-transaction.request.dto.js';
import { ReplaceTransactionRequestDto } from './replace-transaction.request.dto.js';
import { SetTransactionLabelsRequestDto } from './set-transaction-labels.request.dto.js';
import { TransactionLabelResponseDto } from './transaction-label.response.dto.js';
import { TransactionPageResponseDto } from './transaction-page.response.dto.js';
import { TransactionResponseDto } from './transaction.response.dto.js';
import { toHttpError } from './transactions-error.mapper.js';

// A malformed id can't match any transaction, so it gets the same 404 as an
// unknown one instead of reaching Postgres as an invalid uuid (a 500).
const TRANSACTION_ID_PIPE = new ParseUUIDPipe({
  errorHttpStatusCode: HttpStatus.NOT_FOUND,
});

const INVALID_TRANSACTION =
  'Amount 0 or not an integer, date not a real YYYY-MM-DD day, description outside 1-140 characters, accountId not a UUID, or unexpected fields';
const TRANSFER_LEG = 'a transfer leg (change it through /transfers)';
const TRANSACTION_NOT_FOUND =
  'No transaction with this id belongs to the user in the token';

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
    @Inject(ReplaceTransactionUseCase)
    private readonly replaceTransactionUseCase: ReplaceTransactionUseCase,
    @Inject(DeleteTransactionUseCase)
    private readonly deleteTransactionUseCase: DeleteTransactionUseCase,
    @Inject(SetTransactionLabelsUseCase)
    private readonly setTransactionLabelsUseCase: SetTransactionLabelsUseCase,
  ) {}

  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: INVALID_TRANSACTION })
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
      'limit outside 1-100, a tampered or outdated cursor, from/to not a real YYYY-MM-DD day, accountId or labelId not a UUID, or unexpected parameters',
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
        labelId: query.labelId,
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

  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: INVALID_TRANSACTION })
  @ApiNotFoundResponse({
    description: `${TRANSACTION_NOT_FOUND}, or no account with accountId does`,
  })
  @ApiConflictResponse({
    description: `The target account is archived, or ${TRANSFER_LEG}`,
  })
  @Put(':id')
  async replace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', TRANSACTION_ID_PIPE) transactionId: string,
    @Body() body: ReplaceTransactionRequestDto,
  ): Promise<TransactionResponseDto> {
    try {
      const transaction = await this.replaceTransactionUseCase.execute({
        userId: user.id,
        transactionId,
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

  @ApiNoContentResponse({ description: 'Transaction deleted' })
  @ApiNotFoundResponse({ description: TRANSACTION_NOT_FOUND })
  @ApiConflictResponse({ description: `The transaction is ${TRANSFER_LEG}` })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', TRANSACTION_ID_PIPE) transactionId: string,
  ): Promise<void> {
    try {
      await this.deleteTransactionUseCase.execute({
        userId: user.id,
        transactionId,
      });
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiOkResponse({
    type: [TransactionLabelResponseDto],
    description: "The transaction's labels after the change, sorted by name",
  })
  @ApiBadRequestResponse({
    description:
      'labelIds not an array of UUIDs, more than 10 labels, the same label twice, or unexpected fields',
  })
  @ApiNotFoundResponse({
    description: `${TRANSACTION_NOT_FOUND}, or one of the labels doesn't`,
  })
  @Put(':id/labels')
  async setLabels(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', TRANSACTION_ID_PIPE) transactionId: string,
    @Body() body: SetTransactionLabelsRequestDto,
  ): Promise<TransactionLabelResponseDto[]> {
    try {
      const labels = await this.setTransactionLabelsUseCase.execute({
        userId: user.id,
        transactionId,
        labelIds: body.labelIds,
      });
      return labels;
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
