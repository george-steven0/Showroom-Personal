import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { SellingBillsService } from './selling-bills.service'
import { CreateSellingBillDto } from './dto/create-selling-bill.dto'
import { ListSellingBillsQueryDto } from './dto/list-selling-bills-query.dto'
import { CancelSellingBillDto } from './dto/cancel-selling-bill.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('selling-bills')
export class SellingBillsController {
  constructor(private readonly sellingBills: SellingBillsService) {}

  @Get()
  list(@Query() query: ListSellingBillsQueryDto) {
    return this.sellingBills.list(query)
  }

  @Post()
  create(@Body() dto: CreateSellingBillDto, @CurrentUser() user: RequestUser) {
    return this.sellingBills.create(dto, user)
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSellingBillDto, @CurrentUser() user: RequestUser) {
    return this.sellingBills.cancel(id, dto.reason, user)
  }
}
