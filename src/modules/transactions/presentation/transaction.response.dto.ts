import { ApiProperty } from '@nestjs/swagger';

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
}
