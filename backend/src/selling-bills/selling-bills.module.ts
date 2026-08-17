import { Module } from '@nestjs/common'
import { SellingBillsController } from './selling-bills.controller'
import { SellingBillsService } from './selling-bills.service'
import { LedgerModule } from '../ledger/ledger.module'

@Module({
  imports: [LedgerModule],
  controllers: [SellingBillsController],
  providers: [SellingBillsService],
})
export class SellingBillsModule {}
