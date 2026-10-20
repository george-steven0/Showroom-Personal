import { Module } from '@nestjs/common'
import { InternalAccountsController } from './internal-accounts.controller'
import { InternalAccountsService } from './internal-accounts.service'

@Module({
  controllers: [InternalAccountsController],
  providers: [InternalAccountsService],
})
export class InternalAccountsModule {}
