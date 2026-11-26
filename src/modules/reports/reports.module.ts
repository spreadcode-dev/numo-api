import { Module } from '@nestjs/common';
import {
  BALANCES_REPORT,
  type BalancesReport,
} from './application/balances-report.js';
import { GetNetWorthUseCase } from './application/get-net-worth.use-case.js';
import { PgBalancesReport } from './infrastructure/pg-balances-report.js';
import { ReportsController } from './presentation/reports.controller.js';

@Module({
  controllers: [ReportsController],
  providers: [
    { provide: BALANCES_REPORT, useClass: PgBalancesReport },
    {
      provide: GetNetWorthUseCase,
      inject: [BALANCES_REPORT],
      useFactory: (balancesReport: BalancesReport) =>
        new GetNetWorthUseCase(balancesReport),
    },
  ],
})
export class ReportsModule {}
