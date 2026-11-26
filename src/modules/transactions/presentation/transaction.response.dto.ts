import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionLabelResponseDto } from './transaction-label.response.dto.js';

export class TransactionResponseDto {
  id: string;
  accountId: string;

  @ApiProperty({ format: 'date', example: '2026-11-20' })
  date: string;

  @ApiProperty({
    description:
      'Signed integer cents: negative is an expense, positive an income',
    example: -4590,
  })
  amount: number;

  description: string;

  @ApiProperty({
    type: [TransactionLabelResponseDto],
    description: 'Always an array, sorted by name ignoring case and accents',
  })
  labels: TransactionLabelResponseDto[];

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Only on the two legs of a transfer; change them through /transfers',
  })
  transferId?: string;
}
