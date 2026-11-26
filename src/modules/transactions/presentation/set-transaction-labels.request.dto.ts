import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';
import { MAX_LABELS_PER_TRANSACTION } from '../domain/transaction-label-ids.js';

// Only the shape is checked here (an array of UUIDs, so a malformed id never
// reaches Postgres). The limit and the no-duplicates rule live in the domain.
export class SetTransactionLabelsRequestDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    maxItems: MAX_LABELS_PER_TRANSACTION,
    uniqueItems: true,
    description:
      "The full set of the user's labels for this transaction; [] removes them all",
  })
  @IsArray()
  @IsUUID('all', { each: true })
  labelIds: string[];
}
