import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { ACCOUNT_NAME_MAX_LENGTH } from '../domain/account-name.js';
import { ACCOUNT_TYPES } from '../domain/account-type.js';
import { DEFAULT_CURRENCY } from '../domain/currency.js';

// Only the JSON shape is checked here. The rules (allowed types, BRL only,
// 1-60 characters, safe-integer cents) are enforced by the domain and only
// documented here, so they live in one place.
export class CreateAccountRequestDto {
  @ApiProperty({
    example: 'Nubank card',
    minLength: 1,
    maxLength: ACCOUNT_NAME_MAX_LENGTH,
  })
  @IsString()
  name: string;

  @ApiProperty({ enum: [...ACCOUNT_TYPES], example: 'credit_card' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Signed integer cents: -150000 is -R$ 1,500.00',
    example: -150000,
  })
  @IsInt()
  openingBalance: number;

  @ApiPropertyOptional({ enum: [DEFAULT_CURRENCY], default: DEFAULT_CURRENCY })
  @IsOptional()
  @IsString()
  currency?: string;
}
