import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LABEL_COLORS } from '@modules/labels/domain/label-color.js';
import { UNLABELED_NAME } from '../application/get-spending-by-label.use-case.js';

export class LabelSpendingResponseDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: `Absent on the "${UNLABELED_NAME}" entry`,
  })
  labelId?: string;

  @ApiProperty({
    description: `The label name, or "${UNLABELED_NAME}" for expenses without labels`,
  })
  name: string;

  @ApiPropertyOptional({
    enum: [...LABEL_COLORS],
    description: `Absent on the "${UNLABELED_NAME}" entry`,
  })
  color?: string;

  @ApiProperty({
    description:
      'Integer cents, positive: the full amount of every expense the label tags. An expense with several labels counts in full under each one',
    example: 30000,
  })
  amount: number;
}

export class SpendingByLabelResponseDto {
  @ApiProperty({ description: 'YYYY-MM', example: '2026-11' })
  month: string;

  @ApiProperty({
    description:
      "Integer cents, positive: the month's real expense, each transaction counted once. Labels overlap, so the entries can add up to more",
    example: 235000,
  })
  total: number;

  @ApiProperty({
    type: [LabelSpendingResponseDto],
    description: 'Highest amount first; empty when the month has no expenses',
  })
  labels: LabelSpendingResponseDto[];
}
