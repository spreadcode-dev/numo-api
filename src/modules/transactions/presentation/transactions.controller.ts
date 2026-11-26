import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/auth/authenticated-request.js';
import { CurrentUser } from '@shared/auth/current-user.decorator.js';
import { RecordTransactionUseCase } from '../application/record-transaction.use-case.js';
import { RecordTransactionRequestDto } from './record-transaction.request.dto.js';
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
}
