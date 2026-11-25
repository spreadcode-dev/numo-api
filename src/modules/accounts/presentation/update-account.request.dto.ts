import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, ValidateIf } from 'class-validator';
import { ACCOUNT_NAME_MAX_LENGTH } from '../domain/account-name.js';
import { ACCOUNT_TYPES } from '../domain/account-type.js';

// IsOptional would also skip validation for null and let it reach the domain;
// here only a missing field is optional, so {"name": null} is a 400.
const ValidateUnlessMissing = () =>
  ValidateIf((_body: object, value: unknown) => value !== undefined);

// Same split as create: only the JSON shape is checked here, the rules live in
// the domain. currency isn't declared, so the global ValidationPipe rejects it.
export class UpdateAccountRequestDto {
  @ApiPropertyOptional({
    example: 'Itaú checking',
    minLength: 1,
    maxLength: ACCOUNT_NAME_MAX_LENGTH,
  })
  @ValidateUnlessMissing()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: [...ACCOUNT_TYPES], example: 'checking' })
  @ValidateUnlessMissing()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description:
      'Signed integer cents. A correction: every balance computed from it changes too',
    example: 0,
  })
  @ValidateUnlessMissing()
  @IsInt()
  openingBalance?: number;
}
