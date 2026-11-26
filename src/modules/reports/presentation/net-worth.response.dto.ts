import { ApiProperty } from '@nestjs/swagger';
import {
  ACCOUNT_TYPES,
  type AccountType,
} from '@modules/accounts/domain/account-type.js';
import {
  type Currency,
  DEFAULT_CURRENCY,
} from '@modules/accounts/domain/currency.js';

export class AccountBalanceResponseDto {
  id: string;
  name: string;

  @ApiProperty({ enum: [...ACCOUNT_TYPES] })
  type: AccountType;

  @ApiProperty({
    description:
      'Signed integer cents: the opening balance plus the sum of the account transactions',
    example: -150000,
  })
  balance: number;
}

export class NetWorthResponseDto {
  @ApiProperty({ enum: [DEFAULT_CURRENCY] })
  currency: Currency;

  @ApiProperty({
    description:
      'Signed integer cents: the sum of the balances of the non-archived accounts',
    example: 200000,
  })
  total: number;

  @ApiProperty({
    type: [AccountBalanceResponseDto],
    description: 'Non-archived accounts, highest balance first',
  })
  accounts: AccountBalanceResponseDto[];
}
