import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import {
  DEFAULT_MONTHS,
  MAX_MONTHS,
} from '../application/get-cash-flow.use-case.js';

// Query parameters always arrive as strings. Only their shape is checked here;
// the months range and real YYYY-MM months are enforced by the use case and domain.
export class CashFlowQueryDto {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_MONTHS,
    default: DEFAULT_MONTHS,
    description: 'How many months to return, ending at `to`',
  })
  @IsOptional()
  @Matches(/^\d+$/, { message: 'months must be a whole number' })
  months?: string;

  @ApiPropertyOptional({
    description:
      'Last month included (YYYY-MM). Defaults to the current UTC month',
    example: '2026-11',
  })
  @IsOptional()
  @IsString()
  to?: string;
}
