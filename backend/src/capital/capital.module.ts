import { Module } from '@nestjs/common'
import { CapitalController } from './capital.controller'
import { CapitalService } from './capital.service'
import { LedgerModule } from '../ledger/ledger.module'

@Module({
  imports: [LedgerModule],
  controllers: [CapitalController],
  providers: [CapitalService],
})
export class CapitalModule {}
