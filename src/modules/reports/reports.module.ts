import { Module } from '@nestjs/common';
import { CLOCK, type Clock } from '@modules/auth/domain/clock.js';
import { SystemClock } from '@modules/auth/infrastructure/system-clock.js';
import {
  BALANCES_REPORT,
  type BalancesReport,
} from './application/balances-report.js';
import {
  CASH_FLOW_REPORT,
  type CashFlowReport,
} from './application/cash-flow-report.js';
import { GetCashFlowUseCase } from './application/get-cash-flow.use-case.js';
import { GetNetWorthUseCase } from './application/get-net-worth.use-case.js';
import { GetSpendingByLabelUseCase } from './application/get-spending-by-label.use-case.js';
import {
  SPENDING_BY_LABEL_REPORT,
  type SpendingByLabelReport,
} from './application/spending-by-label-report.js';
import { PgBalancesReport } from './infrastructure/pg-balances-report.js';
import { PgCashFlowReport } from './infrastructure/pg-cash-flow-report.js';
import { PgSpendingByLabelReport } from './infrastructure/pg-spending-by-label-report.js';
import { ReportsController } from './presentation/reports.controller.js';

@Module({
  controllers: [ReportsController],
  providers: [
    { provide: BALANCES_REPORT, useClass: PgBalancesReport },
    { provide: CASH_FLOW_REPORT, useClass: PgCashFlowReport },
    { provide: SPENDING_BY_LABEL_REPORT, useClass: PgSpendingByLabelReport },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: GetNetWorthUseCase,
      inject: [BALANCES_REPORT],
      useFactory: (balancesReport: BalancesReport) =>
        new GetNetWorthUseCase(balancesReport),
    },
    {
      provide: GetCashFlowUseCase,
      inject: [CASH_FLOW_REPORT, CLOCK],
      useFactory: (cashFlowReport: CashFlowReport, clock: Clock) =>
        new GetCashFlowUseCase(cashFlowReport, clock),
    },
    {
      provide: GetSpendingByLabelUseCase,
      inject: [SPENDING_BY_LABEL_REPORT],
      useFactory: (spendingByLabelReport: SpendingByLabelReport) =>
        new GetSpendingByLabelUseCase(spendingByLabelReport),
    },
  ],
})
export class ReportsModule {}
