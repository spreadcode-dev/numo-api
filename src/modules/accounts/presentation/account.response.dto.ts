import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ACCOUNT_TYPES, type AccountType } from '../domain/account-type.js';
import { type Currency, DEFAULT_CURRENCY } from '../domain/currency.js';

export class AccountResponseDto {
  id: string;
  name: string;

  @ApiProperty({ enum: [...ACCOUNT_TYPES] })
  type: AccountType;

  @ApiProperty({ enum: [DEFAULT_CURRENCY] })
  currency: Currency;

  @ApiProperty({ description: 'Signed integer cents', example: -150000 })
  openingBalance: number;

  @ApiProperty({
    description:
      'Signed integer cents: the opening balance plus the sum of the account transactions',
    example: -150000,
  })
  balance: number;

  @ApiPropertyOptional({
    description: 'Only present when the account is archived',
  })
  archivedAt?: Date;
}
