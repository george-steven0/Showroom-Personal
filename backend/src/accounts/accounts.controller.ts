import { Controller, Get, Query } from '@nestjs/common'
import { AccountsService } from './accounts.service'
import { ProfitQueryDto } from './dto/profit-query.dto'

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('summary')
  getSummary() {
    return this.accounts.getSummary()
  }

  @Get('owed')
  getOwed() {
    return this.accounts.getOwed()
  }

  @Get('profit')
  getProfit(@Query() query: ProfitQueryDto) {
    return this.accounts.getProfitSummary(query)
  }
}
