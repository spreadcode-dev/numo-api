import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { LABEL_COLORS } from '../domain/label-color.js';
import { LABEL_NAME_MAX_LENGTH } from '../domain/label-name.js';

export const LABEL_COLOR_DESCRIPTION =
  'One of the 8 palette colors (blue, green, teal, purple, pink, red, orange, yellow). Any casing is accepted; it is stored and returned in lowercase';

// Only the JSON shape is checked here. The rules (1-30 characters, palette
// colors) are enforced by the domain and only documented here.
export class CreateLabelRequestDto {
  @ApiProperty({
    example: 'Groceries',
    minLength: 1,
    maxLength: LABEL_NAME_MAX_LENGTH,
  })
  @IsString()
  name: string;

  @ApiProperty({
    enum: [...LABEL_COLORS],
    description: LABEL_COLOR_DESCRIPTION,
    example: '#15803d',
  })
  @IsString()
  color: string;
}
