import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/auth/authenticated-request.js';
import { CurrentUser } from '@shared/auth/current-user.decorator.js';
import { GetCashFlowUseCase } from '../application/get-cash-flow.use-case.js';
import { GetNetWorthUseCase } from '../application/get-net-worth.use-case.js';
import { CashFlowMonthResponseDto } from './cash-flow-month.response.dto.js';
import { CashFlowQueryDto } from './cash-flow.query.dto.js';
import { NetWorthResponseDto } from './net-worth.response.dto.js';
import { toHttpError } from './reports-error.mapper.js';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid or expired access token',
})
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(GetNetWorthUseCase)
    private readonly getNetWorthUseCase: GetNetWorthUseCase,
    @Inject(GetCashFlowUseCase)
    private readonly getCashFlowUseCase: GetCashFlowUseCase,
  ) {}

  @ApiOkResponse({ type: NetWorthResponseDto })
  @Get('net-worth')
  netWorth(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NetWorthResponseDto> {
    return this.getNetWorthUseCase.execute(user.id);
  }

  @ApiOkResponse({ type: [CashFlowMonthResponseDto] })
  @ApiBadRequestResponse({
    description:
      'months not a whole number between 1 and 24, to not a real YYYY-MM month, or unexpected parameters',
  })
  @Get('cash-flow')
  async cashFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CashFlowQueryDto,
  ): Promise<CashFlowMonthResponseDto[]> {
    try {
      const months = await this.getCashFlowUseCase.execute({
        userId: user.id,
        months: query.months === undefined ? undefined : Number(query.months),
        to: query.to,
      });
      return months;
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
