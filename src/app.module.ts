import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from '@modules/health/health.module.js';
import { DatabaseModule } from '@shared/database/database.module.js';
import { AuthModule } from '@modules/auth/auth.module.js';
import { AccountsModule } from '@modules/accounts/accounts.module.js';
import { LabelsModule } from '@modules/labels/labels.module.js';
import { TransactionsModule } from '@modules/transactions/transactions.module.js';
import { ReportsModule } from '@modules/reports/reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    AccountsModule,
    LabelsModule,
    TransactionsModule,
    ReportsModule,
  ],
})
export class AppModule {}
