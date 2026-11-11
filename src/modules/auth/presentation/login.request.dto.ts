import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

// Generous upper bound that only stops huge inputs from reaching argon2. The
// 12-128 character rule belongs to registration: at login a password that
// breaks it is just wrong, and must get the same 401 as any other.
const LOGIN_PASSWORD_MAX_LENGTH = 1_024;

export class LoginRequestDto {
  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'correct-horse-battery' })
  @IsString()
  @MaxLength(LOGIN_PASSWORD_MAX_LENGTH)
  password: string;
}
