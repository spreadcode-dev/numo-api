import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

const BOOLEAN_STRINGS = ['true', 'false'] as const;

export class ListAccountsQueryDto {
  @ApiPropertyOptional({
    enum: [...BOOLEAN_STRINGS],
    default: 'false',
    description: 'Also return archived accounts',
  })
  @IsOptional()
  @IsIn(BOOLEAN_STRINGS)
  includeArchived?: (typeof BOOLEAN_STRINGS)[number];
}
