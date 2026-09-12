import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { SuppliersModule } from './suppliers/suppliers.module'
import { PurchaseBillsModule } from './purchase-bills/purchase-bills.module'
import { SellingBillsModule } from './selling-bills/selling-bills.module'
import { ExpensesModule } from './expenses/expenses.module'
import { CapitalModule } from './capital/capital.module'
import { AccountsModule } from './accounts/accounts.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { ReportsModule } from './reports/reports.module'
import { LedgerModule } from './ledger/ledger.module'
import { SettingsModule } from './settings/settings.module'
import { InventoryModule } from './inventory/inventory.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // __dirname-relative, not cwd-relative — a launcher may start node
      // from an arbitrary working directory.
      envFilePath: join(__dirname, '..', '.env'),
    }),
    // Serves the built React app from the same process/port in production
    // so there is no cross-origin call to make. Harmless in development:
    // with no `frontend/dist` yet, every request just falls through to
    // Nest's own routes.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api/(.*)', '/health'],
    }),
    PrismaModule,
    LedgerModule,
    SettingsModule,
    HealthModule,
    AuthModule,
    SuppliersModule,
    PurchaseBillsModule,
    SellingBillsModule,
    ExpensesModule,
    CapitalModule,
    AccountsModule,
    DashboardModule,
    ReportsModule,
    InventoryModule,
  ],
})
export class AppModule {}
