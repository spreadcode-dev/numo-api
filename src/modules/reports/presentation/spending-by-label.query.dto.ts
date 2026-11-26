import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

// Required, so a missing month is a 400 here; whether it's a real YYYY-MM
// month is checked by the domain (YearMonth).
export class SpendingByLabelQueryDto {
  @ApiProperty({
    description: 'The month to report (YYYY-MM)',
    example: '2026-11',
  })
  @IsString()
  month: string;
}
