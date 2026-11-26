import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, ValidateIf } from 'class-validator';
import { LABEL_COLORS } from '../domain/label-color.js';
import { LABEL_NAME_MAX_LENGTH } from '../domain/label-name.js';
import { LABEL_COLOR_DESCRIPTION } from './create-label.request.dto.js';

// IsOptional would also skip validation for null and let it reach the domain;
// here only a missing field is optional, so {"name": null} is a 400.
const ValidateUnlessMissing = () =>
  ValidateIf((_body: object, value: unknown) => value !== undefined);

export class UpdateLabelRequestDto {
  @ApiPropertyOptional({
    example: 'Supermarket',
    minLength: 1,
    maxLength: LABEL_NAME_MAX_LENGTH,
  })
  @ValidateUnlessMissing()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    enum: [...LABEL_COLORS],
    description: LABEL_COLOR_DESCRIPTION,
    example: '#f97316',
  })
  @ValidateUnlessMissing()
  @IsString()
  color?: string;
}
