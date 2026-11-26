import { ApiProperty } from '@nestjs/swagger';
import { LABEL_COLORS } from '../domain/label-color.js';

export class LabelResponseDto {
  id: string;
  name: string;

  @ApiProperty({ enum: [...LABEL_COLORS], description: 'Always lowercase' })
  color: string;
}
