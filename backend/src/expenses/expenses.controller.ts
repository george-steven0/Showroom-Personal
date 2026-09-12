import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto'
import { ExpenseSummaryQueryDto } from './dto/expense-summary-query.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('summary')
  summary(@Query() query: ExpenseSummaryQueryDto) {
    return this.expenses.summary(query)
  }

  @Get()
  list(@Query() query: ListExpensesQueryDto) {
    return this.expenses.list(query)
  }

  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: RequestUser) {
    return this.expenses.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @CurrentUser() user: RequestUser) {
    return this.expenses.update(id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.expenses.remove(id, user)
  }
}
