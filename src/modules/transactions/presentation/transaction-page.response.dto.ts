import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction.response.dto.js';

export class TransactionPageResponseDto {
  items: TransactionResponseDto[];

  @ApiPropertyOptional({
    description:
      'Opaque; pass it as ?cursor= for the next page. Absent on the last page',
  })
  nextCursor?: string;
}
