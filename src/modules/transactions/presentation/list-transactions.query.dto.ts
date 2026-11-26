import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from '../application/list-transactions.use-case.js';

// Query parameters always arrive as strings. Only their shape is checked here
// (and the id format, so a malformed id never reaches Postgres); the limit
// range and real calendar days are enforced by the use case and domain.
export class ListTransactionsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      "Only this account's transactions. Another user's account gives an empty list",
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'First day included (YYYY-MM-DD)',
    example: '2026-11-01',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Last day included (YYYY-MM-DD)',
    example: '2026-11-30',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE_LIMIT,
    default: DEFAULT_PAGE_LIMIT,
  })
  @IsOptional()
  @Matches(/^\d+$/, { message: 'limit must be a whole number' })
  limit?: string;

  @ApiPropertyOptional({
    description:
      'The nextCursor of the previous page, passed back unchanged. Omit it for the first page',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
