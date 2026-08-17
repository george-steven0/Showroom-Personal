import { Controller, Get, Query } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { ListCashTransactionsQueryDto } from './dto/list-cash-transactions-query.dto'
import { MovementsSummaryQueryDto } from './dto/movements-summary-query.dto'

@Controller('cash-transactions')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@Query() query: ListCashTransactionsQueryDto) {
    return this.reports.listCashTransactions(query)
  }

  @Get('summary')
  summary(@Query() query: MovementsSummaryQueryDto) {
    return this.reports.getMovementsSummary(query)
  }
}
