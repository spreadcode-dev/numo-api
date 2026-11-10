import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { EMAIL_MAX_LENGTH } from '../domain/email.js';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../domain/password.js';

// Length limits are enforced by the domain (Email, Password) and only
// documented here, so the rule lives in one place.
export class RegisterUserRequestDto {
  @ApiProperty({ example: 'ana@example.com', maxLength: EMAIL_MAX_LENGTH })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'correct-horse-battery',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  password: string;
}
