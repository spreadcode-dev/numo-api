import { Controller, Get, Inject } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/auth/authenticated-request.js';
import { CurrentUser } from '@shared/auth/current-user.decorator.js';
import { GetNetWorthUseCase } from '../application/get-net-worth.use-case.js';
import { NetWorthResponseDto } from './net-worth.response.dto.js';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token',
})
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(GetNetWorthUseCase)
    private readonly getNetWorthUseCase: GetNetWorthUseCase,
  ) {}

  @ApiOkResponse({ type: NetWorthResponseDto })
  @Get('net-worth')
  netWorth(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NetWorthResponseDto> {
    return this.getNetWorthUseCase.execute(user.id);
  }
}
