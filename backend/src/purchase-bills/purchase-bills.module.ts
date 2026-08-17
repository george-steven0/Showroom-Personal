import { Module } from '@nestjs/common'
import { PurchaseBillsController } from './purchase-bills.controller'
import { PurchaseLinesController } from './purchase-lines.controller'
import { PurchaseBillsService } from './purchase-bills.service'
import { LedgerModule } from '../ledger/ledger.module'

@Module({
  imports: [LedgerModule],
  controllers: [PurchaseBillsController, PurchaseLinesController],
  providers: [PurchaseBillsService],
  exports: [PurchaseBillsService],
})
export class PurchaseBillsModule {}
