import { ApiProperty } from '@nestjs/swagger';

export class TransactionLabelResponseDto {
  id: string;
  name: string;

  @ApiProperty({ example: '#2563eb' })
  color: string;
}
