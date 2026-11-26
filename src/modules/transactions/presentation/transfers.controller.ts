import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/auth/authenticated-request.js';
import { CurrentUser } from '@shared/auth/current-user.decorator.js';
import { DeleteTransferUseCase } from '../application/delete-transfer.use-case.js';
import { TransferBetweenAccountsUseCase } from '../application/transfer-between-accounts.use-case.js';
import { CreateTransferRequestDto } from './create-transfer.request.dto.js';
import { toHttpError } from './transactions-error.mapper.js';
import { TransferResponseDto } from './transfer.response.dto.js';

// A malformed id can't match any transfer, so it gets the same 404 as an
// unknown one instead of reaching Postgres as an invalid uuid (a 500).
const TRANSFER_ID_PIPE = new ParseUUIDPipe({
  errorHttpStatusCode: HttpStatus.NOT_FOUND,
});

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token',
})
@Controller('transfers')
export class TransfersController {
  constructor(
    @Inject(TransferBetweenAccountsUseCase)
    private readonly transferBetweenAccountsUseCase: TransferBetweenAccountsUseCase,
    @Inject(DeleteTransferUseCase)
    private readonly deleteTransferUseCase: DeleteTransferUseCase,
  ) {}

  @ApiCreatedResponse({ type: TransferResponseDto })
  @ApiBadRequestResponse({
    description:
      'Amount not a positive integer, the same account on both sides, date not a real YYYY-MM-DD day, description outside 1-140 characters, an account id not a UUID, or unexpected fields',
  })
  @ApiNotFoundResponse({
    description: 'One of the accounts does not belong to the user in the token',
  })
  @ApiConflictResponse({ description: 'One of the accounts is archived' })
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTransferRequestDto,
  ): Promise<TransferResponseDto> {
    try {
      const transfer = await this.transferBetweenAccountsUseCase.execute({
        userId: user.id,
        fromAccountId: body.fromAccountId,
        toAccountId: body.toAccountId,
        amount: body.amount,
        date: body.date,
        description: body.description,
      });
      return transfer;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @ApiNoContentResponse({ description: 'Both legs deleted' })
  @ApiNotFoundResponse({
    description: 'No transfer with this id belongs to the user in the token',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':transferId')
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transferId', TRANSFER_ID_PIPE) transferId: string,
  ): Promise<void> {
    try {
      await this.deleteTransferUseCase.execute({ userId: user.id, transferId });
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
