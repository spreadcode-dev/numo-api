import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  accessToken: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType: 'Bearer';

  @ApiProperty({
    description: 'Seconds until the access token expires',
    example: 900,
  })
  expiresIn: number;
}
