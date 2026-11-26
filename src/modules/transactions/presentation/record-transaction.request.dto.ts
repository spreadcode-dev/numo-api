import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID } from 'class-validator';
import { TRANSACTION_DESCRIPTION_MAX_LENGTH } from '../domain/transaction-description.js';

// Only the JSON shape is checked here (plus the id format, so a malformed id
// never reaches Postgres). The rules (non-zero cents, a real calendar day,
// 1-140 characters) are enforced by the domain and only documented here.
export class RecordTransactionRequestDto {
  @ApiProperty({
    format: 'uuid',
    description: "One of the user's active accounts",
  })
  @IsUUID()
  accountId: string;

  @ApiProperty({
    format: 'date',
    description: 'Calendar day as YYYY-MM-DD, with no time zone',
    example: '2026-11-20',
  })
  @IsString()
  date: string;

  @ApiProperty({
    description:
      'Signed integer cents, never 0: negative is an expense, positive an income. -4590 is -R$ 45.90',
    example: -4590,
  })
  @IsInt()
  amount: number;

  @ApiProperty({
    example: 'Market',
    minLength: 1,
    maxLength: TRANSACTION_DESCRIPTION_MAX_LENGTH,
  })
  @IsString()
  description: string;
}
