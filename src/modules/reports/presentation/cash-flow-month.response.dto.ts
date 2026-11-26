import { ApiProperty } from '@nestjs/swagger';

export class CashFlowMonthResponseDto {
  @ApiProperty({ description: 'YYYY-MM', example: '2026-11' })
  month: string;

  @ApiProperty({
    description:
      'Integer cents: sum of the positive transactions of the month, transfers excluded',
    example: 500000,
  })
  income: number;

  @ApiProperty({
    description:
      'Integer cents, as a positive number: sum of the negative transactions of the month, transfers excluded',
    example: 150000,
  })
  expense: number;
}
