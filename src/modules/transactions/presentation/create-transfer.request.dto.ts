import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID } from 'class-validator';
import { TRANSACTION_DESCRIPTION_MAX_LENGTH } from '../domain/transaction-description.js';

// Only the JSON shape is checked here (plus the id formats, so a malformed id
// never reaches Postgres). The rules (a positive amount, two different
// accounts, a real calendar day, 1-140 characters) live in the domain.
export class CreateTransferRequestDto {
  @ApiProperty({
    format: 'uuid',
    description: "The user's active account the money leaves",
  })
  @IsUUID()
  fromAccountId: string;

  @ApiProperty({
    format: 'uuid',
    description:
      "The user's active account the money arrives in; not fromAccountId",
  })
  @IsUUID()
  toAccountId: string;

  @ApiProperty({
    description:
      'Positive integer cents: the outgoing leg gets -amount, the incoming leg +amount',
    minimum: 1,
    example: 50000,
  })
  @IsInt()
  amount: number;

  @ApiProperty({
    format: 'date',
    description: 'Calendar day as YYYY-MM-DD, with no time zone',
    example: '2026-11-20',
  })
  @IsString()
  date: string;

  @ApiProperty({
    example: 'Card bill',
    minLength: 1,
    maxLength: TRANSACTION_DESCRIPTION_MAX_LENGTH,
  })
  @IsString()
  description: string;
}
