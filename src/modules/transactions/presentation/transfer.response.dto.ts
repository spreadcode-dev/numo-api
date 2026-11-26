import { ApiProperty } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction.response.dto.js';

export class TransferResponseDto {
  transferId: string;

  @ApiProperty({ description: 'The leg on fromAccountId, with -amount' })
  outgoing: TransactionResponseDto;

  @ApiProperty({ description: 'The leg on toAccountId, with +amount' })
  incoming: TransactionResponseDto;
}
